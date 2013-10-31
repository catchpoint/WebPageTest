<?php
require_once('common.inc');
require_once('page_data.inc');
require_once('testStatus.inc');
require_once('video/visualProgress.inc.php');
require_once('domains.inc');
require_once('breakdown.inc');
require_once('devtools.inc.php');

if (array_key_exists('batch', $test['test']) && $test['test']['batch']) {
    include 'resultBatch.inc';
} else {
    $ret = array('data' => GetTestStatus($id));
    $ret['statusCode'] = $ret['data']['statusCode'];
    $ret['statusText'] = $ret['data']['statusText'];

    if ($ret['statusCode'] == 200)
        $ret['data'] = GetTestResult($id);
    json_response($ret);
}

/**
* Gather all of the data for a given test and return it as an array
* 
* @param mixed $id
*/
function GetTestResult($id) {
    global $url;
    global $median_metric;

    $testPath = './' . GetTestPath($id);
    $host  = $_SERVER['HTTP_HOST'];
    $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
    $path = substr($testPath, 1);
    $pageData = loadAllPageData($testPath);
    $stats = array(0 => array(), 1 => array());
    $pageStats = calculatePageStats($pageData, $stats[0], $stats[1]);
    if( !strlen($url) )
        $url = $pageData[1][0]['URL'];
    if (gz_is_file("$testPath/testinfo.json"))
        $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
    if (is_file("$testPath/testinfo.ini"))
        $test = parse_ini_file("$testPath/testinfo.ini", true);
    $fvOnly = false;
    if (!count($stats[1]))
        $fvOnly = true;
    $cacheLabels = array('firstView', 'repeatView');

    // summary information
    $ret = array('id' => $id, 'url' => $url, 'summary' => "http://$host$uri/results.php?test=$id");
    $runs = max(array_keys($pageData));
    if (isset($testInfo)) {
        if (array_key_exists('url', $testInfo) && strlen($testInfo['url']))
            $ret['testUrl'] = $testInfo['url'];
        if (array_key_exists('location', $testInfo) && strlen($testInfo['location'])) {
            $locstring = $testInfo['location'];
            if( array_key_exists('browser', $testInfo) && strlen($testInfo['browser']) )
                $locstring .= ':' . $testInfo['browser'];
            $ret['location'] = $locstring;
        }
        if (isset($test) &&
            array_key_exists('test', $test) &&
            is_array($test['test']) &&
            array_key_exists('location', $test['test']) &&
            strlen($test['test']['location']))
            $ret['from'] = $test['test']['location'];
        if (array_key_exists('connectivity', $testInfo) && strlen($testInfo['connectivity']))
            $ret['connectivity'] = $testInfo['connectivity'];
        if (array_key_exists('bwIn', $testInfo))
            $ret['bwDown'] = $testInfo['bwIn'];
        if (array_key_exists('bwOut', $testInfo))
            $ret['bwUp'] = $testInfo['bwOut'];
        if (array_key_exists('latency', $testInfo))
            $ret['latency'] = $testInfo['latency'];
        if (array_key_exists('plr', $testInfo))
            $ret['plr'] = $testInfo['plr'];
        if (array_key_exists('label', $testInfo) && strlen($testInfo['label']))
            $ret['label'] = $testInfo['label'];
        if (array_key_exists('completed', $testInfo))
            $ret['completed'] = $testInfo['completed'];
        if (array_key_exists('testerDNS', $testInfo) && strlen($testInfo['testerDNS']))
            $ret['testerDNS'] = $testInfo['testerDNS'];
        if (array_key_exists('runs', $testInfo) && $testInfo['runs'])
            $runs = $testInfo['runs'];
        if (array_key_exists('fvonly', $testInfo))
            $fvOnly = $testInfo['fvonly'] ? true : false;
    }
    $cachedMax = 0;
    if (!$fvOnly)
        $cachedMax = 1;
    $ret['runs'] = $runs;
    $ret['fvonly'] = $fvOnly;
    $ret['successfulFVRuns'] = CountSuccessfulTests($pageData, 0);
    if (!$fvOnly)
        $ret['successfulRVRuns'] = CountSuccessfulTests($pageData, 1);

    // average and standard deviation
    $ret['average'] = array();
    $ret['standardDeviation'] = array();
    for ($cached = 0; $cached <= $cachedMax; $cached++) {
        $label = $cacheLabels[$cached];
        $ret['average'][$label] = $stats[$cached];
        $ret['standardDeviation'][$label] = array();
        foreach($stats[$cached] as $key => $val)
            $ret['standardDeviation'][$label][$key] = PageDataStandardDeviation($pageData, $key, $cached);
    }
    
    // median
    $ret['median'] = array();
    for ($cached = 0; $cached <= $cachedMax; $cached++) {
        $label = $cacheLabels[$cached];
        $medianRun = GetMedianRun($pageData, $cached, $median_metric);
        if (array_key_exists($medianRun, $pageData)) {
            $ret['median'][$label] = GetSingleRunData($id, $testPath, $medianRun, $cached, $pageData, $testInfo);
        }
    }
    
    $ret['runs'] = array();
    for ($run = 1; $run <= $runs; $run++) {
        $ret['runs'][$run] = array();
        for ($cached = 0; $cached <= $cachedMax; $cached++) {
            $label = $cacheLabels[$cached];
            $ret['runs'][$run][$label] = GetSingleRunData($id, $testPath, $run, $cached, $pageData, $testInfo);
        }
    }
    
    return $ret;
}

/**
* Gather all of the data that we collect for a single run
* 
* @param mixed $id
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function GetSingleRunData($id, $testPath, $run, $cached, &$pageData, $testInfo) {
    $ret = null;
    if (array_key_exists($run, $pageData) &&
        is_array($pageData[$run]) &&
        array_key_exists($cached, $pageData[$run]) &&
        is_array($pageData[$run][$cached])) {
      $host  = $_SERVER['HTTP_HOST'];
      $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
      $path = substr($testPath, 1);
      $ret = $pageData[$run][$cached];
      $ret['run'] = $run;
      $cachedText = '';
      if ($cached)
          $cachedText = '_Cached';

      $basic_results = false;
      if (array_key_exists('basic', $_REQUEST) && $_REQUEST['basic'])
        $basic_results = true;
          
      if (!$basic_results && gz_is_file("$testPath/$run{$cachedText}_pagespeed.txt")) {
          $ret['PageSpeedScore'] = GetPageSpeedScore("$testPath/$run{$cachedText}_pagespeed.txt");
          $ret['PageSpeedData'] = "http://$host$uri//getgzip.php?test=$id&amp;file=$run{$cachedText}_pagespeed.txt";
      }

      $ret['pages'] = array();
      $ret['pages']['details'] = "http://$host$uri/details.php?test=$id&run=$run&cached=$cached";
      $ret['pages']['checklist'] = "http://$host$uri/performance_optimization.php?test=$id&run=$run&cached=$cached";
      $ret['pages']['breakdown'] = "http://$host$uri/breakdown.php?test=$id&run=$run&cached=$cached";
      $ret['pages']['domains'] = "http://$host$uri/domains.php?test=$id&run=$run&cached=$cached";
      $ret['pages']['screenShot'] = "http://$host$uri/screen_shot.php?test=$id&run=$run&cached=$cached";

      $ret['thumbnails'] = array();
      $ret['thumbnails']['waterfall'] = "http://$host$uri/result/$id/$run{$cachedText}_waterfall_thumb.png";
      $ret['thumbnails']['checklist'] = "http://$host$uri/result/$id/$run{$cachedText}_optimization_thumb.png";
      $ret['thumbnails']['screenShot'] = "http://$host$uri/result/$id/$run{$cachedText}_screen_thumb.png";

      $ret['images'] = array();
      $ret['images']['waterfall'] = "http://$host$uri$path/$run{$cachedText}_waterfall.png";
      $ret['images']['connectionView'] = "http://$host$uri$path/$run{$cachedText}_connection.png";
      $ret['images']['checklist'] = "http://$host$uri$path/$run{$cachedText}_optimization.png";
      $ret['images']['screenShot'] = "http://$host$uri$path/$run{$cachedText}_screen.jpg";
      if( is_file("$testPath/$run{$cachedText}_screen.png") )
          $ret['images']['screenShotPng'] = "http://$host$uri$path/$run{$cachedText}_screen.png";

      $ret['rawData'] = array();
      $ret['rawData']['headers'] = "http://$host$uri$path/$run{$cachedText}_report.txt";
      $ret['rawData']['pageData'] = "http://$host$uri$path/$run{$cachedText}_IEWPG.txt";
      $ret['rawData']['requestsData'] = "http://$host$uri$path/$run{$cachedText}_IEWTR.txt";
      $ret['rawData']['utilization'] = "http://$host$uri$path/$run{$cachedText}_progress.csv";
      if( is_file("$testPath/$run{$cachedText}_bodies.zip") )
          $ret['rawData']['bodies'] = "http://$host$uri$path/$run{$cachedText}_bodies.zip";

      if (!$basic_results) {
        $startOffset = array_key_exists('testStartOffset', $ret) ? intval(round($ret['testStartOffset'])) : 0;
        $progress = GetVisualProgress($testPath, $run, $cached, null, null, $startOffset);
        if (array_key_exists('frames', $progress) && is_array($progress['frames']) && count($progress['frames'])) {
          $cachedTextLower = strtolower($cachedText);
          $ret['videoFrames'] = array();
          foreach($progress['frames'] as $ms => $frame) {
              $videoFrame = array('time' => $ms);
              $videoFrame['image'] = "http://$host$uri$path/video_{$run}$cachedTextLower/{$frame['file']}";
              $videoFrame['VisuallyComplete'] = $frame['progress'];
              $ret['videoFrames'][] = $videoFrame;
          }
        }
        if (isset($progress) &&
            is_array($progress) &&
            array_key_exists('DevTools', $progress) &&
            is_array($progress['DevTools'])) {
            if (array_key_exists('processing', $progress['DevTools']))
                $ret['processing'] = $progress['DevTools']['processing'];
            if (array_key_exists('VisualProgress', $progress['DevTools']))
                $ret['VisualProgress'] = $progress['DevTools']['VisualProgress'];
        }
        
        $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false, true);
        $ret['domains'] = getDomainBreakdown($id, $testPath, $run, $cached, $requests);
        $ret['breakdown'] = getBreakdown($id, $testPath, $run, $cached, $requests);
        $ret['requests'] = $requests;
        $console_log = DevToolsGetConsoleLog($testPath, $run, $cached);
        if (isset($console_log))
            $ret['consoleLog'] = $console_log;
        if (gz_is_file("$testPath/$run{$cachedText}_status.txt")) {
            $ret['status'] = array();
            $lines = gz_file("$testPath/$run{$cachedText}_status.txt");
            foreach($lines as $line) {
                $line = trim($line);
                if (strlen($line)) {
                    list($time, $message) = explode("\t", $line);
                    if (strlen($time) && strlen($message))
                        $ret['status'][] = array('time' => $time, 'message' => $message);
                }
            }
        }
      }
    }
        
    return $ret;
}
?>
