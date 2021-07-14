<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
if(extension_loaded('newrelic')) {
  newrelic_add_custom_tracer('ProcessRun');
  newrelic_add_custom_tracer('loadAllPageData');
  newrelic_add_custom_tracer('getRequestsForStep');
  newrelic_add_custom_tracer('LockTest');
  newrelic_add_custom_tracer('UpdateTester');
  newrelic_add_custom_tracer('GetVisualProgressForStep');
  newrelic_add_custom_tracer('GetDevToolsCPUTimeForStep');
  newrelic_add_custom_tracer('GetDevToolsRequestsForStep');
  newrelic_add_custom_tracer('loadUserTimingData');
  newrelic_add_custom_tracer('GetVisualProgress');
  newrelic_add_custom_tracer('DevToolsGetConsoleLog');
  newrelic_add_custom_tracer('SecureDir');
  newrelic_add_custom_tracer('loadPageRunData');
  newrelic_add_custom_tracer('loadPageStepData');
  newrelic_add_custom_tracer('ParseUserTiming');
  newrelic_add_custom_tracer('CalculateTimeToInteractive');

}

chdir('..');
//$debug = true;
require_once('common.inc');
require_once('archive.inc');
require_once 'page_data.inc';
require_once('object_detail.inc');
require_once('harTiming.inc');
require_once('video.inc');
require_once('breakdown.inc');
require_once('devtools.inc.php');
require_once('./video/visualProgress.inc.php');
require_once __DIR__ . '/../include/ResultProcessing.php';

$key  = isset($_REQUEST['key']) ? $_REQUEST['key'] : null;
$location = isset($_REQUEST['location']) ? $_REQUEST['location'] : null;
if (!ValidateLocation($location, $key)) {
  header("HTTP/1.1 403 Unauthorized");
  exit;
}

if (!isset($included)) {
  error_reporting(E_ERROR | E_WARNING | E_PARSE | E_NOTICE);
  header('Content-type: text/plain');
  header("Cache-Control: no-cache, must-revalidate");
  header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
}
set_time_limit(3600);
ignore_user_abort(true);


$id   = isset($_REQUEST['id']) ? $_REQUEST['id'] : null;
$uploaded = false;
if (!isset($id)) {
  // Generate a test ID if this is an upload
  $id = GenerateTestID();
  $uploaded = true;
  $testPath = './' . GetTestPath($id);
  if( !is_dir($testPath) ) 
      mkdir($testPath, 0777, true);
}
// Send back the generated test ID
echo $id;
ob_flush();
flush();

if(extension_loaded('newrelic')) {
  newrelic_add_custom_parameter('test', $id);
}

$workdone_start = microtime(true);

//logmsg(json_encode($_REQUEST), './work/workdone.log', true);

// The following params have a default value:
$done = arrayLookupWithDefault('done', $_REQUEST, false);
$cpu = arrayLookupWithDefault('cpu', $_REQUEST, 0);
$pc = array_key_exists('pc', $_REQUEST) ? $_REQUEST['pc'] : '';
$ec2 = array_key_exists('ec2', $_REQUEST) ? $_REQUEST['ec2'] : '';
$tester = null;
if (strlen($ec2))
  $tester = $ec2;
elseif (strlen($pc))
  $tester = $pc . '-' . trim($_SERVER['REMOTE_ADDR']);
else
  $tester = trim($_SERVER['REMOTE_ADDR']);

// Sometimes we need to make changes to the way the client and server
// communicate, without updating both at the same time.  The following
// params can be set by a client to declare that they support a new
// behavior.  Once all clients are updated, they should be removed.

// Should zipped HAR uploads be flattened?  The main user is the mobitest iOS
// agent.  The agent will be updated to always set this, but until we can
// re-image all agents, we need to support the old behavior for a while.
$flattenUploadedZippedHar =
    arrayLookupWithDefault('flattenZippedHar', $_REQUEST, false);

// The following params are set by the android agents (blaze and WebpageTest).
// TODO(skerner): POST params are not saved to disk directly, so it is hard to
// see what the agent uploaded after the fact.  Consider writing them to a
// file that gets uploaded.
$runNumber     = arrayLookupWithDefault('_runNumber',     $_REQUEST, null);
$runNumber     = arrayLookupWithDefault('run',            $_REQUEST, $runNumber);
$runIndex      = arrayLookupWithDefault('index',          $_REQUEST, null);
$cacheWarmed   = arrayLookupWithDefault('_cacheWarmed',   $_REQUEST, null);
$cacheWarmed   = arrayLookupWithDefault('cached',         $_REQUEST, $cacheWarmed);
$docComplete   = arrayLookupWithDefault('_docComplete',   $_REQUEST, null);
$onFullyLoaded = arrayLookupWithDefault('_onFullyLoaded', $_REQUEST, null);
$onRender      = arrayLookupWithDefault('_onRender',      $_REQUEST, null);
$urlUnderTest  = arrayLookupWithDefault('_urlUnderTest',  $_REQUEST, null);

$testInfo_dirty = false;

if (ValidateTestId($id)) {
  $testPath = './' . GetTestPath($id);

  // Extract the uploaded data
  if (is_dir($testPath)) {
    if (isset($_FILES['file']['tmp_name'])) {
      ExtractZipFile($_FILES['file']['tmp_name'], $testPath);
      CompressTextFiles($testPath);
    }
  }

  $testErrorStr = '';
  $errorStr = '';
  if (array_key_exists('testerror', $_REQUEST) && strlen($_REQUEST['testerror']))
    $testErrorStr = ', Test Error: "' . $_REQUEST['testerror'] . '"';
  if (array_key_exists('error', $_REQUEST) && strlen($_REQUEST['error']))
    $errorStr = ', Test Run Error: "' . $_REQUEST['error'] . '"';
  $testLock = LockTest($id);
  logTestMsg($id, "Test Run Complete. Run: $runNumber, Cached: $cacheWarmed, Done: $done, Tester: $tester$testErrorStr$errorStr");
  if (!isset($testLock))
    logTestMsg($id, "Failed to lock test");
  $testInfo = GetTestInfo($id);

  // Figure out the path to the results.
  $ini = parse_ini_file("$testPath/testinfo.ini");
  $time = time();
  $testInfo['last_updated'] = $time;
  // Allow for the test agents to indicate that they are including a
  // trace-based timeline (mostly for the mobile agents that always include it)
  if (isset($_REQUEST['timeline']) && $_REQUEST['timeline'])
    $testInfo['timeline'] = 1;
  $testInfo_dirty = true;

  if (!strlen($tester) && array_key_exists('tester', $testInfo) && strlen($testInfo['tester']))
    $tester = $testInfo['tester'];

  $medianMetric = GetSetting('medianMetric', 'loadTime');
  if (isset($testInfo['medianMetric']))
    $medianMetric = $testInfo['medianMetric'];

  // keep track of any overall or run-specific errors reported by the agent
  if (array_key_exists('testerror', $_REQUEST) && strlen($_REQUEST['testerror'])) {
    $testInfo['test_error'] = $_REQUEST['testerror'];
    $testInfo_dirty = true;
  }
  if (isset($runNumber) &&
      isset($cacheWarmed) &&
      array_key_exists('error', $_REQUEST) &&
      strlen($_REQUEST['error'])) {
    if (!array_key_exists('errors', $testInfo))
      $testInfo['errors'] = array();
    if (!array_key_exists($runNumber, $testInfo['errors']))
      $testInfo['errors'][$runNumber] = array();
    $testInfo['errors'][$runNumber][$cacheWarmed] = $_REQUEST['error'];
    $testInfo_dirty = true;
  }

  // Do any post-processing on this individual run
  ProcessRun();

  if (strlen($location) && strlen($tester)) {
    $testerInfo = array();
    $testerInfo['ip'] = $_SERVER['REMOTE_ADDR'];
    if (!isset($testerError))
      $testerError = false;
    if (array_key_exists('testerror', $_REQUEST) && strlen($_REQUEST['testerror']))
      $testerError = $_REQUEST['testerror'];
    elseif (array_key_exists('error', $_REQUEST) && strlen($_REQUEST['error']))
      $testerError = $_REQUEST['error'];
    // clear the rebooted flag on the first successful test
    $rebooted = null;
    if ($testerError === false)
      $rebooted = false;
    UpdateTester($location, $tester, $testerInfo, $cpu, $testerError, $rebooted);
  }

  // see if the test is complete
  $all_done = false;
  if ($done) {
    $all_done = true;
    if (isset($runNumber)) {
      $all_done = false;
      $runnum = intval($runNumber);
      if ($runnum) {
        touch("$testPath/run.complete.$runnum");
        $files = glob("$testPath/run.complete.*");
        if (isset($files) && is_array($files)) {
          $done_count = count($files);
          logTestMsg($id, "$done_count of {$testInfo['runs']} tests complete");
          if ($done_count >= $testInfo['runs']) {
            logTestMsg($id, 'All done');
            $all_done = true;
          }
        }
      }
    }
    if ($all_done) {
      // Mark the test as done and save it out so that we can load the page data
      $testInfo['completed'] = $time;
      SaveTestInfo($id, $testInfo);
      $testInfo_dirty = false;

      // delete any .test files
      $files = scandir($testPath);
      foreach ($files as $file)
        if (preg_match('/.*\.test$/', $file))
          unlink("$testPath/$file");
      if (array_key_exists('job_file', $testInfo) && is_file($testInfo['job_file']))
        unlink($testInfo['job_file']);

      $perTestTime = 0;
      $testCount = 0;

      // do pre-complete post-processing
      MoveVideoFiles($testPath);
      WptHookPostProcessResults(__DIR__ . '/../' . $testPath);

      if (!isset($pageData))
        $pageData = loadAllPageData($testPath);
      $medianRun = GetMedianRun($pageData, 0, $medianMetric);
      $testInfo['medianRun'] = $medianRun;
      $testInfo_dirty = true;

      // delete all of the videos except for the median run?
      if( array_key_exists('median_video', $ini) && $ini['median_video'])
        KeepVideoForRun($testPath, $medianRun);

      $test = file_get_contents("$testPath/testinfo.ini");
      $now = gmdate("m/d/y G:i:s", $time);

      // update the completion time if it isn't already set
      if (!strpos($test, 'completeTime')) {
        $complete = "[test]\r\ncompleteTime=$now";
        if($medianRun)
          $complete .= "\r\nmedianRun=$medianRun";
        $out = str_replace('[test]', $complete, $test);
        file_put_contents("$testPath/testinfo.ini", $out);
      }
    }
  }

  if ($testInfo_dirty)
    SaveTestInfo($id, $testInfo);

  SecureDir($testPath);
  if ($uploaded){
    ProcessUploadedTest($id);
  }
  logTestMsg($id, "Done Processing. Run: $runNumber, Cached: $cacheWarmed, Done: $done, Tester: $tester$testErrorStr$errorStr");
  UnlockTest($testLock);
  /*************************************************************************
  * Do No modify TestInfo after this point
  **************************************************************************/

  // do any post-processing when the full test is complete that doesn't rely on testinfo
  if ($all_done) {
    logTestMsg($id, "Test Complete");

    touch("$testPath/test.complete");
    @unlink("$testPath/test.running");
    @unlink("$testPath/test.waiting");
    @unlink("$testPath/test.scheduled");

    // Cleanup the files marking each run
    $files = glob("$testPath/run.complete.*");
    if (isset($files) && is_array($files)) {
      foreach ($files as $file) {
        if (file_exists($file)) {
          unlink($file);
        }
      }
    }

    // send an async request to the post-processing code so we don't block
    SendAsyncRequest("/work/postprocess.php?test=$id");
  }
}

$workdone_end = microtime(true);

function ProcessRun() {
  global $runNumber, $cacheWarmed, $testPath, $id, $testerError;
  if (isset($runNumber) && isset($cacheWarmed)) {
    $resultProcessing = new ResultProcessing($testPath, $id, $runNumber, $cacheWarmed);
    $testerError = $resultProcessing->postProcessRun();
  }
}

/**
* Delete all of the video files except for the median run
*
* @param mixed $id
*/
function KeepVideoForRun($testPath, $run)
{
  if ($run && !GetSetting('keep_all_video')) {
    $dir = opendir($testPath);
    if ($dir) {
      while($file = readdir($dir)) {
        $path = $testPath  . "/$file/";
        if( is_dir($path) && !strncmp($file, 'video_', 6) && $file != "video_$run" )
          delTree("$path/");
        elseif (is_file("$testPath/$file")) {
          if (preg_match('/^([0-9]+(_Cached)?)[_\.]/', $file, $matches) && count($matches) > 1) {
            $match_run = $matches[1];
            if (strcmp("$run", $match_run) &&
                (strpos($file, '_bodies.zip') ||
                 strpos($file, '.cap') ||
                 strpos($file, '_trace.json') ||
                 strpos($file, '_netlog.txt') ||
                 strpos($file, '_doc.') ||
                 strpos($file, '_render.'))) {
              unlink("$testPath/$file");
            }
          }
        }
      }

      closedir($dir);
    }
  }
}

/**
 * Remove sensitive data fields from HTTP headers (cookies and HTTP Auth)
 *
 */
function RemoveSensitiveHeaders($file) {
    $patterns = array('/(cookie:[ ]*)([^\r\n]*)/i','/(authenticate:[ ]*)([^\r\n]*)/i');
    $data = gz_file_get_contents($file);
    $data = preg_replace($patterns, '\1XXXXXX', $data);
    gz_file_put_contents($file, $data);
}

function CompressTextFiles($testPath) {
  global $ini;
  $f = scandir($testPath);
  foreach( $f as $textFile ) {
    if ($textFile != 'test.log') {
      logMsg("Checking $textFile\n");
      if( is_file("$testPath/$textFile") ) {
        $parts = pathinfo($textFile);
        $ext = $parts['extension'];
        if( !strcasecmp( $ext, 'txt') ||
            !strcasecmp( $ext, 'json') ||
            !strcasecmp( $ext, 'log') ||
            !strcasecmp( $ext, 'csv') ) {
          if (strpos($textFile, '_optimization'))
            unlink("$testPath/$textFile");
          elseif (gz_compress("$testPath/$textFile"))
            unlink("$testPath/$textFile");
        }
        if (isset($ini) && is_array($ini) && isset($ini['sensitive']) && $ini['sensitive'] && strpos($textFile, '_report'))
          RemoveSensitiveHeaders($testPath . '/' . basename($textFile, '.gz'));
      }
    }
  }
}

function ExtractZipFile($file, $testPath) {
  global $id;
  $zipsize = filesize($file);
  logTestMsg($id, "Extracting $zipsize byte uploaded file '$file' to '$testPath'");
  $zip = new ZipArchive();
  if ($zip->open($file) === TRUE) {
    $valid = true;
    // Make sure all of the uploaded files are appropriate
    for ($i=0; $i < $zip->numFiles; $i++) {
      $entry = $zip->getNameIndex($i);
      if (substr($entry, -1) == '/') continue; // skip directories
      $fileName = basename($entry);
      if (!validateUploadFileName($fileName))
        $valid = false;
    }
    if ($valid) {
      $extractPath = realpath($testPath);
      if ($extractPath !== false) {
        if (!$zip->extractTo($extractPath))
          logTestMsg($id, "Error extracting uploaded ZIP file '$file' to '$testPath'");
        $zip->close();
      }
    }
  } else {
    logTestMsg($id, "Error opening uploaded ZIP file '$file'");
  }
}

function ValidateLocation($location, $key) {
  $ok = false;
  if (isset($location)) {
    $rate_key = 'rlwork-' . $_SERVER['REMOTE_ADDR'];
    $count = CacheFetch($rate_key);
    if (!isset($count)) {
      $count = 0;
    }
    // Only allow 3 invalid guesses every 10 minutes
    if ($count < 3) {
      $locKey = GetLocationKey($location);
      if (!strlen($locKey)) {
        // Location doesn't have a key specified
        $ok = true;
      } elseif ($key == $locKey) {
        // Key matches
        $ok = true;
      }
    }

    if (!$ok) {
      // rate-limit invalid guesses (remember for 10 minutes cooldown)
      $count++;
      CacheStore($rate_key, $count, 600);
    }
  }
  return $ok;
}
