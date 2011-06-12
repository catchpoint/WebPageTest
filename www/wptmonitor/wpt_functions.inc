<?php
include_once 'utils.inc';
$wptResultsDir = dirname(__FILE__) . "/wpt_results/";

/**
 * @param  $id 'The wpt result ID'
 * @param  $xmlResults 'The contents of the result'
 * @return void
 */
function saveWPTXmlResults($id, $xmlResults) {
  // Save raw XML
  $wptResultsDir = dirname(__FILE__) . "/wpt_results/";
  $pathName = $wptResultsDir . $id;
  if (!is_dir($pathName)) {
    mkdir($pathName, 0755, true);
  }
  $fh = fopen($pathName . "/xmlResult.xml", "w+");
  if (fwrite($fh, $xmlResults) === false) {
    // TODO: handle error
  }
  fclose($fh);
}

/**
 * Fetch all result assets and save locally
 * 
 * @param  $id 'The wpt result ID'
 * @param  $xmlResult 'The contents of the result'
 * @return void
 *
  */
function saveWPTAssets($id, $xmlResult) {

  // Fetch individual assets
  $xml = new SimpleXMLElement($xmlResult);

  $item = $xml->data->run->firstView->thumbnails;
  saveWPTAssetsChildrenOf($id, $item);

  $item = $xml->data->run->firstView->images;
  saveWPTAssetsChildrenOf($id, $item);

  $item = $xml->data->run->firstView->rawData;
  saveWPTAssetsChildrenOf($id, $item);

  $item = $xml->data->run->firstView->videoFrames;
  if ($item) {
    saveWPTVideoFrames($id, $item);
  }

}
/**
 * Save the video frames
 *
 * @param  $id
 * @param  $videoFramesNode
 * @return void
 */
function saveWPTVideoFrames($id, $videoFramesNode) {
  global $wptResultsDir;
  $pathName = $wptResultsDir . $id;

  if (!is_dir($pathName)) {
    mkdir($pathName, 0, true);
  }

  foreach ($videoFramesNode->frame as $frame) {
    $image = $frame->image;
    $item = file_get_contents($image);
    $fileName = basename($image);
    $fh = fopen($pathName . "/" . $fileName, "w+");
    if (fwrite($fh, $item) === false) {
      // TODO: handle error
    }
    fclose($fh);

  }
}

function saveWPTAssetsChildrenOf($id, $node) {
  global $wptResultsDir;
  $pathName = $wptResultsDir . $id;

  $dc = $node->children();
  if (!is_dir($pathName)) {
    mkdir($pathName, 0, true);
  }

  foreach ($dc as $child) {
    $fileName = basename($child);
    $item = file_get_contents($child);
    $fh = fopen($pathName . "/" . $fileName, "w+");
    if (fwrite($fh, $item) === false) {
      // TODO: handle error
    }
    fclose($fh);
  }
}

/**
 * Submit a request to the wpt host
 *
 * @param  $wptHost
 * @param  $urlToTest
 * @param  $label
 * @param  $remoteAgentId
 * @param  $runs
 * @param  $fvonly
 * @param  $video
 * @param  $navscript
 * @param  $authenticate
 * @param  $authuser
 * @param  $authpassword
 * @return string
 */
function submitWPTRequest($wptHost,
                          $urlToTest,
                          $label,
                          $remoteAgentId,
                          $runs,
                          $fvonly,
                          $video,
                          $navscript,
                          $authenticate,
                          $authuser,
                          $authpassword,
                          $format = "xml",
                          $private = 1,
                          $bwDown = null,
                          $bwUp = null,
                          $latency = null,
                          $plr = null,
                          $priority = 9) {
  $resultStatus = array();
  $resultStatus['statusText']="Success";
  $baseURL = getBaseURL();
  // Defaults to -1 indicating failure
  $wptResultId = "-1";
  $req = new HttpRequest($wptHost, HTTP_METH_POST);
  $params = array();
  $params['agent'] = 'wptmonitor';
  $params['callback'] = $baseURL.'/wptCallBack.php';
  $params['url'] = $urlToTest;
  $params['f'] = $format;
  $params['label'] = $label;
  $params['runs'] = $runs;
  $params['fvonly'] = $fvonly;
  $params['video'] = $video;
  $params['private'] = $private;
  $params['priority'] = $priority;
  if ($bwDown!=null && $bwUp!=null && $latency!=null  && $plr!=null ){
    $params['location'] .= $remoteAgentId.'.custom';
    $params['bwDown'] = $bwDown;
    $params['bwUp'] = $bwUp;
    $params['latency'] = $latency;
    $params['plr'] = $plr;
  } else {
    $params['location'] = $remoteAgentId;
  }

  if ($authenticate){
    $params['authType'] = 0;
    $params['login']=$authuser;
    $params['password']=$authpassword;
  }
  if ($navscript) {
    $params['script'] = $navscript;
  }
  $req->addQueryData($params);

  try {
    $response = $req->send();
    /**
     *
<?xml version="1.0" encoding="UTF-8"?>
<response>
<statusCode>400</statusCode>
<statusText>WPT Monitor is not intended to be used against this instance of WebPagetest.</statusText>
</response>
     *
     *
<?xml version="1.0" encoding="UTF-8"?>
<response>
<statusCode>400</statusCode>
<statusText>Invalid Script.  Please contact us if you need help with your test script.</statusText>
</response>
     *
     *
<?xml version="1.0" encoding="UTF-8"?>
  <response>
  <statusCode>200</statusCode>
  <statusText>Ok</statusText>
  <data>
    <testId>101014_3A3</testId>
    <xmlUrl>http://wpt.mtvly.com/xmlResult/101014_3A3/</xmlUrl>
    <userUrl>http://wpt.mtvly.com/result/101014_3A3/</userUrl>
  </data>
</response>
     */
    $responseCode = $req->getResponseCode();
    $responseXml = $req->getResponseBody();

    if ($responseCode != 200 ){
      $resultStatus['statusText'] = "Job Submission failed with http response code: ".$responseCode;
      logOutput("[ERROR] [submitWPTRequest] Job Submission failed with http response code: ".$responseCode);
    } else {
      $xml = new SimpleXMLElement($responseXml);
      if ( $xml->statusCode == "200" ){
        $wptResultId = $xml->data->testId;
      } else {
        $resultStatus['statusText'] = "Job Submission failed with message: ".$xml->statusText;
        logOutput("[ERROR] [submitWPTRequest] Job Submission failed with message: ".$xml->statusText);
      }
    }
  } catch (HttpException $ex) {
    $resultStatus['statusText'] = "Exception: ".$ex->getMessage();
    logOutput("[ERROR] [submitWPTRequest] Exception: ".$ex->getMessage()." ".$responseXml);
  }
  $resultStatus['wptResultId']=$wptResultId;
  return $resultStatus;
}

/**
 * Process script tokens
 *
 * @param  $script
 * @return array
 */
function processTokens($script) {
  $result = array();
  $exp = explode("\n", $script);

  foreach ($exp as $l) {
    $eqLocation = strpos($l, '=');
    $key = trim(substr($l, 0, $eqLocation));
    $token = trim(substr($l, $eqLocation + 1));

    if (substr($token, 0, 11) == 'RANDOM_TEXT') {
      $startParen = strpos($token, "(");
      $endParen = strrpos($token, ")");
      $paramStr = substr($token, $startParen + 1, $endParen - $startParen - 1);
      $result[$key] = generateTextFromList($paramStr);
      continue;
    }
    if (substr($token, 0, 13) == 'RANDOM_NUMBER') {
      $startParen = strpos($token, "(");
      $endParen = strrpos($token, ")");
      $paramStr = substr($token, $startParen + 1, $endParen - $startParen - 1);
      $params = explode(",", $paramStr);
      $result[$key] = generateRandomNumber($params[0], $params[1]);
      continue;
    }
    if (substr($token, 0, 20) == 'RANDOM_FUTURE_MONTH(') {
      $startParen = strpos($token, "(");
      $endParen = strrpos($token, ")");
      $paramStr = substr($token, $startParen + 1, $endParen - $startParen - 1);
      $params = explode(",", $paramStr);
      $result[$key] = generateRandomFutureMonth($params[0], $params[1]);
      continue;
    }
    if (substr($token, 0, 19) == 'RANDOM_FUTURE_DATE(') {
      $startParen = strpos($token, "(");
      $endParen = strrpos($token, ")");
      $paramStr = substr($token, $startParen + 1, $endParen - $startParen - 1);
      $params = explode(",", $paramStr);
      $result[$key] = generateRandomDate($params[0], $params[1], $params[2]);
      continue;
    }

  }
  return $result;
}
/**
 * Returns a random selection from a list of text items
 *
 * @param  $list
 * @return
 */
function generateTextFromList($list) {
  $l = explode("`", $list);
  $size = sizeof($l);
  $num = rand(0, (int) $size-1);
  return $l[$num];
}

/**
 * Generates a random number
 *
 * @param int $from
 * @param int $to
 * @return int
 */
function generateRandomNumber($from = 0, $to = 10000) {
  $num = rand((int) $from, (int) $to);
  return $num;
}

/**
 * Generate a random month in the future
 *
 * @param int $min Minumum number of months from now
 * @param int $max maximum number of months from now
 * @return void
 */
function generateRandomFutureMonth($min, $max) {
  $month = Date('n');
  $r = rand((int) $min, (int) $max);
  return $month+$r;
}

/**
 * Generate a random date with the given format
 *
 * @param int $from
 * @param int $to
 * @param string $format
 * @return string
 */
function generateRandomDate($from = 0, $to = 365, $format = "Y-m-d") {
  // Get rid of any ' in format
  $format = str_replace("'", "", $format);
  $r = rand((int) $from, (int) $to);
  $time = time() + ($r * 86400);
  $date = Date($format, $time);
  return $date;
}

function getWPTResultPath($wptResultId) {
  $path = "/" . substr($wptResultId, 0, 2) . "/" . substr($wptResultId, 2, 2) . "/" . substr($wptResultId, 4, 2) . "/" . substr($wptResultId, 7) . "/";
  return $path;
}

/**
 * Check to see if new user registration is allowed
 * @return boolean
 */
function isRegistrationEnabled() {
  $configTable = Doctrine_Core::getTable('WPTMonitorConfig');
  $config = $configTable->find(1);
  return $config['EnableRegistration'];
}

function getWptConfigFor($key) {
  $configTable = Doctrine_Core::getTable('WPTMonitorConfig');
  $config = $configTable->find(1);
  return $config['JobProcessorAuthenticationKey'];
}

function getWptLocations() {
  $q = Doctrine_Query::create()->from('WPTLocation l');
  $locations = $q->execute();
  $q->free(true);
  return $locations;
}

function processJobsForUser($userId, $jobId = null, $force = false, $runLabel="", $priority=9) {
  global $wptRuntest;
  // Update location information
  $locationInformation = getLocationInformation();

  logOutput("[DEBUG] [processJobsForUsers] start: " .current_seconds()." mem: ". intval(memory_get_usage() / 1024));

  $userTable = Doctrine_Core::getTable('User');
  $user = $userTable->find($userId);
  
  $scriptTable = Doctrine_Core::getTable('WPTScript');
  $jobTable= Doctrine_Core::getTable('WPTJob');
  if ( !$user ){
    logOutput("[ERROR] [ProcessJob] User not found for ID: ".$userId);
    return;
  }
  logOutput("[INFO] [ProcessJob] Processing jobs for " . $user['Username']);

  if ($jobId != null) {
    $q = Doctrine_Query::create()->from('WPTJob j')
        ->where('j.Id= ?', $jobId)
        ->andWhere('j.UserId = ?',$userId)->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    $result = $q->fetchArray();
  } else {
    $q = Doctrine_Query::create()->from('WPTJob j')
        ->where('j.UserId = ?',$userId)->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    $result = $q->fetchArray();
  }
  
  logOutput("[DEBUG] [processJobsForUsers] before looping through results: " .current_seconds()." mem: ". intval(memory_get_usage() / 1024));
  try {
    foreach ($result as $row)
    {
      // Check current queue size for the jobs configured location
      // If it's greater than the threshold then skip the job submission.
      $skipJobSubmission = false;
      foreach ($locationInformation as $location){
        if ( $location['hostURL'] == $row['Host'] && $location['id'] == $row['Location'] ){
          $queueSize = $location['PendingTests'];
          $threshold = getLocationThreshold($location['hostURL'],$location['id']);

          if ( $threshold != 0 && ( $queueSize && $threshold && ($queueSize > $threshold) ) ){
            logOutput("[INFO] [ProcessJob] Skipping job due to high load on location: ".$location['hostURL']." ".$location['id']." queue size: ".$queueSize." greater than the threshold: ".$threshold);
            $skipJobSubmission = true;
            break;
          }
        }
      }
      if ($skipJobSubmission)
        continue;

      $id = $row['Id'];
      $label = $row['Label'];
      $dte = current_seconds();
      $script = $scriptTable->find($row['WPTScriptId']);
      
      // Data stored in the table is in minutes, convert it to seconds.
      $frequencyInSeconds = $row['Frequency'] * 60;

      if ($row['Active'] == 0 && !$force) {
        logOutput("[INFO] [ProcessJob] Skipped Inactive job. Id:$id Label:$label");
      } else {
        // If the field is empty or time is up it's time to run
        if ($force || ((!$row['Lastrun'] || $dte > $row['Lastrun'] + $frequencyInSeconds))) {
          // Process script if it exists
          if ($script['URLScript']) {
            $url = processURLScript($script['URLScript'], $script['URL']);
            logOutput("[INFO] [ProcessJob] Id:$id Label:$label URL:$url");
          } else {
            $url = $script['URL'];
          }
          if ($script['NavigationScript']) {
            $navscript = processURLScript($script['URLScript'], $script['NavigationScript']);
          } else {
            $navscript = $script['NavigationScript'];
          }
          $authenticate = $script['Authenticate'];
          $authuser = $script['AuthUser'];
          $authpassword= $script['AuthPassword'];

          $wptResult = new WPTResult();
          $wptResult['WPTJobId']=$row['Id'];
          $wptResult['Date'] = current_seconds();
          $wptResult['RunLabel'] = $runLabel;
          // TODO: Add option in JOB Table for inclusion of tracking param
//          if ( true ){
//            $mjid=$row['Id'];
//            if ( strpos($url,"?") > -1 ){
//              $url = $url.'&__wptmjid='.$mjid.'_'.$wptResult['Date'];
//            } else {
//              $url = $url.'?__wptmjid='.$mjid.'_'.$wptResult['Date'];
//            }
//          }
          // Default DSL settings

          $private = 1;
          $bwDown = 1500;
          $bwUp = 384;
          $latency = 50;
          $plr = 0;

          if ( $row['WPTBandwidthDown'])
            $bwDown = $row['WPTBandwidthDown'];

          if ( $row['WPTBandwidthUp'])
            $bwUp = $row['WPTBandwidthUp'];

          if ( $row['WPTBandwidthLatency'])
            $latency = $row['WPTBandwidthLatency'];

          if ( $row['WPTBandwidthPacketLoss'])
            $plr = $row['WPTBandwidthPacketLoss'];

          $format = "xml";

          logOutput("[DEBUG] [processJobsForUsers] before submitWPTRequest: " .current_seconds()." mem: ". intval(memory_get_usage() / 1024));
            $wptRes = submitWPTRequest(
            $row['Host'] .$wptRuntest,
            $url,
            $row['Label'],
            $row['Location'],
            $row['Runs'],
            $row['FirstViewOnly'],
            $row['Video'],
            $navscript,
            $authenticate,
            $authuser,
            $authpassword,
            $format,
            $private,
            $bwDown,
            $bwUp,
            $latency,
            $plr,
            $priority);

          $wptResultId = $wptRes['wptResultId'];
          $wptResultText = $wptRes['statusText'];
          logOutput("[DEBUG] [processJobsForUsers] after submitWPTRequest: " .current_seconds()." mem: ". intval(memory_get_usage() / 1024));
//          $row['Lastrun'] = $dte;
          if ($wptResultId == "-1"){
            $wptResult['Status'] = "905";
            $wptResult['ValidationState'] = 2;
          }else{
            $wptResult['Status'] = "100";
          }
          $wptResult['WPTResultId'] = $wptResultId;
          $wptResult['WPTHost'] = $row['Host'];
          $wptResult['DownloadResultXml'] = $row['DownloadResultXml'];
          $wptResult['DownloadDetails'] = $row['DownloadDetails'];
          $wptResult['MaxDownloadAttempts'] = $row['MaxDownloadAttempts'];
          $wptResult['Runs'] = $row['Runs'];
          $wptResult['RunToUseForAverage'] = $row['RunToUseForAverage'];
          $wptResult['FirstStatusUpdate'] = current_seconds();
          $wptResult['LastStatusUpdate'] = current_seconds();
          $wptResult['MultiStep'] = $script['MultiStep']; 
          $wptResult['Validate'] = $script['Validate'];
          $wptResult['ValidationRequest'] = $script['ValidationRequest'];
          $wptResult['ValidationType'] = $script['ValidationType'];
          $wptResult['ValidationMarkAs'] = $script['ValidationMarkAs'];
          $wptResult['ValidationMarkAsElse'] = $script['ValidationMarkAsElse'];
          $wptResult['WPTBandwidthDown'] = $bwDown;
          $wptResult['WPTBandwidthUp'] = $bwUp;
          $wptResult['WPTBandwidthLatency'] = $latency;
          $wptResult['WPTBandwidthPacketLoss'] = $plr;

          $wptResult->save();
          $r = $jobTable->find($id);
          $r['Lastrun'] = $dte;
          $r->save();
          unset($row);
          unset($r);
          unset($wptResult);
          logOutput("[INFO] [ProcessJob] Id:$id Label:$label Sumitted job for processing\n url: " . $url, $wptResultId);
          if ($navscript) {
            logOutput("[INFO] [ProcessJob] Id:$id Label:$label Nav Script\n" . $navscript);
          }
        } else {
          logOutput("[INFO] [ProcessJob] Skipping Job. Scheduled interval not passed. Id:$id Label:$label ");
        }
      }
    }
  }
  catch (Exception $e)
  {
    error_log("[WPTMonitor] Failed while Executing job: " . $id . " message: " . $e->getMessage());
    logOutput('[ERROR] [processJobsForUsers] Exception : ' . $e->getMessage() . "");
    exit;
  }
  logOutput("[DEBUG] [processJobsForUsers] after looping: " .current_seconds()." mem: ". intval(memory_get_usage() / 1024));
  unset($result);
  $user->free(true);
  unset($user);
  logOutput("[DEBUG] [processJobsForUsers] after cleanup: " .current_seconds()." mem: ". intval(memory_get_usage() / 1024));
}


// return our current unix time in millis
function current_seconds() {
//  date_default_timezone_set('UTC');
  $t = gmdate('U');
//  date_default_timezone_set($_SESSION['ls_timezone']);
  return $t;

  list($usec, $sec) = explode(" ", microtime());
  return round(((float) $usec + (float) $sec));
}

function processResultsForAll( $resultId = null ) {
  global $wptXmlResult;
  // Process results

  try
  {
    if ( $resultId == null ){
      // Only fetch jobs that are "100" / still processing
      $q = Doctrine_Query::create()->from('WPTResult r')->where('r.Status = ?', '100');
      $results = $q->execute();
    } else {
      $q = Doctrine_Query::create()->from('WPTResult r')->where('r.WPTResultId = ?', $resultId);
      $results = $q->execute();
    }
    $q->free(true);
    foreach ($results as $result)
    {
      $wptResultId = $result['WPTResultId'];
      $runToUse = $result['RunToUseForAverage'];

      // If we have no valid wpt result id then skip and continue
      if ($wptResultId < 0) {
        continue;
      }

      $id = $result['Id'];

      // If we have a resultId we assume we are forcing a refresh and will ignore max attempts
      if (!$resultId){
        if ($result['DownloadAttempts'] > $result['MaxDownloadAttempts']) {
          // Set to 900 to indicate timeout
          logOutput("[WARN] [ProcessResults] Max download attempts exceeded. Deactivating WPTResultId: $wptResultId Id: $id",$wptResultId);
          $result['Status'] = "910";
          $result->save();
          continue;
        }
        // Increment download attempt count;
        incrementDownloadAttempts($id);
      }
      if ( !$wptResultId ){
        continue;
      }
      try {
        $resultXml = file_get_contents($result['WPTHost'] . $wptXmlResult . $wptResultId . "/");
      } catch (Exception $e) {
        logOutput("[ERROR] [ProcessResults] Failed to retrieve xml for WPTResultId: $wptResultId Id: $id",$wptResultId);
        continue;
      }

      if (!$resultXml) {
        logOutput("[ERROR] [ProcessResults] Empty xml retrieved for WPTResultId: $wptResultId Id: $id",$wptResultId);
        continue;
      }

      try {
        $xml = new SimpleXMLElement($resultXml);
      } catch (Exception $e) {
        // Ignore and continue
        logOutput("[ERROR] [ProcessResults] Failed to parse XML for WPTResultId: $wptResultId Id: $id",$wptResultId);
        continue;
      }
      $status = $xml->statusCode;
      // If no valid statusCode then assume error.
      if (! $xml || !$xml->statusCode){
        logOutput("[ERROR] [ProcessResults] Failed to get statusCode for WPTResultId: $wptResultId Id: $id",$wptResultId);
        continue;
      }
      // If 100 then it's still waiting
      $result['Status'] = $status;

      if ($status == "100") {
        logOutput("[INFO] [ProcessResults] $wptResultId Processing");
        continue;
      }
      // Only process 200s
      if ($status == "200" || $resultId ) {
        logOutput("[INFO] [ProcessResults] $wptResultId Completed",$wptResultId);
        // Check for empty run
        $headersLocation = $xml->data->run[$runToUse - 1]->firstView->rawData->headers;
        // TODO: Remove Strangeloop specific code, or make this feature generic.
        $headers = file_get_contents($headersLocation);
        $request57 = strpos($headers,"Request 6:");

        $pageDataLocation = $xml->data->run[0]->firstView->rawData->pageData;
        $pageData = file_get_contents($pageDataLocation);
        $pageDataLocationRepeatView = $xml->data->run[0]->repeatView->rawData->pageData;
        $pageDataRepeatView = file_get_contents($pageDataLocationRepeatView );

        if ( $pageData ){
          $lines = explode("\n",$pageData);
          if ($lines){
            $headers = explode("\t",$lines[0]);
            $line = explode("\t",$lines[1]);
          }
          foreach( $headers as $key=>$header){
            //Set default
            $dialerId = '0';
            if ($header == "Dialer ID"){
              $dialerId = $line[$key];
            }
            if ( $header == "Error Code"){
              // Ignore the 99999.
  //            if (!$line[$key] == "99999"){
                $errorCode = $line[$key];
  //            }
            }
          }
        }
        if ( $errorCode ){
          $status = $errorCode;
        } else {
          $status = $xml->statusCode;
        }
        // If 100 then it's still waiting
        $result['Status'] = $status;

        if ($xml->data->runs == 0) {
          logOutput("[WARN] [ProcessResults] Result set with 0 runs for WPTResultdId: $wptResultId Id: $id");
          updateJobStatus($id, "999");
          continue;
        }
        $testComplete = $xml->data->run->firstView->results->date;
        // if = then use average.
        if ( $runToUse == 0 ){
          $avgFV = $xml->data->average->firstView;
          $avgRV = $xml->data->average->repeatView;
          $avgRun = $xml->data->average->firstView->avgRun;
          $requestDataLocation = $xml->data->run[$avgRun-1]->firstView->rawData->requestsData;
          $pageDataLocation = $xml->data->run[$avgRun-1]->firstView->rawData->pageData;

        } else {
          $avgFV = $xml->data->run[$runToUse - 1]->firstView->results;
          $avgRV = $xml->data->run[$runToUse - 1]->repeatView->results;
          $requestDataLocation = $xml->data->run[$runToUse-1]->firstView->rawData->requestsData;
          $requestDataLocationRepeatView = $xml->data->run[$runToUse-1]->repeatView->rawData->requestsData;
          $pageDataLocationRepeatView = $xml->data->run[$avgRun-1]->repeatView->rawData->pageData;
       }
        $result['DialerId']=$dialerId;
        if ($avgFV) {
          $result['AvgFirstViewLoadTime'] = $avgFV->loadTime;
          $result['AvgFirstViewFirstByte'] = $avgFV->TTFB;
          $result['AvgFirstViewStartRender'] = $avgFV->render;
          $result['AvgFirstViewDocCompleteTime'] = $avgFV->docTime;
          $result['AvgFirstViewDocCompleteRequests'] = $avgFV->requestsDoc;
          $result['AvgFirstViewDocCompleteBytesIn'] = $avgFV->bytesInDoc;
          $result['AvgFirstViewDomTime'] = $avgFV->domTime;
          $result['AvgFirstViewFullyLoadedTime'] = $avgFV->fullyLoaded;
          $result['AvgFirstViewFullyLoadedRequests'] = $avgFV->requests;
          $result['AvgFirstViewFullyLoadedBytesIn'] = $avgFV->bytesIn;
        }
        if ($avgRV) {
          $result['AvgRepeatViewLoadTime'] = $avgRV->loadTime;
          $result['AvgRepeatViewFirstByte'] = $avgRV->TTFB;
          $result['AvgRepeatViewStartRender'] = $avgRV->render;
          $result['AvgRepeatViewDocCompleteTime'] = $avgRV->docTime;
          $result['AvgRepeatViewDocCompleteRequests'] = $avgRV->requestsDoc;
          $result['AvgRepeatViewDocCompleteBytesIn'] = $avgRV->bytesInDoc;
          $result['AvgRepeatViewDomTime'] = $avgRV->domTime;
          $result['AvgRepeatViewFullyLoadedTime'] = $avgRV->fullyLoaded;
          $result['AvgRepeatViewFullyLoadedRequests'] = $avgRV->requests;
          $result['AvgRepeatViewFullyLoadedBytesIn'] = $avgRV->bytesIn;
        }


        if ($testComplete) {
          $result['Date'] = $testComplete;
        } else {
          $result['Date'] = current_seconds();
        }
        if ($result['DownloadResultXml']) {
          saveWPTXmlResults($wptResultId, $resultXml);
        }
        if ($result['DownloadDetails']) {
          saveWPTAssets($wptResultId, $resultXml);
        }
        if ($result['Validate']){
          $validationRequest = $result['ValidationRequest'];
          $validationType = $result['ValidationType'];
          $validationMarkAs = $result['ValidationMarkAs'];
          $validationMarkAsElse = $result['ValidationMarkAsElse'];
          $requestData = retrieveRequestsData($requestDataLocation );
//          $requestDataRepeatView = retrieveRequestsData($requestDataLocationRepeatView );
          $result['ValidationState'] = $validationMarkAsElse;
          foreach ($requestData as $request){
            if ( preg_match($validationRequest, $request['url']) ){
              if ( $validationType == VALIDATION_TYPE_MATCH ){
                $result['ValidationState'] = $validationMarkAs;
                break;
              } else {
                if ($validationType == VALIDATION_TYPE_NOMATCH){
                  break;
                } else {
                  $result['ValidationState'] = $validationMarkAs;
                }
              }
            }
          }
        }
        if ( $result['AvgFirstViewLoadTime']=0
            && $result['AvgFirstViewFirstByte']=0
            && $result['AvgFirstViewDocCompleteTime']=0
            && $result['AvgFirstViewStartRender']=0){
          $result['ValidationState'] = 2;
        }
        // If this is a multi page job page test will report incorrect numbers. This routine
        // Will calculate correct numbers from the actual request data.
        if ( $result['MultiStep'] ){
          $pageData = file_get_contents($pageDataLocation);
          if ($pageData){
            $pageDataArray = delimitedToArray($pageData,"\t",true);
            if ( $pageDataArray ){
              $result['AvgFirstViewDocCompleteTime'] = array_sum(getArrayFor($pageDataArray,'Doc Complete Time (ms)'));
              $result['AvgFirstViewDocCompleteRequests'] = array_sum(getArrayFor($pageDataArray,'Requests (Doc)'));
              $result['AvgFirstViewDocCompleteBytesIn'] = array_sum(getArrayFor($pageDataArray,'Bytes In (Doc)'));
              $result['AvgFirstViewFullyLoadedTime'] = array_sum(getArrayFor($pageDataArray,'Activity Time(ms)'));
              $result['AvgFirstViewFullyLoadedRequests'] = array_sum(getArrayFor($pageDataArray,'Requests'));
              $result['AvgFirstViewFullyLoadedBytesIn'] = array_sum(getArrayFor($pageDataArray,'Bytes In'));
              $result['AvgFirstViewFirstByte'] = array_sum(getArrayFor($pageDataArray,'Time to First Byte (ms)'));
              $result['AvgFirstViewStartRender'] = array_sum(getArrayFor($pageDataArray,'Time to Start Render (ms)'));
            }
          }
          $pageDataRepeatView = file_get_contents($pageDataLocationRepeatView);
          if ($pageDataRepeatView){
            $pageDataArrayRepeatView = delimitedToArray($pageDataRepeatView,"\t",true);
            if ( $pageDataArrayRepeatView ){
              $result['AvgRepeatViewDocCompleteTime'] = array_sum(getArrayFor($pageDataArrayRepeatView,'Doc Complete Time (ms)'));
              $result['AvgRepeatViewDocCompleteRequests'] = array_sum(getArrayFor($pageDataArrayRepeatView,'Requests (Doc)'));
              $result['AvgRepeatViewDocCompleteBytesIn'] = array_sum(getArrayFor($pageDataArrayRepeatView,'Bytes In (Doc)'));
              $result['AvgRepeatViewFullyLoadedTime'] = array_sum(getArrayFor($pageDataArrayRepeatView,'Activity Time(ms)'));
              $result['AvgRepeatViewFullyLoadedRequests'] = array_sum(getArrayFor($pageDataArrayRepeatView,'Requests'));
              $result['AvgRepeatViewFullyLoadedBytesIn'] = array_sum(getArrayFor($pageDataArrayRepeatView,'Bytes In'));
              $result['AvgRepeatViewFirstByte'] = array_sum(getArrayFor($pageDataArray,'Time to Repeat Byte (ms)'));
              $result['AvgRepeatViewStartRender'] = array_sum(getArrayFor($pageDataArray,'Time to Start Render (ms)'));
            }
          }
        }
        $result->save();
        updateJobstatus($id, $status);
      }
    }
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while Listing jobs: " . $wptResultId . " message: " . $e->getMessage());
    logOutput('[ERROR] [processResultsForAll] Exception : ' . $e->getMessage() . "");
  }
  unset($result);
}
function retrieveRequestsData($location){
  $requests = array();
  try {
    $requestsData = file_get_contents($location);
    if ( $requestsData ){
      $lines = explode("\n",$requestsData);
        if ($lines){
          $headers = explode("\t",$lines[0]);
        }
        foreach( $headers as $key=>$header){
          if ($header == "Host"){
            $hostKey = $key;
          }
          if ( $header == "URL"){
            $urlKey= $key;
          }
          if ( $header == "Real Start Time (ms)"){
            $realStartTimeKey = $key;
          }
          if ( $header == "Full Time to Load (ms)"){
            $fullTime = $key;
          }
        }
        foreach ($lines as $key=>$line){
          $request = array();

          if ( $key == 0){
            continue;
          }
          $l = explode("\t",$line);
          $request['url'] = $l[$hostKey].$l[$urlKey];
          $request['realStartTime'] = $l[$realStartTimeKey];
          $request['fullTime'] = $l[$fullTime];
          $requests[] = $request;
        }
      } else {
      error_log("Failed to fetch file ".$location);
    }
  } catch (Exception $e){
    logOutput("[WARN] [retrieveRequestsData] Failed to retrieve requests data ".$e->getMessage() );
  }
  return $requests;
}
/**
 * Process the URL script
 *
 * @param  $script
 * @param  $url
 * @return mixed
 */
function processURLScript($script, $url) {
  try {
    $tokenValues = processTokens($script);
    foreach ($tokenValues as $tokenKey => $tokenValue) {
      $url = str_replace($tokenKey, $tokenValue, $url);
    }
  } catch (Exception $e) {
    logOutput("[ERROR] [processURLScript] ".$e->getMessage());
  }
  return $url;
}

function updateJobStatus($id, $status) {
  $q = Doctrine_Query::create()->from('WPTResult r')->where('r.Id = ?', $id);
  $result = $q->fetchOne();
  $q->free(true);
  $result['Status'] = $status;
  $result->save();
}

function incrementDownloadAttempts($id) {
  $q = Doctrine_Query::create()->from('WPTResult r')->where('r.Id = ?', $id);
  $result = $q->fetchOne();
  $q->free(true);
  if (!$result['FirstStatusUpdate']) {
    $result['FirstStatusUpdate'] = current_seconds();
  }
  $result['DownloadAttempts'] = $result['DownloadAttempts'] + 1;
  $result['LastStatusUpdate'] = current_seconds();
  $result->save();
}

function getReportDataForLabel($label,$fromDate,$toDate,$stddev, $runLabel=null){
   $q = Doctrine_Query::create()->from('WPTJob j')->where('j.Label = ?', $label)->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
   $job = $q->fetchOne();
   $q->free(true);
   $id = $job['Id'];
   if ( $runLabel ){
     $q = Doctrine_Query::create()->from('WPTResult r')
         ->where('r.WPTJobId= ?', $id)
         ->andWhere('r.RunLabel = ?', $runLabel)
         ->andWhere('r.Date >= ?',$fromDate)
         ->andWhere('r.Date <= ?',$toDate)
          ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
   }else {
     $q = Doctrine_Query::create()->from('WPTResult r')
         ->where('r.WPTJobId= ?', $id)
         ->andWhere('r.Date >= ?',$fromDate)
         ->andWhere('r.Date <= ?',$toDate)
          ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
   }
   $results = $q->fetchArray();
   $q->free(true);
   return $results;
}
function getReportResultsForLabel($label,$fromDate,$toDate,$stddev,$runLabel=null,$ninetieth=null){
   $sum = array();
   $q = Doctrine_Query::create()->from('WPTJob j')->where('j.Label = ?', $label)->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
   $job = $q->fetchOne();
   $q->free(true);
   $id = $job['Id'];

   if ( $runLabel ){
    $q = Doctrine_Query::create()->from('WPTResult r')
        ->where('r.WPTJobId= ?', $id)
        ->andWhere('r.ValidationState > 1')
        ->andWhere('r.AvgFirstViewFirstByte != ""')
        ->andWhere('r.AvgFirstViewDocCompleteTime != ""')
        ->andWhere('r.Status = 200')
        ->orWhere('r.Status = 99999')
        ->andWhere('r.Date >= ?',$fromDate)
        ->andWhere('r.Date <= ?',$toDate)
        ->andWhere('r.RunLabel = ?', $runLabel)
        ->orderby('r.AvgFirstViewDocCompleteTime')
        ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    if ( $ninetieth ){
      $limit = $q->count() *.9;
      $q = Doctrine_Query::create()->from('WPTResult r')
          ->where('r.WPTJobId= ?', $id)
          ->andWhere('r.ValidationState > 1')
          ->andWhere('r.AvgFirstViewFirstByte != ""')
          ->andWhere('r.AvgFirstViewDocCompleteTime != ""')
          ->andWhere('r.Status = 200')
          ->orWhere('r.Status = 99999')
          ->andWhere('r.Date >= ?',$fromDate)
          ->andWhere('r.Date <= ?',$toDate)
          ->andWhere('r.RunLabel = ?', $runLabel)
          ->orderby('r.AvgFirstViewDocCompleteTime')
          ->limit($limit)
          ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    }
   } else {
      $q = Doctrine_Query::create()->from('WPTResult r')
        ->where('r.WPTJobId= ?', $id)
        ->andWhere('r.ValidationState < 2')
        ->andWhere('r.AvgFirstViewFirstByte != ""')
        ->andWhere('r.AvgFirstViewDocCompleteTime != ""')
        ->andWhere('r.Status = 200 OR r.Status = 99999')
        ->andWhere('r.Date >= ?',$fromDate)
        ->andWhere('r.Date <= ?',$toDate)
        ->orderBy('r.AvgFirstViewDocCompleteTime')
        ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    if ( $ninetieth ){
      $limit = $q->count() *.9;
      $q = Doctrine_Query::create()->from('WPTResult r')
        ->where('r.WPTJobId= ?', $id)
        ->andWhere('r.ValidationState < 2')
        ->andWhere('r.AvgFirstViewFirstByte != ""')
        ->andWhere('r.AvgFirstViewDocCompleteTime != ""')
        ->andWhere('r.Status = 200 OR r.Status = 99999')
        ->andWhere('r.Date >= ?',$fromDate)
        ->andWhere('r.Date <= ?',$toDate)
        ->orderBy('r.AvgFirstViewDocCompleteTime')
        ->limit($limit)
        ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    }
   }
   $results = $q->fetchArray();
   $q->free(true);
   if ( sizeof($results) == 0){
     return;
   }
   $count = 0;

   foreach ($results as $result){
       $sum['ttfb'] += $result['AvgFirstViewFirstByte'];
       $sum['render'] += $result['AvgFirstViewStartRender'];
       $sum['docTime'] += $result['AvgFirstViewDocCompleteTime'];
       $sum['domTime'] += $result['AvgFirstViewDocCompleteTime']-$result['AvgFirstViewDomTime'];
       $count++;
   }
   
   $avg['count']=$count;
   if ( $count > 0 ){
    $avg['ttfb'] = number_format(( $sum['ttfb']/$count)/1000,2);
    $avg['render'] = number_format(( $sum['render']/$count)/1000,2);
    $avg['domTime'] = number_format($sum['domTime']/$count/1000,2);
    $avg['docTime'] = number_format($sum['docTime']/$count/1000,2);
   }
   if ( $stddev ){
     $avg['ttfb'] = number_format(standard_deviation(getArrayFor($results,'AvgFirstViewFirstByte'))/1000,2);
     $avg['render'] = number_format(standard_deviation(getArrayFor($results,'AvgFirstViewStartRender'))/1000,2);
     $avg['domTime']=number_format(standard_deviation(getArrayFor($results,'AvgFirstViewDomTime'))/1000,2);
     $avg['docTime']=number_format(standard_deviation(getArrayFor($results,'AvgFirstViewDocCompleteTime'))/1000,2);
   }
   $avg['label']=$job['Label'];
   $avg['jobId']=$job['Id'];
   return $avg;
 }
  function getMaxJobsPerMonth($userId){
    // Find max jobs allowed per month
    $userTable = Doctrine_Core::getTable('User');
    $user = $userTable->find($userId);
    $maxJobsPerMonth = $user['MaxJobsPerMonth'];
    return $maxJobsPerMonth;
  }
  function getUserJobCount($userId){
    // TODO: Will need to update this when support for multi location jobs is added.
    $q = Doctrine_Query::create()->select('j.Frequency')->from('WPTJob j')
                ->where('j.UserId = ?',$userId)
                ->andWhere( 'j.Active = ?', true)
                ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    $jobs = $q->fetchArray();
    $currentJobCount = 0;
    foreach ($jobs as $job){
      $currentJobCount += (43200/$job['Frequency']);
    }
    return $currentJobCount;
  }
/*
 * Check the QueueGrowthCount and email an alert if it has grown for 4 consecutive times.
 */
function checkQueueGrowthCountAndEmailAlert(){
  $queueStatusFilename = './QueueStatus.ini';
  $queueStatus = parse_ini_file($queueStatusFilename,true);
  $message = "";
  $configTable = Doctrine_Core::getTable('WPTMonitorConfig');
  $config = $configTable->find(1);
  $siteContactEmailAddress = $config['SiteContactEmailAddress'];
  foreach( $queueStatus as $key=>$status){
    if ($status['QueueGrowthCount'] > 4 ){
      logOutput('[INFO] [jobProcessor] QueueGrowthCheck has grown over 4 times for: '.$key);

      // Growth rate has exceeded threshold, but only send an alert once per hour.
      // Check time stamp
      if ( !array_key_exists("LastQueueGrowthAlertTime",$status) || ( $status["LastQueueGrowthAlertTime"] > current_seconds() +3600 )){
        logOutput('[INFO] [jobProcessor] QueueGrowthCheck for: '.$key.' has not alerted since: '.$status["LastQueueGrowthAlertTime"]);
        $message = "\n--------------------------------------------\n";
        $message .= "Queue Growth alert for location: ".$status['id']."\n";
        $message .= "In Queue: ".$status['PendingTests']."\n";
        $message .= "Testers: ".$status['AgentCount']."\n";
        $message .= "\n--------------------------------------------\n";
        $message .= "Queue count continues to grow. Please provision more testers or decrease the runrate for this location.";
        // Update alert time stamp
        $queueStatus[$key]['LastQueueGrowthAlertTime'] = current_seconds();
        writeIniFile($queueStatus, $queueStatusFilename ,true);
      }
    }
  }
  if ($message){
    sendEmailAlert($siteContactEmailAddress, $message);
    logOutput('[ERROR] [checkTesterRatioAndEmailAlert] ' . $message );
  }
}

/*
 * Checks the current count of jobs in queue compared to the previous run.
 * If the pending tests for the current info is greater than the last check
 * A counter is incremented. 'QueueGrowthCount'
 */
function updateQueueProcessRate(){
  $queueStatusFilename = './QueueStatus.ini';
  $updateFrequency = 600;
  $currentTime = current_seconds();
  try {
    // Write current queue status
    $locationInformation = getLocationInformation();

    // First time through, or file got deleted.
    if (!file_exists($queueStatusFilename )){
      foreach ($locationInformation as $key=>$location){
        $locationInformation[$key]['QueueGrowthCount'] = '0';
        $locationInformation[$key]['QueueGrowthCheckTimeStamp'] = $currentTime;
      }
      writeIniFile($locationInformation,$queueStatusFilename ,true);
    } else {
      // Compare previous status to current status to detect queue growth.
      $previousLocationInformation = parse_ini_file($queueStatusFilename ,true);

      foreach ($previousLocationInformation as $key=>$previousLocation){
        $location = $locationInformation[$key];
        if ( $previousLocation['QueueGrowthCheckTimeStamp'] + $updateFrequency < $currentTime ){
          logOutput('[INFO] [jobProcessor] QueueGrowthCheck for : '.$key);

          if ( $location['PendingTests'] == 0){
            $location['QueueGrowthCount'] = '0';
            logOutput('[INFO] [jobProcessor] Resetting count QueueGrowthCheck for: '.$key);
          } else {
            if ( $location['PendingTests'] >= $previousLocation['PendingTests'] ){
              $location['QueueGrowthCount'] = $previousLocation['QueueGrowthCount']+1;
              logOutput('[INFO] [jobProcessor] Incrementing count QueueGrowthCheck to '. $location['QueueGrowthCount'].' for: '.$key);
            } elseif ( $location['PendingTests'] < $previousLocation['PendingTests'] && $location['QueueGrowthCount'] > 0){
              logOutput('[INFO] [jobProcessor] Decrementing count QueueGrowthCheck for: '.$key);
              $location['QueueGrowthCount'] = $previousLocation['QueueGrowthCount']-1;
            }
          }
          $location['QueueGrowthCheckTimeStamp'] = $currentTime;
          $locationInformation[$key] = $location;
        } else {
          logOutput('[INFO] [jobProcessor] Skipping QueueGrowthCheck: interval not passed for : '.$key);
          // Keep previous info it update time hasn't passed
          $locationInformation[$key] = $previousLocation;
        }
      }
      // Write current status out
      writeIniFile($locationInformation,$queueStatusFilename ,true);
    }
  } catch (Exception $e) {
    logOutput('[ERROR] [jobProcessor] Exception : ' . $e->getMessage());
  }
}
/*
 * Check the ratio of runrate to tester
 * Currently hard coded for a ratio of 40 "job submissions" for each tester per hour
 *
 */
function checkTesterRatioAndEmailAlert(){
  $queueStatusFilename = './QueueStatus.ini';
  $queueStatus = parse_ini_file($queueStatusFilename,true);

  logOutput('[INFO] [checkTesterRatioAndEmailAlert] ' );
  $configTable = Doctrine_Core::getTable('WPTMonitorConfig');
  $config = $configTable->find(1);
  $siteContactEmailAddress = $config['SiteContactEmailAddress'];
  // Check runrate to test ration and alert if necessary
  // Currently hard coded to alert if ration exceeds 40:1
  // TODO: Make configurable, or improve method of determining optimum run rate
  $locations = getLocationInformation();
  $message = "";
  foreach ($locations as $location){
    $runRate = $location['runRate'];
    $agentCount = $location['AgentCount'];
    if ( empty($agentCount) ) $agentCount = '0';
    $requiredAdditionalTesters = ($runRate / 40) - $agentCount;
    if ( $location['runRate'] ){
      if ( $location['AgentCount'] < 1 || ($location['runRate']/$location['AgentCount'] > 40 )){
        // Only alert once per hour
        if (!array_key_exists('LastTesterRatioAlertTime',$queueStatus) || ($queueStatus[$location['id']]['LastTesterRatioAlertTime'] > current_seconds()+ 3600 )){
          $message = "--------------------------------------------\n";
          $message .= "Runrate ratio insufficient for location: ".$location['id']."\n";
          $message .= "Runrate: ".$runRate."\n";
          $message .= "Testers: ".$agentCount."\n";
          if ($agentCount){
            $message .= "Ratio: ".$runRate/$agentCount."\n";
          } else {
            $message .= "Ratio: NO TESTERS SERVING THIS REGION\n";
          }
          $message .= "Target Ratio: 40\n";
          $message .= "Please add ".ceil($requiredAdditionalTesters)." additional agents for this location.";
          // Update time stamp
          $queueStatus[$location['id']]['LastTesterRatioAlertTime'] = current_seconds();
          writeIniFile($queueStatus, $queueStatusFilename ,true);
        }
      }
    }
  }
  if ($message){
    sendEmailAlert($siteContactEmailAddress, $message);
    logOutput('[ERROR] [checkTesterRatioAndEmailAlert] ' . $message );
    echo $message;
  }

}

?>