<?php
chdir('..');
include('common.inc');
error_reporting(E_ERROR | E_PARSE);
require_once('archive.inc');
require_once 'page_data.inc';
ignore_user_abort(true);
set_time_limit(60*50);

// disconnect the caller
header("Content-Length: 0", true);
ob_end_flush();
flush();
ob_end_clean();
if (function_exists('fastcgi_finish_request'))
  fastcgi_finish_request();
    
if(extension_loaded('newrelic')) { 
  newrelic_add_custom_tracer('ArchiveTest');
  newrelic_add_custom_tracer('loadAllPageData');
  newrelic_add_custom_tracer('SendBeacon');
  newrelic_add_custom_tracer('SendCallback');
}

if (array_key_exists('test', $_REQUEST)) {
  $id = $_REQUEST['test'];
  if (ValidateTestId($id)) {
    $testPath = './' . GetTestPath($id);
    $testInfo = GetTestInfo($id);
    
    // see if we need to log the raw test data
    $now = time();
    $allowLog = true;
    $logPrivateTests = GetSetting('logPrivateTests');
    if ($testInfo['private'] && $logPrivateTests !== false && $logPrivateTests == 0)
      $allowLog = false;
    $pageLog = GetSetting('logTestResults');
    if ($allowLog && $pageLog !== false && strlen($pageLog)) {
      $pageData = loadAllPageData($testPath);
      if (isset($pageData) && is_array($pageData)) {
        foreach($pageData as $run => &$pageRun) {
          foreach($pageRun as $cached => &$testData) {
            $testData['reportedTime'] = gmdate('r', $now);
            $testData['reportedEpoch'] = $now;
            $testData['testUrl'] = $testInfo['url'];
            $testData['run'] = $run;
            $testData['cached'] = $cached;
            $testData['testLabel'] = $testInfo['label'];
            $testData['testLocation'] = $testInfo['location'];
            $testData['testBrowser'] = $testInfo['browser'];
            $testData['testConnectivity'] = $testInfo['connectivity'];
            $testData['tester'] = array_key_exists('test_runs', $testInfo) && array_key_exists($run, $testInfo['test_runs']) && array_key_exists('tester', $testInfo['test_runs'][$run]) ? $testInfo['test_runs'][$run]['tester'] : $testInfo['tester'];
            $testData['testRunId'] = "$id.$run.$cached";
            $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
            $testData['testResultUrl'] = "$protocol://{$_SERVER['HTTP_HOST']}/details.php?test=$id&run=$run&cached=$cached";
            error_log(json_encode($testData) . "\n", 3, $pageLog);
          }
        }
      }
    }
    $requestsLog = GetSetting('logTestRequests');
    if ($allowLog && $requestsLog !== false && strlen($requestsLog)) {
      require_once('object_detail.inc');
      $max_cached = $testInfo['fvonly'] ? 0 : 1;
      for ($run = 1; $run <= $testInfo['runs']; $run++) {
        for ($cached = 0; $cached <= $max_cached; $cached++) {
          $secure = false;
          $haveLocations = false;
          $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);
          if (isset($requests) && is_array($requests)) {
            foreach ($requests as &$request) {
              $request['reportedTime'] = gmdate('r', $now);
              $request['reportedEpoch'] = $now;
              $request['testUrl'] = $testInfo['url'];
              $request['run'] = $run;
              $request['cached'] = $cached;
              $request['testLabel'] = $testInfo['label'];
              $request['testLocation'] = $testInfo['location'];
              $request['testBrowser'] = $testInfo['browser'];
              $request['testConnectivity'] = $testInfo['connectivity'];
              $request['tester'] = array_key_exists('test_runs', $testInfo) && array_key_exists($run, $testInfo['test_runs']) && array_key_exists('tester', $testInfo['test_runs'][$run]) ? $testInfo['test_runs'][$run]['tester'] : $testInfo['tester'];
              $request['testRunId'] = "$id.$run.$cached";
              $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
              $request['testResultUrl'] = "$protocol://{$_SERVER['HTTP_HOST']}/details.php?test=$id&run=$run&cached=$cached";
              error_log(json_encode($request) . "\n", 3, $requestsLog);
            }
          }
        }
      }
    }

    // log any slow tests
    $slow_test_time = GetSetting('slow_test_time');
    if (isset($testInfo) && $slow_test_time && array_key_exists('url', $testInfo) && strlen($testInfo['url'])) {
      $elapsed = time() - $testInfo['started'];
      if ($elapsed > $slow_test_time) {
        $log_entry = gmdate("m/d/y G:i:s", $testInfo['started']) . "\t$elapsed\t{$testInfo['ip']}\t{$testInfo['url']}\t{$testInfo['location']}\t$id\n";
        error_log($log_entry, 3, './tmp/slow_tests.log');
      }
    }
    
    // see if we need to send a showslow beacon
    $beaconUrl = null;
    if( isset($testInfo) && !$testInfo['private'] ) {
      $showslow = GetSetting('showslow');
      if (strpos($id, '.') === false && $showslow && strlen($showslow))
      {
          $beaconUrl = "$showslow/beacon/webpagetest/";
          $showslow_key = GetSetting('showslow_key');
          if ($showslow_key && strlen($showslow_key))
            $beaconUrl .= '?key=' . trim($showslow_key);
          $beaconRate = GetSetting('beaconRate');
          if ($beaconRate && rand(1, 100) > $beaconRate ) {
            unset($beaconUrl);
          } else {
            $lock = LockTest($id);
            if ($lock) {
              $testInfo = GetTestInfo($id);
              if ($testInfo) {
                $testInfo['showslow'] = 1;
                SaveTestInfo($id, $testInfo);
              }
              UnlockTest($lock);
            }
          }
      }
    }

    // archive the actual test
    ArchiveTest($id, false);

    // post the test to tsview if requested
    $tsviewdb = GetSetting('tsviewdb');
    if (array_key_exists('tsview_id', $testInfo) &&
        strlen($testInfo['tsview_id']) &&
        strlen($tsviewdb) &&
        is_file('./lib/tsview.inc.php')) {
      require_once('./lib/tsview.inc.php');
      TSViewPostResult($testInfo, $id, $testPath, $settings['tsviewdb'], $testInfo['tsview_id']);
    }

    // post the test to statsd if requested
    if (GetSetting('statsdHost') &&
        is_file('./lib/statsd.inc.php')) {
      require_once('./lib/statsd.inc.php');
      StatsdPostResult($testInfo, $testPath);
    }
 
    // Send an email notification if necessary
    $notifyFrom = GetSetting('notifyFrom');
    if ($notifyFrom && strlen($notifyFrom) && is_file("$testPath/testinfo.ini")) {
      $host = GetSetting('host');
      $test = parse_ini_file("$testPath/testinfo.ini",true);
      if( array_key_exists('notify', $test['test']) && strlen($test['test']['notify']) )
        notify( $test['test']['notify'], $notifyFrom, $id, $testPath, $host );
    }

    // send a callback/pingback request
    if (isset($testInfo) && isset($testInfo['callback']) && strlen($testInfo['callback'])) {
      $send_callback = true;
      $testId = $id;
      if (array_key_exists('batch_id', $testInfo) && strlen($testInfo['batch_id'])) {
        require_once('testStatus.inc');
        $testId = $testInfo['batch_id'];
        $status = GetTestStatus($testId);
        $send_callback = false;
        if (array_key_exists('statusCode', $status) && $status['statusCode'] == 200)
          $send_callback = true;
      }
      
      if ($send_callback) {
        $url = $testInfo['callback'];
        if( strncasecmp($url, 'http', 4) )
          $url = "http://" . $url;
        if( strpos($url, '?') == false )
          $url .= '?';
        else
          $url .= '&';
        $url .= "id=$testId";
        SendCallback($url);
      }
    }

    // send a beacon?
    if (isset($beaconUrl) && strlen($beaconUrl)) {
      if (!isset($pageData))
        $pageData = loadAllPageData($testPath);
      include('./work/beacon.inc');
      SendBeacon($beaconUrl, $id, $testPath, $testInfo, $pageData);
    }
    logTestMsg($id, "Test post-processing complete");
  }
}

function SendCallback($url) {
  if (function_exists('curl_init')) {
    $c = curl_init();
    curl_setopt($c, CURLOPT_URL, $url);
    curl_setopt($c, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($c, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($c, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($c, CURLOPT_TIMEOUT, 10);
    curl_exec($c);
    curl_close($c);
  } else {
    $context = stream_context_create(array('http' => array('header'=>'Connection: close', 'timeout' => 10)));
    file_get_contents($url, false, $context);
  }
}

/**
* Send a mail notification to the user
* 
* @param mixed $mailto
* @param mixed $id
* @param mixed $testPath
*/
function notify( $mailto, $from,  $id, $testPath, $host )
{
    global $test;
    
    // calculate the results
    require_once 'page_data.inc';
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=iso-8859-1\r\n";
    $headers .= "From: $from\r\n";
    $headers .= "Reply-To: $from";
    
    $pageData = loadAllPageData($testPath);
    $url = trim($pageData[1][0]['URL']);
    $shorturl = substr($url, 0, 40);
    if( strlen($url) > 40 )
        $shorturl .= '...';
    
    $subject = "Test results for $shorturl";
    $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
    if( !isset($host) )
        $host  = $_SERVER['HTTP_HOST'];

    $fv = GetMedianRun($pageData, 0);
    if( isset($fv) && $fv ) {
        $load = number_format($pageData[$fv][0]['loadTime'] / 1000.0, 3);
        $render = number_format($pageData[$fv][0]['render'] / 1000.0, 3);
        $numRequests = number_format($pageData[$fv][0]['requests'],0);
        $bytes = number_format($pageData[$fv][0]['bytesIn'] / 1024, 0);
        $result = "$protocol://$host/result/$id";
        
        // capture the optimization report
        require_once 'optimization.inc';
        require_once('object_detail.inc');
        $secure = false;
        $haveLocations = false;
        $requests = getRequests($id, $testPath, 1, 0, $secure, $haveLocations, false);
        ob_start();
        dumpOptimizationReport($pageData[$fv][0], $requests, $id, 1, 0, $test);
        $optimization = ob_get_contents();
        ob_end_clean();
        
        // build the message body
        $body = 
        "<html>
            <head>
                <title>$subject</title>
                <style type=\"text/css\">
                    .indented1 {padding-left: 40pt;}
                    .indented2 {padding-left: 80pt;}
                </style>
            </head>
            <body>
            <p>The full test results for <a href=\"$url\">$url</a> are now <a href=\"$result/\">available</a>.</p>
            <p>The page loaded in <b>$load seconds</b> with the user first seeing something on the page after <b>$render seconds</b>.  To download 
            the page required <b>$numRequests requests</b> and <b>$bytes KB</b>.</p>
            <p>Here is what the page looked like when it loaded (click the image for a larger view):<br><a href=\"$result/$fv/screen_shot/\"><img src=\"$result/{$fv}_screen_thumb.jpg\"></a></p>
            <h3>Here are the things on the page that could use improving:</h3>
            $optimization
            </body>
        </html>";

        // send the actual mail
        mail($mailto, $subject, $body, $headers);
    }
}

?>
