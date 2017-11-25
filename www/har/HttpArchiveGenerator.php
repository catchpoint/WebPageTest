<?php

require_once __DIR__ . '/../common_lib.inc';
require_once __DIR__ . '/../object_detail.inc';

/**
 * Creates HttpArchives from test data.
 */
class HttpArchiveGenerator
{

    private $pageData;
    private $id;
    private $testPath;
    private $options;

    private $harData;

    private static $includePageArrays = array('priorityStreams' => true, 'blinkFeatureFirstUsed' => true);

    /**
     * HttpArchiveGenerator constructor.
     *
     * @param $pageData
     * @param $id
     * @param $testPath
     * @param $options
     */
    public function __construct($pageData, $id, $testPath, $options)
    {
        $this->pageData = $pageData;
        $this->id = $id;
        $this->testPath = $testPath;
        $this->options = $options;
    }

    /**
     * Builds up the data set from tests data and provides it json encoded.
     *
     * @param $options
     * @return mixed|string
     */
    public function generate(){
        $this->buildHAR();
        return $this->getJsonEncoded($this->options);
    }

    /**
     * Builds the data set.
     */
    private function buildHAR()
    {
        $result = array();

        $this->setBaseData($result);
        $this->setLighthouseData($result);

        $entries = array();
        $result['log']['pages'] = array();
        foreach ($this->pageData as $run => $runData) {
            foreach ($runData as $cached => $cachedOrUncachedRunData) {

                $this->setBrowserData($result, $cachedOrUncachedRunData);

                $pd = $this->setPageData($result, $cachedOrUncachedRunData, $run, $cached);

                $this->setEntryData($run, $cached, $cachedOrUncachedRunData, $pd, $entries);
            }
        }

        $result['log']['entries'] = $entries;

        $this->harData = $result;

    }

    /**
     * Encodes previously build dataset as json.
     *
     * @param $options
     * @return mixed|string
     *          Json encoded harfile.
     */
    private function getJsonEncoded($options)
    {
        $json_encode_good = version_compare(phpversion(), '5.4.0') >= 0 ? true : false;
        $pretty_print = false;
        if (isset($options['pretty']) && $options['pretty'])
            $pretty_print = true;
        if (isset($options['php']) && $options['php']) {
            if ($pretty_print && $json_encode_good)
                $json = json_encode($this->harData, JSON_PRETTY_PRINT);
            else
                $json = json_encode($this->harData);
        } elseif ($json_encode_good) {
            if ($pretty_print)
                $json = json_encode($this->harData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
            else
                $json = json_encode($this->harData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } else {
            $jsonLib = new Services_JSON();
            $json = $jsonLib->encode($this->harData);
        }
        if ($json === false) {
            $jsonLib = new Services_JSON();
            $json = $jsonLib->encode($this->harData);
        }
        return $json;
    }

    private function setBaseData(&$result)
    {
        $result['log'] = array();
        $result['log']['version'] = '1.1';
        $result['log']['creator'] = array(
            'name' => 'WebPagetest',
            'version' => VER_WEBPAGETEST
        );
    }

    private function setLighthouseData(&$result)
    {
        $lighthouse_file = "$this->testPath/lighthouse.json";
        if (gz_is_file($lighthouse_file)) {
            $lighthouse = json_decode(gz_file_get_contents($lighthouse_file), true);
            if (isset($lighthouse) && is_array($lighthouse))
                $result['_lighthouse'] = $lighthouse;
        }
    }

    public function setBrowserData(&$result, $cachedOrUncachedRunData)
    {
        if (!array_key_exists('browser', $result['log'])) {
            $result['log']['browser'] = array(
                'name' => $cachedOrUncachedRunData['browser_name'],
                'version' => $cachedOrUncachedRunData['browser_version']
            );
        }
    }

    private function setPageData(&$result, $cachedOrUncachedRunData, $run, $cached)
    {
        $pd = array();
        $pd['startedDateTime'] = $this->msdate($cachedOrUncachedRunData['date']);
        $pd['title'] = "Run $run, ";
        if ($cached)
            $pd['title'] .= "Repeat View";
        else
            $pd['title'] .= "First View";
        $pd['title'] .= " for " . $cachedOrUncachedRunData['URL'];
        $pd['id'] = "page_{$run}_{$cached}";
        $pd['pageTimings'] = array('onLoad' => $cachedOrUncachedRunData['docTime'], 'onContentLoad' => -1, '_startRender' => $cachedOrUncachedRunData['render']);

        // dump all of our metrics into the har data as custom fields
        foreach ($cachedOrUncachedRunData as $name => $value) {
            if (!is_array($value) || isset(HttpArchiveGenerator::$includePageArrays[$name]))
                $pd["_$name"] = $value;
        }

        // add the page-level ldata to the result
        $result['log']['pages'][] = $pd;
        return $pd;
    }

    private function setEntryData($run, $cached, $cachedOrUncachedRunData, $pd, &$entries)
    {
        list($zip, $bodyNamesArray) = $this->getBodiesFor($run, $cached);

        $secure = false;
        $requests = getRequests($this->id, $this->testPath, $run, $cached, $secure, true);
        foreach ($requests as &$r) {
            $entries[] = $this->getEntriesFor($run, $cached, $cachedOrUncachedRunData, $pd, $r, $bodyNamesArray);
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
        if ($cached)
            $cached_text = '_Cached';

        if (isset($this->options['bodies']) && $this->options['bodies']) {
            $bodies_file = $this->testPath . '/' . $run . $cached_text . '_bodies.zip';
            if (is_file($bodies_file)) {
                $zip = new ZipArchive;
                if ($zip->open($bodies_file) === TRUE) {
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
        return array('bodiesZipFile' => $zip, 'bodyNamesArray' => $body_names);
    }

    private function getEntriesFor($run, $cached, $cachedOrUncachedRunData, $pageData, $requestData, $bodyNamesArray){

        $entry = array();
        $entry['pageref'] = $pageData['id'];
        $entry['startedDateTime'] = $this->msdate((double)$cachedOrUncachedRunData['date'] + ($requestData['load_start'] / 1000.0));
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
                    if (strlen($name))
                        $request['headers'][] = array('name' => $name, 'value' => $val);

                    // parse out any cookies
                    if (!strcasecmp($name, 'cookie')) {
                        $cookies = explode(';', $val);
                        foreach ($cookies as &$cookie) {
                            $pos = strpos($cookie, '=');
                            if ($pos > 0) {
                                $name = (string)trim(substr($cookie, 0, $pos));
                                $val = (string)trim(substr($cookie, $pos + 1));
                                if (strlen($name))
                                    $request['cookies'][] = array('name' => $name, 'value' => $val);
                            }
                        }
                    }
                } else {
                    $pos = strpos($header, 'HTTP/');
                    if ($pos >= 0)
                        $ver = (string)trim(substr($header, $pos + 5, 3));
                }
            }
        }
        if ($headersSize)
            $request['headersSize'] = $headersSize;
        $request['httpVersion'] = $ver;

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
                    if (strlen($name))
                        $response['headers'][] = array('name' => $name, 'value' => $val);

                    if (!strcasecmp($name, 'location'))
                        $loc = (string)$val;
                } else {
                    $pos = strpos($header, 'HTTP/');
                    if ($pos >= 0)
                        $ver = (string)trim(substr($header, $pos + 5, 3));
                }
            }
        }
        if ($headersSize)
            $response['headersSize'] = $headersSize;
        $response['httpVersion'] = $ver;
        $response['redirectURL'] = $loc;

        $response['content'] = array();
        $response['content']['size'] = (int)$requestData['objectSize'];
        if (isset($requestData['contentType']) && strlen($requestData['contentType']))
            $response['content']['mimeType'] = (string)$requestData['contentType'];
        else
            $response['content']['mimeType'] = '';

        // Add the response body
        if (isset($zip)) {
            $name = null;
            if (isset($requestData['body_id'])) {
                $hash = sha1($requestData['body_id']);
                if (isset($body_names[$hash]))
                    $name = $bodyNamesArray[$hash];
            }
            if (!isset($name) && isset($requestData['request_id'])) {
                $hash = sha1($requestData['request_id']);
                if (isset($body_names[$hash]))
                    $name = $bodyNamesArray[$hash];
            }
            if (isset($name)) {
                $body = $zip->getFromName($name);
                $response['content']['text'] = MakeUTF8($body);
            }
        }

        // unsupported fields that are required
        $response['cookies'] = array();

        $entry['response'] = $response;

        $entry['cache'] = (object)array();

        $timings = array();
        $timings['blocked'] = -1;
        $timings['dns'] = (int)$requestData['dns_ms'];
        if (!$timings['dns'])
            $timings['dns'] = -1;

        // HAR did not have an ssl time until version 1.2 .  For
        // backward compatibility, "connect" includes "ssl" time.
        // WepbageTest's internal representation does not assume any
        // overlap, so we must add our connect and ssl time to get the
        // connect time expected by HAR.
        $timings['connect'] = (durationOfInterval($requestData['connect_ms']) +
            durationOfInterval($requestData['ssl_ms']));
        if (!$timings['connect'])
            $timings['connect'] = -1;

        $timings['ssl'] = (int)$requestData['ssl_ms'];
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

        if (array_key_exists('custom_rules', $requestData)) {
            $entry['_custom_rules'] = $requestData['custom_rules'];
        }

        // dump all of our metrics into the har data as custom fields
        foreach ($requestData as $name => $value) {
            if (!is_array($value))
                $entry["_$name"] = $value;
        }

        return $entry;

    }

    private function msdate($mstimestamp)
    {
        $timestamp = floor($mstimestamp);
        $milliseconds = round(($mstimestamp - $timestamp) * 1000);

        $date = gmdate('c', $timestamp);
        $msDate = substr($date, 0, 19) . '.' . sprintf('%03d', $milliseconds) . substr($date, 19);

        return $msDate;
    }

}