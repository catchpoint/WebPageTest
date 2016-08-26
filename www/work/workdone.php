<?php
if(extension_loaded('newrelic')) { 
  newrelic_add_custom_tracer('ProcessIncrementalResult');
  newrelic_add_custom_tracer('CheckForSpam');
  newrelic_add_custom_tracer('loadPageRunData');
  newrelic_add_custom_tracer('getBreakdown');
  newrelic_add_custom_tracer('GetVisualProgress');
  newrelic_add_custom_tracer('DevToolsGetConsoleLog');
  newrelic_add_custom_tracer('WaitForSystemLoad');
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
$har  = arrayLookupWithDefault('har',  $_REQUEST, false);
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
  if (array_key_exists('video', $_REQUEST) && $_REQUEST['video']) {
    logMsg("Video file $id received from {$_REQUEST['location']}");
    $dir = './' . GetVideoPath($id);
    if (array_key_exists('file', $_FILES) && array_key_exists('tmp_name', $_FILES['file'])) {
      if (!is_dir($dir))
          mkdir($dir, 0777, true);
      $dest = $dir . '/video.mp4';
      move_uploaded_file($_FILES['file']['tmp_name'], $dest);
      @chmod($dest, 0666);
      $iniFile = $dir . '/video.ini';
      if (is_file($iniFile))
        $ini = file_get_contents($iniFile);
      else
        $ini = '';
      $ini .= 'completed=' . gmdate('c') . "\r\n";
      file_put_contents($iniFile, $ini);
    }
  } else {
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
        logTestMsg($id, "Test Run Complete. Run: $runNumber, Cached: $cacheWarmed, Done: $done, Tester: $tester$testErrorStr$errorStr");
        $testLock = LockTest($id);
        $testInfo = GetTestInfo($id);
        // update the location time
        if( strlen($location) ) {
            if( !is_dir('./tmp') )
                mkdir('./tmp', 0777, true);
            touch( "./tmp/$location.tm" );
        }
        
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

        if (array_key_exists('file', $_FILES) && array_key_exists('tmp_name', $_FILES['file'])) {
          if (isset($har) && $har) {
            ProcessUploadedHAR($testPath);
          } else {
            logMsg(" Extracting uploaded file '{$_FILES['file']['tmp_name']}' to '$testPath'\n");
            $zip = new ZipArchive();
            if ($zip->open($_FILES['file']['tmp_name']) === TRUE) {
                $extractPath = realpath($testPath);
                $zip->extractTo($extractPath);
                $zip->close();
            }
          }
        }

        // compress the text data files
        if( isset($_FILES['file']) ) {
          $f = scandir($testPath);
          foreach( $f as $textFile ) {
            logMsg("Checking $textFile\n");
            if( is_file("$testPath/$textFile") ) {
              $parts = pathinfo($textFile);
              $ext = $parts['extension'];
              if( !strcasecmp( $ext, 'txt') ||
                  !strcasecmp( $ext, 'json') ||
                  !strcasecmp( $ext, 'log') ||
                  !strcasecmp( $ext, 'csv') ) {
                if ($ini['sensitive'] && strpos($textFile, '_report'))
                  RemoveSensitiveHeaders("$testPath/$textFile");
                elseif (strpos($textFile, '_optimization'))
                  unlink("$testPath/$textFile");
                elseif (gz_compress("$testPath/$textFile"))
                  unlink("$testPath/$textFile");
              }
            }
          }
        }
        //CheckForSpam();
        
        // make sure the test result is valid, otherwise re-run it
        if ($done && !$har &&
            array_key_exists('job_file', $testInfo) && 
            array_key_exists('max_retries', $testInfo) && 
            $testInfo['max_retries'] > 1) {
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
            if ($lock = LockLocation($location)) {
              if (copy($testfile, $testInfo['job_file'])) {
                ResetTestDir($testPath);
                $testInfo['retries']++;
                AddJobFileHead($testInfo['workdir'], $testInfo['job'], $testInfo['priority'], false);
                $done = false;
                unset($testInfo['started']);
                $testInfo_dirty = true;
              }
              UnlockLocation($lock);
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

        // Do any post-processing on this individual run that doesn't requre the test to be locked
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

          if ($lock = LockLocation($location)) {
            $testCount = $testInfo['runs'];
            if( !$testInfo['fvonly'] )
                $testCount *= 2;
                
            if ($testInfo['started'] && $time > $testInfo['started'] && $testCount) {
              $perTestTime = ceil(($time - $testInfo['started']) / $testCount);
              $tests = json_decode(file_get_contents("./tmp/$location.tests"), true);
              if( !$tests )
                $tests = array();
              // keep track of the average time for the last 100 tests
              $tests['times'][] = $perTestTime;
              if( count($tests['times']) > 100 )
                array_shift($tests['times']);
              // update the number of high-priority "page loads" that we think are in the queue
              if( array_key_exists('tests', $tests) && $testInfo['priority'] == 0 )
                $tests['tests'] = max(0, $tests['tests'] - $testCount);
              file_put_contents("./tmp/$location.tests", json_encode($tests));
            }
            UnlockLocation($lock);
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
                 strpos($file, '_devtools.json') ||
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

function ProcessUploadedHAR($testPath)
{
    // From the mobile agents we get the zip file with sub-folders
    if( isset($_FILES['file']) ) {
      logMsg(" Extracting uploaded file '{$_FILES['file']['tmp_name']}' to '$testPath'\n");
      if (preg_match("/\.zip$/",$_FILES['file']['name'])) {
        ZipExtract($_FILES['file']['tmp_name'], $testPath);
      } else {
        move_uploaded_file($_FILES['file']['tmp_name'], $testPath . "/" . $_FILES['file']['name']);
      }
    }

    ProcessHARText($testPath, false);
}

function ProcessHARText($testPath, $harIsFromSinglePageLoad)
{
    $mergedHar = null;

    $dir = opendir($testPath);
    if( $dir )
    {
        while($file = readdir($dir)) 
        {
            if (preg_match("/^(\d+_(Cached_)?)?results?\.har$/", $file))
            {
                // Read and parse the json HAR file
                $parsedHar = json_decode(file_get_contents("{$testPath}/{$file}"), true);
                gz_compress("{$testPath}/{$file}");
                unlink("{$testPath}/{$file}");
                if (!$parsedHar)
                {
                    logMalformedInput("Failed to parse json file '{$file}'");
                    continue;
                }

                if( $mergedHar === null)
                {
                    $mergedHar = $parsedHar;
                } else {
                    $mergedHar['log']['pages'] = array_merge(
                        $mergedHar['log']['pages'], $parsedHar['log']['pages']);
                    $mergedHar['log']['entries'] = array_merge(
                        $mergedHar['log']['entries'], $parsedHar['log']['entries']);
                }
            }
        }
    }

    if( $mergedHar === null)
    {
        logMalformedInput("Missing result json file");
        return;
    }

    ProcessHARData($mergedHar, $testPath, $harIsFromSinglePageLoad);
}

/**
 * We may get a HAR with no page records.  Add one that references all
 * requests in the HAR.
 *
 * @global type $urlUnderTest Sent as a POST param.  What URL was loaded to
 *                            make the HAR?
 * @param array $parsedHar Parsed in-memory reprentation of the HAR.
 * @param type $sortedEntries The requests from the har, soprted by start time.
 */
function CreatePageRecordInHar(&$parsedHar, &$sortedEntries) {
  global $urlUnderTest;

  // Find the time of the first request.
  reset($sortedEntries);
  $firstRequest = current($sortedEntries);
  $firstStartedDateTime = $firstRequest['startedDateTime'];

  // Pick a page id, to be added to all requests.
  $generatedPageId = "generatedPageId";

  $generatedPagesRecord = array(
      "id" => $generatedPageId,
      "pageTimings" => array(),

      // The start time of the page is the start time of the first request.
      "startedDateTime" => $firstStartedDateTime,
      "title" => $urlUnderTest
  );

  $parsedHar['log']['pages'] = array( $generatedPagesRecord );

  // Make sure all entries point to the generated page record.
  foreach ($sortedEntries as $entind => &$entry) {
    $entry['pageref'] = $generatedPageId;
  }
}

function ProcessHARData($parsedHar, $testPath, $harIsFromSinglePageLoad) {
    // Sort the entries by start time. This is done across runs, but
    // since each of them references its own page it shouldn't matter
    $sortedEntries;
    foreach ($parsedHar['log']['entries'] as $entrycount => $entry)
    {
        // We use the textual start date as key, which should work fine
        // for ISO dates.
        $start = $entry['startedDateTime'];
        $sortedEntries[$start . "-" . $entrycount] = $entry;
    }
    ksort($sortedEntries);

    // HAR files can hold multiple page loads.  Some sources of HAR files
    // can only hold one page load, and don't know anything about the page.
    // For example, HAR files generated from a .pcap file captured durring
    // a single page load must have only one page, and many things in a HAR
    // page record, such as the page title, can not be found.  Based on the
    // number of page records, and the argument $harIsFromSinglePageLoad,
    // check that the pages record is as expected, and generate a minimal
    // page record if nessisary.
    $numPageRecords = array_key_exists('pages', $parsedHar['log'])
            ? count($parsedHar['log']['pages'])
            : 0;
    if ($harIsFromSinglePageLoad) {
      if ($numPageRecords > 1) {
        logMalformedInput("HAR has multiple pages, but it should be from " .
                          "a single run.");
        return;
      }

      if ($numPageRecords == 0) {
        // pcap2har will not generate any pages records when using option
        // --no-pages.  Build a fake one.  This simplfies the rest of the
        // HAR proccessing code, because it does not need to check for the
        // existance of the page record every time it tries to read page
        // info.
        CreatePageRecordInHar($parsedHar, $sortedEntries);
      }

    } else {  // ! if ($harIsFromSinglePageLoad)
      if ($numPageRecords == 0) {
        logMalformedInput("No page records in HAR.  Expect at least one.");
        return;
      }
    }

    // Keep meta data about a page from iterating the entries
    $pageData;

    // Iterate over the page records.
    foreach ($parsedHar['log']['pages'] as $pagecount => $page)
    {
        $pageref = $page['id'];
        $curPageData = array();

        // Extract direct page data and save in data array
        $curPageData["url"] = $page['title'];

        $startFull = $page['startedDateTime'];
        $startFullDatePart = '';
        $startFullTimePart = '';
        if (SplitISO6801DateIntoDateAndTime(
                $startFull,  // Split this datetime
                $startFullDatePart, $startFullTimePart)) {  // into these parts.
          $curPageData["startDate"] = $startFullDatePart;
          $curPageData["startTime"] = $startFullTimePart;
          $curPageData["startFull"] = $startFull;
        } else {
          logMalformedInput(
              "Failed to split page key 'startedDateTime' into a date and ".
              "a time part.  Value of key is '$startFull'.");
        }

        global $onRender;
        $curPageData["onRender"] =
            arrayLookupWithDefault('onRender', $page['pageTimings'],
                arrayLookupWithDefault('_onRender', $page['pageTimings'],
                    ($onRender !== null ? $onRender : UNKNOWN_TIME)));

        $curPageData["docComplete"] =
            arrayLookupWithDefault('onContentLoad', $page['pageTimings'], UNKNOWN_TIME);
        $curPageData["fullyLoaded"] =
            arrayLookupWithDefault('onLoad', $page['pageTimings'], UNKNOWN_TIME);

        // TODO: Remove this patch for files missing the data.
        if ($curPageData["docComplete"] <= 0)
          $curPageData["docComplete"] = $curPageData["fullyLoaded"];

        // Agents that upload .pcap files must tell us the URL being tested,
        // because the URL is not always in the .pcap file.  If POST
        // parameter _urlUnderTest is set, use it as the URL being measured.
        global $urlUnderTest;
        $curPageDataUrl = (isset($urlUnderTest) ? $urlUnderTest
                                                : $curPageData["url"]);

        if (preg_match("/^https?:\/\/([^\/?]+)(((?:\/|\\?).*$)|$)/",
                        $curPageDataUrl, $urlMatches)) {
          $curPageData["host"] = $urlMatches[1];
        } else {
          logMalformedInput("HAR error: Could not match host in URL ".
                            $curPageDataUrl);
        }

        // Some clients encode the run number and cache status in the
        // page name.  Others give the information in properties on the
        // pageTimings record.  Prefer the explicit properties.  Fall
        // back to decoding the information from the name of the page
        // record.
        global $runNumber;
        global $cacheWarmed;
        global $docComplete;
        global $onFullyLoaded;
        if (array_key_exists('_runNumber', $page)) {
          $curPageData["run"] = $page['_runNumber'];
          $curPageData["cached"] = $page['_cacheWarmed'];

        } else if (isset($runNumber) && isset($cacheWarmed)) {
          $curPageData["run"] = $runNumber;
          $curPageData["cached"] = $cacheWarmed;

          if (isset($docComplete) && $curPageData["docComplete"] <= 0) {
            $curPageData["docComplete"] = $docComplete;
          }
          
          if (isset($onFullyLoaded) && $curPageData['fullyLoaded'] <=0) {
            $curPageData['fullyLoaded'] = $onFullyLoaded;
          }

        } else if (preg_match("/page_(\d+)_([01])/", $pageref, $matches)) {
          $curPageData["run"] = $matches[1];
          $curPageData["cached"] = $matches[2];

        } else {
          logMalformedInput("HAR error: Could not get runs or cache ".
                            "status, from post params, pages array ".
                            "or page name \"$pageref\".");
          // Sensible defaults:
          $curPageData["run"] =  1;
          $curPageData["cached"] = 0;
        }

        if ($curPageData["run"] <= 0)
          logMalformedInput("HAR error: \$curPageData[\"run\"] should ".
                            "always be positive.  Value is ".
                            $curPageData["run"]);

        $curPageData["title"] =
          ($curPageData["cached"] ? "Cached-" : "Cleared Cache-") .
              "Run_" . $curPageData["run"]  . 
              "^" . $curPageData["url"];

        // Define filename prefix
        $curPageData["runFilePrefix"] =
            $testPath . "/" . $curPageData["run"] . "_";

        if ($curPageData["cached"])
          $curPageData["runFilePrefix"] .= "Cached_";
        $curPageData["runFileName"] = $curPageData["runFilePrefix"] . "IEWTR.txt";
        $curPageData["reportFileName"] = $curPageData["runFilePrefix"] . "report.txt";

        // Write the title line
        file_put_contents($curPageData["runFileName"],
            "Date\tTime\tEvent Name\tIP Address\tAction\tHost\tURL\tResponse Code\t" . 
            "Time to Load (ms)\tTime to First Byte (ms)\tStart Time (ms)\tBytes Out\t".
            "Bytes In\tObject Size\tCookie Size (out)\tCookie Count(out)\tExpires\t" .
            "Cache Control\tContent Type\tContent Encoding\tTransaction Type\tSocket ID\t" . 
            "Document ID\tEnd Time (ms)\tDescriptor\tLab ID\tDialer ID\tConnection Type\t" .
            "Cached\tEvent URL\tPagetest Build\tMeasurement Type\tExperimental\tEvent GUID\t" . 
            "Sequence Number\tCache Score\tStatic CDN Score\tGZIP Score\tCookie Score\t" .
            "Keep-Alive Score\tDOCTYPE Score\tMinify Score\tCombine Score\tCompression Score\t" .
            "ETag Score\tFlagged\tSecure\tDNS Time\tConnect Time\tSSL Time\tGzip Total Bytes\t" .
            "Gzip Savings\tMinify Total Bytes\tMinify Savings\tImage Total Bytes\tImage Savings\t" .
            "Cache Time (sec)\tReal Start Time (ms)\tFull Time to Load (ms)\tOptimization Checked\r\n");

        // Write the page line line
        file_put_contents($curPageData["runFileName"],
            "{$curPageData['startDate']}\t{$curPageData['startTime']}\t".
            "{$curPageData['title']}\t\t\t{$curPageData['host']}\t{$curPageData['url']}\t".
            "0\t0\t0\t0\t0\t0\t0\t0\t0\t0\t\t\t\t0\t0\t0\t0\tLaunch\t-1\t0\t-1\t".
            "{$curPageData['cached']}\t{$curPageData['url']}\t".
            "0\t0\t0\t0\t0\t0\t0\t0\t0\t0\t-1\t0\t0\t0\t0\t0\t0\t\t\t\t0\t0\t0\t0\t0\t0\t".
            "\t0\t\t0\r\n", FILE_APPEND);

        // Write the raw data in the report (not accurate, may need to fix after)
        // TODO: Write real data
        file_put_contents($curPageData["reportFileName"],
            "Results for '{$curPageData['url']}':\r\n\r\n" .
            "Page load time: 0 seconds\r\n" .
            "Time to first byte: 0 seconds\r\n" .
            "Time to Base Page Downloaded: 0 seconds\r\n" .
            "Time to Start Render: 0 seconds\r\n" .
            "Time to Document Complete: 0 seconds\r\n" .
            "Time to Fully Loaded: 0 seconds\r\n" .
            "Bytes sent out: 0 KB\r\n" .
            "Bytes received: 0 KB\r\n" .
            "DNS Lookups: 0\r\n" .
            "Connections: 0\r\n" .
            "Requests: 0\r\n" .
            "   OK Requests:  0\r\n" .
            "   Redirects:    0\r\n" .
            "   Not Modified: 0\r\n" .
            "   Not Found:    0\r\n" .
            "   Other:        0\r\n" .
            "Base Page Response: 200\r\n" . 
            "Request details:\r\n\r\n");                    

        // Start by stating the time-to-first-byte is the page load time,
        // will be updated as we iterate requests.
        $curPageData["TTFB"] = $curPageData["docComplete"];

        // Reset counters for requests
        $curPageData["bytesOut"] = 0;
        $curPageData["bytesIn"] = 0;
        $curPageData["nDnsLookups"] = 0;
        $curPageData["nConnect"] = 0;
        $curPageData["nRequest"] = 0;
        $curPageData["nReqs200"] = 0;
        $curPageData["nReqs302"] = 0;
        $curPageData["nReqs304"] = 0;
        $curPageData["nReqs404"] = 0;
        $curPageData["nReqsOther"] = 0;

        $curPageData["bytesOutDoc"] = 0;
        $curPageData["bytesInDoc"] = 0;
        $curPageData["nDnsLookupsDoc"] = 0;
        $curPageData["nConnectDoc"] = 0;
        $curPageData["nRequestDoc"] = 0;
        $curPageData["nReqs200Doc"] = 0;
        $curPageData["nReqs302Doc"] = 0;
        $curPageData["nReqs304Doc"] = 0;
        $curPageData["nReqs404Doc"] = 0;
        $curPageData["nReqsOtherDoc"] = 0;

        // Reset the request number on the run
        $curPageData["reqNum"] = 0;
        $curPageData["calcStarTime"] = 0;

        // Store the data for the next loops
        $pageData[$pageref] = $curPageData;
        unset($curPageData);
    }

    // Iterate the entries
    foreach ($sortedEntries as $entind => $entry)
    {
        // See http://www.softwareishard.com/blog/har-12-spec/#entries
        $pageref = $entry['pageref'];
        $startedDateTime = $entry['startedDateTime'];
        $entryTime = $entry['time'];
        $reqEnt = $entry['request'];
        $respEnt = $entry['response'];
        $cacheEnt = $entry['cache'];
        $timingsEnt = $entry['timings'];

        if ($reqEnt['method'] == 'HEAD')
          continue;
                  
        // pcap2har doesn't set the server's IP address, so it may be unset:
        $reqIpAddr = arrayLookupWithDefault('serverIPAddress', $entry, null);

        // The following HAR fields are in the HAR spec, but we do not
        // use them:
        // $entry['connection']
        // $entry['comment']

        $curPageData = $pageData[$pageref];

        // Extract the variables
        $reqHttpVer = $reqEnt['httpVersion'];
        $respHttpVer = $respEnt['httpVersion'];

        $reqDate = '';
        $reqTime = '';
        if (!SplitISO6801DateIntoDateAndTime(
                $startedDateTime,  // Split this datetime
                $reqDate, $reqTime)) {  // into these parts.
          logMalformedInput(
              "Sorted entry key 'startedDateTime' could ".
              "not be split into a date and time part.  ".
              "Value is '$startedDateTime'");
        }

        $reqEventName = $curPageData['title'];
        $reqAction = $reqEnt['method'];

        logMsg("Processing resource " . ShortenUrl($reqEnt['url']));
        // Skip non-http URLs (in the future we may do something with them)
        if (!preg_match("/^https?:\/\/([^\/?]+)([\/\?].*)?/",
                        $reqEnt['url'], $matches)) {
            logMsg("Skipping https file " . $reqEnt['url']);
            continue;
        }
        $reqUrl = $matches[2];
        $reqHost = $matches[1];
        $reqRespCode = $respEnt['status'];
        // For now, ignore status 0 responses, as we assume these are
        // cached resources.
        if ($reqRespCode == "0") {
            logMsg("Skipping resp 0 resource " . $reqEnt['url']);
            continue;
        }
        $reqRespCodeText = $respEnt['statusText'];
        $reqLoadTime = 0 + $entryTime;

        // The list is sorted by time, so use the first resource as the real start time,
        // since the start time on the page isn't always reliable (likely a bug, but this will do for now)
        if ($curPageData["calcStarTime"] == 0) {
            $curPageData["calcStarTime"] = $startedDateTime;
            $curPageData["startFull"] = $startedDateTime;
        }

        $reqStartTime = getDeltaMillisecondsFromISO6801Dates(
            $curPageData["startFull"], $startedDateTime);
        if ($reqStartTime < 0.0) {
          logMalformedInput(
              "Negative start offset ($reqStartTime mS) for request.\n".
              "\$curPageData[\"startFull\"] = ".
              $curPageData["startFull"] . "\n".
              "\$startedDateTime =          " . $startedDateTime."\n");
        }

        $requestTimings = convertHarTimesToWebpageTestTimes($timingsEnt, $reqStartTime);
        $reqDnsTime = $requestTimings['dns_ms'];
        $reqSslTime = $requestTimings['ssl_ms'];
        $reqConnectTime = $requestTimings['connect_ms'];
        $reqBytesOut = abs($reqEnt['headersSize']) + abs($reqEnt['bodySize']);
        $reqBytesIn = abs($respEnt['headersSize']) + abs($respEnt['bodySize']);
        $reqObjectSize = abs($respEnt['bodySize']);
        $reqCookieSize = 0; // TODO: Calculate
        $reqCookieCount = 0; // TODO: Calculate
        $reqExpires = 0; // TODO: Calculate from cache
        $reqCacheControl = 0; // TODO: Extract from headers
        $reqContentType = $respEnt['content']['mimeType'];
        $reqContentEncoding = 0; // TODO: Extract from headers
        $reqTransType = 3; // TODO: Extract from headers
        $reqEndTime = $reqStartTime + $reqLoadTime;
        $reqCached = 0; // TODO: Extract from cache - or do we never have cached files since they aren't requested?
        $reqEventUrl = $curPageData["url"];
        $reqSecure = preg_match("/^https/", $reqEnt['url']) ? 1 : 0;

        // Variables that are likely not important
        // TODO: Check if they matter
        $reqSocketID = 3;
        $reqDocId = 3;
        $reqDescriptor = "Launch";
        $reqLabId = -1;
        $reqDialerId = 0;
        $reqConnnectionType = -1;

        // Write the line
        file_put_contents($curPageData["runFileName"],
            "$reqDate\t" . 
            "$reqTime\t" . 
            "$reqEventName\t" . 
            "$reqIpAddr\t" . 
            "$reqAction\t" . 
            "$reqHost\t" . 
            "$reqUrl\t" . 
            "$reqRespCode\t" . 
            $requestTimings['load']  . "\t" . // Time to Load (ms)
            $requestTimings['ttfb']  . "\t" . // Time to First Byte (ms)
            $requestTimings['start'] . "\t" . // Start Time (ms)
            "$reqBytesOut\t" .
            "$reqBytesIn\t" . 
            "$reqObjectSize\t" . 
            "$reqCookieSize\t" . 
            "$reqCookieCount\t" . 
            "$reqExpires\t" . 
            "$reqCacheControl\t" . 
            "$reqContentType\t" . 
            "$reqContentEncoding\t" . 
            "$reqTransType\t" . 
            "$reqSocketID\t" . 
            "$reqDocId\t" . 
            "$reqEndTime\t" . 
            "$reqDescriptor\t" . 
            "$reqLabId\t" . 
            "$reqDialerId\t" . 
            "$reqConnnectionType\t" . 
            "$reqCached\t" . 
            "$reqEventUrl\t" . 
            "\t" . //"Pagetest Build\t" . 
            "\t" . //"Measurement Type\t" . 
            "\t" . //"Experimental\t" . 
            "\t" . //"Event GUID\t" . 
            "\t" . //"Sequence Number\t" . 
            "\t" . //"Cache Score\t" . 
            "\t" . //"Static CDN Score\t" . 
            "\t" . //"GZIP Score\t" . 
            "\t" . //"Cookie Score\t" . 
            "\t" . //"Keep-Alive Score\t" . 
            "\t" . //"DOCTYPE Score\t" . 
            "\t" . //"Minify Score\t" . 
            "\t" . //"Combine Score\t" . 
            "\t" . //"Compression Score\t" . 
            "\t" . //"ETag Score\t" . 
            "\t" . //"Flagged\t" . 
            "$reqSecure\t" . 
            "-1\t" . // DNS Time (ms)            Set start and end instead.
            "-1\t" . // Socket Connect time (ms) Set start and end instead.
            "-1\t" . // SSL time (ms)            Set start and end instead.
            "\t" . //"Gzip Total Bytes\t" . 
            "\t" . //"Gzip Savings\t" . 
            "\t" . //"Minify Total Bytes\t" . 
            "\t" . //"Minify Savings\t" . 
            "\t" . //"Image Total Bytes\t" . 
            "\t" . //"Image Savings\t" . 
            "\t" . //"Cache Time (sec)\t" . 
            "\t" . //"Real Start Time (ms)\t" . 
            "\t" . //"Full Time to Load (ms)\t" . 
            "0\t". //"Optimization Checked\r\n
            "\t" . //CDN Provider
            $requestTimings['dns_start']     . "\t" . // DNS start
            $requestTimings['dns_end']       . "\t" . // DNS end
            $requestTimings['connect_start'] . "\t" . // connect start
            $requestTimings['connect_end']   . "\t" . // connect end
            $requestTimings['ssl_start']     . "\t" . // ssl negotiation start
            $requestTimings['ssl_end']       . "\t" . // ssl negotiation end
            "\t" . //initiator
            "\r\n",
            FILE_APPEND);

        $reqNum = $curPageData["reqNum"] + 1;
        $curPageData["reqNum"] = $reqNum;

        // Write the request raw data
        file_put_contents($curPageData["reportFileName"],
            "Request $reqNum:\r\n".
            "      Action: GET\r\n".
            "      Url: {$reqUrl}\r\n".
            "      Host: {$reqHost}\r\n".
            "      Result code: $reqRespCode\r\n".
            "      Transaction time: $reqTime milliseconds\r\n".
            "      Time to first byte: " . $requestTimings['ttfb'] . " milliseconds\r\n".
            "      Request size (out): $reqBytesOut Bytes\r\n".
            "      Response size (in): $reqBytesIn Bytes\r\n".
            "  Request Headers:\r\n".
            "      {$reqAction} {$reqUrl} {$reqHttpVer}\r\n",
        FILE_APPEND);

        // Write the request/response headers
        foreach ($reqEnt['headers'] as $headercount => $header)
        {
            // Write the request/response headers
            file_put_contents($curPageData["reportFileName"],
                "      {$header['name']}: {$header['value']}\r\n", FILE_APPEND);
        }
        // Write the response raw data
        // TODO: Fill real data
        file_put_contents($curPageData["reportFileName"],
            "  Response Headers:\r\n".
            "      {$respHttpVer} {$reqRespCode} {$reqRespCodeText}\r\n",
        FILE_APPEND);

        // Write the request/response headers
        foreach ($respEnt['headers'] as $headercount => $header)
        {
            // Write the request/response headers
            file_put_contents($curPageData["reportFileName"],
                "      {$header['name']}: {$header['value']}\r\n", FILE_APPEND);
        }
        // Add a newline
        file_put_contents($curPageData["reportFileName"],"\r\n", FILE_APPEND);

        // Add up the total page counters
        $curPageData["bytesOut"] += $reqBytesOut;
        $curPageData["bytesIn"] += $reqBytesIn;
        $curPageData["nDnsLookups"] += ($reqDnsTime > 0) ? $reqDnsTime : 0;
        $curPageData["nConnect"] += ($reqConnectTime > 0) ? $reqDnsTime : 0;;
        $curPageData["nRequest"] += 1;
        if (preg_match('/^200$/', $reqRespCode)) {
            $curPageData["nReqs200"] += 1;
        } else if (preg_match('/^302$/', $reqRespCode)) {
            $curPageData["nReqs302"] += 1;
        } else if (preg_match('/^304$/', $reqRespCode)) {
            $curPageData["nReqs304"] += 1;
        } else if (preg_match('/^404$/', $reqRespCode)) {
            $curPageData["nReqs404"] += 1;
        } else {
            $curPageData["nReqsOther"] += 1;
        }

        // Add up the document complete counters, if we're before doc complete
        if ($curPageData["docComplete"] > $reqStartTime)
        {
            $curPageData["bytesOutDoc"] += $reqBytesOut;
            $curPageData["bytesInDoc"] += $reqBytesIn;
            $curPageData["nDnsLookupsDoc"] += ($reqDnsTime > 0) ? $reqDnsTime : 0;
            $curPageData["nConnectDoc"] += ($reqConnectTime > 0) ? $reqDnsTime : 0;;
            $curPageData["nRequestDoc"] += 1;
            if (preg_match('/^200$/', $reqRespCode)) {
                $curPageData["nReqs200Doc"] += 1;
            } else if (preg_match('/^302$/', $reqRespCode)) {
                $curPageData["nReqs302Doc"] += 1;
            } else if (preg_match('/^304$/', $reqRespCode)) {
                $curPageData["nReqs304Doc"] += 1;
            } else if (preg_match('/^404$/', $reqRespCode)) {
                $curPageData["nReqs404Doc"] += 1;
            } else {
                $curPageData["nReqsOtherDoc"] += 1;
            }
        }

        // Find the page's time-to-first-byte which is minimum first-byte
        // time of all the requests. The request's time-to-first-byte can
        // not be used because it is relative to the start of the request,
        // not the start of the page.
        $curPageData["TTFB"] = min(
            $curPageData["TTFB"], $requestTimings['receive_start']);

        // Update the page data variable back into the array
        $pageData[$pageref] = $curPageData;
    }

    // Create the page files
    foreach ($parsedHar['log']['pages'] as $pagecount => $page)
    {
        $pageref = $page['id'];
        $curPageData = $pageData[$pageref];

        // Create the page title line
        $curPageData["resourceFileName"] = $curPageData["runFilePrefix"] . "IEWPG.txt";
        file_put_contents($curPageData["resourceFileName"],
            "Date\tTime\tEvent Name\tURL\tLoad Time (ms)\tTime to First Byte (ms)\tunused\tBytes Out\tBytes In\tDNS Lookups\tConnections\tRequests\tOK Responses\tRedirects\tNot Modified\tNot Found\tOther Responses\tError Code\tTime to Start Render (ms)\tSegments Transmitted\tSegments Retransmitted\tPacket Loss (out)\tActivity Time(ms)\tDescriptor\tLab ID\tDialer ID\tConnection Type\tCached\tEvent URL\tPagetest Build\tMeasurement Type\tExperimental\tDoc Complete Time (ms)\tEvent GUID\tTime to DOM Element (ms)\tIncludes Object Data\tCache Score\tStatic CDN Score\tOne CDN Score\tGZIP Score\tCookie Score\tKeep-Alive Score\tDOCTYPE Score\tMinify Score\tCombine Score\tBytes Out (Doc)\tBytes In (Doc)\tDNS Lookups (Doc)\tConnections (Doc)\tRequests (Doc)\tOK Responses (Doc)\tRedirects (Doc)\tNot Modified (Doc)\tNot Found (Doc)\tOther Responses (Doc)\tCompression Score\tHost\tIP Address\tETag Score\tFlagged Requests\tFlagged Connections\tMax Simultaneous Flagged Connections\tTime to Base Page Complete (ms)\tBase Page Result\tGzip Total Bytes\tGzip Savings\tMinify Total Bytes\tMinify Savings\tImage Total Bytes\tImage Savings\tBase Page Redirects\tOptimization Checked\r\n");

        // Write the page's data
        file_put_contents($curPageData["resourceFileName"],
            "{$curPageData['startDate']}\t" . 
            "{$curPageData['startTime']}\t" . 
            "{$curPageData['title']}\t" . 
            "{$curPageData['url']}\t" . 
            "{$curPageData['fullyLoaded']}\t" . 
            "{$curPageData['TTFB']}\t" . 
            "\t" . //"unused\t" . 
            "{$curPageData['bytesOut']}\t" . 
            "{$curPageData['bytesIn']}\t" . 
            "{$curPageData['nDnsLookups']}\t" . 
            "{$curPageData['nConnect']}\t" . 
            "{$curPageData['nRequest']}\t" . 
            "{$curPageData['nReqs200']}\t" . 
            "{$curPageData['nReqs302']}\t" . 
            "{$curPageData['nReqs304']}\t" . 
            "{$curPageData['nReqs404']}\t" . 
            "{$curPageData['nReqsOther']}\t" . 
            "0\t" . // TODO: Find out how to get the error code
            "{$curPageData['onRender']}\t" . 
            "\t" . //"Segments Transmitted\t" . 
            "\t" . //"Segments Retransmitted\t" . 
            "\t" . //"Packet Loss (out)\t" . 
            "{$curPageData['fullyLoaded']}\t" . //Activity Time, apparently the same as fully loaded 
            "\t" . //"Descriptor\t" . 
            "\t" . //"Lab ID\t" . 
            "\t" . //"Dialer ID\t" . 
            "\t" . //"Connection Type\t" . 
            "{$curPageData['cached']}\t" . 
            "{$curPageData['url']}\t" . 
            "\t" . //"Pagetest Build\t" . 
            "\t" . //"Measurement Type\t" . 
            "\t" . //"Experimental\t" . 
            "{$curPageData['docComplete']}\t" . 
            "\t" . //"Event GUID\t" . 
            "\t" . //"Time to DOM Element (ms)\t" . 
            "\t" . //"Includes Object Data\t" . 
            "\t" . //"Cache Score\t" . 
            "\t" . //"Static CDN Score\t" . 
            "\t" . //"One CDN Score\t" . 
            "\t" . //"GZIP Score\t" . 
            "\t" . //"Cookie Score\t" . 
            "\t" . //"Keep-Alive Score\t" . 
            "\t" . //"DOCTYPE Score\t" . 
            "\t" . //"Minify Score\t" . 
            "\t" . //"Combine Score\t" . 
            "{$curPageData['bytesOutDoc']}\t" . 
            "{$curPageData['bytesInDoc']}\t" . 
            "{$curPageData['nDnsLookupsDoc']}\t" . 
            "{$curPageData['nConnectDoc']}\t" . 
            "{$curPageData['nRequestDoc']}\t" . 
            "{$curPageData['nReqs200Doc']}\t" . 
            "{$curPageData['nReqs302Doc']}\t" . 
            "{$curPageData['nReqs304Doc']}\t" . 
            "{$curPageData['nReqs404Doc']}\t" . 
            "{$curPageData['nReqsOtherDoc']}\t" . 
            "\t" . //"Compression Score\t" . 
            "{$curPageData['host']}\t" . 
            "\t" . //"IP Address\t" . 
            "\t" . //"ETag Score\t" . 
            "\t" . //"Flagged Requests\t" . 
            "\t" . //"Flagged Connections\t" . 
            "\t" . //"Max Simultaneous Flagged Connections\t" . 
            "\t" . //"Time to Base Page Complete (ms)\t" . 
            "\t" . //"Base Page Result\t" . 
            "\t" . //"Gzip Total Bytes\t" . 
            "\t" . //"Gzip Savings\t" . 
            "\t" . //"Minify Total Bytes\t" . 
            "\t" . //"Minify Savings\t" . 
            "\t" . //"Image Total Bytes\t" . 
            "\t" . //"Image Savings\t" . 
            "\t" . //"Base Page Redirects\t" . 
            "0\r\n", //"Optimization Checked\r\n"
        FILE_APPEND);
    }
}

/**
 * Helper for GetDeltaMillisecondsFromISO6801Dates().  Finds the millisecond
 * offset of an ISO8601 date.  Caller ensures that $dateString is a valid
 * ISO8601 date.  An invalid date will cause the method to return 0.0 .
 *
 * We avoid checking that the date is well-formed because the only caller
 * already checks this.  If you use this method, you should check the date
 * for validity before calling this method or add a check at the start of
 * this method.
 *
 * @param string $dateString An ISO8601 date string.
 * @return double The millisecond offset of an ISO8601 date.
 */
function GetMillisecondsFromValidISO8601String($dateString) {
  // The \d+ below are:
  // Year, month, day, hour, minute, whole second, fractional part of a second.
  if (!preg_match('/^\d+-\d+-\d+T\d+:\d+:\d+\.(\d+)/', $dateString, $matches)) {
    // A valid ISO8601 date does that does not match the above expression
    // has no fractional part of a second.  Examples:
    // "1997", "1997-07", "1997-07-16", "1997-07-16T19:20+01:00"
    // "1997-07-16T19:20-2:30", ""1997-07-16T19:20Z".
    return 0.0;
  }
  $fractionOfSeconds = $matches[1];
  $fractionalPartInSec = (double)("0.".$fractionOfSeconds);

  // 1000.0 milliseconds in a second.
  return 1000.0 * $fractionalPartInSec;
}

/**
 * Calculate the delta in milliseconds between two ISO8601 string dates.
 *
 * @param before
 * @param after
 */
function GetDeltaMillisecondsFromISO6801Dates($before, $after) {
  // strtotime() parses the time into a UNIX timestamp, with a resolution of
  // seconds.  Because all the built in PHP date/time methods have this
  // limitation, we will pull out the microseconds ourselves using a regular
  // expression.  The second parameter is the time to use for a date that does
  // not have hours or minutes.  We assume that "1997" means the first instant
  // of 1997, which is midnight on new years eve.
  $beforeTimeSeconds = strtotime($before, "00");
  $afterTimeSeconds = strtotime($after, "00");
  if ($beforeTimeSeconds === False ||
      $afterTimeSeconds  === False)
    return null;

  return 1000.0 * (double)($afterTimeSeconds - $beforeTimeSeconds)
         + GetMillisecondsFromValidISO8601String($after)
         - GetMillisecondsFromValidISO8601String($before);
}

/**
 * Split an ISO8601 string into a date part, and a time part.
 * Tricky because we want to preserve the exiact time, but PHP date objects
 * are limited to a resolution of seconds.
 */
function SplitISO6801DateIntoDateAndTime($ISO8601String,
                                         &$out_dateString, &$out_timeString) {
  $timestamp = strtotime($ISO8601String, "00");
  if ($timestamp === False)
    return False;  // Invalid date/time.

  // Because strtotime parsed |$ISO8601String|, we know it is well formed.
  // Split the string at the first 'T', which should be the border between
  // the date part and the time part.
  $dateAndTimeParts = explode("T", $ISO8601String, 2);
  $numParts = count($dateAndTimeParts);
  switch ($numParts) {
    case 1:
      $out_dateString = $dateAndTimeParts[0];
      $out_timeString = "";
      return True;

    case 2:
      $out_dateString = $dateAndTimeParts[0];
      $out_timeString = $dateAndTimeParts[1];
      return True;

    default:
      return False;
  }
}

/**
 * Remove sensitive data fields from HTTP headers (cookies and HTTP Auth)
 *
 */
function RemoveSensitiveHeaders($file) {
    $patterns = array('/(cookie:[ ]*)([^\r\n]*)/i','/(authenticate:[ ]*)([^\r\n]*)/i');
    $data = file_get_contents($file);
    $data = preg_replace($patterns, '\1XXXXXX', $data);
    file_put_contents($file, $data);
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

  if ($done) {
    // mark this test as done
    $testInfo['test_runs'][$runNumber]['done'] = true;
    $testInfo_dirty = true;
    
    // make sure all of the sharded tests are done
    for ($run = 1; $run <= $testInfo['runs'] && $done; $run++) {
      if (!$testInfo['test_runs'][$run]['done'])
        $done = false;
    }
    
    if (!$done &&
        array_key_exists('discarded', $testInfo['test_runs'][$runNumber]) &&
        $testInfo['test_runs'][$runNumber]['discarded']) {
      if (is_file("$testPath/test.job")) {
        if ($lock = LockLocation($location)) {
          if (copy("$testPath/test.job", $testInfo['job_file'])) {
            AddJobFileHead($testInfo['workdir'], $testInfo['job'], $testInfo['priority'], true);
          }
          UnlockLocation($lock);
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
            $haveLocations = false;
            $requests = getRequests($id, $testPath, $runNumber, $cacheWarmed, $secure, $haveLocations, false);
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
?>
