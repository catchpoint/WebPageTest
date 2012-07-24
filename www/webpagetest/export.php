<?php

/******************************************************************************
* 
*   Export a result data set  in HTTP archive format:
*   http://groups.google.com/group/firebug-working-group/web/http-tracing---export-format
* 
******************************************************************************/

include 'common.inc';
require_once('page_data.inc');
include 'object_detail.inc';
require_once('lib/json.php');

// see if we are loading a single run or all of them
if( isset($testPath) )
{
    $pageData;
    if( isset($_REQUEST["run"]) && $_REQUEST["run"] )
    {
        $pageData[0] = array();
        if( isset($cached) )
            $pageData[$run][$cached] = loadPageRunData($testPath, $run, $cached);
        else
        {
            $pageData[$run][0] = loadPageRunData($testPath, $run, 0);
            $pageData[$run][1] = loadPageRunData($testPath, $run, 1);
        }
    }
    else
        $pageData = loadAllPageData($testPath);

    // build up the array
    $result = BuildResult($pageData);

    // spit it out as json
    $filename = '';
    if (@strlen($url))
    {
        $parts = parse_url($url);
        $filename = $parts['host'];
    }
    if (!strlen($filename))
        $filename = "pagetest";
    $filename .= ".$id.har";
    header("Content-disposition: attachment; filename=$filename");
    header('Content-type: application/json');

    if( $_GET['php'] )
      $out = json_encode($result);
    else
    {    
      $json = new Services_JSON();
      $out = $json->encode($result);
    }
    
    // see if we need to wrap it in a JSONP callback
    if( isset($_REQUEST['callback']) && strlen($_REQUEST['callback']) )
        echo "{$_REQUEST['callback']}(";
        
    // send the actual JSON data
    echo $out;
    
    if( isset($_REQUEST['callback']) && strlen($_REQUEST['callback']) )
        echo ");";
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

/**
* Build the data set
* 
* @param mixed $pageData
*/
function BuildResult(&$pageData)
{
    global $id;
    global $testPath;
    $result = array();
    $entries = array();
    
    $result['log'] = array();
    $result['log']['version'] = '1.1';
    $result['log']['creator'] = array(
        'name' => 'WebPagetest',
        'version' => '1.8'
        );
    $result['log']['pages'] = array();
    foreach ($pageData as $run => $pageRun) {
        foreach ($pageRun as $cached => $data) {
            $cached_text = '';
            if ($cached)
                $cached_text = '_Cached';
            if (!array_key_exists('browser', $result['log'])) {
                $result['log']['browser'] = array(
                    'name' => $data['browser_name'],
                    'version' => $data['browser_version']
                    );
            }
            $pd = array();
            $pd['startedDateTime'] = msdate($data['date']);
            $pd['title'] = "Run $run, ";
            if( $cached )
                $pd['title'] .= "Repeat View";
            else
                $pd['title'] .= "First View";
            $pd['title'] .= " for " . $data['URL'];
            $pd['id'] = "page_{$run}_{$cached}";
            $pd['pageTimings'] = array( 'onLoad' => $data['docTime'], 'onContentLoad' => -1, '_startRender' => $data['render'] );
            
            // add the pagespeed score
            $score = GetPageSpeedScore("$testPath/{$run}{$cached_text}_pagespeed.txt");
            if( strlen($score) )
                $pd['_pageSpeed'] = array( 'score' => $score );
            
            // add the page-level ldata to the result
            $result['log']['pages'][] = $pd;
            
            // now add the object-level data to the result
            $secure = false;
            $haveLocations = false;
            $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false, true);
            foreach( $requests as &$r )
            {
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
                if( isset($r['headers']) && isset($r['headers']['request']) )
                {
                    foreach($r['headers']['request'] as &$header)
                    {
                        $pos = strpos($header, ':');
                        if( $pos > 0 )
                        {
                            $name = trim(substr($header, 0, $pos));
                            $val = trim(substr($header, $pos + 1));
                            if( strlen($name) )
                                $request['headers'][] = array('name' => $name, 'value' => $val);

                            // parse out any cookies
                            if( !strcasecmp($name, 'cookie') )
                            {
                                $cookies = explode(';', $val);
                                foreach( $cookies as &$cookie )
                                {
                                    $pos = strpos($cookie, '=');
                                    if( $pos > 0 )
                                    {
                                        $name = (string)trim(substr($cookie, 0, $pos));
                                        $val = (string)trim(substr($cookie, $pos + 1));
                                        if( strlen($name) )
                                            $request['cookies'][] = array('name' => $name, 'value' => $val);
                                    }
                                }
                            }
                        }
                        else
                        {
                            $pos = strpos($header, 'HTTP/');
                            if( $pos >= 0 )
                                $ver = (string)trim(substr($header, $pos + 5, 3));
                        }
                    }
                }
                $request['httpVersion'] = $ver;

                $request['queryString'] = array();
                $parts = parse_url($request['url']);
                if( isset($parts['query']) )
                {
                    $qs = array();
                    parse_str($parts['query'], $qs);
                    foreach($qs as $name => $val)
                        $request['queryString'][] = array('name' => (string)$name, 'value' => (string)$val );
                }
                
                if( !strcasecmp(trim($request['method']), 'post') )
                {
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
                if( isset($r['headers']) && isset($r['headers']['response']) )
                {
                    foreach($r['headers']['response'] as &$header)
                    {
                        $pos = strpos($header, ':');
                        if( $pos > 0 )
                        {
                            $name = (string)trim(substr($header, 0, $pos));
                            $val = (string)trim(substr($header, $pos + 1));
                            if( strlen($name) )
                                $response['headers'][] = array('name' => $name, 'value' => $val);
                            
                            if( !strcasecmp($name, 'location') )
                                $loc = (string)$val;
                        }
                        else
                        {
                            $pos = strpos($header, 'HTTP/');
                            if( $pos >= 0 )
                                $ver = (string)trim(substr($header, $pos + 5, 3));
                        }
                    }
                }
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
                
                // add it to the list of entries
                $entries[] = $entry;
            }
        }
    }
    
    $result['log']['entries'] = $entries;
    
    return $result;
}
?>
