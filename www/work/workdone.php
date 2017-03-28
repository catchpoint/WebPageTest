<?php
if(extension_loaded('newrelic')) { 
  newrelic_add_custom_tracer('ProcessIncrementalResult');
  newrelic_add_custom_tracer('CompressTextFiles');
  newrelic_add_custom_tracer('loadPageStepData');
  newrelic_add_custom_tracer('loadVideo');
  newrelic_add_custom_tracer('GetVisualProgressForStep');
  newrelic_add_custom_tracer('GetDevToolsCPUTimeForStep');
  newrelic_add_custom_tracer('getBreakdown');
  newrelic_add_custom_tracer('GetVisualProgress');
  newrelic_add_custom_tracer('DevToolsGetConsoleLog');
  newrelic_add_custom_tracer('ExtractZipFile');
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
require_once('./video/avi2frames.inc.php');
require_once __DIR__ . '/../include/ResultProcessing.php';

if (!isset($included)) {
  error_reporting(E_ERROR | E_PARSE);
  header('Content-type: text/plain');
  header("Cache-Control: no-cache, must-revalidate");
  header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
}
set_time_limit(3600);
ignore_user_abort(true);

$key  = $_REQUEST['key'];
$id   = $_REQUEST['id'];

if(extension_loaded('newrelic')) { 
  newrelic_add_custom_parameter('test', $id);
  newrelic_add_custom_parameter('location', $location);
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

// Should zipped har uploads be flattened?  The main user is the mobitest iOS
// agent.  The agent will be updated to always set this, but until we can
// re-image all agents we need to support the old behavior for a while.
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
  $testInfo = GetTestInfo($id);
  if (isset($testInfo['medianMetric']))
    $medianMetric = $testInfo['medianMetric'];
  if (!$testInfo || !array_key_exists('location', $testInfo)) {
    $testLock = LockTest($id);
    $testInfo = GetTestInfo($id);
    UnlockTest($testLock);
  }
  if ($testInfo && array_key_exists('location', $testInfo)) {
    $location = $testInfo['location'];
    $locKey = GetLocationKey($location);
    if ((!strlen($locKey) || !strcmp($key, $locKey)) || !strcmp($_SERVER['REMOTE_ADDR'], "127.0.0.1")) {
      $testErrorStr = '';
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

      if (!strlen($tester) &&
          array_key_exists('tester', $testInfo) &&
          strlen($testInfo['tester']))
        $tester = $testInfo['tester'];
                          
      if (array_key_exists('shard_test', $testInfo) && $testInfo['shard_test'])
        ProcessIncrementalResult();

      if (isset($_FILES['file']['tmp_name'])) {
        ExtractZipFile($_FILES['file']['tmp_name'], $testPath);
        CompressTextFiles($testPath);
      }

      // make sure the test result is valid, otherwise re-run it
      if ($done && isset($testInfo['job_file']) && isset($testInfo['max_retries']) && $testInfo['max_retries'] > 1) {
        $testfile = null;
        $valid = true;
        $available_runs = 0;
        $expected_runs = $testInfo['runs'];
        if (!$testInfo['fvonly'])
          $expected_runs = $expected_runs * 2;
        $files = scandir($testPath);
        foreach ($files as $file) {
          if (preg_match('/^[0-9]+_(Cached_)?IEWPG.txt/', $file) === true)
            $available_runs++;
          if ($file == 'test.job')
            $testfile = "$testPath/$file";
        }
        if ($available_runs < $expected_runs)
          $valid = false;
        if (!array_key_exists('retries', $testInfo))
          $testInfo['retries'] = 0;
        if (!$valid && $testInfo['retries'] < $testInfo['max_retries'] && isset($testfile)) {
          if (copy($testfile, $testInfo['job_file'])) {
            ResetTestDir($testPath);
            $testInfo['retries']++;
            AddJobFileHead($testInfo['workdir'], $testInfo['job'], $testInfo['priority'], false);
            $done = false;
            unset($testInfo['started']);
            $testInfo_dirty = true;
          }
        }
      }
      
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
      if (isset($runNumber) && isset($cacheWarmed)) {
        $resultProcessing = new ResultProcessing($testPath, $id, $runNumber, $cacheWarmed);
        $testerError = $resultProcessing->postProcessRun();

        if ($testInfo['fvonly'] || $cacheWarmed) {
          if (!array_key_exists('test_runs', $testInfo))
            $testInfo['test_runs'] = array();
          if (array_key_exists($runNumber, $testInfo['test_runs']))
            $testInfo['test_runs'][$runNumber]['done'] = true;
          else
            $testInfo['test_runs'][$runNumber] = array('done' => true);
          $numSteps = $resultProcessing->countSteps();
          $reportedSteps = 0;
          if (!empty($testInfo['test_runs'][$runNumber]['steps'])) {
            $reportedSteps = $testInfo['test_runs'][$runNumber]['steps'];
            if ($reportedSteps != $numSteps) {
              $testerError = "Number of steps for first and repeat view differ (fv: $reportedSteps, rv: $numSteps)";
            }
          }
          $testInfo['test_runs'][$runNumber]['steps'] = max($numSteps, $reportedSteps);
          $testInfo_dirty = true;
        }
        if (!GetSetting('disable_video_processing')) {
          if ($testInfo['video'])
            $workdone_video_start = microtime(true);
          ProcessAVIVideo($testInfo, $testPath, $runNumber, $cacheWarmed, $max_load);
          if ($testInfo['video'])
            $workdone_video_end = microtime(true);
        }
      }

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
      if ($done) {
        // Mark the test as done and save it out so that we can load the page data
        $testInfo['completed'] = $time;
        if (!array_key_exists('test_runs', $testInfo))
          $testInfo['test_runs'] = array();
        // the number of steps should be the same for every run. But we take the max in case a step failed during
        // a run
        $numSteps = 0;
        for ($run = 1; $run <= $testInfo['runs']; $run++) {
          if (array_key_exists($run, $testInfo['test_runs']))
            $testInfo['test_runs'][$run]['done'] = true;
          else
            $testInfo['test_runs'][$run] = array('done' => true);
          if (!empty($testInfo['test_runs'][$run]['steps'])) {
            $numSteps = max($numSteps, $testInfo['test_runs'][$run]['steps']);
          }
        }
        $testInfo['steps'] = $numSteps;
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
        if( array_key_exists('median_video', $ini) && $ini['median_video'] )
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
        
        // see if it is an industry benchmark test
        if (array_key_exists('industry', $ini) && array_key_exists('industry_page', $ini) && 
          strlen($ini['industry']) && strlen($ini['industry_page'])) {
          if( !is_dir('./video/dat') )
            mkdir('./video/dat', 0777, true);
          $indLock = Lock("Industry Video");
          if (isset($indLock)) {
            // update the page in the industry list
            $ind;
            $data = file_get_contents('./video/dat/industry.dat');
            if( $data )
              $ind = json_decode($data, true);
            $update = array();
            $update['id'] = $id;
            $update['last_updated'] = $now;
            $ind[$ini['industry']][$ini['industry_page']] = $update;
            $data = json_encode($ind);
            file_put_contents('./video/dat/industry.dat', $data);
            Unlock($indLock);
          }
        }
      }

      if ($testInfo_dirty)
        SaveTestInfo($id, $testInfo);

      SecureDir($testPath);
      logTestMsg($id, "Done Processing. Run: $runNumber, Cached: $cacheWarmed, Done: $done, Tester: $tester$testErrorStr$errorStr");
      UnlockTest($testLock);
      /*************************************************************************
      * Do No modify TestInfo after this point
      **************************************************************************/
        
      // do any post-processing when the full test is complete that doesn't rely on testinfo        
      if ($done) {
        logTestMsg($id, "Test Complete");

        // send an async request to the post-processing code so we don't block
        SendAsyncRequest("/work/postprocess.php?test=$id");
      }
    } else {
      logMsg("location key incorrect\n");
    }
  }
}

$workdone_end = microtime(true);

/*
if (isset($workdone_video_start) && isset($workdone_video_end)) {
  $elapsed = intval(($workdone_end - $workdone_start) * 1000);
  $video_elapsed = intval(($workdone_video_end - $workdone_video_start) * 1000);
  if ($video_elapsed > 10)
    logMsg("$elapsed ms - video processing: $video_elapsed ms - Test $id, Run $runNumber:$cacheWarmed", './work/workdone.log', true);
}
*/

/**
* Delete all of the video files except for the median run
* 
* @param mixed $id
*/
function KeepVideoForRun($testPath, $run)
{
  if ($run) {
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

/**
* Reset the state of the given test directory (delete all the results)
* 
* @param mixed $testDir
*/
function ResetTestDir($testPath) {
    $files = scandir($testPath);
    foreach ($files as $file) {
        if ($file != '.' && $file != '..' && strncasecmp($file, 'test', 4)) {
            if (is_file("$testPath/$file"))
                unlink("$testPath/$file");
            elseif (is_dir("$testPath/$file"))
                delTree("$testPath/$file");
        }
    }
}

/**
* Handle sharded test results where they come in individually
* 
*/
function ProcessIncrementalResult() {
  global $testPath;
  global $done;
  global $testInfo;
  global $testInfo_dirty;
  global $runNumber;
  global $cacheWarmed;
  global $location;
  global $id;

  if ($done) {
    logMsg("$id - " . json_encode($testInfo['shards_finished']), __DIR__ . '/workdone.txt', true);
    // mark this shard as done
    if (!isset($testInfo['shards_finished']))
      $testInfo['shards_finished'] = array();
    $testInfo['shards_finished'][$runNumber] = true;
    $testInfo_dirty = true;
    logTestMsg($id, "Marked shard $runNumber as complete: " . json_encode($testInfo['shards_finished']));
    
    // make sure all of the sharded tests are done
    for ($run = 1; $run <= $testInfo['runs'] && $done; $run++) {
      if (!isset($testInfo['shards_finished'][$run]) || $testInfo['shards_finished'][$run] !== true)
        $done = false;
    }
    if ($done) {
      logTestMsg($id, "All {$testInfo['runs']} runs are complete");
    }
    
    if (!$done &&
        array_key_exists('discarded', $testInfo['test_runs'][$runNumber]) &&
        $testInfo['test_runs'][$runNumber]['discarded']) {
      if (is_file("$testPath/test.job")) {
        if (copy("$testPath/test.job", $testInfo['job_file'])) {
          AddJobFileHead($location, $testInfo['workdir'], $testInfo['job'], $testInfo['priority'], true);
        }
      }
    }
  }
}

/**
* Check the given test against our block list to see if the test bypassed our blocks.
* If it did, add the domain to the automatic blocked domains list
* 
*/
function CheckForSpam() {
    global $testPath;
    global $id;
    global $runNumber;
    global $cacheWarmed;
    global $testInfo;
    global $testInfo_dirty;

    if (isset($testInfo) && 
        !array_key_exists('spam', $testInfo) &&
        strpos($id, '.') == false &&
        !strlen($testInfo['user']) &&
        !strlen($testInfo['key']) &&
        is_file('./settings/blockurl.txt')) {
        $blocked = false;
        $blockUrls = file('./settings/blockurl.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (count($blockUrls)) {
            if (!isset($runNumber))
                $runNumber = 1;
            if (!isset($cacheWarmed))
                $cacheWarmed = 0;

            $secure = false;
            $requests = getRequests($id, $testPath, $runNumber, $cacheWarmed, $secure);
            if (isset($requests) && is_array($requests) && count($requests)) {
                foreach($requests as &$request) {
                    if (array_key_exists('full_url', $request)) {
                        $url = $request['full_url'];
                        foreach( $blockUrls as $block ) {
                            $block = trim($block);
                            if (strlen($block) && (preg_match("/$block/i", $url))) {
                                $date = gmdate("Ymd");
                                // add the top-level page domain to the block list
                                $pageUrl = $requests[0]['full_url'];
                                $host = '';
                                if (strlen($pageUrl)) {
                                    $parts = parse_url($pageUrl);
                                    $host = trim($parts['host']);
                                    if (strlen($host) &&
                                        strcasecmp($host, 'www.google.com') &&
                                        strcasecmp($host, 'google.com') &&
                                        strcasecmp($host, 'www.youtube.com') &&
                                        strcasecmp($host, 'youtube.com')) {
                                        // add it to the auto-block list if it isn't already there
                                        if (is_file('./settings/blockdomainsauto.txt'))
                                            $autoBlock = file('./settings/blockdomainsauto.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                                        if (!isset($autoBlock) || !is_array($autoBlock))
                                            $autoBlock = array();
                                        $found = false;
                                        foreach($autoBlock as $entry) {
                                            if (!strcasecmp($entry, $host)) {
                                                $found = true;
                                                break;
                                            }
                                        }
                                        if (!$found) {
                                            $autoBlock[] = $host;
                                            file_put_contents('./settings/blockdomainsauto.txt', implode("\r\n", $autoBlock));
                                        }
                                    }
                                }
                                logMsg("[$id] $host: $pageUrl referenced $url which matched $block", "./log/{$date}-auto_blocked.log", true);
                                
                                $blocked = true;
                                break 2;
                            }
                        }
                    }
                }
            }
        }
        if ($blocked) {
          $testInfo['spam'] = $blocked;
          $testInfo_dirty = true;
        }
    }
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
    $extractPath = realpath($testPath);
    if ($extractPath !== false) {
      if (!$zip->extractTo($extractPath))
        logTestMsg($id, "Error extracting uploaded zip file '$file' to '$testPath'");
      $zip->close();
    }
  } else {
    logTestMsg($id, "Error opening uploaded zip file '$file'");
  }
}
?>
