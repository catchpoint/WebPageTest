<?php
// pre-process the "timeline" param to extract the test, run and cached state.
// This is a hack for now because the Chrome timeline viewer doesn't urldecode
// URLs so it all needs to be passed as a single query param
if (isset($_REQUEST['timeline'])) {
  $params = explode(',', $_REQUEST['timeline']);
  foreach ($params as $param) {
    list($key, $value) = explode(':', $param);
    if ($key == 't')
      $_REQUEST['test'] = $value;
    elseif ($key == 'r')
      $_REQUEST['run'] = $value;
    elseif ($key == 'c')
      $_REQUEST['cached'] = $value;
  }
}
include 'common.inc'; 
$ok = false;
if (gz_is_file("$testPath/$run{$cachedText}_trace.json")) {
  $ok = true;
  header("Content-disposition: attachment; filename=timeline.json");
  header ("Content-type: application/json");
  
  // Trim off the beginning "traceEvents" object and the trailing }
  // and reduce the trace to just an array which is what the timeline
  // viewer expects
  $filename = "$testPath/$run{$cachedText}_trace.json";
  $buffer = '';
  $handle = gzopen("$filename.gz", 'rb');
  if ($handle === false)
      $handle = gzopen($filename, 'rb');
  if ($handle !== false) {
    $started = false;
    while (!gzeof($handle)) {
      echo $buffer;
      $buffer = gzread($handle, 1024 * 1024);  // 1MB at a time
      if (!$started) {
        $started = true;
        $pos = strpos($buffer, '[');
        if ($pos !== false)
          $buffer = substr($buffer, $pos);
        // remove the empty element at the beginning
        if (substr($buffer, 0,  4) == '[{},') {
          $buffer = '[' . substr($buffer, 4);
        } elseif (substr($buffer, 0,  5) == "[{}\n,") {
          $buffer = '[' . substr($buffer, 5);
        }
      }
      ob_flush();
      flush();
    }
    echo rtrim($buffer, "\r\n}");
    gzclose($handle);
  }
} elseif (gz_is_file("$testPath/$run{$cachedText}_timeline.json")) {
  $ok = true;
  header("Content-disposition: attachment; filename=timeline.json");
  header ("Content-type: application/json");
  gz_readfile_chunked("$testPath/$run{$cachedText}_timeline.json");
} elseif (gz_is_file("$testPath/$run{$cachedText}_devtools.json")) {
  require_once('devtools.inc.php');
  $devTools = array();
  $startOffset = null;
  GetTimeline($testPath, $run, $cached, $devTools, $startOffset);
  if (isset($devTools) && is_array($devTools) && count($devTools)) {
    foreach ($devTools as $entry) {
      $events = GetEvents($entry);
      if (count($events)) {
        if (!$ok) {
          $ok = true;
          header("Content-disposition: attachment; filename=timeline.json");
          header ("Content-type: application/json");
          echo "[\"WebPagetest\"";
        }
        foreach ($events as $event) {
          echo ",\n";
          echo json_encode($event);
        }
      }
    }
    if ($ok)
      echo "\n]";
  }
}
if (!$ok) {
  header("HTTP/1.0 404 Not Found");
}

function GetEvents($entry) {
  $events = array();
  if (is_array($entry) &&
      isset($entry['method']) &&
      $entry['method'] == 'Timeline.eventRecorded' &&
      isset($entry['params']['record']['type'])) {
    AdjustTimes($entry['params']['record']);
    if ($entry['params']['record']['type'] == 'RenderingFrame') {
      if (isset($entry['params']['record']['children']) &&
          count($entry['params']['record']['children'])) {
        $events = $entry['params']['record']['children'];
      }
    } else {
      $events[] = $entry['params']['record'];
    }
  }
  return $events;
}

function AdjustTimes(&$entry) {
  if (isset($entry) && is_array($entry)) {
    if (isset($entry['startTime']))
      $entry['startTime'] *= 1000.0;
    if (isset($entry['endTime']))
      $entry['endTime'] *= 1000.0;
    if (isset($entry['children']) &&
        is_array($entry['children']) &&
        count($entry['children'])) {
      foreach($entry['children'] as &$child)
        AdjustTimes($child);
    }
  }
}
?>
