<?php

/**
 * Given a HAR timing record and an event name, see if the event occurred.
 * A value of -1 or the absence of an event key from the record indicates
 * that an event did not occur.
 *
 * An event that takes 0 milliseconds is considered to have occured.  We
 * assume that it actually took time, but was rounded down.
 */
function harTimingEventOccured($harTimingsRec, $eventName) {
  if (!array_key_exists($eventName, $harTimingsRec))
    return false;

  $eventValue = $harTimingsRec[$eventName];
  if (!is_numeric($eventValue))
    return false;

  if ($eventValue < 0)
    return false;

  return true;
}

/**
 * Given an array and a key, check that the key exists in the array, and its
 * value is a non-negative number.  If so, return it.  If not, return a default
 * value.
 *
 * Used on time intervals from HAR files, where -1 or unset or null means
 * "unknown".  When drawing an unknown time in a waterfall, we show unknown
 * times as no time, so $default will be 0 .
 */
function positiveNumberKeyOrDefault($harTimingsRec, $eventName, $default) {
  if (!array_key_exists($eventName, $harTimingsRec))
    return $default;

  $value = $harTimingsRec[$eventName];
  if (!is_numeric($value))
    return $default;

  if ($value < 0)
    return $default;

  return $value;
}

/**
 * Given the timings field and start time of a HAR request, construct
 * and return an array with the start, end and duration of each event type.
 */
function convertHarTimesToStartEndDuration($harTimingsRec, $entryTime) {
  // A HAR timing record includes the duration of several events.
  // ssl overlaps connect.  Otherwise, all events happen one at a time in
  // order:
  //
  // |<-blocked->|<-dns->|<-connect->|<-send->|<-wait->|<-receive->|
  //                         |<-ssl->|
  // A duration of -1 or omitting an event means the event did not happen.
  // For example, fetching from a URL whose host is an IP address would
  // not have a DNS event.

  $harEventNames = array(
      'blocked', 'dns', 'connect', 'send', 'wait', 'receive', 'ssl');

  $eventTimes = array();
  foreach ($harEventNames as $eventName) {
    // For each event type defined in the HAR spec, find and record the number
    // of milliseconds it took.  If the value is unknown or does not apply,
    // make it zero.
    $duration = positiveNumberKeyOrDefault($harTimingsRec, $eventName, 0);

    $eventTimes[$eventName] = array('ms' => $duration);
  }

  // Compute the start and end time of each event by summing event durations.
  $lastEventEndTime = $entryTime;
  foreach ($harEventNames as $eventName) {
    // ssl event time is special, because it is part of the connect time.
    // We deal with it after the loop.
    if ($eventName == 'ssl')
      continue;

    $eventTimes[$eventName]['start'] = $lastEventEndTime;
    $lastEventEndTime += $eventTimes[$eventName]['ms'];
    $eventTimes[$eventName]['end'] = $lastEventEndTime;
  }

  // The ssl time is included in the end of connect time.
  // In other words, they end at the same time, and the ssl
  // start time is end minus duration.
  $eventTimes['ssl']['end']   = $eventTimes['connect']['end'];
  $eventTimes['ssl']['start'] = $eventTimes['ssl']['end'] -
                                $eventTimes['ssl']['ms'];

  if ($eventTimes['ssl']['start'] < $eventTimes['connect']['start']) {
    logMalformedInput("HAR timing record has ssl time larger than connect ".
                      "time.  Probably a bug in the HAR generator.  Timing ".
                      "record is: " . print_r($harTimingsRec, true));

    // Alter teh ssl timing to conform to the spec.
    $eventTimes['ssl']['start'] = $eventTimes['connect']['start'];
    $eventTimes['ssl']['ms']    = $eventTimes['connect']['ms'];
  }

  return $eventTimes;
}

/**
 * Given the timings field and start time of a HAR request, construct and
 * return an array with the times WebpageTest uses for storage.
 *
 * TODO(skerner): object_detail.inc:FixUpRequestTimes() defines an object
 * with request timing that is almost the same, but slightly different.
 * For example, we use 'ttfb' for the value they call 'ttfb_ms'.  Pick
 * a convention and stick to it.
 */
function convertHarTimesToWebpageTestTimes($harTimingsRec, $entryTime) {
  $harTimes = convertHarTimesToStartEndDuration($harTimingsRec, $entryTime);

  // WebpageTest records timing using a different set of events and deltas
  // than HAR.  To understand them, it helps to look at a timeline.
  //
  // Arrows ( \|/ ) denote a point in time, encoded as an integer number of
  // milliseconds since the start of the measurement.
  //
  // Ranges ( |<-- event name -->| ) denote an interval between events, encoded
  // as an integer number of milliseconds.
  //
  //   $entryTime
  //       |
  //      \|/
  //
  // HAR:  |<-blocked->|<-dns->|<-connect->|<-send->|<-wait->|<-receive->|
  //                               |<-ssl->|
  //
  // WPT:             /|\     /|\ /|\     /|\               /|\         /|\
  //                   |       |   |       |                 |           |
  //                dns start  |   |       |<-- ttfb ------->|           |
  //                           | conn end  |<-- load ------------------->|
  //                           |           |                 |
  //                        dns end      start          receive_start
  //                       conn start


  $wptTimes = array();

  $wptTimes['start'] = $harTimes['send']['start'];
  $wptTimes['ttfb']  = $harTimes['wait']   ['end'] - $harTimes['send']['start'];
  $wptTimes['load']  = $harTimes['receive']['end'] - $harTimes['send']['start'];


  // If no DNS request was recorded, set dns start and end times to 0.
  // The same rule applies to all webpagetest intervals.
  if (harTimingEventOccured($harTimingsRec, 'dns')) {
    $wptTimes['dns_start'] = $harTimes['dns']['start'];
    $wptTimes['dns_end'  ] = $harTimes['dns']['end'];
  } else {
    $wptTimes['dns_start'] = 0;
    $wptTimes['dns_end']   = 0;
  }
  $wptTimes['dns_ms'] = $wptTimes['dns_end'] -
                        $wptTimes['dns_start'];

  if (harTimingEventOccured($harTimingsRec, 'connect')) {
    $wptTimes['connect_start'] = $harTimes['connect']['start'];
    $wptTimes['connect_end']   = $harTimes['ssl']    ['start'];
  } else {
    $wptTimes['connect_start'] = 0;
    $wptTimes['connect_end']   = 0;
  }
  $wptTimes['connect_ms'] = $wptTimes['connect_end'] -
                            $wptTimes['connect_start'];

  if (harTimingEventOccured($harTimingsRec, 'ssl')) {
    $wptTimes['ssl_start'] = $harTimes['ssl']['start'];
    $wptTimes['ssl_end']   = $harTimes['ssl']['end'];
  } else {
    $wptTimes['ssl_start'] = 0;
    $wptTimes['ssl_end']   = 0;
  }
  $wptTimes['ssl_ms'] = $wptTimes['ssl_end'] -
                        $wptTimes['ssl_start'];

  // The time bytes are first received is used to compute the time to first byte
  // of the page.
  $wptTimes['receive_start'] = $harTimes['receive']['start'];

  // Debug: See what this function does for each request:
  /*
  logMalformedInput("convertHarTimesToWebpageTestTimes: ".print_r(array(
      'entryTime' => $entryTime,
      'har timing rec' => $harTimingsRec,
      'har absolute times' => $harTimes,
      'wpt times' => $wptTimes
  ), true));
  */
  return $wptTimes;
}

?>