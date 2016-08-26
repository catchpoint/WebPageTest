<?php
$DevToolsCacheVersion = '1.7';
require_once __DIR__ . '/include/TestPaths.php';

if(extension_loaded('newrelic')) { 
    newrelic_add_custom_tracer('GetTimeline');
    newrelic_add_custom_tracer('GetDevToolsRequests');
    newrelic_add_custom_tracer('GetDevToolsEventsForStep');
    newrelic_add_custom_tracer('DevToolsGetConsoleLog');
    newrelic_add_custom_tracer('DevToolsGetCPUSlicesForStep');
    newrelic_add_custom_tracer('GetDevToolsCPUTime');
    newrelic_add_custom_tracer('ParseDevToolsEvents');
    newrelic_add_custom_tracer('DevToolsMatchEvent');
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
  // TODO: remove function if not needed anymore and the version below is used everywhere
  $localPaths = new TestPaths($testPath, $run, $cached);
  return GetDevToolsRequestsForStep($localPaths, $requests, $pageData);
}

/**
 * Pull the requests from the dev tools timeline
 *
 * @param TestPaths $localPaths Paths for the run or step to get the data for
 * @param array $requests Gets set with the request data if successful
 * @param array $pageData Gets set with the page data if successful
 * @return bool True if successful, false otherwise
 */
function GetDevToolsRequestsForStep($localPaths, &$requests, &$pageData) {
    $requests = null;
    $pageData = null;
    $startOffset = null;
    $ver = 13;
    $ok = GetCachedDevToolsRequests($localPaths, $requests, $pageData, $ver);
    if (!$ok) {
      if (GetDevToolsEventsForStep(null, $localPaths, $events, $startOffset)) {
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
              $pageData['cached'] = $localPaths->isCachedResult();
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
                    $request['method'] = isset($rawRequest['method']) ? $rawRequest['method'] : '';
                    $request['host'] = '';
                    $request['url'] = '';
                    $request['full_url'] = '';
                    $request['is_secure'] = 0;
                    $request['full_url'] = $rawRequest['url'];
                    $request['host'] = $parts['host'];
                    $request['url'] = $parts['path'];
                    if (isset($parts['query']) && strlen($parts['query']))
                      $request['url'] .= '?' . $parts['query'];
                    if ($parts['scheme'] == 'https')
                      $request['is_secure'] = 1;
                    $request['id'] = $rawRequest['id'];

                    $request['responseCode'] = isset($rawRequest['response']['status']) ? $rawRequest['response']['status'] : -1;
                    if (isset($rawRequest['errorCode']))
                        $request['responseCode'] = $rawRequest['errorCode'];
                    $request['load_ms'] = -1;
                    if (isset($rawRequest['response']['timing']['sendStart']) &&
                        $rawRequest['response']['timing']['sendStart'] >= 0)
                        $rawRequest['startTime'] = $rawRequest['response']['timing']['sendStart'];
                    if (isset($rawRequest['endTime'])) {
                        $request['load_ms'] = round(($rawRequest['endTime'] - $rawRequest['startTime']));
                        $endOffset = round(($rawRequest['endTime'] - $rawPageData['startTime']));
                        if ($endOffset > $pageData['fullyLoaded'])
                            $pageData['fullyLoaded'] = $endOffset;
                    }
                    $request['ttfb_ms'] = isset($rawRequest['firstByteTime']) ? round(($rawRequest['firstByteTime'] - $rawRequest['startTime'])) : -1;
                    $request['load_start'] = isset($rawRequest['startTime']) ? round(($rawRequest['startTime'] - $rawPageData['startTime'])) : 0;
                    $request['bytesOut'] = isset($rawRequest['headers']) ? strlen(implode("\r\n", $rawRequest['headers'])) : 0;
                    $request['bytesIn'] = 0;
                    $request['objectSize'] = '';
                    if (isset($rawRequest['bytesIn'])) {
                      $request['bytesIn'] = $rawRequest['bytesIn'];
                    } elseif (isset($rawRequest['bytesInEncoded']) && $rawRequest['bytesInEncoded']) {
                      $request['objectSize'] = $rawRequest['bytesInEncoded'];
                      $request['bytesIn'] = $rawRequest['bytesInEncoded'];
                      if (isset($rawRequest['response']['headersText']))
                          $request['bytesIn'] += strlen($rawRequest['response']['headersText']);
                    } elseif (isset($rawRequest['bytesInData'])) {
                      $request['objectSize'] = $rawRequest['bytesInData'];
                      $request['bytesIn'] = $rawRequest['bytesInData'];
                      if (isset($rawRequest['response']['headersText']))
                          $request['bytesIn'] += strlen($rawRequest['response']['headersText']);
                    }
                    $request['expires'] = '';
                    $request['cacheControl'] = '';
                    $request['contentType'] = '';
                    $request['contentEncoding'] = '';
                    if (isset($rawRequest['response']['headers'])) {
                        GetDevToolsHeaderValue($rawRequest['response']['headers'], 'Expires', $request['expires']);
                        GetDevToolsHeaderValue($rawRequest['response']['headers'], 'Cache-Control', $request['cacheControl']);
                        GetDevToolsHeaderValue($rawRequest['response']['headers'], 'Content-Type', $request['contentType']);
                        GetDevToolsHeaderValue($rawRequest['response']['headers'], 'Content-Encoding', $request['contentEncoding']);
                        GetDevToolsHeaderValue($rawRequest['response']['headers'], 'Content-Length', $request['objectSize']);
                    }
                    $request['type'] = 3;
                    $request['socket'] = isset($rawRequest['response']['connectionId']) ? $rawRequest['response']['connectionId'] : -1;
                    $request['dns_start'] = -1;
                    $request['dns_end'] = -1;
                    $request['connect_start'] = -1;
                    $request['connect_end'] = -1;
                    $request['ssl_start'] = -1;
                    $request['ssl_end'] = -1;
                    if (isset($rawRequest['response']['timing'])) {
                      if (isset($rawRequest['response']['timing']['sendStart']) &&
                          isset($rawRequest['response']['timing']['receiveHeadersEnd']) &&
                          $rawRequest['response']['timing']['receiveHeadersEnd'] >= $rawRequest['response']['timing']['sendStart'])
                        $request['ttfb_ms'] = round(($rawRequest['response']['timing']['receiveHeadersEnd'] - $rawRequest['response']['timing']['sendStart']));
                      
                      // add the socket timing
                      if ($request['socket'] !== -1 &&
                        !array_key_exists($request['socket'], $connections)) {
                        $connections[$request['socket']] = $rawRequest['response']['timing'];
                        if (isset($rawRequest['response']['timing']['dnsStart']) &&
                            $rawRequest['response']['timing']['dnsStart'] >= 0) {
                          $dnsKey = $request['host'];
                          if (!array_key_exists($dnsKey, $dnsTimes)) {
                            $dnsTimes[$dnsKey] = 1;
                            $request['dns_start'] = round(($rawRequest['response']['timing']['dnsStart'] - $rawPageData['startTime']));
                            if (isset($rawRequest['response']['timing']['dnsEnd']) &&
                                $rawRequest['response']['timing']['dnsEnd'] >= 0)
                              $request['dns_end'] = round(($rawRequest['response']['timing']['dnsEnd'] - $rawPageData['startTime']));
                          }
                        }
                        if (isset($rawRequest['response']['timing']['connectStart']) &&
                            $rawRequest['response']['timing']['connectStart'] >= 0) {
                          $request['connect_start'] = round(($rawRequest['response']['timing']['connectStart'] - $rawPageData['startTime']));
                          if (isset($rawRequest['response']['timing']['connectEnd']) &&
                              $rawRequest['response']['timing']['connectEnd'] >= 0)
                            $request['connect_end'] = round(($rawRequest['response']['timing']['connectEnd'] - $rawPageData['startTime']));
                        }
                        if (isset($rawRequest['response']['timing']['sslStart']) &&
                            $rawRequest['response']['timing']['sslStart'] >= 0) {
                          $request['ssl_start'] = round(($rawRequest['response']['timing']['sslStart'] - $rawPageData['startTime']));
                          if ($request['connect_end'] > $request['ssl_start'])
                            $request['connect_end'] = $request['ssl_start'];
                          if (isset($rawRequest['response']['timing']['sslEnd']) &&
                              $rawRequest['response']['timing']['sslEnd'] >= 0)
                            $request['ssl_end'] = round(($rawRequest['response']['timing']['sslEnd'] - $rawPageData['startTime']));
                        }
                      }
                    }
                    $request['initiator'] = '';
                    $request['initiator_line'] = '';
                    $request['initiator_column'] = '';
                    if (isset($rawRequest['initiator']['url'])) {
                      $request['initiator'] = $rawRequest['initiator']['url'];
                      if (isset($rawRequest['initiator']['lineNumber']))
                        $request['initiator_line'] = $rawRequest['initiator']['lineNumber'];
                    }
                    if (isset($rawRequest['initialPriority'])) {
                      $request['priority'] = $rawRequest['initialPriority'];
                    }
                    $request['server_rtt'] = null;
                    $request['headers'] = array('request' => array(), 'response' => array());
                    if (isset($rawRequest['response']['requestHeadersText'])) {
                        $request['headers']['request'] = array();
                        $headers = explode("\n", $rawRequest['response']['requestHeadersText']);
                        foreach($headers as $header) {
                            $header = trim($header);
                            if (strlen($header))
                                $request['headers']['request'][] = $header;
                        }
                    } elseif (isset($rawRequest['response']['requestHeaders'])) {
                        $request['headers']['request'] = array();
                        foreach($rawRequest['response']['requestHeaders'] as $key => $value)
                            $request['headers']['request'][] = "$key: $value";
                    } elseif (isset($rawRequest['headers'])) {
                        $request['headers']['request'] = array();
                        foreach($rawRequest['headers'] as $key => $value)
                            $request['headers']['request'][] = "$key: $value";
                    }
                    if (isset($rawRequest['response']['headersText'])) {
                        $request['headers']['response'] = array();
                        $headers = explode("\n", $rawRequest['response']['headersText']);
                        foreach($headers as $header) {
                            $header = trim($header);
                            if (strlen($header))
                                $request['headers']['response'][] = $header;
                        }
                    } elseif (isset($rawRequest['response']['headers'])) {
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
                    if (isset($request['load_ms']) &&
                        isset($request['ttfb_ms']) &&
                        $request['load_ms'] < $request['ttfb_ms'])
                      $valid = false;
                    
                    if ($valid) {
                      // page-level stats
                      if (!isset($pageData['URL']) && strlen($request['full_url']))
                          $pageData['URL'] = $request['full_url'];
                      if (isset($rawRequest['startTime'])) {
                          $startOffset = round(($rawRequest['startTime'] - $rawPageData['startTime']));
                          if ($startOffset > $pageData['fullyLoaded'])
                              $pageData['fullyLoaded'] = $startOffset;
                      }
                      if (isset($rawRequest['endTime'])) {
                          $endOffset = round(($rawRequest['endTime'] - $rawPageData['startTime']));
                          if ($endOffset > $pageData['fullyLoaded'])
                              $pageData['fullyLoaded'] = $endOffset;
                      }
                      if (!isset($pageData['TTFB']) &&
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
        SaveCachedDevToolsRequests($localPaths, $requests, $pageData, $ver);
      }
    }
    return $ok;
}

/**
 * @param TestPaths $localPaths Paths for the step or run to get the cached requests for
 * @param array $requests Gets set with cached requests data, if the cache is found and valid
 * @param array $pageData Gets set with cached page data, if the cache is found and valid
 * @param int $ver Cache version
 * @return bool True if successful, false otherwise
 */
$MEMCACHE_GetCachedDevToolsRequests = array();
function GetCachedDevToolsRequests($localPaths, &$requests, &$pageData, $ver) {
  global $MEMCACHE_GetCachedDevToolsRequests;
  $ok = false;
  $cache = null;
  if (count($MEMCACHE_GetCachedDevToolsRequests) > 100)
    $MEMCACHE_GetCachedDevToolsRequests = array();
  $cacheFile = $localPaths->devtoolsRequestsCacheFile($ver);
  if (isset($MEMCACHE_GetCachedDevToolsRequests[$cacheFile])) {
    $cache = $MEMCACHE_GetCachedDevToolsRequests[$cacheFile];
  } elseif (gz_is_file($cacheFile)) {
    $cache = json_decode(gz_file_get_contents($cacheFile), true);
    $MEMCACHE_GetCachedDevToolsRequests[$cacheFile] = $cache;
  }
  if (isset($cache) &&
      isset($cache['requests']) &&
      isset($cache['pageData'])) {
    $ok = true;
    $requests = $cache['requests'];
    $pageData = $cache['pageData'];
  }
  return $ok;
}

/**
 * @param TestPaths $localPaths Paths for step or run to save the cached data
 * @param array $requests The requests to save
 * @param array $pageData The page data to save
 * @param int $ver Cache version
 */
function SaveCachedDevToolsRequests($localPaths, &$requests, &$pageData, $ver) {
  $cacheFile = $localPaths->devtoolsRequestsCacheFile($ver);
  $lock = Lock($cacheFile);
  if (isset($lock)) {
    if (gz_is_file($cacheFile))
      $cache = json_decode(gz_file_get_contents($cacheFile), true);
    if (!isset($cache) || !is_array($cache))
      $cache = array();
    $cache['requests'] = $requests;
    $cache['pageData'] = $pageData;
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
    $endTimestamp = null;
    foreach ($events as $event) {
      if (isset($event['timestamp']) && (!isset($endTimestamp) || $event['timestamp'] > $endTimestamp))
        $endTimestamp = $event['timestamp'];
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
    // Go through and error-out any requests that were started but never got a response or error
    if (isset($endTimestamp)) {
      foreach ($rawRequests as &$request) {
        if (!isset($request['endTime'])) {
          $request['endTime'] = $endTimestamp;
          $request['firstByteTime'] = $endTimestamp;
          $request['fromNet'] = true;
          $request['errorCode'] = 12999;
        }
      }
    }
    
    // pull out just the requests that were served on the wire
    foreach ($rawRequests as &$request) {
      if (array_key_exists('startTime', $request)) {
        if (!isset($request['fromCache']) && isset($request['response']['timing'])) {
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
 * @param TestPaths $localPaths Paths of the run or step to get the events for
 * @param array $events Gets set to an array containing the events
 * @param int $startOffset Gets set to the start offset
 * @return bool True if successful, false otherwise
 */
function GetDevToolsEventsForStep($filter, $localPaths, &$events, &$startOffset) {
  $ok = false;
  $events = array();
  $devToolsFile = $localPaths->devtoolsFile();
  if (gz_is_file($devToolsFile)){
    $raw = trim(gz_file_get_contents($devToolsFile));
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
  $messages = json_decode($json, true, 100000);
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
  
  if (!$firstEvent && $hasTimeline) {
    foreach ($messages as $message) {
      if (is_array($message) && isset($message['method'])) {
        $eventTime = DevToolsEventTime($message);
        $json = json_encode($message);
        if (strpos($json, '"type":"Resource') !== false) {
          $firstEvent = $eventTime;
          break;
        }
      }
    }
  }
  if (!$firstEvent && $hasNet && isset($messages) && is_array($messages)) {
    foreach ($messages as $message) {
      if (is_array($message) && isset($message['method'])) {
        $eventTime = DevToolsEventTime($message);
        $method_class = substr($message['method'], 0, strpos($message['method'], '.'));
        if ($eventTime && $method_class === 'Network') {
          $firstEvent = $eventTime * 1000.0;
          break;
        }
      }
    }
  }

  if (isset($messages) && is_array($messages)) {  
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

/**
 * @param TestPaths $localPaths The paths for the run or step to get the console log for
 * @return array|null The console log or null, if it couldn't be retrieved
 */
function DevToolsGetConsoleLogForStep($localPaths) {
  $console_log = null;
  $console_log_file = $localPaths->consoleLogFile();
  if (gz_is_file($console_log_file))
      $console_log = json_decode(gz_file_get_contents($console_log_file), true);
  elseif (gz_is_file($localPaths->devtoolsFile())) {
    $console_log = array();
    $startOffset = null;
    if (GetDevToolsEventsForStep('Console.messageAdded', $localPaths, $events, $startOffset) &&
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
 * @param TestPaths $localPaths Paths related to this run/step
 * @return array|null An array of threads with each thread being an array of slices (one for
 * each time period).  Each slice is an array of events and the fraction of that
 * slice that they consumed (with a total maximum of 1 for any slice).
 */
function DevToolsGetCPUSlicesForStep($localPaths) {
  $slices = null;
  $slices_file = $localPaths->devtoolsCPUTimelineFile() . ".gz";
  $trace_file = $localPaths->devtoolsTraceFile() . ".gz";
  if (!GetSetting('disable_timeline_processing') && !is_file($slices_file) && is_file($trace_file) && is_file(__DIR__ . '/lib/trace/trace-parser.py')) {
    $script = realpath(__DIR__ . '/lib/trace/trace-parser.py');
    touch($slices_file);
    if (is_file($slices_file)) {
      $slices_file = realpath($slices_file);
      unlink($slices_file);
    }
    $user_timing = $localPaths->chromeUserTimingFile() . ".gz";
    touch($user_timing);
    if (is_file($user_timing)) {
      $user_timing = realpath($user_timing);
      unlink($user_timing);
    }
    $trace_file = realpath($trace_file);

    $command = "python \"$script\" -t \"$trace_file\" -u \"$user_timing\" -c \"$slices_file\" 2>&1";
    exec($command, $output, $result);
    if (!is_file($slices_file))
      touch($slices_file);
  }
  if (gz_is_file($slices_file))
    $slices = json_decode(gz_file_get_contents($slices_file), true);
  if (isset($slices) && !is_array($slices))
    $slices = null;
    
  return $slices;
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
  // TODO: remove once not used anymore
  $localPaths = new TestPaths($testPath, $run, $cached);
  return GetDevToolsCPUTimeForStep($localPaths, $endTime);
}

/**
 * @param TestPaths $localPaths Paths for this run/step to get the CPU time for
 * @param int $endTime End time to consider (optional, will be retrieved from requests otherwise)
 * @return array
 */
function GetDevToolsCPUTimeForStep($localPaths, $endTime = 0) {
  if (!$endTime) {
    require_once(__DIR__ . '/page_data.inc');
    $runCompleted = IsTestRunComplete($localPaths->getRunNumber(), $testInfo);
    $pageData =  loadPageStepData($localPaths, $runCompleted);
    if (isset($pageData) && is_array($pageData) && isset($pageData['fullyLoaded'])) {
      $endTime = $pageData['fullyLoaded'];
    }
  }

  $times = null;
  $ver = 3;
  $cacheFile = $localPaths->devtoolsCPUTimeCacheFile($ver);
  if (gz_is_file($cacheFile))
    $cache = json_decode(gz_file_get_contents($cacheFile), true);

  if (isset($cache) && is_array($cache) && isset($cache[$endTime])) {
    $times = $cache[$endTime];
  } else {
    $cpu = DevToolsGetCPUSlicesForStep($localPaths);
    if (isset($cpu) && is_array($cpu) && isset($cpu['main_thread']) && isset($cpu['slices'][$cpu['main_thread']]) && isset($cpu['slice_usecs'])) {
      $busy = 0;
      $times = array();
      if (!$endTime && isset($cpu['total_usecs']))
        $endTime = $cpu['total_usecs'] / 1000;
      foreach ($cpu['slices'][$cpu['main_thread']] as $name => $slices) {
        $last_slice = min(intval(ceil(($endTime * 1000) / $cpu['slice_usecs'])), count($slices));
        $times[$name] = 0;
        for ($i = 0; $i < $last_slice; $i++)
          $times[$name] += $slices[$i] / 1000.0;
        $busy += $times[$name];
        $times[$name] = intval(round($times[$name]));
      }
      $times['Idle'] = max($endTime - intval(round($busy)), 0);
    }
    // Cache the result
    if (!isset($cache) || !is_array($cache))
      $cache = array();
    $cache[$endTime] = $times;
    gz_file_put_contents($cacheFile, json_encode($cache));
  }
  return $times;
}

?>
