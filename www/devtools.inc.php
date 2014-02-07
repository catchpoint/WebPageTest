<?php
$DevToolsCacheVersion = '1.6';

if(extension_loaded('newrelic')) { 
    newrelic_add_custom_tracer('GetCachedDevToolsProgress');
    newrelic_add_custom_tracer('GetDevToolsProgress');
    newrelic_add_custom_tracer('GetTimeline');
    newrelic_add_custom_tracer('GetDevToolsRequests');
    newrelic_add_custom_tracer('GetDevToolsEvents');
    newrelic_add_custom_tracer('DevToolsGetConsoleLog');
}

/**
* Calculate the visual progress and speed index from the dev tools timeline trace
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function GetDevToolsProgress($testPath, $run, $cached) {
    $progress = GetCachedDevToolsProgress($testPath, $run, $cached);
    if (!isset($progress) || !is_array($progress)) {
      $completed = false;
      if( gz_is_file("$testPath/testinfo.json") ) {
        $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
        if (array_key_exists('completed', $testInfo) && strlen($testInfo['completed']))
          $completed = true;
      }
      $startOffset = null;
      if (GetTimeline($testPath, $run, $cached, $timeline, $startOffset)) {
        $cachedText = '';
        if( $cached )
            $cachedText = '_Cached';
        $console_log_file = "$testPath/$run{$cachedText}_console_log.json";
        $console_log = array();
        $progress = array();
        $startTime = 0;
        $fullScreen = 0;
        $regions = array();
        $viewport = null;
        if (DevToolsHasLayout($timeline, $viewport)) {
          $didLayout = false;
          $didReceiveResponse = false;
        } else {
          $didLayout = true;
          $didReceiveResponse = true;
        }
        $startTimes = array();
        $progress['processing'] = array();
        foreach($timeline as &$entry) {
            if (array_key_exists('method', $entry)) {
              if (array_key_exists('params', $entry) &&
                  !array_key_exists($entry['method'], $startTimes)) {
                if (array_key_exists('timestamp', $entry['params']))
                  $startTimes[$entry['method']] = $entry['params']['timestamp'] * 1000;
                elseif (array_key_exists('record', $entry['params']) &&
                        array_key_exists('startTime', $entry['params']['record']))
                  $startTimes[$entry['method']] = $entry['params']['record']['startTime'];
              }
            } elseif (array_key_exists('timestamp', $entry) &&
              !array_key_exists('timestamp', $startTimes))
              $startTimes['timestamp'] = $entry['timestamp'];
            $frame = '0';
            ProcessPaintEntry($entry, $fullScreen, $regions, $frame, $didLayout, $didReceiveResponse, $viewport);
            GetTimelineProcessingTimes($entry, $progress['processing'], $processing_start, $processing_end);
            if (DevToolsMatchEvent('Console.messageAdded', $entry) &&
                array_key_exists('message', $entry['params']) &&
                is_array($entry['params']['message']))
                $console_log[] = $entry['params']['message'];
        }
        if (!gz_is_file($console_log_file))
          gz_file_put_contents($console_log_file, json_encode($console_log));
        if (count($progress['processing'])) {
          $proc_total = 0.0;
          foreach($progress['processing'] as $type => &$procTime) {
            $proc_total += $procTime;
            $procTime = intval(round($procTime));
          }
          $progress['processing']['Idle'] = 0;
          if (isset($processing_start) &&
              isset($processing_end) &&
              $processing_end > $processing_start) {
            $proc_elapsed = $processing_end - $processing_start;
            if ($proc_elapsed > $proc_total)
              $progress['processing']['Idle'] = intval(round($proc_elapsed - $proc_total));
          }
        } else
          unset($progress['processing']);
        foreach($startTimes as $time) {
          if (!$startTime || $time < $startTime)
            $startTime = $time;
        }
        $regionCount = count($regions);
        if ($regionCount) {
            $paintEvents = array();
            $total = 0.0;
            foreach($regions as $name => &$region) {
                $area = $region['width'] * $region['height'];
                $updateCount = floatval(count($region['times']));
                $incrementalImpact = floatval($area) / $updateCount;
                // only count full screen paints for half their value
                if ($area == $fullScreen)
                    $incrementalImpact /= 2;
                foreach($region['times'] as $time) {
                    $total += $incrementalImpact;
                    $elapsed = (int)($time - $startTime);
                    if (!array_key_exists($elapsed, $paintEvents))
                        $paintEvents[$elapsed] = $incrementalImpact;
                    else
                        $paintEvents[$elapsed] += $incrementalImpact;
                }
            }
            if (count($paintEvents)) {
                ksort($paintEvents, SORT_NUMERIC);
                $current = 0.0;
                $lastTime = 0.0;
                $lastProgress = 0.0;
                $progress['SpeedIndex'] = 0.0;
                $progress['VisuallyComplete'] = 0;
                $progress['StartRender'] = 0;
                $progress['VisualProgress'] = array();
                foreach($paintEvents as $time => $increment) {
                    $current += $increment;
                    $currentProgress = floatval(floatval($current) / floatval($total));
                    $currentProgress = floatval(round($currentProgress * 100) / 100.0);
                    $elapsed = $time - $lastTime;
                    $siIncrement = floatval($elapsed) * (1.0 - $lastProgress);
                    $progress['SpeedIndex'] += $siIncrement;
                    $progress['VisualProgress'][$time] = $currentProgress;
                    $progress['VisuallyComplete'] = $time;
                    if (!$progress['StartRender'])
                        $progress['StartRender'] = $time;
                    $lastProgress = $currentProgress;
                    $lastTime = $time;
                    if ($currentProgress >= 1.0)
                        break;
                }
            }
        }
        if ($completed && isset($progress) && is_array($progress))
            SavedCachedDevToolsProgress($testPath, $run, $cached, $progress);
      }
    }
    return $progress;
}  

/**
* Load the timeline data for the given test run (from a timeline file or a raw dev tools dump)
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
* @param mixed $timeline
*/
function GetTimeline($testPath, $run, $cached, &$timeline, &$startOffset) {
    $ok = false;
    $cachedText = '';
    if( $cached )
        $cachedText = '_Cached';
    $timelineFile = "$testPath/$run{$cachedText}_devtools.json";
    if (!gz_is_file($timelineFile))
        $timelineFile = "$testPath/$run{$cachedText}_timeline.json";
    if (gz_is_file($timelineFile)){
      $timeline = array();
      $raw = gz_file_get_contents($timelineFile);
      ParseDevToolsEvents($raw, $timeline, null, false, $startOffset);
      if (isset($timeline) && is_array($timeline) && count($timeline))
          $ok = true;
    }
    return $ok;
}

/**
* Pull out the paint entries from the timeline data and group them by the region being painted
* 
* @param mixed $entry
* @param mixed $startTime
* @param mixed $fullScreen
* @param mixed $regions
*/
function ProcessPaintEntry(&$entry, &$fullScreen, &$regions, $frame, &$didLayout, &$didReceiveResponse, $viewport) {
    $ret = false;
    if (isset($entry) && is_array($entry)) {
        $hadPaintChildren = false;
        if (!$didReceiveResponse &&
            array_key_exists('type', $entry) &&
            !strcasecmp($entry['type'], 'ResourceReceiveResponse')) {
            $didReceiveResponse = true;
        }
        if ($didReceiveResponse &&
            !$didLayout &&
            array_key_exists('type', $entry) &&
            !strcasecmp($entry['type'], 'Layout')) {
            $didLayout = true;
        }
        if (array_key_exists('frameId', $entry))
            $frame = $entry['frameId'];
        if (array_key_exists('params', $entry) && array_key_exists('record', $entry['params']))
            ProcessPaintEntry($entry['params']['record'], $fullScreen, $regions, $frame, $didLayout, $didReceiveResponse, $viewport);
        if(array_key_exists('children', $entry) &&
           is_array($entry['children'])) {
            foreach($entry['children'] as &$child)
                if (ProcessPaintEntry($child, $fullScreen, $regions, $frame, $didLayout, $didReceiveResponse, $viewport))
                    $hadPaintChildren = true;
        } 
        if (array_key_exists('type', $entry) &&
          !strcasecmp($entry['type'], 'Paint') &&
          array_key_exists('data', $entry)) {
          if (array_key_exists('clip', $entry['data'])) {
            $entry['data']['x'] = $entry['data']['clip'][0];
            $entry['data']['y'] = $entry['data']['clip'][1];
            $entry['data']['width'] = $entry['data']['clip'][4] - $entry['data']['clip'][0];
            $entry['data']['height'] = $entry['data']['clip'][5] - $entry['data']['clip'][1];
          }
          if (array_key_exists('width', $entry['data']) &&
              array_key_exists('height', $entry['data']) &&
              array_key_exists('x', $entry['data']) &&
              array_key_exists('y', $entry['data']) &&
              ClipPaintRectToViewport($entry['data'], $viewport)) {
            $ret = true;
            $area = $entry['data']['width'] * $entry['data']['height'];
            if ($area > $fullScreen)
                $fullScreen = $area;
            if ($didLayout && $didReceiveResponse && !$hadPaintChildren) {
                $paintEvent = $entry['data'];
                $paintEvent['endTime'] = $entry['endTime'];
                $paintEvent['startTime'] = $entry['startTime'];
                $regionName = "$frame:{$paintEvent['x']},{$paintEvent['y']} - {$paintEvent['width']}x{$paintEvent['height']}";
                if (!array_key_exists($regionName, $regions)) {
                    $regions[$regionName] = $paintEvent;
                    $regions[$regionName]['times'] = array();
                }
                $regions[$regionName]['times'][] = $entry['endTime'];
            }
          }
        }
    }
    return $ret;
}

/**
* Clip the provided paint rect to the viewport and return true if the resulting rect is valid
* 
* @param mixed $paintRect
* @param mixed $viewport
*/
function ClipPaintRectToViewport(&$paintRect, $viewport) {
  $isInside = true;
  if (isset($viewport)) {
    $isInside = false;
    $left = max($paintRect['x'], $viewport['x']);
    $top = max($paintRect['y'], $viewport['y']);
    $right = min($paintRect['x'] + $paintRect['width'], $viewport['x'] + $viewport['width']);
    $bottom = min($paintRect['y'] + $paintRect['height'], $viewport['y'] + $viewport['height']);
    if ($right > $left && $bottom > $top) {
      $paintRect['x'] = $left;
      $paintRect['y'] = $top;
      $paintRect['width'] = $right - $left;
      $paintRect['height'] = $bottom - $top;
      $isInside = true;
    }
  }
  return $isInside;
}

/**
* Load a cached version of the calculated visual progress if it exists
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function GetCachedDevToolsProgress($testPath, $run, $cached) {
    global $DevToolsCacheVersion;
    $progress = null;
    if (gz_is_file("$testPath/devToolsProgress.json")) {
        $cache = json_decode(gz_file_get_contents("$testPath/devToolsProgress.json"), true);
        if (isset($cache) && is_array($cache)) {
            if (array_key_exists('version', $cache) &&
                $cache['version'] == $DevToolsCacheVersion) {
                $key = "$run.$cached";
                if (array_key_exists($key, $cache))
                    $progress = $cache[$key];
            } else {
                if (is_file("$testPath/devToolsProgress.json"))
                    unlink("$testPath/devToolsProgress.json");
                if (is_file("$testPath/devToolsProgress.json.gz"))
                    unlink("$testPath/devToolsProgress.json.gz");
            }
        }
    }
    return $progress;
}

/**
* Save the cached visual progress to disk
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
* @param mixed $progress
*/
function SavedCachedDevToolsProgress($testPath, $run, $cached, $progress) {
    $key = "$run.$cached";
    $cache = null;
    global $DevToolsCacheVersion;
    if (gz_is_file("$testPath/devToolsProgress.json"))
        $cache = json_decode(gz_file_get_contents("$testPath/devToolsProgress.json"), true);
    if (!isset($cache) ||
        !is_array($cache) ||
        !array_key_exists('version', $cache) ||
        $cache['version'] != $DevToolsCacheVersion)
        $cache = array('version' => $DevToolsCacheVersion);
    $cache[$key] = $progress;
    gz_file_put_contents("$testPath/devToolsProgress.json", json_encode($cache));
}

/**
* Pull the requests from the dev tools timeline
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
* @param mixed $requests
*/
function GetDevToolsRequests($testPath, $run, $cached, &$requests, &$pageData) {
    $ok = false;
    $requests = null;
    $pageData = null;
    $startOffset = null;
    if (GetDevToolsEvents(array('Page.', 'Network.'), $testPath, $run, $cached, $events, $startOffset)) {
        if (DevToolsFilterNetRequests($events, $rawRequests, $rawPageData)) {
            $requests = array();
            $pageData = array();

            // initialize the page data records
            $pageData['loadTime'] = 0;
            $pageData['docTime'] = 0;
            $pageData['fullyLoaded'] = 0;
            $pageData['bytesOut'] = 0;
            $pageData['bytesOutDoc'] = 0;
            $pageData['bytesIn'] = 0;
            $pageData['bytesInDoc'] = 0;
            $pageData['requests'] = 0;
            $pageData['requestsDoc'] = 0;
            $pageData['responses_200'] = 0;
            $pageData['responses_404'] = 0;
            $pageData['responses_other'] = 0;
            $pageData['result'] = 0;
            $pageData['testStartOffset'] = isset($startOffset) && $startOffset > 0 ? $startOffset : 0;
            $pageData['cached'] = $cached;
            $pageData['optimization_checked'] = 0;
            $pageData['start_epoch'] = $rawPageData['startTime'];
            if (array_key_exists('onload', $rawPageData))
                $pageData['loadTime'] = $pageData['docTime'] = round(($rawPageData['onload'] - $rawPageData['startTime']) * 1000);
            
            // go through and pull out the requests, calculating the page stats as we go
            $connections = array();
            $dnsTimes = array();
            foreach($rawRequests as &$rawRequest) {
              if (array_key_exists('url', $rawRequest)) {
                $parts = parse_url($rawRequest['url']);
                if (isset($parts) &&
                    is_array($parts) &&
                    array_key_exists('host', $parts) &&
                    array_key_exists('path', $parts)) {
                  $request = array();
                  $request['ip_addr'] = '';
                  $request['method'] = array_key_exists('method', $rawRequest) ? $rawRequest['method'] : '';
                  $request['host'] = '';
                  $request['url'] = '';
                  $request['full_url'] = '';
                  $request['is_secure'] = 0;
                  $request['full_url'] = $rawRequest['url'];
                  $request['host'] = $parts['host'];
                  $request['url'] = $parts['path'];
                  if (array_key_exists('query', $parts) && strlen($parts['query']))
                    $request['url'] .= '?' . $parts['query'];
                  if ($parts['scheme'] == 'https')
                    $request['is_secure'] = 1;

                  $request['responseCode'] = array_key_exists('response', $rawRequest) && array_key_exists('status', $rawRequest['response']) ? $rawRequest['response']['status'] : -1;
                  if (array_key_exists('errorCode', $rawRequest))
                      $request['responseCode'] = $rawRequest['errorCode'];
                  $request['load_ms'] = -1;
                  if (array_key_exists('response', $rawRequest) &&
                      array_key_exists('timing', $rawRequest['response']) &&
                      array_key_exists('sendStart', $rawRequest['response']['timing']) &&
                      $rawRequest['response']['timing']['sendStart'] >= 0)
                      $rawRequest['startTime'] = $rawRequest['response']['timing']['sendStart'];
                  if (array_key_exists('endTime', $rawRequest)) {
                      $request['load_ms'] = round(($rawRequest['endTime'] - $rawRequest['startTime']) * 1000);
                      $endOffset = round(($rawRequest['endTime'] - $rawPageData['startTime']) * 1000);
                      if ($endOffset > $pageData['fullyLoaded'])
                          $pageData['fullyLoaded'] = $endOffset;
                  }
                  $request['ttfb_ms'] = array_key_exists('firstByteTime', $rawRequest) ? round(($rawRequest['firstByteTime'] - $rawRequest['startTime']) * 1000) : -1;
                  $request['load_start'] = array_key_exists('startTime', $rawRequest) ? round(($rawRequest['startTime'] - $rawPageData['startTime']) * 1000) : 0;
                  $request['bytesOut'] = array_key_exists('headers', $rawRequest) ? strlen(implode("\r\n", $rawRequest['headers'])) : 0;
                  $request['bytesIn'] = 0;
                  $request['objectSize'] = '';
                  if (array_key_exists('bytesIn', $rawRequest)) {
                    $request['bytesIn'] = $rawRequest['bytesIn'];
                  } elseif (array_key_exists('bytesInData', $rawRequest)) {
                    $request['objectSize'] = $rawRequest['bytesInData'];
                    $request['bytesIn'] = $rawRequest['bytesInData'];
                    if (array_key_exists('response', $rawRequest) && array_key_exists('headersText', $rawRequest['response']))
                        $request['bytesIn'] += strlen($rawRequest['response']['headersText']);
                  }
                  $request['expires'] = '';
                  $request['cacheControl'] = '';
                  $request['contentType'] = '';
                  $request['contentEncoding'] = '';
                  if (array_key_exists('response', $rawRequest) && 
                      array_key_exists('headers', $rawRequest['response'])) {
                      if (array_key_exists('Expires', $rawRequest['response']['headers']))
                          $request['expires'] =  $rawRequest['response']['headers']['Expires'];
                      if (array_key_exists('Cache-Control', $rawRequest['response']['headers']))
                          $request['cacheControl'] =  $rawRequest['response']['headers']['Cache-Control'];
                      if (array_key_exists('Content-Type', $rawRequest['response']['headers']))
                          $request['contentType'] =  $rawRequest['response']['headers']['Content-Type'];
                      if (array_key_exists('Content-Encoding', $rawRequest['response']['headers']))
                          $request['contentEncoding'] =  $rawRequest['response']['headers']['Content-Encoding'];
                      if (array_key_exists('Content-Length', $rawRequest['response']['headers']))
                          $request['objectSize'] =  $rawRequest['response']['headers']['Content-Length'];
                  }
                  $request['type'] = 3;
                  $request['socket'] = array_key_exists('response', $rawRequest) && array_key_exists('connectionId', $rawRequest['response']) ? $rawRequest['response']['connectionId'] : -1;
                  $request['dns_start'] = -1;
                  $request['dns_end'] = -1;
                  $request['connect_start'] = -1;
                  $request['connect_end'] = -1;
                  $request['ssl_start'] = -1;
                  $request['ssl_end'] = -1;
                  if (array_key_exists('response', $rawRequest) &&
                      array_key_exists('timing', $rawRequest['response'])) {
                    if (array_key_exists('sendStart', $rawRequest['response']['timing']) &&
                        array_key_exists('receiveHeadersEnd', $rawRequest['response']['timing']) &&
                        $rawRequest['response']['timing']['receiveHeadersEnd'] >= $rawRequest['response']['timing']['sendStart'])
                      $request['ttfb_ms'] = round(($rawRequest['response']['timing']['receiveHeadersEnd'] - $rawRequest['response']['timing']['sendStart']) * 1000);
                    
                    // add the socket timing
                    if ($request['socket'] !== -1 &&
                      !array_key_exists($request['socket'], $connections)) {
                      $connections[$request['socket']] = $rawRequest['response']['timing'];
                      if (array_key_exists('dnsStart', $rawRequest['response']['timing']) &&
                          $rawRequest['response']['timing']['dnsStart'] >= 0) {
                        $dnsKey = $request['host'];
                        if (!array_key_exists($dnsKey, $dnsTimes)) {
                          $dnsTimes[$dnsKey] = 1;
                          $request['dns_start'] = round(($rawRequest['response']['timing']['dnsStart'] - $rawPageData['startTime']) * 1000);
                          if (array_key_exists('dnsEnd', $rawRequest['response']['timing']) &&
                              $rawRequest['response']['timing']['dnsEnd'] >= 0)
                            $request['dns_end'] = round(($rawRequest['response']['timing']['dnsEnd'] - $rawPageData['startTime']) * 1000);
                        }
                      }
                      if (array_key_exists('connectStart', $rawRequest['response']['timing']) &&
                          $rawRequest['response']['timing']['connectStart'] >= 0) {
                        $request['connect_start'] = round(($rawRequest['response']['timing']['connectStart'] - $rawPageData['startTime']) * 1000);
                        if (array_key_exists('connectEnd', $rawRequest['response']['timing']) &&
                            $rawRequest['response']['timing']['connectEnd'] >= 0)
                          $request['connect_end'] = round(($rawRequest['response']['timing']['connectEnd'] - $rawPageData['startTime']) * 1000);
                      }
                      if (array_key_exists('sslStart', $rawRequest['response']['timing']) &&
                          $rawRequest['response']['timing']['sslStart'] >= 0) {
                        $request['ssl_start'] = round(($rawRequest['response']['timing']['sslStart'] - $rawPageData['startTime']) * 1000);
                        if ($request['connect_end'] > $request['ssl_start'])
                          $request['connect_end'] = $request['ssl_start'];
                        if (array_key_exists('sslEnd', $rawRequest['response']['timing']) &&
                            $rawRequest['response']['timing']['sslEnd'] >= 0)
                          $request['ssl_end'] = round(($rawRequest['response']['timing']['sslEnd'] - $rawPageData['startTime']) * 1000);
                      }
                    }
                  }
                  $request['initiator'] = '';
                  $request['initiator_line'] = '';
                  $request['initiator_column'] = '';
                  if (array_key_exists('initiator', $rawRequest)) {
                      if (array_key_exists('url', $rawRequest['initiator']))
                          $request['initiator'] = $rawRequest['initiator']['url'];
                      if (array_key_exists('lineNumber', $rawRequest['initiator']))
                          $request['initiator_line'] = $rawRequest['initiator']['lineNumber'];
                  }
                  $request['server_rtt'] = null;
                  $request['headers'] = array('request' => array(), 'response' => array());
                  if (array_key_exists('response', $rawRequest) &&
                      array_key_exists('requestHeadersText', $rawRequest['response'])) {
                      $request['headers']['request'] = array();
                      $headers = explode("\n", $rawRequest['response']['requestHeadersText']);
                      foreach($headers as $header) {
                          $header = trim($header);
                          if (strlen($header))
                              $request['headers']['request'][] = $header;
                      }
                  } elseif (array_key_exists('response', $rawRequest) &&
                      array_key_exists('requestHeaders', $rawRequest['response'])) {
                      $request['headers']['request'] = array();
                      foreach($rawRequest['response']['requestHeaders'] as $key => $value)
                          $request['headers']['request'][] = "$key: $value";
                  } elseif (array_key_exists('headers', $rawRequest)) {
                      $request['headers']['request'] = array();
                      foreach($rawRequest['headers'] as $key => $value)
                          $request['headers']['request'][] = "$key: $value";
                  }
                  if (array_key_exists('response', $rawRequest) &&
                      array_key_exists('headersText', $rawRequest['response'])) {
                      $request['headers']['response'] = array();
                      $headers = explode("\n", $rawRequest['response']['headersText']);
                      foreach($headers as $header) {
                          $header = trim($header);
                          if (strlen($header))
                              $request['headers']['response'][] = $header;
                      }
                  } elseif (array_key_exists('response', $rawRequest) &&
                      array_key_exists('headers', $rawRequest['response'])) {
                      $request['headers']['response'] = array();
                      foreach($rawRequest['response']['headers'] as $key => $value)
                          $request['headers']['response'][] = "$key: $value";
                  }

                  // unsupported fields
                  $request['score_cache'] = -1;
                  $request['score_cdn'] = -1;
                  $request['score_gzip'] = -1;
                  $request['score_cookies'] = -1;
                  $request['score_keep-alive'] = -1;
                  $request['score_minify'] = -1;
                  $request['score_combine'] = -1;
                  $request['score_compress'] = -1;
                  $request['score_etags'] = -1;
                  $request['dns_ms'] = -1;
                  $request['connect_ms'] = -1;
                  $request['ssl_ms'] = -1;
                  $request['gzip_total'] = null;
                  $request['gzip_save'] = null;
                  $request['minify_total'] = null;
                  $request['minify_save'] = null;
                  $request['image_total'] = null;
                  $request['image_save'] = null;
                  $request['cache_time'] = null;
                  $request['cdn_provider'] = null;
                  $request['server_count'] = null;
                  
                  // make SURE it is a valid request
                  $valid = true;
                  if (array_key_exists('load_ms', $request) &&
                      array_key_exists('ttfb_ms', $request) &&
                      $request['load_ms'] < $request['ttfb_ms'])
                    $valid = false;
                  
                  if ($valid) {
                    // page-level stats
                    if (!array_key_exists('URL', $pageData) && strlen($request['full_url']))
                        $pageData['URL'] = $request['full_url'];
                    if (array_key_exists('endTime', $rawRequest)) {
                        $endOffset = round(($rawRequest['endTime'] - $rawPageData['startTime']) * 1000);
                        if ($endOffset > $pageData['fullyLoaded'])
                            $pageData['fullyLoaded'] = $endOffset;
                    }
                    if (!array_key_exists('TTFB', $pageData) &&
                        $request['ttfb_ms'] >= 0 &&
                        ($request['responseCode'] == 200 ||
                         $request['responseCode'] == 304))
                        $pageData['TTFB'] = $request['load_start'] + $request['ttfb_ms'];
                    $pageData['bytesOut'] += $request['bytesOut'];
                    $pageData['bytesIn'] += $request['bytesIn'];
                    $pageData['requests']++;
                    if ($request['load_start'] < $pageData['docTime']) {
                        $pageData['bytesOutDoc'] += $request['bytesOut'];
                        $pageData['bytesInDoc'] += $request['bytesIn'];
                        $pageData['requestsDoc']++;
                    }
                    if ($request['responseCode'] == 200)
                        $pageData['responses_200']++;
                    elseif ($request['responseCode'] == 404) {
                        $pageData['responses_404']++;
                        $pageData['result'] = 99999;
                    } else
                        $pageData['responses_other']++;
                    
                    $requests[] = $request;
                  }
                }
              }
            }
            $pageData['connections'] = count($connections);
        }
    }
    if (count($requests)) {
      if ($pageData['responses_200'] == 0) {
        if (array_key_exists('responseCode', $requests[0]))
          $pageData['result'] = $requests[0]['responseCode'];
        else
          $pageData['result'] = 12999;
      }
      $ok = true;
    }
    return $ok;
}

/**
* Convert the raw timeline events into just the network events we care about
* 
* @param mixed $events
* @param mixed $requests
*/
function DevToolsFilterNetRequests($events, &$requests, &$pageData) {
    $pageData = array('startTime' => 0, 'onload' => 0, 'endTime' => 0);
    $requests = array();
    $rawRequests = array();
    $idMap = array();
    foreach ($events as $event) {
        if ($event['method'] == 'Page.loadEventFired' &&
            array_key_exists('timestamp', $event) &&
            $event['timestamp'] > $pageData['onload'])
            $pageData['onload'] = $event['timestamp'];
        if (array_key_exists('timestamp', $event) &&
            array_key_exists('requestId', $event)) {
            $originalId = $id = $event['requestId'];
            if (array_key_exists($id, $idMap))
              $id .= '-' . $idMap[$id];
            if ($event['method'] == 'Network.requestWillBeSent' &&
                array_key_exists('request', $event) &&
                array_key_exists('url', $event['request']) &&
                stripos($event['request']['url'], 'http') === 0 &&
                parse_url($event['request']['url']) !== false) {
                $request = $event['request'];
                $request['startTime'] = $event['timestamp'];
                $request['endTime'] = $event['timestamp'];
                if (array_key_exists('initiator', $event))
                    $request['initiator'] = $event['initiator'];
                // redirects re-use the same request ID
                if (array_key_exists($id, $rawRequests)) {
                  if (array_key_exists('redirectResponse', $event)) {
                    if (!array_key_exists('endTime', $rawRequests[$id]) || 
                        $event['timestamp'] > $rawRequests[$id]['endTime'])
                        $rawRequests[$id]['endTime'] = $event['timestamp'];
                    if (!array_key_exists('firstByteTime', $rawRequests[$id]))
                        $rawRequests[$id]['firstByteTime'] = $event['timestamp'];
                    $rawRequests[$id]['fromNet'] = false;
                    // iOS incorrectly sets the fromNet flag to false for resources from cache
                    // but it doesn't have any send headers for those requests
                    // so use that as an indicator.
                    if (array_key_exists('fromDiskCache', $event['redirectResponse']) &&
                        !$event['redirectResponse']['fromDiskCache'] &&
                        array_key_exists('headers', $rawRequests[$id]) &&
                        is_array($rawRequests[$id]['headers']) &&
                        count($rawRequests[$id]['headers']))
                        $rawRequests[$id]['fromNet'] = true;
                    $rawRequests[$id]['response'] = $event['redirectResponse'];
                  }
                  $count = 0;
                  if (array_key_exists($originalId, $idMap))
                    $count = $idMap[$originalId];
                  $idMap[$originalId] = $count + 1;
                  $id = "{$originalId}-{$idMap[$originalId]}";
                }
                $request['id'] = $id;
                $rawRequests[$id] = $request;
            } elseif (array_key_exists($id, $rawRequests)) {
                if ($event['method'] == 'Network.dataReceived') {
                    if (!array_key_exists('firstByteTime', $rawRequests[$id]))
                        $rawRequests[$id]['firstByteTime'] = $event['timestamp'];
                    if (!array_key_exists('bytesInData', $rawRequests[$id]))
                        $rawRequests[$id]['bytesInData'] = 0;
                    if (array_key_exists('encodedDataLength', $event) && $event['encodedDataLength'])
                        $rawRequests[$id]['bytesInData'] += $event['encodedDataLength'];
                    elseif (array_key_exists('dataLength', $event) && $event['dataLength'])
                        $rawRequests[$id]['bytesInData'] += $event['dataLength'];
                }
                if ($event['method'] == 'Network.responseReceived' &&
                    array_key_exists('response', $event)) {
                    if (!array_key_exists('endTime', $rawRequests[$id]) || 
                        $event['timestamp'] > $rawRequests[$id]['endTime'])
                        $rawRequests[$id]['endTime'] = $event['timestamp'];
                    if (!array_key_exists('firstByteTime', $rawRequests[$id]))
                        $rawRequests[$id]['firstByteTime'] = $event['timestamp'];
                    $rawRequests[$id]['fromNet'] = false;
                    // iOS incorrectly sets the fromNet flag to false for resources from cache
                    // but it doesn't have any send headers for those requests
                    // so use that as an indicator.
                    if (array_key_exists('fromDiskCache', $event['response']) &&
                        !$event['response']['fromDiskCache'] &&
                        array_key_exists('headers', $rawRequests[$id]) &&
                        is_array($rawRequests[$id]['headers']) &&
                        count($rawRequests[$id]['headers']))
                        $rawRequests[$id]['fromNet'] = true;
                    // if we didn't get explicit bytes, fall back to any responses that had
                    // content-length headers
                    if ((!array_key_exists('bytesIn', $rawRequests[$id]) || !$rawRequests[$id]['bytesIn']) &&
                        array_key_exists('response', $event) &&
                        is_array($event['response']) &&
                        array_key_exists('headers', $event['response']) &&
                        is_array($event['response']['headers']) &&
                        array_key_exists('Content-Length', $event['response']['headers'])) {
                      $rawRequests[$id]['bytesIn'] = $event['response']['headers']['Content-Length'];
                      $rawRequests[$id]['bytesIn'] += strlen(implode("\n", $rawRequests[$id]['headers']));
                    }
                    $rawRequests[$id]['response'] = $event['response'];
                }
                if ($event['method'] == 'Network.loadingFinished') {
                    if (!array_key_exists('firstByteTime', $rawRequests[$id]))
                        $rawRequests[$id]['firstByteTime'] = $event['timestamp'];
                    if (!array_key_exists('endTime', $rawRequests[$id]) || 
                        $event['timestamp'] > $rawRequests[$id]['endTime'])
                        $rawRequests[$id]['endTime'] = $event['timestamp'];
                }
                if ($event['method'] == 'Network.loadingFailed') {
                  if (!array_key_exists('response', $rawRequests[$id])) {
                    $rawRequests[$id]['fromNet'] = true;
                    $rawRequests[$id]['errorCode'] = 12999;
                    if (!array_key_exists('firstByteTime', $rawRequests[$id]))
                        $rawRequests[$id]['firstByteTime'] = $event['timestamp'];
                    if (!array_key_exists('endTime', $rawRequests[$id]) || 
                        $event['timestamp'] > $rawRequests[$id]['endTime'])
                        $rawRequests[$id]['endTime'] = $event['timestamp'];
                    if (array_key_exists('errorText', $event))
                        $rawRequests[$id]['error'] = $event['errorText'];
                    if (array_key_exists('error', $event))
                        $rawRequests[$id]['errorCode'] = $event['error'];
                  }
                }
            }
        }
    }
    // pull out just the requests that were served on the wire
    foreach ($rawRequests as &$request) {
        if (array_key_exists('startTime', $request)) {
          if (array_key_exists('response', $request) &&
              array_key_exists('timing', $request['response'])) {
              if (array_key_exists('requestTime', $request['response']['timing']) &&
                  array_key_exists('end_time', $request) &&
                  $request['response']['timing']['requestTime'] >= $request['startTime'] &&
                  $request['response']['timing']['requestTime'] <= $request['endTime'])
                  $request['startTime'] = $request['response']['timing']['requestTime'];
              $min = null;
              foreach ($request['response']['timing'] as $key => &$value) {
                if ($key != 'requestTime' && $value >= 0) {
                  $value = $request['startTime'] + ($value / 1000);
                  if (!isset($min) || $value < $min)
                    $min = $value;
                }
              }
              if (isset($min) && $min > $request['startTime'])
                $request['startTime'] = $min;
          }
          if (array_key_exists('startTime', $request) &&
              (!$pageData['startTime'] ||
               $request['startTime'] < $pageData['startTime']))
              $pageData['startTime'] = $request['startTime'];
        }
        if (array_key_exists('endTime', $request) &&
            (!$pageData['endTime'] ||
             $request['endTime'] > $pageData['endTime']))
            $pageData['endTime'] = $request['endTime'];
        if (array_key_exists('fromNet', $request) &&
            $request['fromNet'])
            $requests[] = $request;
    }
    $ok = false;
    if (count($requests))
        $ok = true;
    return $ok;
}

/**
* Load a filtered list of events from the dev tools capture
* 
* @param mixed $filter
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
* @param mixed $events
*/
function GetDevToolsEvents($filter, $testPath, $run, $cached, &$events, &$startOffset) {
  $ok = false;
  $events = array();
  $cachedText = '';
  if( $cached )
      $cachedText = '_Cached';
  $devToolsFile = "$testPath/$run{$cachedText}_devtools.json";
  if (gz_is_file($devToolsFile)){
    $raw = gz_file_get_contents($devToolsFile);
    ParseDevToolsEvents($raw, $events, $filter, true, $startOffset);
  }
  if (count($events))
      $ok = true;
  return $ok;
}

/**
* Parse and trim raw timeline data.
* Remove everything before the first non-timeline event.
* 
* @param mixed $json
* @param mixed $events
*/
function ParseDevToolsEvents(&$json, &$events, $filter, $removeParams, &$startOffset) {
  $START_MESSAGE = '"WPT start"';
  $STOP_MESSAGE = '"WPT stop"';
  $hasNet = strpos($json, '"Network.') !== false ? true : false;
  $hasTrim = strpos($json, $START_MESSAGE) !== false ? true : false;
  $messages = json_decode($json, true);
  unset($json);

  $firstEvent = null;
  $recording = $hasTrim ? false : true;
  $recordPending = false;
  $events = array();
  $startOffset = null;
  
  foreach ($messages as $message) {
    if (is_array($message)) {
      // See if we got the first valid event in the trace (throw away the timeline
      // events at the beginning that are from video capture starting).
      if ($hasNet) {
        if (!$firstEvent && array_key_exists('method', $message) && $message['method'] !== 'Timeline.eventRecorded') {
          $eventTime = DevToolsEventTime($message);
          $firstEvent = isset($eventTime) ? $eventTime : 0;
        }
      } elseif (!$firstEvent) {
        $eventTime = DevToolsEventTime($message);
        $firstEvent = isset($eventTime) ? $eventTime : 0;
      }
      
      // see if we are waiting for the first net message after a WPT Start
      if  ($recordPending && array_key_exists('method', $message)) {
        $method_class = substr($message['method'], 0, strpos($message['method'], '.'));
        if ($method_class === 'Network' || $method_class === 'Page') {
          $recordPending = false;
          $recording = true;
        }
      }

      // see if we got a stop message (do this before capture so we don't include it)
      if ($recording && $hasTrim) {
        $encoded = json_encode($message);
        if (strpos($encoded, $STOP_MESSAGE) !== false)
          $recording = false;
      }

      // keep any events that we need to keep
      if ($recording && isset($firstEvent)) {
        if (DevToolsMatchEvent($filter, $message, $firstEvent)) {
          if (!isset($startOffset) && $firstEvent) {
            $eventTime = DevToolsEventTime($message);
            if ($eventTime) {
              $startOffset = $eventTime - $firstEvent;
            }
          }

          if ($removeParams && array_key_exists('params', $message)) {
            $event = $message['params'];
            $event['method'] = $message['method'];
            $events[] = $event;
          } else {
            $events[] = $message;
          }
        }
      }
                    
      // see if we got a start message (do this after capture so we don't include it)
      if (!$recording && !$recordPending && $hasTrim) {
        $encoded = json_encode($message);
        if (strpos($encoded, $START_MESSAGE) !== false)
          $recordPending = true;
      }
    }
  }  
}

function DevToolsEventTime(&$event) {
  $time = null;
  if (is_array($event) &&
      array_key_exists('params', $event) &&
      is_array($event['params'])) {
    if (array_key_exists('record', $event['params']) &&
        is_array($event['params']['record']) &&
        array_key_exists('startTime', $event['params']['record']))
      $time = floatval($event['params']['record']['startTime']);
    elseif (array_key_exists('timestamp', $event['params']))
      $time = floatval($event['params']['timestamp']) * 1000.0;
    elseif (array_key_exists('message', $event['params']) && array_key_exists('timestamp', $event['params']['message']))
      $time = floatval($event['params']['message']['timestamp']) * 1000.0;
  }
  return $time;
}

function DevToolsEventEndTime(&$event) {
  $time = null;
  if (is_array($event) &&
      array_key_exists('params', $event) &&
      is_array($event['params'])) {
    if (array_key_exists('record', $event['params']) &&
        is_array($event['params']['record']) &&
        array_key_exists('endTime', $event['params']['record']))
      $time = floatval($event['params']['record']['endTime']);
    elseif (array_key_exists('timestamp', $event['params']))
      $time = floatval($event['params']['timestamp']) * 1000.0;
  }
  return $time;
}

function DevToolsIsValidNetRequest(&$event) {
  $isValid = false;

  if (array_key_exists('method', $event) &&
      $event['method'] == 'Network.requestWillBeSent' &&
      array_key_exists('params', $event) &&
      is_array($event['params']) &&
      array_key_exists('request', $event['params']) &&
      is_array($event['params']['request']) &&
      array_key_exists('url', $event['params']['request']) &&
      !strncmp('http', $event['params']['request']['url'], 4) &&
      parse_url($event['params']['request']['url']) !== false)
    $isValid = true;
    
  return $isValid;
}

function DevToolsIsNetRequest(&$event) {
  $isValid = false;
  if (array_key_exists('method', $event)) {
    if ($event['method'] == 'Network.requestWillBeSent')
      $isValid = true;
    elseif ($event['method'] == 'Timeline.eventRecorded') {
      $NET_REQUEST = ',"type":"ResourceSendRequest",';
      $encoded = json_encode($event);
      if (strpos($encoded, $NET_REQUEST) !== false)
        $isValid = true;
    }
  }
  return $isValid;
}

function FindNextNetworkRequest(&$events, $startTime) {
  $netTime = null;
  foreach ($events as &$event) {
    $eventTime = DevToolsEventTime($event);
    if (isset($eventTime) &&
        $eventTime >= $startTime &&
        (!isset($netTime) || $eventTime < $netTime) &&
        DevToolsIsNetRequest($event)) {
      $netTime = $eventTime;
    }
  }
  if (!isset($netTime))
    $netTime = $startTime;
  return $netTime;
}

function DevToolsMatchEvent($filter, &$event, $startTime = null, $endTime = null) {
  $match = true;
  if (is_array($event) &&
      array_key_exists('method', $event) &&
      array_key_exists('params', $event)) {
    if (isset($startTime) && $startTime) {
      $time = DevToolsEventEndTime($event);
      if ($time < $startTime || (isset($endTime) && $endTime && $time >= $endTime))
        $match = false;
    }
    if ($match && isset($filter)) {
        $match = false;
        if (is_string($filter)) {
            if (stripos($event['method'], $filter) !== false)
                $match = true;
        } elseif(is_array($filter)) {
            foreach($filter as $str) {
                if (stripos($event['method'], $str) !== false) {
                    $match = true;
                    break;
                }
            }
        }
    }
  }
  return $match;
}

/**
* See if there are layout and network events in the trace
* 
* @param mixed $timeline
*/
function DevToolsHasLayout(&$timeline, &$viewport) {
  $hasLayout = false;
  $hasResponse = false;
  $ret = false;
  foreach ($timeline as &$entry) {
    DevToolsEventHasLayout($entry, $hasLayout, $hasResponse, $viewport);
    if ($hasLayout && $hasResponse) {
      $ret = true;
      break;
    }
  }
  return $ret;
}

/**
* Recursively check the given event for layout or response
* 
* @param mixed $event
*/
function DevToolsEventHasLayout(&$entry, &$hasLayout, &$hasResponse, &$viewport) {
  if (isset($entry) && is_array($entry)) {
      if (!$hasResponse &&
          array_key_exists('type', $entry) &&
          !strcasecmp($entry['type'], 'ResourceReceiveResponse')) {
          $hasResponse = true;
      }
      if ($hasResponse &&
          !$hasLayout &&
          array_key_exists('type', $entry) &&
          !strcasecmp($entry['type'], 'Layout')) {
          if (array_key_exists('data', $entry) &&
              is_array($entry['data']) &&
              array_key_exists('partialLayout', $entry['data'])) {
            if (!$entry['data']['partialLayout']) {
              if (array_key_exists('root', $entry['data'])) {
                $x = $entry['data']['root'][0];
                $y = $entry['data']['root'][1];
                $width = $entry['data']['root'][2] - $x;
                $height = $entry['data']['root'][5] - $y;
                if ($width > 0 && $height > 0) {
                  $hasLayout = true;
                  $viewport = array('x' => $x, 'y' => $y, 'width' => $width, 'height' => $height);
                }
              } else
                $hasLayout = true;
            }
          } else
            $hasLayout = true;
      }
      if (array_key_exists('params', $entry) && array_key_exists('record', $entry['params']))
          DevToolsEventHasLayout($entry['params']['record'], $hasLayout, $hasResponse, $viewport);
      if(array_key_exists('children', $entry) &&
         is_array($entry['children'])) {
          foreach($entry['children'] as &$child)
              DevToolsEventHasLayout($child, $hasLayout, $hasResponse, $viewport);
      } 
  }
}

function DevToolsGetConsoleLog($testPath, $run, $cached) {
  $console_log = null;
  $cachedText = '';
  if( $cached )
      $cachedText = '_Cached';
  $console_log_file = "$testPath/$run{$cachedText}_console_log.json";
  if (gz_is_file($console_log_file))
      $console_log = json_decode(gz_file_get_contents($console_log_file), true);
  elseif (gz_is_file("$testPath/$run{$cachedText}_devtools.json")) {
    $console_log = array();
    $startOffset = null;
    if (GetDevToolsEvents('Console.messageAdded', $testPath, $run, $cached, $events, $startOffset) &&
          is_array($events) &&
          count($events)) {
      foreach ($events as $event) {
        if (is_array($event) &&
            array_key_exists('message', $event) &&
            is_array($event['message']))
            $console_log[] = $event['message'];
      }
    }
    gz_file_put_contents($console_log_file, json_encode($console_log));
  }
  return $console_log;
}

/**
* Get the processing times by event type
* 
* @param mixed $entry
* @param mixed $processingTimes
*/
function GetTimelineProcessingTimes(&$entry, &$processingTimes, &$processing_start, &$processing_end) {
  $duration = 0;
  if (array_key_exists('type', $entry)) {
    $type = trim($entry['type']);
    if (array_key_exists('endTime', $entry) &&
        array_key_exists('startTime', $entry) &&
        $entry['endTime'] >= $entry['startTime']) {
      $duration = $entry['endTime'] - $entry['startTime'];
      if (!isset($processing_start) || $entry['startTime'] < $processing_start)
        $processing_start = $entry['startTime'];
      if (!isset($processing_end) || $entry['endTime'] > $processing_end)
        $processing_end = $entry['startTime'];
    }
    if (array_key_exists('children', $entry) &&
        is_array($entry['children']) &&
        count($entry['children'])) {
      $childTime = 0;
      foreach($entry['children'] as &$child)
        $childTime += GetTimelineProcessingTimes($child, $processingTimes, $processing_start, $processing_end);
      if ($childTime < $duration) {
        $selfTime = $duration - $childTime;
        if (array_key_exists($type, $processingTimes))
          $processingTimes[$type] += $selfTime;
        else
          $processingTimes[$type] = $selfTime;
      }
    } elseif ($duration) {
      if (array_key_exists($type, $processingTimes))
        $processingTimes[$type] += $duration;
      else
        $processingTimes[$type] = $duration;
    }
  }
  if (array_key_exists('params', $entry) && array_key_exists('record', $entry['params']))
      GetTimelineProcessingTimes($entry['params']['record'], $processingTimes, $processing_start, $processing_end);
  return $duration;
}

/**
* Get the baseline start time in dev tools time for the given data.
* 
* The start time is the time of the first non-timeline event.
* 
* @param mixed $entries
*/
function GetDevToolsStartTime(&$entries) {
  $startOffset = null;
  foreach ($entries as &$entry) {
    if (isset($entry) &&
        is_array($entry) &&
        array_key_exists('method', $entry) &&
        $entry['method'] !== 'Timeline.eventRecorded') {
      $eventTime = DevToolsEventTime($entry);
      if ($eventTime && (!$startOffset || $eventTime < $startOffset)) {
        $startOffset = $eventTime;
      }
    }
  }    
  return $startOffset;
}

/**
* Get the relative offset for the video capture (in milliseconds).
* This is the time between the first non-timeline event and the
* last paint or rasterize event prior to it.
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function DevToolsGetVideoOffset($testPath, $run, $cached, &$endTime) {
  $offset = 0;
  $endTime = 0;
  $lastEvent = 0;
  $cachedText = '';
  if( $cached )
      $cachedText = '_Cached';
  $devToolsFile = "$testPath/$run{$cachedText}_devtools.json";
  if (gz_is_file($devToolsFile)){
    $events = json_decode(gz_file_get_contents($devToolsFile), true);
    if (is_array($events)) {
      $lastPaint = 0;
      $startTime = 0;
      foreach ($events as &$event) {
        if (is_array($event) && array_key_exists('method', $event)) {
          $method_class = substr($event['method'], 0, strpos($event['method'], '.'));
          
          // calculate the start time stuff
          if (!$startTime && ($method_class === 'Page' || $method_class === 'Network'))
            $startTime = DevToolsEventTime($event);
          if ($method_class === 'Timeline') {
            $eventTime = DevToolsEventEndTime($event);
            if ($eventTime &&
                (!$startTime || $eventTime <= $startTime) &&
                (!$lastPaint || $eventTime > $lastPaint)) {
              $encoded = json_encode($event);
              if (strpos($encoded, '"type":"Rasterize"') !== false ||
                  strpos($encoded, '"type":"CompositeLayers"') !== false ||
                  strpos($encoded, '"type":"Paint"') !== false) {
                $lastPaint = $eventTime;
              }
            }
          }
          
          // keep track of the last activity for the end time (for video)
          if ($method_class === 'Page' || $method_class === 'Network') {
            $eventTime = DevToolsEventEndTime($event);
            if ($eventTime > $lastEvent)
              $lastEvent = $eventTime;
          }
        }
      }
    }
  }
  
  if ($startTime && $lastPaint && $lastPaint < $startTime)
    $offset = round($startTime - $lastPaint);
  
  if ($startTime && $lastEvent && $lastEvent > $startTime)
    $endTime = ceil($lastEvent - $startTime);
    
  return $offset;
}

/**
* If we have a timeline, figure out what each thread was doing at each point in time.
* Basically CPU utilization from the timeline.
* 
* returns an array of threads with each thread being an array of slices (one for
* each time period).  Each slice is an array of events and the fraction of that
* slice that they consumed (with a total maximum of 1 for any slice).
*/
function DevToolsGetCPUSlices($testPath, $run, $cached, $slice_count, $end_ms) {
  $slices = null;
  $devTools = array();
  $startOffset = null;
  GetTimeline($testPath, $run, $cached, $devTools, $startOffset);
  if (isset($devTools) && is_array($devTools) && count($devTools)) {
    $timeline = array();
    // do a quick pass to see if we have non-timeline entries and
    // to get the timestamp of the first non-timeline entry
    foreach ($devTools as &$entry) {
      if (isset($entry) &&
          is_array($entry) &&
          array_key_exists('method', $entry) &&
          $entry['method'] == 'Timeline.eventRecorded' &&
          array_key_exists('params', $entry) &&
          is_array($entry['params']) &&
          array_key_exists('record', $entry['params']) &&
          is_array($entry['params']['record'])) {
        $times = DevToolsGetEventTimes($entry['params']['record']);
        if ($times) {
        }
        unset($times);
      }
    }
  }
  return $slices;
}

/**
* Break out all of the individual times of an event and it's children
* 
* @param mixed $entry
*/
function DevToolsGetEventTimes(&$record) {
  $times = null;
  
  if (array_key_exists('startTime', $record) &&
      array_key_exists('endTime', $record) &&
      array_key_exists('type', $record)) {
      $times = array();
      $start = $record['startTime'];
      $end = $record['endTime'];
      $type = $record['type'];
      if (array_key_exists('children', $record) && count($record['children'])) {
        $children_times = array();
        foreach($record['children'] as &$child) {
          $child_times = DevToolsGetEventTimes($child);
          if (isset($child_times)) {
            $children_times += $child_times;
          }
        }
      }
      
      if (isset($children_times) && count($children_times)) {
        ksort($children_times, SORT_NUMERIC);
        $firstStart = key($children_times);
        $times[$start] = array('start' => $start, 'end' => $firstStart, 'type' => $type);
        $times += $children_times;
        $lastEnd = end($children_times)['end'];
        $times[$lastEnd] = array('start' => $lastEnd, 'end' => $end, 'type' => $type);
      } else {
        $times[$start] = array('start' => $start, 'end' => $end, 'type' => $type);
      }
  }
  
  return $times;
}
?>
