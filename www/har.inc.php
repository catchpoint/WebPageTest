<?php
require_once('page_data.inc');
require_once('logging.inc');
require_once('object_detail.inc');
require_once('lib/json.php');

/**
* Generate a HAR file for the given test
* 
* @param mixed $testPath
*/
function GenerateHAR($id, $testPath, $options) {
  global $median_metric;
  $json = '{}';
  $multistep = $options['multistep'];
  if( isset($testPath) ) {
    $pageData = null;
    if (isset($options["run"]) && $options["run"]) {
      if (!strcasecmp($options["run"],'median')) {
        $raw = loadAllPageData($testPath, $requests, null, $multistep);
        $run = GetMedianRun($raw, $options['cached'], $median_metric);
        unset($raw);
      } else {
        $run = intval($options["run"]);
      }
      if (!$run)
        $run = 1;
      $pageData[$run] = array();
      if( isset($options['cached']) ) {
        $pageData[$run][$options['cached']] = loadPageRunData($testPath, $run, $options['cached'], $requests, null, $multistep);
        if (!isset($pageData[$run][$options['cached']]))
          unset($pageData);
      } else {
        $pageData[$run][0] = loadPageRunData($testPath, $run, 0, $requests, null, $multistep);
        if (!isset($pageData[$run][0]))
          unset($pageData);
        $pageData[$run][1] = loadPageRunData($testPath, $run, 1, $requests, null, $multistep);
      }
    }
    
    if (!isset($pageData)) {
      $pageData = loadAllPageData($testPath, $requests, null, $multistep);
    }

    // build up the array
    $harData = BuildHAR($pageData, $requests, $id, $testPath, $options);

    $json_encode_good = version_compare(phpversion(), '5.4.0') >= 0 ? true : false;
    $pretty_print = false;
    if (isset($options['pretty']) && $options['pretty'])
      $pretty_print = true;
    if (isset($options['php']) && $options['php']) {
      if ($pretty_print && $json_encode_good)
        $json = json_encode($harData, JSON_PRETTY_PRINT);
      else
        $json = json_encode($harData);
    } elseif ($json_encode_good) {
      if ($pretty_print)
        $json = json_encode($harData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
      else
        $json = json_encode($harData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } else {    
      $jsonLib = new Services_JSON();
      $json = $jsonLib->encode($harData);
    }
    if ($json === false) {
      $jsonLib = new Services_JSON();
      $json = $jsonLib->encode($harData);
    }
  }
  
  return $json;
}

function msdate($mstimestamp)
{
    $timestamp = floor($mstimestamp);
    $milliseconds = round(($mstimestamp - $timestamp) * 1000);
    
    $date = gmdate('c', $timestamp);
    $msDate = substr($date, 0, 19) . '.' . sprintf('%03d', $milliseconds) . substr($date, 19);

    return $msDate;
}

/**
 * Time intervals can be UNKNOWN_TIME or a non-negative number of milliseconds.
 * Intervals that are set to UNKNOWN_TIME represent events that did not happen,
 * so their duration is 0ms.
 *
 * @param type $value
 * @return int The duration of $value
 */
function durationOfInterval($value) {
  if ($value == UNKNOWN_TIME) {
    return 0;
  }
  return (int)$value;
}

function BuildHarPage($testPath, $cached, $run, $data) {
  $cached_text = '';
  if ($cached)
    $cached_text = '_Cached';
  $pageId = "page_{$run}_{$cached}";
  if (isset($data['stepName']))
    $pageId = $pageId . "_" . $data['stepName'];
  $pd = array();
  $pd['startedDateTime'] = msdate($data['date']);
  $pd['title'] = "Run $run, ";
  if( $cached )
    $pd['title'] .= "Repeat View";
  else
    $pd['title'] .= "First View";
  $pd['title'] .= " for " . $data['URL'];
  $pd['id'] = $pageId;
  $pd['pageTimings'] = array( 'onLoad' => $data['docTime'], 'onContentLoad' => -1, '_startRender' => $data['render'] );

  // dump all of our metrics into the har data as custom fields
  foreach($data as $name => $value) {
    if (!is_array($value))
      $pd["_$name"] = $value;
  }
  return $pd;
}

function BuildHAREntry($data, $pd, $r) {
  $entry = array();
  $entry['pageref'] = $pd['id'];
  $entry['startedDateTime'] = msdate((double)$data['date'] + ($r['load_start'] / 1000.0));
  $entry['time'] = $r['all_ms'];

  $request = array();
  $request['method'] = $r['method'];
  $protocol = ($r['is_secure']) ? 'https://' : 'http://';
  $request['url'] = $protocol . $r['host'] . $r['url'];
  $request['headersSize'] = -1;
  $request['bodySize'] = -1;
  $request['cookies'] = array();
  $request['headers'] = array();
  $ver = '';
  $headersSize = 0;
  if( isset($r['headers']) && isset($r['headers']['request']) ) {
    foreach($r['headers']['request'] as &$header) {
      $headersSize += strlen($header) + 2; // add 2 for the \r\n that is on the raw headers
      $pos = strpos($header, ':');
      if( $pos > 0 ) {
        $name = trim(substr($header, 0, $pos));
        $val = trim(substr($header, $pos + 1));
        if( strlen($name) )
          $request['headers'][] = array('name' => $name, 'value' => $val);

        // parse out any cookies
        if( !strcasecmp($name, 'cookie') ) {
          $cookies = explode(';', $val);
          foreach( $cookies as &$cookie ) {
            $pos = strpos($cookie, '=');
            if( $pos > 0 ) {
              $name = (string)trim(substr($cookie, 0, $pos));
              $val = (string)trim(substr($cookie, $pos + 1));
              if( strlen($name) )
                $request['cookies'][] = array('name' => $name, 'value' => $val);
            }
          }
        }
      } else {
        $pos = strpos($header, 'HTTP/');
        if( $pos >= 0 )
          $ver = (string)trim(substr($header, $pos + 5, 3));
      }
    }
  }
  if ($headersSize)
    $request['headersSize'] = $headersSize;
  $request['httpVersion'] = $ver;

  $request['queryString'] = array();
  $parts = parse_url($request['url']);
  if( isset($parts['query']) ) {
    $qs = array();
    parse_str($parts['query'], $qs);
    foreach($qs as $name => $val) {
      if (is_string($name) && is_string($val)) {
        if (!mb_detect_encoding($name, 'UTF-8', true)) {
          // not a valid UTF-8 string. URL encode it again so it can be safely consumed by the client.
          $name = urlencode($name);
        }
        if (!mb_detect_encoding($val, 'UTF-8', true)) {
          // not a valid UTF-8 string. URL encode it again so it can be safely consumed by the client.
          $val = urlencode($val);
        }
        $request['queryString'][] = array('name' => (string)$name, 'value' => (string)$val);
      }
    }
  }

  if( !strcasecmp(trim($request['method']), 'post') ) {
    $request['postData'] = array();
    $request['postData']['mimeType'] = '';
    $request['postData']['text'] = '';
  }

  $entry['request'] = $request;

  $response = array();
  $response['status'] = (int)$r['responseCode'];
  $response['statusText'] = '';
  $response['headersSize'] = -1;
  $response['bodySize'] = (int)$r['objectSize'];
  $response['headers'] = array();
  $ver = '';
  $loc = '';
  $headersSize = 0;
  if( isset($r['headers']) && isset($r['headers']['response']) ) {
    foreach($r['headers']['response'] as &$header) {
      $headersSize += strlen($header) + 2; // add 2 for the \r\n that is on the raw headers
      $pos = strpos($header, ':');
      if( $pos > 0 ) {
        $name = (string)trim(substr($header, 0, $pos));
        $val = (string)trim(substr($header, $pos + 1));
        if( strlen($name) )
          $response['headers'][] = array('name' => $name, 'value' => $val);

        if( !strcasecmp($name, 'location') )
          $loc = (string)$val;
      } else {
        $pos = strpos($header, 'HTTP/');
        if( $pos >= 0 )
          $ver = (string)trim(substr($header, $pos + 5, 3));
      }
    }
  }
  if ($headersSize)
    $response['headersSize'] = $headersSize;
  $response['httpVersion'] = $ver;
  $response['redirectURL'] = $loc;

  $response['content'] = array();
  $response['content']['size'] = (int)$r['objectSize'];
  if( isset($r['contentType']) && strlen($r['contentType']))
    $response['content']['mimeType'] = (string)$r['contentType'];
  else
    $response['content']['mimeType'] = '';

  // unsupported fields that are required
  $response['cookies'] = array();

  $entry['response'] = $response;

  $entry['cache'] = (object)array();

  $timings = array();
  $timings['blocked'] = -1;
  $timings['dns'] = (int)$r['dns_ms'];
  if( !$timings['dns'])
    $timings['dns'] = -1;

  // HAR did not have an ssl time until version 1.2 .  For
  // backward compatibility, "connect" includes "ssl" time.
  // WepbageTest's internal representation does not assume any
  // overlap, so we must add our connect and ssl time to get the
  // connect time expected by HAR.
  $timings['connect'] = (durationOfInterval($r['connect_ms']) +
      durationOfInterval($r['ssl_ms']));
  if(!$timings['connect'])
    $timings['connect'] = -1;

  $timings['ssl'] = (int)$r['ssl_ms'];
  if (!$timings['ssl'])
    $timings['ssl'] = -1;

  // TODO(skerner): WebpageTest's data model has no way to
  // represent the difference between the states HAR calls
  // send (time required to send HTTP request to the server)
  // and wait (time spent waiting for a response from the server).
  // We lump both into "wait".  Issue 24* tracks this work.  When
  // it is resolved, read the real values for send and wait
  // instead of using the request's TTFB.
  // *: http://code.google.com/p/webpagetest/issues/detail?id=24
  $timings['send'] = 0;
  $timings['wait'] = (int)$r['ttfb_ms'];
  $timings['receive'] = (int)$r['download_ms'];

  $entry['timings'] = $timings;

  // The HAR spec defines time as the sum of the times in the
  // timings object, excluding any unknown (-1) values and ssl
  // time (which is included in "connect", for backward
  // compatibility with tools written before "ssl" was defined
  // in HAR version 1.2).
  $entry['time'] = 0;
  foreach ($timings as $timingKey => $duration) {
    if ($timingKey != 'ssl' && $duration != UNKNOWN_TIME) {
      $entry['time'] += $duration;
    }
  }

  if (array_key_exists('custom_rules', $r)) {
    $entry['_custom_rules'] = $r['custom_rules'];
  }

  // dump all of our metrics into the har data as custom fields
  foreach($r as $name => $value) {
    if (!is_array($value))
      $entry["_$name"] = $value;
  }
  return $entry;
}

/**
* Build the data set
*
* @param mixed $pageData
*/
function BuildHAR(&$pageData, $allRequests, $id, $testPath, $options) {
  $result = array();
  $entries = array();
  $multistep = $options['multistep'] != 0;

  $testInfo = GetTestInfo($id);

  if (isset($testInfo['tester']) && strlen($testInfo['tester'])) {
    $tester = $testInfo['tester'];
  } else {
    $tester = '';
  }

  $result['log'] = array();
  $result['log']['version'] = '1.1';
  $result['log']['creator'] = array(
      'name' => 'WebPagetest',
      'version' => VER_WEBPAGETEST,
      '_tester' => $tester
      );
  $result['log']['pages'] = array();
  foreach ($pageData as $run => $pageRun) {
    foreach ($pageRun as $cached => $data) {
      $cached_text = '';
      if ($cached) {
        $cached_text = '_Cached';
      }
      $steps = array();
      if ($multistep) {
        foreach ($data as $stepName => $stepData) {
          $steps[] = $stepData;
        }
      } else {
        $steps[] = $data;
      }
      if (!array_key_exists('browser', $result['log'])) {
        $result['log']['browser'] = array(
            'name' => $steps[0]['browser_name'],
            'version' => $steps[0]['browser_version']
        );
      }
      if (isset($allRequests)) {
        $requestsByStep = array();
        $runRequests = $allRequests[$run][$cached];
        if ($multistep) {
          foreach ($runRequests as $stepName => $stepRequests) {
            $requestsByStep[] = $stepRequests;
          }
        } else {
          $requestsByStep[] = $runRequests;
        }
      }
      if ($cached)
        $cached_text = '_Cached';
      for ($i = 0; $i < count($steps); $i++) {
        $stepData = $steps[$i];
        if (isset($requestsByStep)) {
          $stepRequests = $requestsByStep[$i];
        }
        // add the page-level ldata to the result
        $pd = BuildHarPage($testPath, $cached, $run, $stepData);
        $result['log']['pages'][] = $pd;
        // now add the object-level data to the result
        $secure = false;
        $haveLocations = false;
        $stepName = isset($stepData['stepName']) ? $stepData['stepName'] : null;
        if (isset($stepRequests)) {
          $requests = $stepRequests;
          fixRequests($requests, $id, $testPath, $run, $cached, $secure, $haveLocations, false, true, null,
              $stepName);

        } else {
          $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false, true, $stepName);
        }
        // add it to the list of entries
        foreach ($requests as $r) {
          $entry = BuildHAREntry($stepData, $pd, $r);
          $entries[] = $entry;
        }
        // add the bodies to the requests
        if (isset($options['bodies']) && $options['bodies']) {
          $bodies_file = $testPath . '/' . $run . $cached_text . '_bodies.zip';
          if (is_file($bodies_file)) {
            $zip = new ZipArchive;
            if ($zip->open($bodies_file) === TRUE) {
              for ($i = 0; $i < $zip->numFiles; $i++) {
                $index = intval($zip->getNameIndex($i), 10) - 1;
                if (array_key_exists($index, $entries))
                  $entries[$index]['response']['content']['text'] = utf8_encode($zip->getFromIndex($i));
              }
            }
          }
        }
      }
    }
  }
  
  $result['log']['entries'] = $entries;

  AddImages($id, $testPath, $result);
  
  return $result;
}

function AddImages($id, $testPath, &$result) {

    // retrieve custom screenshots labels from the output.json
    $labels = getCustomScreenshotsLabels($testPath);
    $labelIndex = 0;
    $labelsCount = count($labels);

    // scan all images in result dir
    $files = scandir($testPath);
    foreach ($files as $file) { 
        $matches = array();

        // visually complete
        if (preg_match('/^(?P<step>\d+)_visuallycomplete_(?P<hash>[a-f0-9]{40})\.jpg$/', $file, $matches) == 1) {
            $page = intval($matches['step']) - 1;
            if (isset($result['log']['pages'][$page]['_pageScreenshots'])) {
                $images = $result['log']['pages'][$page]['_pageScreenshots'];
            } else {
                $images = array();
            }
            $image = array();
            $image['fileName'] = ltrim($testPath, '.') . '/' . basename($file);
            $image['hash'] = $matches['hash'];
            $image['type'] = 'VISUALLY_COMPLETE';
            $image['taken_ms'] = $result['log']['pages'][$page]['_visualComplete'];

            $images[] = $image;
            $result['log']['pages'][$page]['_pageScreenshots'] = $images;
        }

        // Custom image
        if (preg_match('/^(?P<timestamp>\d+)_screenshot_(?P<hash>[a-f0-9]{40})\.jpg$/', $file, $matches) == 1) {
            $time = intval($matches['timestamp']);
            $page = pageFromTimestamp($result, $time);
            if (isset($result['log']['pages'][$page]['_pageScreenshots'])) {
                $images = $result['log']['pages'][$page]['_pageScreenshots'];
            } else {
                $images = array();
            }
            $image = array();
            $image['fileName'] = ltrim($testPath, '.') . '/' . basename($file);
            $image['hash'] = $matches['hash'];
            $image['type'] = 'SCRIPT';
            $image['taken_ms'] = $time - $result['log']['pages'][$page]['_date'] * 1000;

            if ($labelIndex < $labelsCount) {
                $image['label'] = $labels[$labelIndex];
                ++$labelIndex;
            } else {
                $image['label'] = "";
            }


            $images[] = $image;
            $result['log']['pages'][$page]['_pageScreenshots'] = $images;
        }

        // result image
        if (preg_match('/^result_(?P<hash>[a-f0-9]{40})\.jpg$/', $file, $matches) == 1) {
            $image = array();
            $image['fileName'] = ltrim($testPath, '.') . '/' . basename($file);
            $image['hash'] = $matches['hash'];

            $result['log']['_resultScreenshot'] = $image;
        }
    }
}

function pageFromTimestamp(&$result, $time) {
    $pages = $result['log']['pages'];

    for ($i = count($pages) - 1; $i >= 0; $i--) {
        if ($pages[$i]['_date'] * 1000 <= $time) {
            return $i;
        }
    }
}

function getCustomScreenshotsLabels($testPath) {
    $output_file = $testPath . "/output.json.gz";
    $labels = array();
    if (gz_is_file($output_file)) {
        $output = json_decode(gz_file_get_contents($output_file), true);
        if (isset($output['screenshots'])) {
            $labels_obj = $output['screenshots'];
            $labels_obj_count = count($labels_obj);

            if ($labels_obj_count > 0) {
                $len = intval($labels_obj[$labels_obj_count - 1]['id']) + 1;

                // set all labels to empty strings
                $labels = array_pad(array(), $len, "");

                // set label
                foreach ($labels_obj as $l) {
                    $labels[intval($l['id'])] = preg_replace('/\\.[^.\\s]{3,4}$/', '', $l['fileName']);
                }
            }
            
        }
    }

    return $labels;
}
?>
