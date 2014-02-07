<?php
if(extension_loaded('newrelic')) { 
  newrelic_add_custom_tracer('StartProcessingIncrementalResult');
  newrelic_add_custom_tracer('CheckForSpam');
  newrelic_add_custom_tracer('loadPageRunData');
  newrelic_add_custom_tracer('ProcessAVIVideo');
  newrelic_add_custom_tracer('getBreakdown');
  newrelic_add_custom_tracer('GetVisualProgress');
  newrelic_add_custom_tracer('DevToolsGetConsoleLog');
  newrelic_add_custom_tracer('FinishProcessingIncrementalResult');
}

chdir('..');
//$debug = true;
require_once('common.inc');
require_once('archive.inc');
require_once('./lib/pclzip.lib.php');
require_once 'page_data.inc';
require_once('harTiming.inc');
require_once('./video/avi2frames.inc.php');

if (!isset($included)) {
  error_reporting(E_ERROR | E_PARSE);
  header('Content-type: text/plain');
  header("Cache-Control: no-cache, must-revalidate");
  header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
  ignore_user_abort(true);
}
set_time_limit(60*5);

$location = $_REQUEST['location'];
$key  = $_REQUEST['key'];
$id   = $_REQUEST['id'];
$testLock = null;

if(extension_loaded('newrelic')) { 
  newrelic_add_custom_parameter('test', $id);
  newrelic_add_custom_parameter('location', $location);
}

//logmsg(json_encode($_REQUEST), './work/workdone.log', true);

// The following params have a default value:
$done = arrayLookupWithDefault('done', $_REQUEST, false);
$har  = arrayLookupWithDefault('har',  $_REQUEST, false);
$pcap = arrayLookupWithDefault('pcap', $_REQUEST, false);
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

// When we upgrade the pcap to har converter, we need to test
// each agent.  Agents can opt in to testing the latest
// version by setting this POST param to '1'.
$useLatestPCap2Har =
    arrayLookupWithDefault('useLatestPCap2Har', $_REQUEST, false);

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


if( array_key_exists('video', $_REQUEST) && $_REQUEST['video'] )
{
    logMsg("Video file $id received from $location");
    
    if (ValidateTestId($id)) {
        $dir = './' . GetVideoPath($id);
        if( isset($_FILES['file']) )
        {
            if (!is_dir($dir)) {
                mkdir($dir, 0777, true);
            }
            $dest = $dir . '/video.mp4';
            move_uploaded_file($_FILES['file']['tmp_name'], $dest);
            @chmod($dest, 0666);

            // update the ini file
            $iniFile = $dir . '/video.ini';
            if (is_file($iniFile)) {
                $ini = file_get_contents($iniFile);
            } else {
                $ini = '';
            }
            $ini .= 'completed=' . gmdate('c') . "\r\n";
            file_put_contents($iniFile, $ini);
        }
    }
} elseif (ValidateTestId($id)) {
    $locKey = GetLocationKey($location);
    logMsg("\n\nWork received for test: $id, location: $location, key: $key\n");
    if( (!strlen($locKey) || !strcmp($key, $locKey)) || !strcmp($_SERVER['REMOTE_ADDR'], "127.0.0.1") ) {
        // update the location time
        if( strlen($location) ) {
            if( !is_dir('./tmp') )
                mkdir('./tmp');
            touch( "./tmp/$location.tm" );
        }
        
        if( !isset($_FILES['file']) )
            logMsg(" No uploaded file attached\n");
        
        // Figure out the path to the results.
        $testPath = './' . GetTestPath($id);
        $ini = parse_ini_file("$testPath/testinfo.ini");
        $time = time();
        if( gz_is_file("$testPath/testinfo.json") ) {
            $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
            if( isset($testInfo) ) {
                $testInfo['last_updated'] = $time;
                $testInfo_dirty = true;

                if (!strlen($location) &&
                    array_key_exists('location', $testInfo) &&
                    strlen($testInfo['location']))
                  $location = $testInfo['location'];
                if (!strlen($tester) &&
                    array_key_exists('tester', $testInfo) &&
                    strlen($testInfo['tester']))
                  $tester = $testInfo['tester'];
                                    
                if (strlen($location) && strlen($tester)) {
                    $testerInfo = array();
                    $testerInfo['ip'] = $_SERVER['REMOTE_ADDR'];
                    if ($done)
                        $testerInfo['test'] = '';
                    UpdateTester($location, $tester, $testerInfo, $cpu);
                }
            }
        }
        if (isset($testInfo) && array_key_exists('shard_test', $testInfo) && $testInfo['shard_test'])
            StartProcessingIncrementalResult();

        if (isset($har) && $har && isset($_FILES['file']) && isset($_FILES['file']['tmp_name'])) {
            ProcessUploadedHAR($testPath);
        } elseif(isset($pcap) && $pcap &&
                 isset($_FILES['file']) && isset($_FILES['file']['tmp_name'])) {
            // The results page allows a user to download a pcap file.  It
            // expects the file to be at a specific path, which encodes the
            // run number and cache state.
            $finalPcapFileName =
                $runNumber . ($cacheWarmed ? "_Cached" : "") . ".cap";

            MovePcapIntoPlace($_FILES['file']['name'],
                              $_FILES['file']['tmp_name'],
                              $testPath, $finalPcapFileName);

            ProcessPCAP($testPath, $finalPcapFileName);
        } elseif( isset($_FILES['file']) ) {
            // extract the zip file
            logMsg(" Extracting uploaded file '{$_FILES['file']['tmp_name']}' to '$testPath'\n");
            $archive = new PclZip($_FILES['file']['tmp_name']);
            $list = $archive->extract(PCLZIP_OPT_PATH, "$testPath/", PCLZIP_OPT_REMOVE_ALL_PATH);
        }

        // compress the text data files
        if( isset($_FILES['file']) ) {
            $f = scandir($testPath);
            foreach( $f as $textFile ) {
                logMsg("Checking $textFile\n");
                if( is_file("$testPath/$textFile") ) {
                    $parts = pathinfo($textFile);
                    $ext = $parts['extension'];
                    if( !strcasecmp( $ext, 'txt') || !strcasecmp( $ext, 'json') || !strcasecmp( $ext, 'csv') ) {
                        // delete the optimization file (generated dynamically now)
                        // or any files with sensitive data if we were asked to
                        if( $ini['sensitive'] && strpos($textFile, '_report') ) {
                            RemoveSensitiveHeaders("$testPath/$textFile");
                        }
                        if( strpos($textFile, '_optimization') ) {
                            unlink("$testPath/$textFile");
                        } else {
                            logMsg( "Compressing $testPath/$textFile\n" );

                            if( gz_compress("$testPath/$textFile") )
                                unlink("$testPath/$textFile");
                        }
                    }
                }
            }
        }
        CheckForSpam();
        
        // make sure the test result is valid, otherwise re-run it
        if ($done && !$har && !$pcap && isset($testInfo) &&
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
                if (stripos($file, 'IEWPG'))
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
        // pre-process any background processing we need to do for this run
        if (isset($runNumber) && isset($cacheWarmed)) {
            ProcessAVIVideo($testInfo, $testPath, $runNumber, $cacheWarmed, false);
            loadPageRunData($testPath, $runNumber, $cacheWarmed);
        }
            
        // see if the test is complete
        if( $done )
        {
            // delete any .test files
            $files = scandir($testPath);
            foreach ($files as $file) {
                if (preg_match('/.*\.test$/', $file)) {
                    unlink("$testPath/$file");
                }
            }
            if (array_key_exists('job_file', $testInfo) && is_file($testInfo['job_file'])) {
                unlink($testInfo['job_file']);
            }
            
            $perTestTime = 0;
            $testCount = 0;

            // do pre-complete post-processing
            require_once('video.inc');
            require_once('./video/visualProgress.inc.php');
            MoveVideoFiles($testPath);
            
            if (!isset($pageData))
              $pageData = loadAllPageData($testPath);
            $medianRun = GetMedianRun($pageData, 0);

            // calculate and cache the content breakdown and visual progress information
            if( isset($testInfo) ) {
                require_once('breakdown.inc');
                for ($i = 1; $i <= $testInfo['runs']; $i++) {
                    getBreakdown($id, $testPath, $i, 0, $requests);
                    GetVisualProgress($testPath, $i, 0);
                    if (!$testInfo['fvonly']) {
                        getBreakdown($id, $testPath, $i, 1, $requests);
                        GetVisualProgress($testPath, $i, 1);
                    }
                }
            }

            // delete all of the videos except for the median run?
            if( array_key_exists('median_video', $ini) && $ini['median_video'] )
                KeepVideoForRun($testPath, $medianRun);
            
            $test = file_get_contents("$testPath/testinfo.ini");
            $now = gmdate("m/d/y G:i:s", $time);

            // update the completion time if it isn't already set
            if( !strpos($test, 'completeTime') )
            {
                $complete = "[test]\r\ncompleteTime=$now";
                if($medianRun)
                    $complete .= "\r\nmedianRun=$medianRun";
                $out = str_replace('[test]', $complete, $test);
                file_put_contents("$testPath/testinfo.ini", $out);
            }

            if( isset($testInfo) )
            {
                if( !isset($testInfo['completed']) )
                {
                    $testInfo['completed'] = $time;
                    $testInfo['medianRun'] = $medianRun;
                    gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfo));
                    $testInfo_dirty = false;
                    
                    $lockFile = fopen( "./tmp/$location.lock", 'w',  false);
                    if( $lockFile )
                    {
                        if( flock($lockFile, LOCK_EX) )
                        {
                            $testCount = $testInfo['runs'];
                            if( !$testInfo['fvonly'] )
                                $testCount *= 2;
                                
                            if( $testInfo['started'] && $time > $testInfo['started'] && $testCount )
                            {
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
                            flock($lockFile, LOCK_UN);
                        }
                        fclose($lockFile);
                    }
                }
            }
            
            // see if it is an industry benchmark test
            if( array_key_exists('industry', $ini) && array_key_exists('industry_page', $ini) && 
                strlen($ini['industry']) && strlen($ini['industry_page']) )
            {
                // lock the industry list
                // we will just lock it against ourselves to protect against  simultaneous updates
                // we will let the readers get whatever they can
                if( !is_dir('./video/dat') )
                    mkdir('./video/dat');
                    
                $lockFile = fopen( './video/dat/lock.dat', "w",  false);
                if( $lockFile )
                {
                    if( flock($lockFile, LOCK_EX) )
                    {
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
                        flock($lockFile, LOCK_UN);
                    }
                        
                    fclose($lockFile);
                }
            }
            
            if( isset($testInfo) && $testInfo_dirty ) {
                $testInfo_dirty = false;
                gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfo));
            }
            SecureDir($testPath);
            FinishProcessingIncrementalResult();
            
            // send an async request to the post-processing code so we don't block
            SendAsyncRequest("/work/postprocess.php?test=$id");
        } else {
            if( isset($testInfo) && $testInfo_dirty )
                gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfo));

            SecureDir($testPath);
            FinishProcessingIncrementalResult();
        }
    }
    else
        logMsg("location key incorrect\n");
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
    
    if( !isset($host) )
        $host  = $_SERVER['HTTP_HOST'];

    $fv = GetMedianRun($pageData, 0);
    if( isset($fv) && $fv )
    {
        $load = number_format($pageData[$fv][0]['loadTime'] / 1000.0, 3);
        $render = number_format($pageData[$fv][0]['render'] / 1000.0, 3);
        $numRequests = number_format($pageData[$fv][0]['requests'],0);
        $bytes = number_format($pageData[$fv][0]['bytesIn'] / 1024, 0);
        $result = "http://$host/result/$id";
        
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

/**
 * Exec the pcap2har python script, which converts a
 * .pcap file to a .har .
 *
 * @param string $pcapPath Path to read the PCAP file from.
 * @param string $harPath Path to which the HAR file will be written.
 * @param boolean $useLatestPCap2Har Use the latest version of pcap2har.py,
 *                as opposed to the stable version.
 * @param &array<string> $consoleOut Console output will be stored
 *                       in this array.
 * @return int The return code from pcap2har.py.
 */
function ExecPcap2Har($pcapPath, $harPath, $useLatestPCap2Har,
                      &$consoleOut) {
  // When we update pcap2har, we need to test that each
  // agent can use the new version.  To make testing easy,
  // the agent that uploads a .pcap can control which version
  // of pcap2har.py is used.  If $useLatestPcap is false,
  // use the stable version.  If $useLatestPcap is true,
  // use the latest version.  Once a version is known to
  // work with all agents, we promote the latest version
  // to stable.
  $pathContainingPCapToHar = ($useLatestPCap2Har ? "./mobile/latest"
                                                 : "./mobile");
  putenv("PYTHONPATH=".
         "$pathContainingPCapToHar:".
         "./mobile/dpkt-1.7:".
         "./mobile/simplejson");
  // When converting dates to ms since the epoch, do not add an offset
  // for time zones.
  putenv("TZ=UTC");

  $pcap2harExe = "$pathContainingPCapToHar/pcap2har/main.py";

  // Use switch --no-pages to avoid splitting requests into multiple page
  // loads.  WebpageTest agents start tcpdump for each page load, so we know
  // all network traffic is part of the same page load.  The heuristics used
  // to split requests into pages fail on some sites, such as m.yahoo.com.
  $pcap2harArgs = ($useLatestPCap2Har ? "--no-pages" : "");

  $retLine = exec("/usr/bin/python ".
                  "$pcap2harExe $pcap2harArgs $pcapPath $harPath 2>&1",
                  $consoleOut,
                  $returnCode);

  return $returnCode;
}

/**
 * Move an uploaded pcap file into the right place, unzipping if nessisary.
 *
 * @param String $clientFileName     File name set by the client.
 * @param String $uploadTmpFileName  Absolute path to the uploaded file.
 * @param String $testPath           Root of the results subdirectory of our test.
 * @param String $finalPcapFileName  The final file name the pcap should have.
 */
function MovePcapIntoPlace($clientFileName, $uploadTmpFileName,
                           $testPath, $finalPcapFileName) {
    // Is the upload a zip archive?  If so, unpack it.
    if (preg_match("/\.zip$/", $clientFileName)) {
        // Directory structure is not flattened, because the android
        // agent puts needed files at paths that encode their run
        // number and cache state.
        $archive = new PclZip($uploadTmpFileName);
        $list = $archive->extract(PCLZIP_OPT_PATH, "$testPath/");

        // Find the path to the uploaded pcap file, relative to
        // $testPath.
        $pcapFileName = null;
        foreach ($list as $file) {
            if (preg_match('/\.pcap$/', $file['stored_filename'])) {
                if ($pcapFileName !== null) {
                    logMalformedInput("zipped pcap upload should ".
                                      "contain only one .pcap file.");
                }
                // The zip library starts all paths with a "/".
                $pcapFileName = ltrim($file['stored_filename'], "/");
            }
        }
        if ($pcapFileName === null) {
            logMalformedInput(".pcap.zip file contains no .pcap file.");
        } else if (!rename("$testPath/$pcapFileName",
                           "$testPath/$finalPcapFileName")) {
            logMalformedInput("Failed to rename( $testPath/$pcapFileName , ".
                              "$testPath/$finalPcapFileName )");
        }
    } else {
        move_uploaded_file(
            $_FILES['file']['tmp_name'],
            "$testPath/$finalPcapFileName");
    }
}

/**
 * @param string $testPath
 */
function ProcessPCAP($testPath, $pcapFile)
{
    global $runNumber;
    global $cacheWarmed;
    global $useLatestPCap2Har;

    $pcapFilePath = "$testPath/$pcapFile";
    $harFilePath = $pcapFilePath . ".har";

    $consoleOut = array();

    // Execute pcap2har
    $returnCode = ExecPcap2Har($pcapFilePath, $harFilePath,
                               $useLatestPCap2Har,
                               $consoleOut);

    if ($returnCode != 0)
    {
       logMalformedInput("pcap to HAR converter returned $returnCode.  ".
                         "Expected 0.  pcap file is $pcapFilePath .  ".
                         "Console output is :\n". print_r($consoleOut, true));
       return;
    }

    // The mobile agents assume the har file is named results.har.  Make a copy
    // with the expected path.  We don't just write a file with this name,
    // because we want to keep the har from each run.
    copy($harFilePath, $testPath . "/results.har");

    // The entire pacp file captured one single page loading.
    $harIsFromSinglePageLoad = true;
    ProcessHARText($testPath, $harIsFromSinglePageLoad);
}

function ProcessUploadedHAR($testPath)
{
    require_once('./lib/pcltar.lib.php3');
    require_once('./lib/pclerror.lib.php3');
    require_once('./lib/pcltrace.lib.php3');
    global $done;
    global $flattenUploadedZippedHar;

    // From the mobile agents we get the zip file with sub-folders
    if( isset($_FILES['file']) )
    {
        //var_dump($_FILES['file']);
        logMsg(" Extracting uploaded file '{$_FILES['file']['tmp_name']}' to '$testPath'\n");
        if ($_FILES['file']['type'] == "application/tar" || preg_match("/\.tar$/",$_FILES['file']['name']))
        {
            PclTarExtract($_FILES['file']['tmp_name'],"$testPath","/","tar");
        }
        else if (preg_match("/\.zip$/",$_FILES['file']['name']))
        {
            $archive = new PclZip($_FILES['file']['tmp_name']);
            if ($flattenUploadedZippedHar)
            {
                // PCLZIP_OPT_REMOVE_ALL_PATH causes any directory structure
                // within the zip to be flattened.  Different agents have
                // slightly different directory layout, but all file names
                // are guaranteed to be unique.  Flattening allows us to avoid
                // directory traversal.
                // TODO(skerner): Find out why the blaze agents have different
                // directory structure and make it consistent, and remove
                // $flattenUploadedZippedHar as an option.
                $archive->extract(PCLZIP_OPT_PATH, "$testPath/",
                                  PCLZIP_OPT_REMOVE_ALL_PATH);
            }
            else
            {
                logMalformedInput("Depricated har upload path.  Agents should ".
                                  "set flattenZippedHar=1.");
                $archive->extract(PCLZIP_OPT_PATH, "$testPath/");
            }
        }
        else
        {
            move_uploaded_file($_FILES['file']['tmp_name'],
                               $testPath . "/" . $_FILES['file']['name']);
        }
    }

    // The HAR may hold multiple page loads.
    $harIsFromSinglePageLoad = false;
    ProcessHARText($testPath, $harIsFromSinglePageLoad);
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
function StartProcessingIncrementalResult() {
    global $id;
    global $testPath;
    global $done;
    global $testInfo;
    global $testInfo_dirty;
    global $runNumber;
    global $runIndex;
    global $cacheWarmed;
    global $testLock;
    global $location;
    global $admin;

    if( $testLock = fopen( "$testPath/test.lock", 'w',  false) )
        flock($testLock, LOCK_EX);

    // re-load the testinfo from disk so we don't write stale data acquired from outside the lock
    $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
    if( isset($testInfo) ) {
        $testInfo['last_updated'] = $time;
        $testInfo_dirty = true;
    }

    if ($done) {
        if (!array_key_exists('test_runs', $testInfo)) {
            $testInfo['test_runs'] = array();
            for ($run = 1; $run <= $testInfo['runs']; $run++) {
                $testInfo['test_runs'][$run] = array();
            }
        }
        
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
* Clean up the test lock that protects the sharded test result processing
* 
*/
function FinishProcessingIncrementalResult() {
    global $testPath;
    global $testLock;
    global $done;
    if (isset($testLock) && $testLock) {
        flock($testLock, LOCK_UN);
        fclose($testLock);
    }
    if ($done)
        unlink("$testPath/test.lock");
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

            require_once('object_detail.inc');
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
