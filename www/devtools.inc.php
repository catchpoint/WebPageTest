<?php
$DevToolsCacheVersion = '1.7';

if (extension_loaded('newrelic')) {
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
function GetTimeline($testPath, $run, $cached, &$timeline, &$startOffset)
{
    $ok = false;
    $cachedText = '';
    if ($cached)
        $cachedText = '_Cached';
    //$timelineFile = "$testPath/$run{$cachedText}_devtools.json";
    $timelineFile = "$testPath/devtools.json";
    if (!gz_is_file($timelineFile))
        $timelineFile = "$testPath/$run{$cachedText}_timeline.json";
    if (gz_is_file($timelineFile)) {
        $timeline = array();
        $raw = gz_file_get_contents($timelineFile);
        ParseDevToolsEvents($raw, $timeline, null, false, $startOffset);
        if (isset($timeline) && is_array($timeline) && count($timeline))
            $ok = true;
    }
    return $ok;
}

function ProcessDevToolsEvents($events, &$pageData, &$requests, $stepName = 0)
{
    $ok = false;
    if (DevToolsFilterNetRequests($events, $rawRequests, $rawPageData)) {
        $requests = array();
        $pageData = array();

        // initialize the page data records
        $pageData['stepName'] = "Step " . ($stepName + 1);
        $pageData['date'] = $rawPageData['date'];
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
        foreach ($rawRequests as &$rawRequest) {
            if (array_key_exists('url', $rawRequest)) {
                $request = array();
                $request['ip_addr'] = '';
                $request['method'] = isset($rawRequest['method']) ? $rawRequest['method'] : '';
                $request['host'] = '';
                $request['url'] = '';
                $request['full_url'] = '';
                $request['is_secure'] = 0;
                $request['full_url'] = $rawRequest['url'];

                $parts = parse_url($rawRequest['url']);
                if (isset($parts) &&
                    is_array($parts) &&
                    array_key_exists('host', $parts) &&
                    array_key_exists('path', $parts)
                ) {
                    $request['host'] = $parts['host'];
                    $request['url'] = $parts['path'];
                    if (isset($parts['query']) && strlen($parts['query']))
                        $request['url'] .= '?' . $parts['query'];
                    if ($parts['scheme'] == 'https')
                        $request['is_secure'] = 1;
                }
                $request['id'] = $rawRequest['id'];

                $request['responseCode'] = isset($rawRequest['response']['status']) ? $rawRequest['response']['status'] : -1;
                if (isset($rawRequest['errorCode']))
                    $request['responseCode'] = $rawRequest['errorCode'];
                $request['load_ms'] = -1;
                if (isset($rawRequest['response']['timing']['sendStart']) &&
                    $rawRequest['response']['timing']['sendStart'] >= 0
                )
                    $rawRequest['startTime'] = $rawRequest['response']['timing']['sendStart'];
                if (isset($rawRequest['endTime'])) {
                    $request['load_ms'] = round(($rawRequest['endTime'] - $rawRequest['startTime']));
                    $endOffset = round(($rawRequest['endTime'] - $rawPageData['startTime']));
                    if ($endOffset > $pageData['fullyLoaded'])
                        $pageData['fullyLoaded'] = $endOffset;
                }
                $request['ttfb_ms'] = isset($rawRequest['firstByteTime']) ? round(($rawRequest['firstByteTime'] - $rawRequest['startTime'])) : -1;
                $request['load_start'] = isset($rawRequest['startTime']) ? round(($rawRequest['startTime'] - $rawPageData['startTime'])) : 0;

                $request['bytesOut'] = 0;
                if (isset($rawRequest['response']['requestHeadersText'])) {
                    $request['bytesOut'] += strlen($rawRequest['response']['requestHeadersText']);
                } else {
                    $request['bytesOut'] = isset($rawRequest['headers']) ? strlen(implode("\r\n", $rawRequest['headers'])) : 0;
                }
                if (isset($rawRequest['postData'])) {
                    $request['bytesOut'] += strlen($rawRequest['postData']);
                }

                $request['bytesIn'] = 0;
                $request['objectSize'] = '';
                if (isset($rawRequest['bytesInEncoded']) && $rawRequest['bytesInEncoded']) {
                    $request['objectSize'] = $rawRequest['bytesInEncoded'];
                    $request['bytesIn'] = $rawRequest['bytesInEncoded'];
                }
                if (isset($rawRequest['bytesInData']) && $rawRequest['bytesInData']) {
                    $request['objectSize'] = $rawRequest['bytesInData'];

                    // bytesIn should be accounted for as encoded, but if
                    // something happens and we don't have that metrics yet, use
                    // the unencoded version
                    if ($request['bytesIn'] == 0) {
                        $request['bytesIn'] = $rawRequest['bytesInData'];
                    }
                }
                if (isset($rawRequest['response']['headersText'])) {
                    $request['bytesIn'] += strlen($rawRequest['response']['headersText']);
                } else {
                    $request['bytesIn'] += strlen(implode("\n", $rawRequest['response']['headers']));
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

                    // fallback to Content-Length if we have no actual data
                    if ($request['objectSize'] == '')
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
                        $rawRequest['response']['timing']['receiveHeadersEnd'] >= $rawRequest['response']['timing']['sendStart']
                    )
                        $request['ttfb_ms'] = round(($rawRequest['response']['timing']['receiveHeadersEnd'] - $rawRequest['response']['timing']['sendStart']));

                    // add the socket timing
                    if ($request['socket'] !== -1 &&
                        !array_key_exists($request['socket'], $connections)
                    ) {
                        $connections[$request['socket']] = $rawRequest['response']['timing'];
                        if (isset($rawRequest['response']['timing']['dnsStart']) &&
                            $rawRequest['response']['timing']['dnsStart'] >= 0
                        ) {
                            $dnsKey = $request['host'];
                            if (!array_key_exists($dnsKey, $dnsTimes)) {
                                $dnsTimes[$dnsKey] = 1;
                                $request['dns_start'] = round(($rawRequest['response']['timing']['dnsStart'] - $rawPageData['startTime']));
                                if (isset($rawRequest['response']['timing']['dnsEnd']) &&
                                    $rawRequest['response']['timing']['dnsEnd'] >= 0
                                )
                                    $request['dns_end'] = round(($rawRequest['response']['timing']['dnsEnd'] - $rawPageData['startTime']));
                            }
                        }
                        if (isset($rawRequest['response']['timing']['connectStart']) &&
                            $rawRequest['response']['timing']['connectStart'] >= 0
                        ) {
                            $request['connect_start'] = round(($rawRequest['response']['timing']['connectStart'] - $rawPageData['startTime']));
                            if (isset($rawRequest['response']['timing']['connectEnd']) &&
                                $rawRequest['response']['timing']['connectEnd'] >= 0
                            )
                                $request['connect_end'] = round(($rawRequest['response']['timing']['connectEnd'] - $rawPageData['startTime']));
                        }
                        if (isset($rawRequest['response']['timing']['sslStart']) &&
                            $rawRequest['response']['timing']['sslStart'] >= 0
                        ) {
                            $request['ssl_start'] = round(($rawRequest['response']['timing']['sslStart'] - $rawPageData['startTime']));
                            if ($request['connect_end'] > $request['ssl_start'])
                                $request['connect_end'] = $request['ssl_start'];
                            if (isset($rawRequest['response']['timing']['sslEnd']) &&
                                $rawRequest['response']['timing']['sslEnd'] >= 0
                            )
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
                $request['server_rtt'] = null;
                $request['headers'] = array('request' => array(), 'response' => array());
                if (isset($rawRequest['response']['requestHeadersText'])) {
                    $request['headers']['request'] = array();
                    $headers = explode("\n", $rawRequest['response']['requestHeadersText']);
                    foreach ($headers as $header) {
                        $header = trim($header);
                        if (strlen($header))
                            $request['headers']['request'][] = $header;
                    }
                } elseif (isset($rawRequest['response']['requestHeaders'])) {
                    $request['headers']['request'] = array();
                    foreach ($rawRequest['response']['requestHeaders'] as $key => $value)
                        $request['headers']['request'][] = "$key: $value";
                } elseif (isset($rawRequest['headers'])) {
                    $request['headers']['request'] = array();
                    foreach ($rawRequest['headers'] as $key => $value)
                        $request['headers']['request'][] = "$key: $value";
                }
                if (isset($rawRequest['response']['headersText'])) {
                    $request['headers']['response'] = array();
                    $headers = explode("\n", $rawRequest['response']['headersText']);
                    foreach ($headers as $header) {
                        $header = trim($header);
                        if (strlen($header))
                            $request['headers']['response'][] = $header;
                    }
                } elseif (isset($rawRequest['response']['headers'])) {
                    $request['headers']['response'] = array();
                    foreach ($rawRequest['response']['headers'] as $key => $value)
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
                if (isset($request['load_ms']) &&
                    isset($request['ttfb_ms']) &&
                    $request['load_ms'] < $request['ttfb_ms']) {
                    // given the approximation of ttfb and load_ms, it is
                    // possible that very close numbers endup being invalid. In
                    // this case, fix load_ms
                    $request['load_ms'] = $request['ttfb_ms'];
                }

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
                        $request['responseCode'] == 304)
                ) {
                    $pageData['TTFB'] = $request['load_start'] + $request['ttfb_ms'];
                    if ($request['ssl_end'] >= 0 &&
                        $request['ssl_start'] >= 0
                    ) {
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
        $pageData['load_start'] = $requests[0]['load_start'];
        $pageData['connections'] = count($connections);
    }
    if (count($requests)) {
        if ($pageData['responses_200'] == 0) {
            if (array_key_exists('responseCode', $requests[0]))
                $pageData['result'] = $requests[0]['responseCode'];
            else
                $pageData['result'] = 12999;
        }
        if (isset($rawPageData['mainResourceID'])) {
            foreach ($requests as $index => &$request) {
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
function GetDevToolsRequests($testPath, $run, $cached, &$requests, &$pageData, $multistep = false)
{
    $requests = null;
    $pageData = null;
    $startOffset = null;
    $ok = true;
    if ($multistep) {
        $requests = Array();
        $pageData = Array();
    }
    if (GetDevToolsEvents(null, $testPath, $run, $cached, $events, $startOffset, $multistep)) {
        if ($multistep) {
            for ($i = 0; $i < count($events); $i++) {
                $stepEvents = $events[$i];
                $stepPageData = null;
                $stepPageRequests = null;
                $ok = ProcessDevToolsEvents($stepEvents, $stepPageData, $stepPageRequests, $i);
                if ($ok || isset($stepPageData['URL'])) {
                    $requests[] = $stepPageRequests;
                    $pageData[] = $stepPageData;
                }
            }
        } else {
            $ok = ProcessDevToolsEvents($events, $pageData, $requests);
        }
    }
    return $ok;
}

/**
 * Convert the raw timeline events into just the network events we care about
 *
 * @param mixed $events
 * @param mixed $requests
 */
function DevToolsFilterNetRequests($events, &$requests, &$pageData)
{
    $pageData = array('startTime' => 0, 'onload' => 0, 'endTime' => 0);
    $requests = array();
    $allRequests = array(); // indexed by ID
    $idMap = array();
    $endTimestamp = null;
    foreach ($events as $event) {
        if ($event['method'] == 'Network.requestWillBeSent' &&
            isset($event['wallTime']) &&
            (!isset($pageData['date']) || $event['wallTime'] < $pageData['date'])
        ) {
            $pageData['date'] = $event['wallTime'];
        }
        if (isset($event['timestamp']) && (!isset($endTimestamp) || $event['timestamp'] > $endTimestamp)) {
            $endTimestamp = $event['timestamp'];
        }
        if (!isset($main_frame) &&
            $event['method'] == 'Page.frameStartedLoading' &&
            isset($event['frameId'])
        ) {
            $main_frame = $event['frameId'];
        }
        if ($event['method'] == 'Page.frameStartedLoading' &&
            isset($event['frameId']) &&
            isset($main_frame) &&
            $event['frameId'] == $main_frame
        ) {
            $main_resource_id = null;
        }
        if (!isset($main_resource_id) &&
            $event['method'] == 'Network.requestWillBeSent' &&
            isset($event['requestId']) &&
            isset($event['frameId']) &&
            isset($main_frame) &&
            $event['frameId'] == $main_frame
        ) {
            $main_resource_id = $event['requestId'];
        }
        if ($event['method'] == 'Page.loadEventFired' &&
            array_key_exists('timestamp', $event) &&
            $event['timestamp'] > $pageData['onload']
        ) {
            $pageData['onload'] = $event['timestamp'];
        }
        if ($event['method'] == 'Network.requestServedFromCache' &&
            array_key_exists('requestId', $event) &&
            array_key_exists($event['requestId'], $allRequests)
        ) {
            $allRequests[$event['requestId']]['fromNet'] = false;
            $allRequests[$event['requestId']]['fromCache'] = true;
        }
        if (array_key_exists('timestamp', $event) &&
            array_key_exists('requestId', $event)
        ) {
            $originalId = $id = $event['requestId'];
            if (array_key_exists($id, $idMap))
                $id .= '-' . $idMap[$id];
            if ($event['method'] == 'Network.requestWillBeSent' &&
                array_key_exists('request', $event) &&
                array_key_exists('url', $event['request']) &&
                stripos($event['request']['url'], 'http') === 0 &&
                parse_url($event['request']['url']) !== false
            ) {
                $request = $event['request'];
                $request['startTime'] = $event['timestamp'];
                if (array_key_exists('initiator', $event))
                    $request['initiator'] = $event['initiator'];
                // redirects re-use the same request ID
                if (array_key_exists($id, $allRequests)) {
                    if (array_key_exists('redirectResponse', $event)) {
                        if (!array_key_exists('endTime', $allRequests[$id]) ||
                            $event['timestamp'] > $allRequests[$id]['endTime']
                        )
                            $allRequests[$id]['endTime'] = $event['timestamp'];
                        if (!array_key_exists('firstByteTime', $allRequests[$id]))
                            $allRequests[$id]['firstByteTime'] = $event['timestamp'];
                        $allRequests[$id]['fromNet'] = false;
                        // iOS incorrectly sets the fromNet flag to false for resources from cache
                        // but it doesn't have any send headers for those requests
                        // so use that as an indicator.
                        if (array_key_exists('fromDiskCache', $event['redirectResponse']) &&
                            !$event['redirectResponse']['fromDiskCache'] &&
                            array_key_exists('headers', $allRequests[$id]) &&
                            is_array($allRequests[$id]['headers']) &&
                            count($allRequests[$id]['headers'])
                        )
                            $allRequests[$id]['fromNet'] = true;
                        $allRequests[$id]['response'] = $event['redirectResponse'];

                        // Encoded data length for redirection is inlined in the
                        // redirect response
                        if (array_key_exists('encodedDataLength', $event['redirectResponse']) && $event['redirectResponse']['encodedDataLength'] > -1) {
                            if (!array_key_exists('bytesInEncoded', $allRequests[$id]) || $allRequests[$id]['bytesInEncoded'] < 0)
                                $allRequests[$id]['bytesInEncoded'] = 0;
                            if (!array_key_exists('bytesInData', $allRequests[$id]) || $allRequests[$id]['bytesInData'] < 0)
                                $allRequests[$id]['bytesInData'] = 0;

                            $allRequests[$id]['bytesInEncoded'] += $event['redirectResponse']['encodedDataLength'];

                            // we only get the encoded data length, this is an
                            // approximation
                            $allRequests[$id]['bytesInData'] += $event['redirectResponse']['encodedDataLength'];
                        }
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
                $allRequests[$id] = $request;
            } elseif (array_key_exists($id, $allRequests)) {

                if (!array_key_exists('endTime', $allRequests[$id]) ||
                    $event['timestamp'] > $allRequests[$id]['endTime']) {
                    $allRequests[$id]['endTime'] = $event['timestamp'];
                }

                if ($event['method'] == 'Network.dataReceived') {
                    if (!array_key_exists('firstByteTime', $allRequests[$id]))
                        $allRequests[$id]['firstByteTime'] = $event['timestamp'];
                    if (!array_key_exists('bytesInData', $allRequests[$id]))
                        $allRequests[$id]['bytesInData'] = 0;
                    if (array_key_exists('dataLength', $event))
                        $allRequests[$id]['bytesInData'] += $event['dataLength'];
                    if (!array_key_exists('bytesInEncoded', $allRequests[$id]) || $allRequests[$id]['bytesInEncoded'] < 0)
                        $allRequests[$id]['bytesInEncoded'] = 0;
                    if (array_key_exists('encodedDataLength', $event))
                        $allRequests[$id]['bytesInEncoded'] += $event['encodedDataLength'];
                }
                if ($event['method'] == 'Network.responseReceived' &&
                    array_key_exists('response', $event)
                ) {
                    if (!array_key_exists('firstByteTime', $allRequests[$id]))
                        $allRequests[$id]['firstByteTime'] = $event['timestamp'];

                    $allRequests[$id]['fromNet'] = false;
                    // the timing data for cached resources is completely bogus
                    if (isset($allRequests[$id]['fromCache']) && isset($event['response']['timing']))
                        unset($event['response']['timing']);
                    // iOS incorrectly sets the fromNet flag to false for resources from cache
                    // but it doesn't have any send headers for those requests
                    // so use that as an indicator.
                    if (array_key_exists('fromDiskCache', $event['response']) &&
                        !$event['response']['fromDiskCache'] &&
                        array_key_exists('headers', $allRequests[$id]) &&
                        is_array($allRequests[$id]['headers']) &&
                        count($allRequests[$id]['headers']) &&
                        !isset($allRequests[$id]['fromCache'])
                    ) {
                        $allRequests[$id]['fromNet'] = true;
                    }
                    // adjust the start time
                    if (isset($event['response']['timing']['receiveHeadersEnd']))
                        $allRequests[$id]['startTime'] = $event['timestamp'] - $event['response']['timing']['receiveHeadersEnd'];
                    $allRequests[$id]['response'] = $event['response'];
                }
                if ($event['method'] == 'Network.loadingFinished') {
                    if (!array_key_exists('firstByteTime', $allRequests[$id]))
                        $allRequests[$id]['firstByteTime'] = $event['timestamp'];
                }
                if ($event['method'] == 'Network.loadingFailed') {
                    if (!array_key_exists('response', $allRequests[$id]) &&
                        !isset($allRequests[$id]['fromCache'])
                    ) {
                        if (!isset($event['canceled']) || !$event['canceled']) {
                            $allRequests[$id]['fromNet'] = true;
                            if (!array_key_exists('firstByteTime', $allRequests[$id]))
                                $allRequests[$id]['firstByteTime'] = $event['timestamp'];
                            if (array_key_exists('errorText', $event))
                                $allRequests[$id]['error'] = $event['errorText'];
                            if (array_key_exists('error', $event))
                                $allRequests[$id]['errorCode'] = $event['error'];

                        }
                    }
                }
            }
        }
        if ($event['method'] == 'Page.domContentEventFired' &&
            array_key_exists('timestamp', $event) &&
            !isset($pageData['domContentLoadedEventStart'])
        ) {
            $pageData['domContentLoadedEventStart'] = $event['timestamp'];
            $pageData['domContentLoadedEventEnd'] = $event['timestamp'];
        }
    }

    // pull out just the requests that were served on the wire
    foreach ($allRequests as &$request) {
        // Ignore any requests that were started but never got a response or error
        // since they can be inflight requests
        if (isset($endTimestamp)) {
            if (!isset($request['endTime'])) {
                unset($allRequests[$request['id']]);
                continue;
            }
        }

        if (array_key_exists('startTime', $request)) {
            if (!isset($request['fromCache']) && isset($request['response']['timing'])) {
                if (array_key_exists('requestTime', $request['response']['timing']) &&
                    array_key_exists('endTime', $request) &&
                    $request['response']['timing']['requestTime'] >= $request['startTime'] &&
                    $request['response']['timing']['requestTime'] <= $request['endTime']
                )
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
                    $request['startTime'] < $pageData['startTime'])
            ) {
                $pageData['startTime'] = $request['startTime'];
            }
        }
        if (array_key_exists('endTime', $request) &&
            (!$pageData['endTime'] ||
                $request['endTime'] > $pageData['endTime'])
        ) {
            $pageData['endTime'] = $request['endTime'];
        }
        if (array_key_exists('fromNet', $request) && $request['fromNet']) {
            $requests[] = $request;
        }
    }
    if (isset($main_resource_id))
        $pageData['mainResourceID'] = $main_resource_id;
    $ok = false;
    if (count($requests)) {
        // sort them by start time
        usort($requests, function ($a, $b) {
            return $a['startTime'] > $b['startTime'];
        });
        $ok = true;
    }
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
function GetDevToolsEvents($filter, $testPath, $run, $cached, &$events, &$startOffset, $multistep = false)
{
    $ok = false;
    $events = array();
    $devToolsFile = "$testPath/devtools.json";
    if (gz_is_file($devToolsFile)) {
        $raw = trim(gz_file_get_contents($devToolsFile));
        ParseDevToolsEvents($raw, $events, $filter, true, $startOffset, $multistep);
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
function ParseDevToolsEvents(&$json, &$events, $filter, $removeParams, &$startOffset, $multistep = false)
{
    $messages = json_decode($json, true);
    // invalid json means we fail
    if (!$messages) {
        return;
    }

    $step = array();
    $startOffset = null;

    $foundFirstEvent = false;
    $foundHookPage = false;
    $events = Array(); // list of events for each step
    $iFrames = Array(); // list of iFrame frameId
    foreach ($messages as $entry) {
        $message = $entry['message'];
        if (isset($message['params']['timestamp'])) {
            $message['params']['timestamp'] *= 1000.0;
        }
        if (!$foundFirstEvent &&
            isset($message['method']) &&
            isset($message['params']['timestamp']) &&
            isset($message['params']['request']['url']) &&
            strlen($message['params']['request']['url']) &&
            $message['method'] == 'Network.requestWillBeSent'
        ) {
            // The first page of the webdriver session is the one that is loaded after the blank2.html page loaded
            // by the Chrome extension
            if (!$foundHookPage) {
                if ($message['params']['documentURL'] == 'http://127.0.0.1:8888/blank2.html') {
                    $foundHookPage = true;
                }
            } else {
                // Skip other requests on the hook page or generated by Chrome
                // home page
                if ($message['params']['documentURL'] == 'http://127.0.0.1:8888/blank2.html' ||
                    preg_match("/(https:\/\/www.google.com\/_\/chrome\/newtab|chrome-search:\/\/)/", $message['params']['documentURL'])
                ) {
                    continue;
                }
                $foundFirstEvent = true;
            }
        }
        if ($foundFirstEvent) {
            // If an iFrame is attached to a parent frame, keep a reference of
            // this iFrame frameId. With all iFrame ids, we can differentiate 
            // frameStartedLoading producing a new step from the ones just
            // loading data in an iframe.
            if ($multistep && isset($message['method']) && $message['method'] == "Page.frameAttached") {
                $iFrames[$message['params']['frameId']] = $iFrame[$message['params']['parentFrameId']];
            }

            if ($multistep && isset($message['method']) && $message['method'] == "Page.frameStartedLoading" &&
                isset($message['params']['frameId']) && 
                    !array_key_exists($message['params']['frameId'], $iFrames)) {

                $events[] = $step;
                $step = Array();
                continue;
            }
            if (DevToolsMatchEvent($filter, $message)) {
                if ($removeParams && array_key_exists('params', $message)) {
                    $event = $message['params'];
                    $event['method'] = $message['method'];
                    $step[] = $event;
                } else {
                    $step[] = $message;
                }
            }
        }
    }
    if ($multistep) {
        $events[] = $step;
    } else {
        $events = $step;
    }
}

function DevToolsEventTime(&$event)
{
    $time = null;
    if (isset($event['params']['record']['startTime'])) {
        $time = $event['params']['record']['startTime'];
    } elseif (isset($event['params']['timestamp'])) {
        $time = $event['params']['timestamp'];
    } elseif (isset($event['params']['message']['timestamp'])) {
        $time = $event['params']['message']['timestamp'];
    } elseif (isset($event['params']['ts'])) {
        $time = $event['params']['ts'] / 1000.0;
    }
    return $time;
}

function DevToolsEventEndTime(&$event)
{
    $time = null;
    if (isset($event['params']['record']['endTime'])) {
        $time = $event['params']['record']['endTime'];
    } elseif (isset($event['params']['timestamp'])) {
        $time = $event['params']['timestamp'];
    }
    return $time;
}

function DevToolsIsValidNetRequest(&$event)
{
    $isValid = false;

    if (array_key_exists('method', $event) &&
        $event['method'] == 'Network.requestWillBeSent' &&
        array_key_exists('params', $event) &&
        is_array($event['params']) &&
        array_key_exists('request', $event['params']) &&
        is_array($event['params']['request']) &&
        array_key_exists('url', $event['params']['request']) &&
        !strncmp('http', $event['params']['request']['url'], 4) &&
        parse_url($event['params']['request']['url']) !== false
    )
        $isValid = true;

    return $isValid;
}

function DevToolsIsNetRequest(&$event)
{
    $isValid = false;
    if (array_key_exists('method', $event)) {
        if ($event['method'] == 'Network.requestWillBeSent')
            $isValid = true;
    }
    return $isValid;
}

function FindNextNetworkRequest(&$events, $startTime)
{
    $netTime = null;
    foreach ($events as &$event) {
        $eventTime = DevToolsEventTime($event);
        if (isset($eventTime) &&
            $eventTime >= $startTime &&
            (!isset($netTime) || $eventTime < $netTime) &&
            DevToolsIsNetRequest($event)
        ) {
            $netTime = $eventTime;
        }
    }
    if (!isset($netTime))
        $netTime = $startTime;
    return $netTime;
}

function DevToolsMatchEvent($filter, &$event, $startTime = null, $endTime = null)
{
    $match = true;
    if (isset($event['method']) && isset($event['params'])) {
        if (isset($startTime) && $startTime) {
            $time = DevToolsEventTime($event);
            if (isset($time) && $time &&
                ($time < $startTime ||
                    $time - $startTime > 600000 ||
                    (isset($endTime) && $endTime && $time > $endTime))
            )
                $match = false;
        }
        if ($match && isset($filter)) {
            $match = false;
            if (is_string($filter)) {
                if (stripos($event['method'], $filter) !== false)
                    $match = true;
            } elseif (is_array($filter)) {
                foreach ($filter as $str) {
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

function DevToolsGetConsoleLog($testPath, $run, $cached)
{
    $console_log = null;
    $cachedText = '';
    if ($cached)
        $cachedText = '_Cached';
    $console_log_file = "$testPath/$run{$cachedText}_console_log.json";
    if (gz_is_file($console_log_file))
        $console_log = json_decode(gz_file_get_contents($console_log_file), true);
    //elseif (gz_is_file("$testPath/$run{$cachedText}_devtools.json")) {
    elseif (gz_is_file("$testPath/devtools.json")) {
        $console_log = array();
        $startOffset = null;
        if (GetDevToolsEvents('Console.messageAdded', $testPath, $run, $cached, $events, $startOffset) &&
            is_array($events) &&
            count($events)
        ) {
            foreach ($events as $event) {
                if (is_array($event) &&
                    array_key_exists('message', $event) &&
                    is_array($event['message'])
                )
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
function DevToolsGetVideoOffset($testPath, $run, $cached, &$endTime)
{
    $offset = 0;
    $endTime = 0;
    $lastEvent = 0;
    $cachedText = '';
    if ($cached)
        $cachedText = '_Cached';
    //$devToolsFile = "$testPath/$run{$cachedText}_devtools.json";
    $devToolsFile = "$testPath/devtools.json";
    if (gz_is_file($devToolsFile)) {
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
                            (!$lastPaint || $eventTime > $lastPaint)
                        ) {
                            if (strpos($encoded, '"type":"ResourceSendRequest"') !== false)
                                $startTime = DevToolsEventTime($event);
                            if (strpos($encoded, '"type":"Rasterize"') !== false ||
                                strpos($encoded, '"type":"CompositeLayers"') !== false ||
                                strpos($encoded, '"type":"Paint"') !== false
                            ) {
                                $lastPaint = $eventTime;
                            }
                        }
                        if ($eventTime > $lastEvent &&
                            strpos($encoded, '"type":"Resource') !== false
                        )
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

function GetTraceTimeline($testPath, $run, $cached, &$timeline)
{
    $ok = false;
    $cachedText = '';
    if ($cached)
        $cachedText = '_Cached';
    //$traceFile = "$testPath/$run{$cachedText}_trace.json";
    $traceFile = "$testPath/devtools.json";
    if (gz_is_file($traceFile)) {
        $events = json_decode(gz_file_get_contents($traceFile), true);
        if (isset($events) && is_array($events) && isset($events['traceEvents'])) {
            $timeline = array();
            $thread_stack = array();
            $main_thread = null;
            $threads = array();
            $ignore_threads = array();
            foreach ($events['traceEvents'] as $event) {
                if (isset($event['cat']) && isset($event['name']) && isset($event['pid']) && isset($event['tid']) && isset($event['ph']) && isset($event['ts']) &&
                    ($event['cat'] == 'disabled-by-default-devtools.timeline' || $event['cat'] == 'devtools.timeline')
                ) {
                    $thread = "{$event['pid']}:{$event['tid']}";
                    if (!isset($main_thread) &&
                        $event['name'] == 'ResourceSendRequest' &&
                        isset($event['args']['data']['url'])
                    ) {
                        if (substr($event['args']['data']['url'], 0, 21) == 'http://127.0.0.1:8888') {
                            $ignore_threads[$thread] = true;
                        } else {
                            if (!isset($threads[$thread]))
                                $threads[$thread] = count($threads);
                            $main_thread = $thread;
                            // make sure the navigation event is included so we have the real start time
                            if (!isset($event['dur']))
                                $event['dur'] = 1;
                        }
                    }

                    if (isset($main_thread) &&
                        !isset($threads[$thread]) &&
                        $event['name'] !== 'Program' &&
                        !isset($ignore_threads[$thread])
                    ) {
                        $threads[$thread] = count($threads);
                    }

                    // ignore any activity before the first navigation
                    if (isset($threads[$thread]) &&
                        ((isset($event['dur']) && isset($thread_stack[$thread]) && count($thread_stack[$thread])) ||
                            $event['ph'] == 'B' || $event['ph'] == 'E')
                    ) {
                        $event['thread'] = $threads[$thread];
                        if (!isset($thread_stack[$thread]))
                            $thread_stack[$thread] = array();
                        $e = null;
                        if ($event['ph'] == 'E') {
                            if (count($thread_stack[$thread])) {
                                $e = array_pop($thread_stack[$thread]);
                                // These had BETTER match
                                if ($e['name'] == $event['name'])
                                    $e['endTime'] = $event['ts'] / 1000.0;
                            }
                        } else {
                            $e = $event;
                            $e['type'] = $event['name'];
                            $e['startTime'] = $event['ts'] / 1000.0;

                            // Start of an event, just push it to the stack
                            if ($event['ph'] == 'B') {
                                $thread_stack[$thread][] = $e;
                                unset($e);
                            } elseif (isset($event['dur'])) {
                                $e['endTime'] = $e['startTime'] + ($event['dur'] / 1000.0);
                            }
                        }

                        if (isset($e)) {
                            if (count($thread_stack[$thread])) {
                                $parent = array_pop($thread_stack[$thread]);
                                if (!isset($parent['children']))
                                    $parent['children'] = array();
                                $parent['children'][] = $e;
                                $thread_stack[$thread][] = $parent;
                            } else {
                                $timeline[] = $e;
                            }
                        }
                    }
                }
            }
            if (count($timeline))
                $ok = true;
        }
    }
    return $ok;
}

/**
 * If we have a timeline, figure out what each thread was doing at each point in time.
 * Basically CPU utilization from the timeline.
 *
 * returns an array of threads with each thread being an array of slices (one for
 * each time period).  Each slice is an array of events and the fraction of that
 * slice that they consumed (with a total maximum of 1 for any slice).
 */
function DevToolsGetCPUSlices($testPath, $run, $cached)
{
    $count = 0;
    $slices = null;
    $timeline = array();
    $ver = 2;
    $cacheFile = "$testPath/$run.$cached.devToolsCPUSlices.$ver";
    if (gz_is_file($cacheFile))
        $slices = json_decode(gz_file_get_contents($cacheFile), true);
    if (!isset($slices)) {
        GetTraceTimeline($testPath, $run, $cached, $timeline);
        if (isset($timeline) && is_array($timeline) && count($timeline)) {
            // Do a first pass to get the start and end times as well as the number of threads
            $threads = array(0 => true);
            $startTime = 0;
            $endTime = 0;
            foreach ($timeline as $entry) {
                if ($entry['startTime'] && (!$startTime || $entry['startTime'] < $startTime))
                    $startTime = $entry['startTime'];
                if ($entry['endTime'] && (!$endTime || $entry['endTime'] > $endTime))
                    $endTime = $entry['endTime'];
                $threads[$entry['thread']] = true;
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
                foreach ($timeline as $entry)
                    $count += DevToolsGetEventTimes($entry, $startTime, $slices);
            }
        }

        if ($count) {
            // remove any threads that didn't have actual slices populated
            $emptyThreads = array();
            foreach ($slices as $thread => &$records) {
                $is_empty = true;
                foreach ($records as $ms => &$values) {
                    if (count($values)) {
                        $is_empty = false;
                        break;
                    }
                }
                if ($is_empty)
                    $emptyThreads[] = $thread;
            }
            if (count($emptyThreads)) {
                foreach ($emptyThreads as $thread)
                    unset($slices[$thread]);
            }
            gz_file_put_contents($cacheFile, json_encode($slices));
        } else {
            $slices = null;
        }
    }

    if (!isset($_REQUEST['threads']) && isset($slices) && is_array($slices)) {
        $threads = array_keys($slices);
        foreach ($threads as $thread) {
            if ($thread !== 0)
                unset($slices[$thread]);
        }
    }

    return $slices;
}

function DevToolsAdjustSlice(&$slice, $amount, $type, $parentType)
{

    if ($type && $amount) {
        if ($amount == 1.0) {
            foreach ($slice as $sliceType => $value)
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
function DevToolsGetEventTimes(&$record, $startTime, &$slices, $thread = null, $parentType = null)
{
    $count = 0;
    if (array_key_exists('startTime', $record) &&
        array_key_exists('endTime', $record) &&
        array_key_exists('type', $record)
    ) {
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
                    foreach ($record['children'] as &$child)
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
function GetDevToolsHeaderValue($headers, $name, &$value)
{
    foreach ($headers as $key => $headerValue) {
        if (!strcasecmp($name, $key)) {
            $value = $headerValue;
            break;
        }
    }
}

function GetDevToolsCPUTime($testPath, $run, $cached, $endTime = 0)
{
    $times = null;
    $ver = 1;
    $ver = 2;
    $cacheFile = "$testPath/$run.$cached.devToolsCPUTime.$ver";
    if (gz_is_file($cacheFile))
        $cache = json_decode(gz_file_get_contents($cacheFile), true);
    // If an end time wasn't specified, figure out what the fully loaded time is
    if (!$endTime) {
        if (GetDevToolsRequests($testPath, $run, $cached, $requests, $pageData) &&
            isset($pageData) && is_array($pageData) && isset($pageData['fullyLoaded'])
        ) {
            $endTime = $pageData['fullyLoaded'];
        }
    }
    if (isset($cache[$endTime])) {
        $times = $cache[$endTime];
    } else {
        $slices = DevToolsGetCPUSlices($testPath, $run, $cached);
        if (isset($slices) && is_array($slices) && isset($slices[0]) &&
            is_array($slices[0]) && count($slices[0])
        ) {
            $times = array('Idle' => 0.0);
            foreach ($slices[0] as $ms => $breakdown) {
                if (!$endTime || $ms < $endTime) {
                    $idle = 1.0;
                    if (isset($breakdown) && is_array($breakdown) && count($breakdown)) {
                        foreach ($breakdown as $event => $ms_time) {
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
        $cache[$endTime] = $times;
        gz_file_put_contents($cacheFile, json_encode($cache));
    }
    return $times;
}

?>
