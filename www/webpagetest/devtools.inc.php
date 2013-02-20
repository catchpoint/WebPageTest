<?php
$DevToolsCacheVersion = '0.3';

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
        if (GetTimeline($testPath, $run, $cached, $timeline)) {
            $startTime = 0;
            $fullScreen = 0;
            $regions = array();
            foreach($timeline as &$entry) {
                $frame = '0';
                ProcessPaintEntry($entry, $startTime, $fullScreen, $regions, $frame);
            }
            $regionCount = count($regions);
            if ($regionCount) {
                $paintEvents = array();
                $total = 0.0;
                foreach($regions as $name => &$region) {
                    $area = $region['width'] * $region['height'];
                    if ($regionCount == 1 || $area != $fullScreen) {
                        $updateCount = floatval(count($region['times']));
                        $incrementalImpact = floatval($area) / $updateCount;
                        foreach($region['times'] as $time) {
                            $total += $incrementalImpact;
                            $elapsed = (int)($time - $startTime);
                            if (!array_key_exists($elapsed, $paintEvents))
                                $paintEvents[$elapsed] = $incrementalImpact;
                            else
                                $paintEvents[$elapsed] += $incrementalImpact;
                        }
                    }
                }
                if (count($paintEvents)) {
                    ksort($paintEvents, SORT_NUMERIC);
                    $current = 0.0;
                    $lastTime = 0.0;
                    $lastProgress = 0.0;
                    $progress = array('SpeedIndex' => 0.0, 
                                      'VisuallyComplete' => 0,
                                      'StartRender' => 0,
                                      'VisualProgress' => array());
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
        }
        if (isset($progress) && is_array($progress))
            SavedCachedDevToolsProgress($testPath, $run, $cached, $progress);
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
function GetTimeline($testPath, $run, $cached, &$timeline) {
    $ok = false;
    $cachedText = '';
    if( $cached )
        $cachedText = '_cached';
    $timelineFile = "$testPath/$run{$cachedText}_devtools.json";
    if (!gz_is_file($timelineFile))
        $timelineFile = "$testPath/$run{$cachedText}_timeline.json";
    if (gz_is_file($timelineFile)){
        $timeline = json_decode(gz_file_get_contents($timelineFile), true);
        if ($timeline)
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
function ProcessPaintEntry(&$entry, &$startTime, &$fullScreen, &$regions, $frame) {
    $ret = false;
    $hadPaintChildren = false;
    if (array_key_exists('frameId', $entry))
        $frame = $entry['frameId'];
    if (array_key_exists('params', $entry) && array_key_exists('record', $entry['params']))
        ProcessPaintEntry($entry['params']['record'], $startTime, $fullScreen, $regions, $frame);
    if (array_key_exists('startTime', $entry) &&
        $entry['startTime'] &&
        (!$startTime ||
         $entry['startTime'] < $startTime))
        $startTime = $entry['startTime'];
    if(array_key_exists('children', $entry) &&
       is_array($entry['children'])) {
        foreach($entry['children'] as &$child)
            if (ProcessPaintEntry($child, $startTime, $fullScreen, $regions, $frame))
                $hadPaintChildren = true;
    }
    if (!$hadPaintChildren &&
        array_key_exists('type', $entry) &&
        !strcasecmp($entry['type'], 'Paint') &&
        array_key_exists('data', $entry) &&
        array_key_exists('width', $entry['data']) &&
        array_key_exists('height', $entry['data']) &&
        array_key_exists('x', $entry['data']) &&
        array_key_exists('y', $entry['data'])) {
        $ret = true;
        $paintEvent = $entry['data'];
        $paintEvent['startTime'] = $entry['startTime'];
        $area = $paintEvent['width'] * $paintEvent['height'];
        if ($area > $fullScreen)
            $fullScreen = $area;
        $regionName = "$frame:{$paintEvent['x']},{$paintEvent['y']} - {$paintEvent['width']}x{$paintEvent['height']}";
        if (!array_key_exists($regionName, $regions)) {
            $regions[$regionName] = $paintEvent;
            $regions[$regionName]['times'] = array();
        }
        $regions[$regionName]['times'][] = $entry['startTime'];
    }
    return $ret;
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
    $requests = array();
    $pageData = array();
    if (GetDevToolsEvents(array('Page.', 'Network.'), $testPath, $run, $cached, $events)) {
        if (DevToolsFilterNetRequests($events, $rawRequests, $rawPageData)) {
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
            $pageData['cached'] = $cached;
            $pageData['optimization_checked'] = 0;
            if (array_key_exists('onload', $rawPageData))
                $pageData['loadTime'] = $pageData['docTime'] = round(($rawPageData['onload'] - $rawPageData['startTime']) * 1000);
            
            // go through and pull out the requests, calculating the page stats as we go
            $connections = array();
            foreach($rawRequests as &$rawRequest) {
                $request = array();
                $request['ip_addr'] = '';
                $request['method'] = array_key_exists('method', $rawRequest) ? $rawRequest['method'] : '';
                $request['host'] = '';
                $request['url'] = '';
                $request['full_url'] = '';
                $request['is_secure'] = 0;
                if (array_key_exists('url', $rawRequest)) {
                    $request['full_url'] = $rawRequest['url'];
                    $parts = parse_url($rawRequest['url']);
                    $request['host'] = $parts['host'];
                    $request['url'] = $parts['path'];
                    if (array_key_exists('query', $parts) && strlen($parts['query']))
                        $request['url'] .= '?' . $parts['query'];
                    if ($parts['scheme'] == 'https')
                        $request['is_secure'] = 1;
                }
                $request['responseCode'] = array_key_exists('response', $rawRequest) && array_key_exists('status', $rawRequest['response']) ? $rawRequest['response']['status'] : -1;
                if (array_key_exists('errorCode', $rawRequest))
                    $request['responseCode'] = $rawRequest['errorCode'];
                $request['load_ms'] = -1;
                if (array_key_exists('endTime', $rawRequest)) {
                    $request['load_ms'] = round(($rawRequest['endTime'] - $rawRequest['startTime']) * 1000);
                    $endOffset = round(($rawRequest['startTime'] - $rawPageData['startTime']) * 1000);
                    if ($endOffset > $pageData['fullyLoaded'])
                        $pageData['fullyLoaded'] = $endOffset;
                }
                $request['ttfb_ms'] = array_key_exists('firstByteTime', $rawRequest) ? round(($rawRequest['firstByteTime'] - $rawRequest['startTime']) * 1000) : -1;
                $request['load_start'] = array_key_exists('startTime', $rawRequest) ? round(($rawRequest['startTime'] - $rawPageData['startTime']) * 1000) : 0;
                $request['bytesOut'] = array_key_exists('headers', $rawRequest) ? strlen(implode("\r\n", $rawRequest['headers'])) : 0;
                $request['bytesIn'] = array_key_exists('bytesIn', $rawRequest) ? $rawRequest['bytesIn'] : 0;
                if (array_key_exists('response', $rawRequest) && array_key_exists('headersText', $rawRequest['response']))
                    $request['bytesIn'] += strlen($rawRequest['response']['headersText']);
                $request['objectSize'] = '';
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
                }
                $request['type'] = 3;
                $request['socket'] = array_key_exists('response', $rawRequest) && array_key_exists('connectionId', $rawRequest['response']) ? $rawRequest['response']['connectionId'] : -1;
                $request['dns_start'] = -1;
                $request['dns_end'] = -1;
                $request['connect_start'] = -1;
                $request['connect_end'] = -1;
                $request['ssl_start'] = -1;
                $request['ssl_end'] = -1;
                if ($request['socket'] !== -1 &&
                    !array_key_exists($request['socket'], $connections) && 
                    array_key_exists('response', $rawRequest) &&
                    array_key_exists('timing', $rawRequest['response'])) {
                    $connections[$request['socket']] = $rawRequest['response']['timing'];
                    $request['dns_start'] = $rawRequest['response']['timing']['dnsStart'];
                    $request['dns_end'] = $rawRequest['response']['timing']['dnsEnd'];
                    $request['connect_start'] = $rawRequest['response']['timing']['connectStart'];
                    $request['connect_end'] = $rawRequest['response']['timing']['connectEnd'];
                    $request['ssl_start'] = $rawRequest['response']['timing']['sslStart'];
                    $request['ssl_end'] = $rawRequest['response']['timing']['sslEnd'];
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
            $pageData['connections'] = count($connections);
        }
    }
    if (count($requests))
        $ok = true;
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
    foreach ($events as $event) {
        if (array_key_exists('timestamp', $event) &&
            (!$pageData['startTime'] ||
             $event['timestamp'] < $pageData['startTime']))
            $pageData['startTime'] = $event['timestamp'];
        if (array_key_exists('timestamp', $event) &&
            (!$pageData['endTime'] ||
             $event['timestamp'] > $pageData['endTime']))
            $pageData['endTime'] = $event['timestamp'];
        if ($event['method'] == 'Page.loadEventFired' &&
            array_key_exists('timestamp', $event) &&
            $event['timestamp'] > $pageData['onload'])
            $pageData['onload'] = $event['timestamp'];
        if (array_key_exists('timestamp', $event) &&
            array_key_exists('requestId', $event)) {
            $id = $event['requestId'];
            if ($event['method'] == 'Network.requestWillBeSent' &&
                array_key_exists('request', $event) &&
                array_key_exists('url', $event['request']) &&
                stripos($event['request']['url'], 'http') === 0) {
                $request = $event['request'];
                $request['id'] = $id;
                $request['startTime'] = $event['timestamp'];
                if (array_key_exists('initiator', $event))
                    $request['initiator'] = $event['initiator'];
                $rawRequests[$id] = $request;
            } elseif (array_key_exists($id, $rawRequests)) {
                if ($event['method'] == 'Network.dataReceived') {
                    if (!array_key_exists('firstByteTime', $rawRequests[$id]))
                        $rawRequests[$id]['firstByteTime'] = $event['timestamp'];
                    if (!array_key_exists('bytesIn', $rawRequests[$id]))
                        $rawRequests[$id]['bytesIn'] = 0;
                    if (array_key_exists('encodedDataLength', $event))
                        $rawRequests[$id]['bytesIn'] += $event['encodedDataLength'];
                }
                if ($event['method'] == 'Network.responseReceived' &&
                    array_key_exists('response', $event)) {
                    if (!array_key_exists('endTime', $rawRequests[$id]) || 
                        $event['timestamp'] > $rawRequests[$id]['endTime'])
                        $rawRequests[$id]['endTime'] = $event['timestamp'];
                    if (!array_key_exists('firstByteTime', $rawRequests[$id]))
                        $rawRequests[$id]['firstByteTime'] = $event['timestamp'];
                    $rawRequests[$id]['fromNet'] = false;
                    if (array_key_exists('fromDiskCache', $event['response']) &&
                        !$event['response']['fromDiskCache'])
                        $rawRequests[$id]['fromNet'] = true;
                    $rawRequests[$id]['response'] = $event['response'];
                }
                if ($event['method'] == 'Network.loadingFinished') {
                    if (!array_key_exists('endTime', $rawRequests[$id]) || 
                        $event['timestamp'] > $rawRequests[$id]['endTime'])
                        $rawRequests[$id]['endTime'] = $event['timestamp'];
                }
                if ($event['method'] == 'Network.loadingFailed') {
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
    // pull out just the requests that were served on the wire
    foreach ($rawRequests as $request) {
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
function GetDevToolsEvents($filter, $testPath, $run, $cached, &$events) {
    $ok = false;
    $events = array();
    $cachedText = '';
    if( $cached )
        $cachedText = '_cached';
    $devToolsFile = "$testPath/$run{$cachedText}_devtools.json";
    if (gz_is_file($devToolsFile)){
        $messages = json_decode(gz_file_get_contents($devToolsFile), true);
        if ($messages && is_array($messages)) {
            foreach($messages as &$message) {
                if (is_array($message) &&
                    array_key_exists('method', $message) &&
                    array_key_exists('params', $message)) {
                    $match = true;
                    if (isset($filter)) {
                        $match = false;
                        if (is_string($filter)) {
                            if (stripos($message['method'], $filter) !== false)
                                $match = true;
                        } elseif(is_array($filter)) {
                            foreach($filter as $str) {
                                if (stripos($message['method'], $str) !== false) {
                                    $match = true;
                                    break;
                                }
                            }
                        }
                    }
                    if ($match) {
                        $event = $message['params'];
                        $event['method'] = $message['method'];
                        $events[] = $event;
                    }
                 }
            }
        }
    }
    if (count($events))
        $ok = true;
    return $ok;
}
?>
