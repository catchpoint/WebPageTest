<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

require_once INCLUDES_PATH . '/common_lib.inc';
require_once INCLUDES_PATH . '/object_detail.inc';
require_once INCLUDES_PATH . '/include/TestResults.php';
require_once INCLUDES_PATH . '/include/Browser.php';

/**
 * Creates HttpArchives from test data.
 */
class HttpArchiveGenerator
{
    private $resultData;
    private $testInfo;
    private $options;

    private $harData = array();

    /**
     * HttpArchiveGenerator constructor.
     *
     * @param $testIfo
     *          Object of type TestInfo containing info about the test har file should be created for.
     * @param $options
     *          Options for HAR-file generation.
     */
    public function __construct($testInfo, $options)
    {
        $this->resultData = TestResults::fromFiles($testInfo);
        $this->testInfo = $testInfo;
        $this->options = $options;
    }

    /**
     * Builds up the dataset from test data and provides it JSON-encoded.
     *
     */
    public function generate()
    {
        $this->buildHAR();
        return $this->getJsonEncoded($this->options);
    }

    /**
     * Builds the dataset.
     */
    private function buildHAR()
    {

        $this->setBaseData();
        $this->setLighthouseData();
        $this->setBrowserData();

        $entries = array();
        $this->harData['log']['pages'] = array();

        for ($runNumber = 1; $runNumber <= $this->resultData->countRuns(); $runNumber++) {
            $harShouldContainAllRuns = !$this->options['run'];
            $harShouldContainOnlyThisRun = $this->options['run'] && $this->options['run'] == $runNumber;

            if ($harShouldContainAllRuns || $harShouldContainOnlyThisRun) {
                $this->handleRun($runNumber, $entries);
            }
        }

        $this->harData['log']['entries'] = $entries;
    }

    private function setBaseData()
    {
        $this->harData['log'] = array();
        $this->harData['log']['version'] = '1.1';
        $this->harData['log']['creator'] = array(
            'name' => 'WebPagetest',
            'version' => VER_WEBPAGETEST
        );
    }

    private function setLighthouseData()
    {
        if (isset($this->options['lighthouse']) && $this->options['lighthouse']) {
            $testPath = $this->testInfo->getRootDirectory();
            $lighthouse_file = $testPath . "/lighthouse.json";
            if (gz_is_file($lighthouse_file)) {
                $lighthouse = json_decode(gz_file_get_contents($lighthouse_file), true);
                if (isset($lighthouse) && is_array($lighthouse)) {
                    $this->harData['_lighthouse'] = $lighthouse;
                }
            }
            $lighthouse_log = $testPath . "/lighthouse.log";
            if (gz_is_file($lighthouse_log)) {
                $log = gz_file_get_contents($lighthouse_log);
                if (isset($log) && strlen($log)) {
                    if (!isset($this->harData['_lighthouse'])) {
                        $this->harData['_lighthouse'] = array();
                    }
                    $this->harData['test_log'] = $log;
                }
            }
        }
    }

    public function setBrowserData()
    {
        $browser = $this->resultData->getBrowser();
        if (isset($browser)) {
            $this->harData['log']['browser'] = array(
                'name' => $browser->getName(),
                'version' => $browser->getVersion()
            );
        }
    }

    private function handleRun($runNumber, &$entries)
    {
        $this->setPageAndEntryDataFor($runNumber, false, $entries);

        if (!$this->testInfo->isFirstViewOnly()) {
            $this->setPageAndEntryDataFor($runNumber, true, $entries);
        }
    }

    private function setPageAndEntryDataFor($runNumber, $cached, &$entries)
    {
        $runResult = $this->resultData->getRunResult($runNumber, $cached);
        for ($stepNumber = 1; $stepNumber <= $runResult->countSteps(); $stepNumber++) {
            $stepResult = $runResult->getStepResult($stepNumber);
            $rawResult = $stepResult->getRawResults();

            $pd = $this->setPageDataFor($rawResult, $stepResult);
            $this->setEntryDataFor($rawResult, $pd, $entries);
        }
    }

    private function setPageDataFor($stepData, $testStepResult)
    {
        $run = $stepData['run'];
        $cached = $stepData['cached'];
        $stepNumber = $stepData['step'];

        $pd = array();
        $pd['startedDateTime'] = HttpArchiveGenerator::msdate($stepData['date']);
        $pd['title'] = "Run $run, ";
        if ($cached) {
            $pd['title'] .= "Repeat View";
        } else {
            $pd['title'] .= "First View";
        }
        $pd['title'] .= " for " . $stepData['URL'];
        $pd['id'] = "page_{$run}_{$cached}_{$stepNumber}";
        $pd['testID'] = $this->testInfo->getId();
        $pd['pageTimings'] = array('onLoad' => $stepData['docTime'], 'onContentLoad' => -1, '_startRender' => $stepData['render']);

        $info = $this->testInfo->getInfoArray();
        if (!empty($info['bwIn'])) {
            $pd['_bwDown'] = $info['bwIn'];
        }

        // dump all of our metrics into the HAR data as custom fields
        foreach ($stepData as $name => $value) {
            $pd["_$name"] = $value;
        }

        $console_log = $testStepResult->getConsoleLog();
        if (isset($console_log)) {
            $pd['_consoleLog'] = $console_log;
        }

        // add the page-level ldata to the result
        $this->harData['log']['pages'][] = $pd;
        return $pd;
    }

    private function setEntryDataFor($stepData, $pd, &$entries)
    {
        $run = $stepData['run'];
        $cached = $stepData['cached'];
        list($zip, $bodyNamesArray) = $this->getBodiesFor($run, $cached);

        $secure = false;
        $requests = getRequests($this->testInfo->getId(), $this->testInfo->getRootDirectory(), $run, $cached, $secure, true, $stepData['step']);
        foreach ($requests as &$r) {
            $entries[] = $this->getEntriesFor($stepData, $pd, $r, $zip, $bodyNamesArray);
        }

        if (isset($zip)) {
            $zip->close();
        }
    }

    private function getBodiesFor($run, $cached)
    {
        $zip = null;
        $body_names = array();

        $cached_text = '';
        if ($cached) {
            $cached_text = '_Cached';
        }

        if (isset($this->options['bodies']) && $this->options['bodies']) {
            $bodies_file = $this->testInfo->getRootDirectory() . '/' . $run . $cached_text . '_bodies.zip';
            if (is_file($bodies_file)) {
                $zip = new ZipArchive();
                if ($zip->open($bodies_file) === true) {
                    for ($i = 0; $i < $zip->numFiles; $i++) {
                        $name = $zip->getNameIndex($i);
                        $parts = explode('-', $name);
                        if (count($parts) >= 3 && stripos($name, '-body.txt') !== false) {
                            $hash = sha1(trim($parts[1]));
                            $body_names[$hash] = $name;
                        }
                    }
                }
            }
        }
        return array($zip, $body_names);
    }

    private function getEntriesFor($stepData, $pageData, $requestData, $zip, $bodyNamesArray)
    {

        $run = $stepData['run'];
        $cached = $stepData['cached'];

        $entry = array();
        $entry['pageref'] = $pageData['id'];
        $entry['startedDateTime'] = HttpArchiveGenerator::msdate((double)$stepData['date'] + ($requestData['load_start'] / 1000.0));
        $entry['time'] = $requestData['all_ms'];
        $entry['_run'] = $run;
        $entry['_cached'] = $cached;

        $request = array();
        $request['method'] = $requestData['method'];
        $protocol = ($requestData['is_secure']) ? 'https://' : 'http://';
        $request['url'] = $protocol . $requestData['host'] . $requestData['url'];
        $request['headersSize'] = -1;
        $request['bodySize'] = -1;
        $request['cookies'] = array();
        $request['headers'] = array();
        $ver = '';
        $headersSize = 0;
        if (isset($requestData['headers']) && isset($requestData['headers']['request'])) {
            foreach ($requestData['headers']['request'] as &$header) {
                $headersSize += strlen($header) + 2; // add 2 for the \r\n that is on the raw headers
                $pos = strpos($header, ':');
                if ($pos > 0) {
                    $name = trim(substr($header, 0, $pos));
                    $val = trim(substr($header, $pos + 1));
                    if (strlen($name)) {
                        $request['headers'][] = array('name' => $name, 'value' => $val);
                    }

                    // parse out any cookies
                    if (!strcasecmp($name, 'cookie')) {
                        $cookies = explode(';', $val);
                        foreach ($cookies as &$cookie) {
                            $pos = strpos($cookie, '=');
                            if ($pos > 0) {
                                $name = (string)trim(substr($cookie, 0, $pos));
                                $val = (string)trim(substr($cookie, $pos + 1));
                                if (strlen($name)) {
                                    $request['cookies'][] = array('name' => $name, 'value' => $val);
                                }
                            }
                        }
                    }
                } else {
                    if (!$ver) { // if version not already set then try to parse it from headers
                        $pos = strpos($header, 'HTTP/');
                        if ($pos !== false) {
                            $ver = (string)trim(substr($header, $pos, 8));
                            // Only accept HTTP/0.9 and HTTP/1 values for versions from headers
                            // HTTP/2 and above is not set in headers and will come from protocol
                            if ($ver !== 'HTTP/0.9' && $ver !== 'HTTP/1.0' && $ver !== 'HTTP/1.1') {
                                $ver = '';
                            }
                        }
                    }
                }
            }
        }
        if ($headersSize) {
            $request['headersSize'] = $headersSize;
        }
        // Get HTTP version from protocol and only fall back to parsed header version if not set
        if (isset($requestData['protocol']) && strlen($requestData['protocol'])) {
            $request['httpVersion'] = $requestData['protocol'];
        } elseif (strlen($ver)) {
            $request['httpVersion'] = $ver;
        } else {
            $request['httpVersion'] = '';
        }

        $request['queryString'] = array();
        $parts = parse_url($request['url']);
        if (isset($parts['query'])) {
            $qs = array();
            parse_str($parts['query'], $qs);
            foreach ($qs as $name => $val) {
                if (is_string($name) && is_string($val)) {
                    if (function_exists('mb_detect_encoding')) {
                        if (!mb_detect_encoding($name, 'UTF-8', true)) {
                            $name = urlencode($name);
                        }
                        if (!mb_detect_encoding($val, 'UTF-8', true)) {
                            $val = urlencode($val);
                        }
                    }
                    $request['queryString'][] = array('name' => (string)$name, 'value' => (string)$val);
                }
            }
        }

        if (!strcasecmp(trim($request['method']), 'post')) {
            $request['postData'] = array();
            $request['postData']['mimeType'] = '';
            $request['postData']['text'] = '';
        }

        $entry['request'] = $request;

        $response = array();
        $response['status'] = (int)$requestData['responseCode'];
        $response['statusText'] = '';
        $response['headersSize'] = -1;
        $response['bodySize'] = (int)$requestData['objectSize'];
        $response['headers'] = array();
        $ver = '';
        $loc = '';
        $headersSize = 0;
        if (isset($requestData['headers']) && isset($requestData['headers']['response'])) {
            foreach ($requestData['headers']['response'] as &$header) {
                $headersSize += strlen($header) + 2; // add 2 for the \r\n that is on the raw headers
                $pos = strpos($header, ':');
                if ($pos > 0) {
                    $name = (string)trim(substr($header, 0, $pos));
                    $val = (string)trim(substr($header, $pos + 1));
                    if (strlen($name)) {
                        $response['headers'][] = array('name' => $name, 'value' => $val);
                    }

                    if (!strcasecmp($name, 'location')) {
                        $loc = (string)$val;
                    }
                } else {
                    if (!$ver) { // if version not already set then try to parse it from headers
                        $pos = strpos($header, 'HTTP/');
                        if ($pos !== false) {
                            $ver = (string)trim(substr($header, $pos, 8));
                            // Only accept HTTP/0.9 and HTTP/1 values for versions from headers
                            // HTTP/2 and above is not set in headers and will come from protocol
                            if ($ver !== 'HTTP/0.9' && $ver !== 'HTTP/1.0' && $ver !== 'HTTP/1.1') {
                                $ver = '';
                            }
                        }
                    }
                }
            }
        }
        if ($headersSize) {
            $response['headersSize'] = $headersSize;
        }
        // Get HTTP version from protocol and only fall back to parsed header version if not set
        if (isset($requestData['protocol']) && strlen($requestData['protocol'])) {
            $response['httpVersion'] = $requestData['protocol'];
        } elseif (strlen($ver)) {
            $response['httpVersion'] = $ver;
        } else {
            $response['httpVersion'] = '';
        }
        $response['redirectURL'] = $loc;

        $response['content'] = array();
        $response['content']['size'] = (int)$requestData['objectSize'];
        if (isset($requestData['contentType']) && strlen($requestData['contentType'])) {
            $response['content']['mimeType'] = (string)$requestData['contentType'];
        } else {
            $response['content']['mimeType'] = '';
        }

        // Add the response body
        if (isset($zip)) {
            $name = null;
            if (isset($requestData['body_id'])) {
                $hash = sha1($requestData['body_id']);
                if (isset($bodyNamesArray[$hash])) {
                    $name = $bodyNamesArray[$hash];
                }
            }
            if (!isset($name) && isset($requestData['request_id'])) {
                $hash = sha1($requestData['request_id']);
                if (isset($bodyNamesArray[$hash])) {
                    $name = $bodyNamesArray[$hash];
                }
            }
            if (isset($name)) {
                $body = $zip->getFromName($name);
                $encoding = mb_detect_encoding($body, mb_detect_order(), true);
                if ($encoding !== false) {
                    if ($encoding != 'UTF-8') {
                        $body = mb_convert_encoding($body, 'UTF-8', $encoding);
                    }
                    $response['content']['text'] = $body;
                }
            }
        }

        // unsupported fields that are required
        $response['cookies'] = array();

        $entry['response'] = $response;

        $entry['cache'] = (object)array();

        $timings = array();
        $timings['blocked'] = -1;
        $timings['dns'] = (int)$requestData['dns_ms'];
        if (!$timings['dns']) {
            $timings['dns'] = -1;
        }

        // HAR did not have an ssl time until version 1.2.  For
        // backward compatibility, "connect" includes "ssl" time.
        // WebPageTest's internal representation does not assume any
        // overlap, so we must add our connect and ssl time to get the
        // connect time expected by HAR.
        $timings['connect'] = (HttpArchiveGenerator::durationOfInterval($requestData['connect_ms']) +
            HttpArchiveGenerator::durationOfInterval($requestData['ssl_ms']));
        if (!$timings['connect']) {
            $timings['connect'] = -1;
        }

        $timings['ssl'] = (int)$requestData['ssl_ms'];
        if (!$timings['ssl']) {
            $timings['ssl'] = -1;
        }

        // TODO(skerner): WebPageTest's data model has no way to
        // represent the difference between the states HAR calls
        // send (time required to send HTTP request to the server)
        // and wait (time spent waiting for a response from the server).
        // We lump both into "wait".  Issue 24* tracks this work.  When
        // it is resolved, read the real values for send and wait
        // instead of using the request's TTFB.
        // *: https://code.google.com/p/webpagetest/issues/detail?id=24
        $timings['send'] = 0;
        $timings['wait'] = (int)$requestData['ttfb_ms'];
        $timings['receive'] = (int)$requestData['download_ms'];

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

        // dump all of our metrics into the HAR data as custom fields
        foreach ($requestData as $name => $value) {
            $entry["_$name"] = $value;
        }

        return $entry;
    }

    /**
     * Encodes previously-built dataset as JSON.
     *
     * @param $options
     * @return mixed|string
     *          JSON-encoded HAR file.
     */
    private function getJsonEncoded($options)
    {
        $pretty_print = false;
        $json = null;
        if (isset($options['pretty']) && $options['pretty']) {
            $pretty_print = true;
        }
        if (isset($options['php']) && $options['php']) {
            if ($pretty_print) {
                $json = json_encode($this->harData, JSON_PRETTY_PRINT);
            } else {
                $json = json_encode($this->harData);
            }
        } else {
            if ($pretty_print) {
                $json = json_encode($this->harData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
            } else {
                $json = json_encode($this->harData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        }
        return $json;
    }

    static function msdate($mstimestamp)
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
    static function durationOfInterval($value)
    {
        if ($value == UNKNOWN_TIME) {
            return 0;
        }
        return (int)$value;
    }
}
