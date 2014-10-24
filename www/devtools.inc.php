<?php
$DevToolsCacheVersion = '1.7';

if(extension_loaded('newrelic')) { 
    newrelic_add_custom_tracer('GetTimeline');
    newrelic_add_custom_tracer('GetDevToolsRequests');
    newrelic_add_custom_tracer('GetDevToolsEvents');
    newrelic_add_custom_tracer('DevToolsGetConsoleLog');
    newrelic_add_custom_tracer('DevToolsGetCPUSlices');
    newrelic_add_custom_tracer('GetDevToolsCPUTime');
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
* Pull the requests from the dev tools timeline
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
* @param mixed $requests
*/
function GetDevToolsRequests($testPath, $run, $cached, &$requests, &$pageData) {
    $requests = null;
    $pageData = null;
    $startOffset = null;
    $ver = 12;
    $cached = isset($cached) && $cached ? 1 : 0;
    $ok = GetCachedDevToolsRequests($testPath, $run, $cached, $requests, $pageData, $ver);
    if (!$ok) {
      if (GetDevToolsEvents(null, $testPath, $run, $cached, $events, $startOffset)) {
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
                  $pageData['loadTime'] = $pageData['docTime'] = round(($rawPageData['onload'] - $rawPageData['startTime']));
              if (isset($rawPageData['domContentLoadedEventStart'])) {
                $pageData['domContentLoadedEventStart'] = round($rawPageData['domContentLoadedEventStart'] - $rawPageData['startTime']);
                $pageData['domContentLoadedEventEnd'] = isset($rawPageData['domContentLoadedEventEnd']) ?
                    round($rawPageData['domContentLoadedEventEnd'] - $rawPageData['startTime']) :
                    $pageData['domContentLoadedEventStart'];
              }
              if (isset($rawPageData['loadEventStart'])) {
                $pageData['loadEventStart'] = round($rawPageData['loadEventStart'] - $rawPageData['startTime']);
                $pageData['loadEventEnd'] = isset($rawPageData['loadEventEnd']) ?
                    round($rawPageData['loadEventEnd'] - $rawPageData['startTime']) :
                    $pageData['loadEventStart'];
              } else {
                $pageData['loadEventStart'] = $pageData['loadTime'];
                $pageData['loadEventEnd'] = $pageData['loadTime'];
              }
              
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
                    $request['id'] = $rawRequest['id'];

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
                        $request['load_ms'] = round(($rawRequest['endTime'] - $rawRequest['startTime']));
                        $endOffset = round(($rawRequest['endTime'] - $rawPageData['startTime']));
                        if ($endOffset > $pageData['fullyLoaded'])
                            $pageData['fullyLoaded'] = $endOffset;
                    }
                    $request['ttfb_ms'] = array_key_exists('firstByteTime', $rawRequest) ? round(($rawRequest['firstByteTime'] - $rawRequest['startTime'])) : -1;
                    $request['load_start'] = array_key_exists('startTime', $rawRequest) ? round(($rawRequest['startTime'] - $rawPageData['startTime'])) : 0;
                    $request['bytesOut'] = array_key_exists('headers', $rawRequest) ? strlen(implode("\r\n", $rawRequest['headers'])) : 0;
                    $request['bytesIn'] = 0;
                    $request['objectSize'] = '';
                    if (array_key_exists('bytesIn', $rawRequest)) {
                      $request['bytesIn'] = $rawRequest['bytesIn'];
                    } elseif (array_key_exists('bytesInEncoded', $rawRequest) && $rawRequest['bytesInEncoded']) {
                      $request['objectSize'] = $rawRequest['bytesInEncoded'];
                      $request['bytesIn'] = $rawRequest['bytesInEncoded'];
                      if (array_key_exists('response', $rawRequest) && array_key_exists('headersText', $rawRequest['response']))
                          $request['bytesIn'] += strlen($rawRequest['response']['headersText']);
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
                        GetDevToolsHeaderValue($rawRequest['response']['headers'], 'Expires', $request['expires']);
                        GetDevToolsHeaderValue($rawRequest['response']['headers'], 'Cache-Control', $request['cacheControl']);
                        GetDevToolsHeaderValue($rawRequest['response']['headers'], 'Content-Type', $request['contentType']);
                        GetDevToolsHeaderValue($rawRequest['response']['headers'], 'Content-Encoding', $request['contentEncoding']);
                        GetDevToolsHeaderValue($rawRequest['response']['headers'], 'Content-Length', $request['objectSize']);
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
                        $request['ttfb_ms'] = round(($rawRequest['response']['timing']['receiveHeadersEnd'] - $rawRequest['response']['timing']['sendStart']));
                      
                      // add the socket timing
                      if ($request['socket'] !== -1 &&
                        !array_key_exists($request['socket'], $connections)) {
                        $connections[$request['socket']] = $rawRequest['response']['timing'];
                        if (array_key_exists('dnsStart', $rawRequest['response']['timing']) &&
                            $rawRequest['response']['timing']['dnsStart'] >= 0) {
                          $dnsKey = $request['host'];
                          if (!array_key_exists($dnsKey, $dnsTimes)) {
                            $dnsTimes[$dnsKey] = 1;
                            $request['dns_start'] = round(($rawRequest['response']['timing']['dnsStart'] - $rawPageData['startTime']));
                            if (array_key_exists('dnsEnd', $rawRequest['response']['timing']) &&
                                $rawRequest['response']['timing']['dnsEnd'] >= 0)
                              $request['dns_end'] = round(($rawRequest['response']['timing']['dnsEnd'] - $rawPageData['startTime']));
                          }
                        }
                        if (array_key_exists('connectStart', $rawRequest['response']['timing']) &&
                            $rawRequest['response']['timing']['connectStart'] >= 0) {
                          $request['connect_start'] = round(($rawRequest['response']['timing']['connectStart'] - $rawPageData['startTime']));
                          if (array_key_exists('connectEnd', $rawRequest['response']['timing']) &&
                              $rawRequest['response']['timing']['connectEnd'] >= 0)
                            $request['connect_end'] = round(($rawRequest['response']['timing']['connectEnd'] - $rawPageData['startTime']));
                        }
                        if (array_key_exists('sslStart', $rawRequest['response']['timing']) &&
                            $rawRequest['response']['timing']['sslStart'] >= 0) {
                          $request['ssl_start'] = round(($rawRequest['response']['timing']['sslStart'] - $rawPageData['startTime']));
                          if ($request['connect_end'] > $request['ssl_start'])
                            $request['connect_end'] = $request['ssl_start'];
                          if (array_key_exists('sslEnd', $rawRequest['response']['timing']) &&
                              $rawRequest['response']['timing']['sslEnd'] >= 0)
                            $request['ssl_end'] = round(($rawRequest['response']['timing']['sslEnd'] - $rawPageData['startTime']));
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
                          $endOffset = round(($rawRequest['endTime'] - $rawPageData['startTime']));
                          if ($endOffset > $pageData['fullyLoaded'])
                              $pageData['fullyLoaded'] = $endOffset;
                      }
                      if (!array_key_exists('TTFB', $pageData) &&
                          $request['ttfb_ms'] >= 0 &&
                          ($request['responseCode'] == 200 ||
                           $request['responseCode'] == 304)) {
                          $pageData['TTFB'] = $request['load_start'] + $request['ttfb_ms'];
                          if ($request['ssl_end'] >= 0 &&
                              $request['ssl_start'] >= 0) {
                              $pageData['basePageSSLTime'] = $request['ssl_end'] - $request['ssl_start'];
                          }
                      }
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
        if (isset($rawPageData['mainResourceID'])) {
          foreach($requests as $index => &$request) {
            if ($request['id'] == $rawPageData['mainResourceID'])
              $main_request = $index;
          }
          if (isset($main_request)) {
            $requests[$main_request]['final_base_page'] = true;
            $pageData['final_base_page_request'] = $index + 1;
            $pageData['final_base_page_request_id'] = $rawPageData['mainResourceID'];
          }
        }
        $ok = true;
      }
      if ($ok) {
        SaveCachedDevToolsRequests($testPath, $run, $cached, $requests, $pageData, $ver);
      }
    }
    return $ok;
}

function GetCachedDevToolsRequests($testPath, $run, $cached, &$requests, &$pageData, $ver) {
  $ok = false;
  $cacheFile = "$testPath/$run.$cached.devToolsRequests.$ver";
  if (gz_is_file($cacheFile)) {
    $cache = json_decode(gz_file_get_contents($cacheFile), true);
    if (isset($cache[$run][$cached]['requests']) &&
        isset($cache[$run][$cached]['pageData'])) {
      $ok = true;
      $requests = $cache[$run][$cached]['requests'];
      $pageData = $cache[$run][$cached]['pageData'];
    }
  }
  return $ok;
}

function SaveCachedDevToolsRequests($testPath, $run, $cached, &$requests, &$pageData, $ver) {
  $cacheFile = "$testPath/$run.$cached.devToolsRequests.$ver";
  $lock = Lock($cacheFile);
  if (isset($lock)) {
    if (gz_is_file($cacheFile))
      $cache = json_decode(gz_file_get_contents($cacheFile), true);
    if (!isset($cache) || !is_array($cache))
      $cache = array();
    $cache[$run][$cached]['requests'] = $requests;
    $cache[$run][$cached]['pageData'] = $pageData;
    gz_file_put_contents($cacheFile, json_encode($cache));
    Unlock($lock);
  }
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
        if (!isset($main_frame) &&
            $event['method'] == 'Page.frameStartedLoading' &&
            isset($event['frameId'])) {
          $main_frame = $event['frameId'];
        }
        if ($event['method'] == 'Page.frameStartedLoading' &&
            isset($event['frameId']) &&
            isset($main_frame) &&
            $event['frameId'] == $main_frame) {
          $main_resource_id = null;
        }
        if (!isset($main_resource_id) &&
            $event['method'] == 'Network.requestWillBeSent' &&
            isset($event['requestId']) &&
            isset($event['frameId']) &&
            isset($main_frame) &&
            $event['frameId'] == $main_frame) {
          $main_resource_id = $event['requestId'];
        }
        if ($event['method'] == 'Page.loadEventFired' &&
            array_key_exists('timestamp', $event) &&
            $event['timestamp'] > $pageData['onload']) {
          $pageData['onload'] = $event['timestamp'];
        }
        if ($event['method'] == 'Network.requestServedFromCache' &&
            array_key_exists('requestId', $event) &&
            array_key_exists($event['requestId'], $rawRequests)) {
          $rawRequests[$event['requestId']]['fromNet'] = false;
          $rawRequests[$event['requestId']]['fromCache'] = true;
        }
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
                  if (isset($main_resource_id) && $main_resource_id == $originalId)
                    $main_resource_id = $id;
                }
                $request['id'] = $id;
                $rawRequests[$id] = $request;
            } elseif (array_key_exists($id, $rawRequests)) {
                if (!array_key_exists('endTime', $rawRequests[$id]) || 
                    $event['timestamp'] > $rawRequests[$id]['endTime'])
                    $rawRequests[$id]['endTime'] = $event['timestamp'];
                if ($event['method'] == 'Network.dataReceived') {
                    if (!array_key_exists('firstByteTime', $rawRequests[$id]))
                        $rawRequests[$id]['firstByteTime'] = $event['timestamp'];
                    if (!array_key_exists('bytesInData', $rawRequests[$id]))
                        $rawRequests[$id]['bytesInData'] = 0;
                    if (array_key_exists('dataLength', $event))
                        $rawRequests[$id]['bytesInData'] += $event['dataLength'];
                    if (!array_key_exists('bytesInEncoded', $rawRequests[$id]))
                        $rawRequests[$id]['bytesInEncoded'] = 0;
                    if (array_key_exists('encodedDataLength', $event))
                        $rawRequests[$id]['bytesInEncoded'] += $event['encodedDataLength'];
                }
                if ($event['method'] == 'Network.responseReceived' &&
                    array_key_exists('response', $event)) {
                    if (!array_key_exists('firstByteTime', $rawRequests[$id]))
                        $rawRequests[$id]['firstByteTime'] = $event['timestamp'];
                    $rawRequests[$id]['fromNet'] = false;
                    // the timing data for cached resources is completely bogus
                    if (isset($rawRequests[$id]['fromCache']) && isset($event['response']['timing']))
                      unset($event['response']['timing']);
                    // iOS incorrectly sets the fromNet flag to false for resources from cache
                    // but it doesn't have any send headers for those requests
                    // so use that as an indicator.
                    if (array_key_exists('fromDiskCache', $event['response']) &&
                        !$event['response']['fromDiskCache'] &&
                        array_key_exists('headers', $rawRequests[$id]) &&
                        is_array($rawRequests[$id]['headers']) &&
                        count($rawRequests[$id]['headers']) &&
                        !isset($rawRequests[$id]['fromCache'])) {
                      $rawRequests[$id]['fromNet'] = true;
                    }
                    // if we didn't get explicit bytes, fall back to any responses that had
                    // content-length headers
                    if ((!array_key_exists('bytesIn', $rawRequests[$id]) || !$rawRequests[$id]['bytesIn']) &&
                        isset($event['response']['headers']['Content-Length'])) {
                      $rawRequests[$id]['bytesIn'] = $event['response']['headers']['Content-Length'];
                      $rawRequests[$id]['bytesIn'] += strlen(implode("\n", $rawRequests[$id]['headers']));
                    }
                    // adjust the start time
                    if (isset($event['response']['timing']['receiveHeadersEnd']))
                      $rawRequests[$id]['startTime'] = $event['timestamp'] - $event['response']['timing']['receiveHeadersEnd'];
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
                  if (!array_key_exists('response', $rawRequests[$id]) &&
                      !isset($rawRequests[$id]['fromCache'])) {
                    if (!isset($event['canceled']) || !$event['canceled']) {
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
        if ($event['method'] == 'Page.domContentEventFired' &&
            array_key_exists('timestamp', $event) &&
            !isset($pageData['domContentLoadedEventStart'])) {
          $pageData['domContentLoadedEventStart'] = $event['timestamp'];
          $pageData['domContentLoadedEventEnd'] = $event['timestamp'];
        }
        if (isset($main_frame) &&
            $event['method'] == 'Timeline.eventRecorded' &&
            !isset($pageData['domContentLoadedEventStart'])) {
          $eventString = json_encode($event);
          if (strpos($eventString, '"type":"DOMContentLoaded"') !== false &&
              isset($event['record'])) {
            ParseDevToolsDOMContentLoaded($event['record'], $main_frame, $pageData);
          }
        }
    }
    // pull out just the requests that were served on the wire
    foreach ($rawRequests as &$request) {
      if (array_key_exists('startTime', $request)) {
        if (!isset($rawRequests[$id]['fromCache']) && isset($request['response']['timing'])) {
          if (array_key_exists('requestTime', $request['response']['timing']) &&
              array_key_exists('end_time', $request) &&
              $request['response']['timing']['requestTime'] >= $request['startTime'] &&
              $request['response']['timing']['requestTime'] <= $request['endTime'])
              $request['startTime'] = $request['response']['timing']['requestTime'];
          $min = null;
          foreach ($request['response']['timing'] as $key => &$value) {
            if ($key != 'requestTime' && $value >= 0) {
              $value += $request['startTime'];
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
      if (array_key_exists('fromNet', $request) && $request['fromNet']) {
        $requests[] = $request;
      }
    }
    if (isset($main_resource_id))
      $pageData['mainResourceID'] = $main_resource_id;
    $ok = false;
    if (count($requests)) {
        // sort them by start time
        usort($requests, function($a, $b) {
          return $a['startTime'] > $b['startTime'];
        });
        $ok = true;
    }
    return $ok;
}

function ParseDevToolsDOMContentLoaded(&$event, $main_frame, &$pageData) {
  if (isset($event['type']) &&
      $event['type'] == 'EventDispatch' &&
      isset($event['data']['type']) &&
      $event['data']['type'] == 'DOMContentLoaded' &&
      isset($event['frameId']) &&
      $event['frameId'] == $main_frame &&
      isset($event['startTime'])) {
    $pageData['domContentLoadedEventStart'] = $event['startTime'];
    $pageData['domContentLoadedEventEnd'] = isset($event['endTime']) ? $event['endTime'] : $event['startTime'];
  } elseif (isset($event['children'])) {
    foreach($event['children'] as &$child) {
      ParseDevToolsDOMContentLoaded($child, $main_frame, $pageData);
      if (isset($pageData['domContentLoadedEventStart']))
        break;
    }
  }
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
  $hasTimeline = strpos($json, '"Timeline.eventRecorded"') !== false ? true : false;
  $hasTrim = strpos($json, $START_MESSAGE) !== false ? true : false;
  $messages = json_decode($json, true);
  unset($json);

  $firstEvent = null;
  $recording = $hasTrim ? false : true;
  $recordPending = false;
  $events = array();
  $startOffset = null;
  $previousTime = null;
  $clockOffset = null;
  
  // First go and match up the first net event with the matching timeline event
  // to sync the clocks (recent Chrome builds use different clocks)
  if ($hasNet && $hasTimeline) {
    foreach ($messages as $message) {
      if (is_array($message) &&
          isset($message['method']) &&
          isset($message['params']['timestamp']) &&
          isset($message['params']['request']['url']) &&
          strlen($message['params']['request']['url']) &&
          $message['method'] == 'Network.requestWillBeSent') {
        $firstNetEventTime = $message['params']['timestamp'] * 1000.0;
        $firstNetEventURL = json_encode($message['params']['request']['url']);
        break;
      }
    }
    if (isset($firstNetEventTime) && isset($firstNetEventURL)) {
      foreach ($messages as $message) {
        if (is_array($message) &&
            isset($message['method']) &&
            isset($message['params']['record']['startTime']) &&
            $message['method'] == 'Timeline.eventRecorded') {
          $json = json_encode($message);
          if (strpos($json, $firstNetEventURL) !== false) {
            $timelineEventTime = $message['params']['record']['startTime'];
            $firstEvent = $timelineEventTime;
            break;
          }
        }
      }
    }
    if (isset($firstNetEventTime) && isset($timelineEventTime)) {
      $clockOffset = $timelineEventTime - $firstNetEventTime;
      $firstEvent = min($firstEvent, $firstNetEventTime + $clockOffset);
    }
  }
  
  if (!$firstEvent && ($hasTimeline || $hasNet)) {
    foreach ($messages as $message) {
      if (is_array($message) && isset($message['method'])) {
        $eventTime = DevToolsEventTime($message);
        if ($hasTimeline) {
          $json = json_encode($message);
          if (strpos($json, '"type":"Resource') !== false) {
            $firstEvent = $eventTime;
            break;
          }
        } else {
          $method_class = substr($message['method'], 0, strpos($message['method'], '.'));
          if ($eventTime && $method_class === 'Network') {
            $firstEvent = $eventTime * 1000.0;
            break;
          }
        }
      }
    }
  }
  
  foreach ($messages as $message) {
    if (is_array($message)) {
      if (isset($message['params']['timestamp'])) {
        $message['params']['timestamp'] *= 1000.0;
        if (isset($clockOffset))
          $message['params']['timestamp'] += $clockOffset;
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
          if ($hasTrim && !isset($startOffset) && $firstEvent) {
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
  if (isset($event['params']['record']['startTime'])) {
    $time = $event['params']['record']['startTime'];
  }
  elseif (isset($event['params']['timestamp'])) {
    $time = $event['params']['timestamp'];
  }
  elseif (isset($event['params']['message']['timestamp'])) {
    $time = $event['params']['message']['timestamp'];
  }
  return $time;
}

function DevToolsEventEndTime(&$event) {
  $time = null;
  if (isset($event['params']['record']['endTime'])) {
    $time = $event['params']['record']['endTime'];
  } elseif (isset($event['params']['timestamp'])) {
    $time = $event['params']['timestamp'];
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
  if (isset($event['method']) && isset($event['params'])) {
    if (isset($startTime) && $startTime) {
      $time = DevToolsEventTime($event);
      if (isset($time) && $time &&
          ($time < $startTime ||
          $time - $startTime > 600000 ||
          (isset($endTime) && $endTime && $time > $endTime)))
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
          if ($method_class === 'Timeline') {
            $encoded = json_encode($event);
            $eventTime = DevToolsEventEndTime($event);
            if ($eventTime &&
                (!$startTime || $eventTime <= $startTime) &&
                (!$lastPaint || $eventTime > $lastPaint)) {
              if (strpos($encoded, '"type":"ResourceSendRequest"') !== false)
                $startTime = DevToolsEventTime($event);
              if (strpos($encoded, '"type":"Rasterize"') !== false ||
                  strpos($encoded, '"type":"CompositeLayers"') !== false ||
                  strpos($encoded, '"type":"Paint"') !== false) {
                $lastPaint = $eventTime;
              }
            }
            if ($eventTime > $lastEvent &&
                strpos($encoded, '"type":"Resource') !== false)
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
function DevToolsGetCPUSlices($testPath, $run, $cached) {
  $count = 0;
  $slices = null;
  $devTools = array();
  $startOffset = null;
  $ver = 1;
  $cacheFile = "$testPath/$run.$cached.devToolsCPUSlices.$ver";
  if (gz_is_file($cacheFile))
    $slices = json_decode(gz_file_get_contents($cacheFile), true);
  if (!isset($slices)) {
    GetTimeline($testPath, $run, $cached, $devTools, $startOffset);
    if (isset($devTools) && is_array($devTools) && count($devTools)) {
      // Do a first pass to get the start and end times as well as the number of threads
      $threads = array(0 => true);
      $startTime = 0;
      $endTime = 0;
      foreach ($devTools as &$entry) {
        if (isset($entry['method']) &&
            $entry['method'] == 'Timeline.eventRecorded' &&
            isset($entry['params']['record'])) {
          $start = DevToolsEventTime($entry);
          if ($start && (!$startTime || $start < $startTime))
            $startTime = $start;
          $end = DevToolsEventEndTime($entry);
          if ($end && (!$endTime || $end > $endTime))
            $endTime = $end;
          $thread = isset($entry['params']['record']['thread']) ? $entry['params']['record']['thread'] : 0;
          $threads[$thread] = true;
        }
      }
      
      // create time slice arrays for each thread
      $slices = array();
      foreach ($threads as $id => $bogus)
        $slices[$id] = array();
        
      // create 1ms time slices for the full time
      if ($endTime > $startTime) {
        $startTime = floor($startTime);
        $endTime = ceil($endTime);
        for ($i = $startTime; $i <= $endTime; $i++) {
          $ms = intval($i - $startTime);
          foreach ($threads as $id => $bogus)
            $slices[$id][$ms] = array();
        }

        // Go through each element and account for the time    
        foreach ($devTools as &$entry) {
          if (isset($entry['method']) &&
              $entry['method'] == 'Timeline.eventRecorded' &&
              isset($entry['params']['record'])) {
            $count += DevToolsGetEventTimes($entry['params']['record'], $startTime, $slices);
          }
        }
      }
    }
    
    if ($count) {
      // remove any threads that didn't have actual slices populated
      $emptyThreads = array();
      foreach ($slices as $thread => &$records) {
        $is_empty = true;
        foreach($records as $ms => &$values) {
          if (count($values)) {
            $is_empty = false;
            break;
          }
        }
        if ($is_empty)
          $emptyThreads[] = $thread;
      }
      if (count($emptyThreads)) {
        foreach($emptyThreads as $thread)
          unset($slices[$thread]);
      }
      gz_file_put_contents($cacheFile, json_encode($slices));
    } else {
      $slices = null;
    }
  }
    
  return $slices;
}

function DevToolsAdjustSlice(&$slice, $amount, $type, $parentType) {

  if ($type && $amount) {
    if ($amount == 1.0) {
      foreach($slice as $sliceType => $value)
        $slice[$sliceType] = 0;
    } elseif (isset($parentType)) {
        $slice[$parentType] = max(0, $slice[$parentType] - $amount);
    }
    $slice[$type] = $amount;
  }
}

/**
* Break out all of the individual times of an event and it's children
* 
* @param mixed $entry
*/
function DevToolsGetEventTimes(&$record, $startTime, &$slices, $thread = null, $parentType = null) {
  $count = 0;
  if (array_key_exists('startTime', $record) &&
      array_key_exists('endTime', $record) &&
      array_key_exists('type', $record)) {
    $start = $record['startTime'];
    $end = $record['endTime'];
    $type = $record['type'];
    if (!isset($thread))
      $thread = array_key_exists('thread', $record) ? $record['thread'] : 0;
    
    if ($end && $start && $end > $start) {
      // check to make sure it spans at least more than 1ms
      $startWhole = ceil($start);
      $endWhole = floor($end);
      if ($endWhole >= $startWhole) {
        // set the time slices for this event
        for ($i = $startWhole; $i <= $endWhole; $i++) {
          $ms = intval($i - $startTime);
          DevToolsAdjustSlice($slices[$thread][$ms], 1.0, $type, $parentType);
          $count++;
        }
        $elapsed = $startWhole - $start;
        if ($elapsed > 0) {
          $ms = intval(floor($start) - $startTime);
          DevToolsAdjustSlice($slices[$thread][$ms], $elapsed, $type, $parentType);
          $count++;
        }
        $elapsed = $end - $endWhole;
        if ($elapsed > 0) {
          $ms = intval(ceil($end) - $startTime);
          DevToolsAdjustSlice($slices[$thread][$ms], $elapsed, $type, $parentType);
          $count++;
        }
        // recursively process any child events
        if (array_key_exists('children', $record) && count($record['children'])) {
          foreach($record['children'] as &$child)
            $count += DevToolsGetEventTimes($child, $startTime, $slices, $thread, $type);
        }
      } else {
        $elapsed = $end - $start;
        if ($elapsed < 1 && $elapsed > 0) {
          $ms = intval(floor($start) - $startTime);
          DevToolsAdjustSlice($slices[$thread][$ms], $elapsed, $type, $parentType);
          $count++;
        }
      }
    }
  }
  return $count;
}

/**
* Scan through the array of headers and find the requested header.
* We have to scan because they are case-insensitive.
* 
* @param mixed $headers
* @param mixed $name
*/
function GetDevToolsHeaderValue($headers, $name, &$value) {
  foreach ($headers as $key => $headerValue) {
    if (!strcasecmp($name, $key)) {
      $value = $headerValue;
      break;
    }
  }
}

function GetDevToolsCPUTime($testPath, $run, $cached, $endTime = 0) {
  $times = null;
  // If an end time wasn't specified, figure out what the fully loaded time is
  if (!$endTime) {
    if (GetDevToolsRequests($testPath, $run, $cached, $requests, $pageData) &&
        isset($pageData) && is_array($pageData) && isset($pageData['fullyLoaded'])) {
      $endTime = $pageData['fullyLoaded'];
    }
  }
  $slices = DevToolsGetCPUSlices($testPath, $run, $cached);
  if (isset($slices) && is_array($slices) && isset($slices[0]) &&
      is_array($slices[0]) && count($slices[0])) {
    $times = array('Idle' => 0.0);
    foreach ($slices[0] as $ms => $breakdown) {
      if (!$endTime || $ms < $endTime) {
        $idle = 1.0;
        if (isset($breakdown) && is_array($breakdown) && count($breakdown)) {
          foreach($breakdown as $event => $ms_time) {
            if (!isset($times[$event]))
              $times[$event] = 0;
            $times[$event] += $ms_time;
            $idle -= $ms_time;
          }
        }
        $times['Idle'] += $idle;
      }
    }
    // round the times to the nearest millisecond
    $total = 0;
    foreach ($times as $event => &$val) {
      $val = round($val);
      if ($event !== 'Idle')
        $total += $val;
    }
    if ($endTime && $endTime > $total)
      $times['Idle'] = $endTime - $total;
  }
  return $times;
}

?>
