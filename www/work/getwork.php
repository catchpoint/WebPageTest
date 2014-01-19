<?php
if(extension_loaded('newrelic')) { 
  newrelic_add_custom_tracer('GetUpdate');
  newrelic_add_custom_tracer('GetVideoJob');
  newrelic_add_custom_tracer('GetJob');
  newrelic_add_custom_tracer('GetJobFile');
  newrelic_add_custom_tracer('CheckCron');
  newrelic_add_custom_tracer('ProcessTestShard');
  newrelic_add_custom_tracer('GetTesters');
  newrelic_add_custom_tracer('LockLocation');
}

chdir('..');
include 'common_lib.inc';
error_reporting(0);
set_time_limit(600);
$is_json = array_key_exists('f', $_GET) && $_GET['f'] == 'json';
$location = $_GET['location'];
$key = array_key_exists('key', $_GET) ? $_GET['key'] : '';
$recover = array_key_exists('recover', $_GET) ? $_GET['recover'] : '';
$pc = array_key_exists('pc', $_GET) ? $_GET['pc'] : '';
$ec2 = array_key_exists('ec2', $_GET) ? $_GET['ec2'] : '';
$tester = null;
if (strlen($ec2))
  $tester = $ec2;
elseif (strlen($pc))
  $tester = $pc . '-' . trim($_SERVER['REMOTE_ADDR']);
else
  $tester = trim($_SERVER['REMOTE_ADDR']);

$dnsServers = '';
if (array_key_exists('dns', $_REQUEST))
  $dnsServers = str_replace('-', ',', $_REQUEST['dns']);
$supports_sharding = false;
if (array_key_exists('shards', $_REQUEST) && $_REQUEST['shards'])
  $supports_sharding = true;

$is_done = false;
if (!array_key_exists('freedisk', $_GET) || (float)$_GET['freedisk'] > 0.1) {
  if (!$is_done && array_key_exists('ver', $_GET))
    $is_done = GetUpdate();
  if (!$is_done && @$_GET['video'])
    $is_done = GetVideoJob();
  if (!$is_done)
    $is_done = GetJob();
}

// kick off any cron work we need to do asynchronously
CheckCron();

// Send back a blank result if we didn't have anything.
if (!$is_done) {
  header('Content-type: text/plain');
  header("Cache-Control: no-cache, must-revalidate");
  header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
}


/**
* Get an actual task to complete
* 
*/
function GetJob() {
    $is_done = false;

    global $location;
    global $key;
    global $pc;
    global $ec2;
    global $tester;
    global $recover;
    global $is_json;
    global $dnsServers;

    $workDir = "./work/jobs/$location";
    $locKey = GetLocationKey($location);
    if (strpos($location, '..') == false &&
        strpos($location, '\\') == false &&
        strpos($location, '/') == false &&
        (!strlen($locKey) || !strcmp($key, $locKey))) {
        if( $lock = LockLocation($location) )
        {
            $now = time();
            $testers = GetTesters($location);

            // make sure the tester isn't marked as offline (usually when shutting down EC2 instances)                
            if(!@$testers[$tester]['offline']) {
                $fileName = GetJobFile($workDir, $priority);
                if( isset($fileName) && strlen($fileName) )
                {
                    $is_done = true;
                    $delete = true;
                    
                    if ($is_json)
                        header ("Content-type: application/json");
                    else
                        header('Content-type: text/plain');
                    header("Cache-Control: no-cache, must-revalidate");
                    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

                    // send the test info to the test agent
                    $testInfo = file_get_contents("$workDir/$fileName");

                    // extract the test ID from the job file
                    if( preg_match('/Test ID=([^\r\n]+)\r/i', $testInfo, $matches) )
                        $testId = trim($matches[1]);

                    if( isset($testId) ) {
                        // figure out the path to the results
                        $testPath = './' . GetTestPath($testId);

                        // flag the test with the start time
                        $ini = file_get_contents("$testPath/testinfo.ini");
                        if (stripos($ini, 'startTime=') === false) {
                            $time = time();
                            $start = "[test]\r\nstartTime=" . gmdate("m/d/y G:i:s", $time);
                            $out = str_replace('[test]', $start, $ini);
                            file_put_contents("$testPath/testinfo.ini", $out);
                        }
                        
                        if( gz_is_file("$testPath/testinfo.json") ) {
                            $testInfoJson = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
                            if (!array_key_exists('tester', $testInfoJson) || !strlen($testInfoJson['tester']))
                                $testInfoJson['tester'] = $tester;
                            if (isset($dnsServers) && strlen($dnsServers))
                                $testInfoJson['testerDNS'] = $dnsServers;
                            if (!array_key_exists('started', $testInfoJson) || !strlen($testInfoJson['started']))
                                $testInfoJson['started'] = $time;
                            $testInfoJson['id'] = $testId;
                            ProcessTestShard($testInfoJson, $testInfo, $delete);
                            gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfoJson));
                        }
                        file_put_contents("./tmp/last-test-{$location}-{$tester}.test", $testId);
                    }

                    if ($delete)
                        unlink("$workDir/$fileName");
                    else
                        AddJobFileHead($workDir, $fileName, $priority, true);
                    
                    if ($is_json) {
                        $testJson = array();
                        $script = '';
                        $isScript = false;
                        $lines = explode("\r\n", $testInfo);
                        foreach($lines as $line) {
                            if( strlen(trim($line)) ) {
                                if( $isScript ) {
                                    if( strlen($script) )
                                        $script .= "\r\n";
                                    $script .= $line;
                                } elseif( !strcasecmp($line, '[Script]') )
                                    $isScript = true;
                                else {
                                    $pos = strpos($line, '=');
                                    if( $pos > -1 ) {
                                        $key = trim(substr($line, 0, $pos));
                                        $value = trim(substr($line, $pos + 1));
                                        if( strlen($key) && strlen($value) ) {
                                            if( is_numeric($value) )
                                                $testJson[$key] = (int)$value;
                                            else
                                                $testJson[$key] = $value;
                                        }
                                    }
                                }
                            }
                        }
                        if( strlen($script) )
                            $testJson['script'] = $script;
                        echo json_encode($testJson);
                    }
                    else
                        echo $testInfo;
                    $ok = true;
                }
                    
                // zero out the tracked page loads in case some got lost
                if( !$is_done ) {
                    $tests = json_decode(file_get_contents("./tmp/$location.tests"), true);
                    if( $tests ) {
                        $tests['tests'] = 0;
                        file_put_contents("./tmp/$location.tests", json_encode($tests));
                    }
                }
            }
            
            UnlockLocation($lock);

            // keep track of the last time this location reported in
            $testerInfo = array();
            $testerInfo['ip'] = $_SERVER['REMOTE_ADDR'];
            $testerInfo['pc'] = $pc;
            $testerInfo['ec2'] = $ec2;
            $testerInfo['ver'] = array_key_exists('version', $_GET) ? $_GET['version'] : $_GET['ver'];
            $testerInfo['freedisk'] = @$_GET['freedisk'];
            $testerInfo['ie'] = @$_GET['ie'];
            $testerInfo['dns'] = $dnsServers;
            $testerInfo['video'] = @$_GET['video'];
            $testerInfo['GPU'] = @$_GET['GPU'];
            $testerInfo['test'] = '';
            if (isset($testId))
                $testerInfo['test'] = $testId;
            UpdateTester($location, $tester, $testerInfo);
      }
    }
    
    return $is_done;
}

/**
* See if there is a video rendering job that needs to be done
* 
*/
function GetVideoJob()
{
    global $debug;
    global $location;
    global $tester;
    $ret = false;
    
    $videoDir = './work/video';
    if( is_dir($videoDir) )
    {
        // lock the directory
        $lockFile = fopen( './tmp/video.lock', 'w',  false);
        if( $lockFile )
        {
            if( flock($lockFile, LOCK_EX) )
            {
                // look for the first zip file
                $dir = opendir($videoDir);
                if( $dir )
                {
                    $testFile = null;
                    while(!$testFile && $file = readdir($dir)) 
                    {
                        $path = $videoDir . "/$file";
                        if( is_file($path) && stripos($file, '.zip') )
                            $testFile = $path;
                    }
                    
                    if( $testFile )
                    {
                        header('Content-Type: application/zip');
                        header("Cache-Control: no-cache, must-revalidate");
                        header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
                        readfile_chunked($testFile);
                        $ret = true;
                        
                        // delete the test file
                        unlink($testFile);
                    }

                    closedir($dir);
                }
                flock($lockFile, LOCK_UN);
            }

            fclose($lockFile);
        }
    }
    
    return $ret;
}

/**
* See if there is a software update
* 
*/
function GetUpdate()
{
    global $location;
    $ret = false;
    
    // see if the client sent a version number
    if( $_GET['ver'] )
    {
        $fileBase = '';
        if( isset($_GET['software']) && strlen($_GET['software']) )
            $fileBase = trim($_GET['software']);
        
        $updateDir = './work/update';
        if( is_dir("$updateDir/$location") )
            $updateDir = "$updateDir/$location";
            
        // see if we have any software updates
        if( is_file("$updateDir/{$fileBase}update.ini") && is_file("$updateDir/{$fileBase}update.zip") )
        {
            $update = parse_ini_file("$updateDir/{$fileBase}update.ini");

            // Check for inequality allows both upgrade and quick downgrade
            if( $update['ver'] && intval($update['ver']) !== intval($_GET['ver']) )
            {
                header('Content-Type: application/zip');
                header("Cache-Control: no-cache, must-revalidate");
                header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

                readfile_chunked("$updateDir/{$fileBase}update.zip");
                $ret = true;
            }
        }
    }
    
    return $ret;
}

/**
* Send a quick http request locally if we need to process cron events (to each of the cron entry points)
* 
* This only runs events on 15-minute intervals and tries to keep it close to the clock increments (00, 15, 30, 45)
* 
*/
function CheckCron() {
    // open and lock the cron job file - abandon quickly if we can't get a lock
    $should_run = false;
    $cron_lock = fopen('./tmp/wpt_cron.lock', 'w+');
    if ($cron_lock !== false) {
        if (flock($cron_lock, LOCK_EX | LOCK_NB)) {
            $last_run = 0;
            if (is_file('./tmp/wpt_cron.dat'))
                $last_run = file_get_contents('./tmp/wpt_cron.dat');
            $now = time();
            $elapsed = $now - $last_run;
            if (!$last_run || $elapsed > 120) {
                if ($elapsed > 1200) {
                    // if it has been over 20 minutes, run regardless of the wall-clock time
                    $should_run = true;
                } else {
                    $minute = gmdate('i', $now) % 5;
                    if ($minute < 2)
                        $should_run = true;
                }
            }
            if ($should_run) {
                file_put_contents('./tmp/wpt_cron.dat', $now);
            }
            flock($cron_lock, LOCK_UN);
        }
        fclose($cron_lock);
    }
    
    // send the cron requests
    if ($should_run) {
        if (is_file('./settings/benchmarks/benchmarks.txt') && 
            is_file('./benchmarks/cron.php')) {
            SendAsyncRequest('/benchmarks/cron.php');
        }
        if (is_file('./jpeginfo/cleanup.php')) {
            SendAsyncRequest('/jpeginfo/cleanup.php');
        }
    }
}

/**
* Process a sharded test
* 
* @param mixed $testInfo
*/
function ProcessTestShard(&$testInfo, &$test, &$delete) {
    global $supports_sharding;
    global $tester;
    if (isset($testInfo) && array_key_exists('shard_test', $testInfo) && $testInfo['shard_test']) {
        if ((array_key_exists('type', $testInfo) && $testInfo['type'] == 'traceroute') ||
            !$supports_sharding) {
            $testInfo['shard_test'] = 0;
        } else {
            if( $testLock = fopen( "$testPath/test.lock", 'w',  false) )
                flock($testLock, LOCK_EX);
            $done = true;
            $assigned_run = 0;
            if (!array_key_exists('test_runs', $testInfo)) {
                $testInfo['test_runs'] = array();
                for ($run = 1; $run <= $testInfo['runs']; $run++) {
                    $testInfo['test_runs'][$run] = array();
                }
            }
            
            // find a run to assign to a tester
            for ($run = 1; $run <= $testInfo['runs']; $run++) {
                if (!array_key_exists('tester', $testInfo['test_runs'][$run])) {
                    $testInfo['test_runs'][$run]['tester'] = $tester;
                    $testInfo['test_runs'][$run]['started'] = time();
                    $testInfo['test_runs'][$run]['done'] = false;
                    $assigned_run = $run;
                    break;
                }
            }
            
            // go through again and see if all tests have been assigned
            for ($run = 1; $run <= $testInfo['runs']; $run++) {
                if (!array_key_exists('tester', $testInfo['test_runs'][$run])) {
                    $done = false;
                    break;
                }
            }
            
            if ($assigned_run) {
                $append = "run=$assigned_run\r\n";

                // Figure out if this test needs to be discarded
                $index = $assigned_run;
                if (array_key_exists('discard', $testInfo)) {
                    if ($index <= $testInfo['discard']) {
                        $append .= "discardTest=1\r\n";
                        $index = 1;
                        $done = true;
                        $testInfo['test_runs'][$assigned_run]['discarded'] = true;
                    } else {
                        $index -= $testInfo['discard'];
                    }
                }
                $append .= "index=$index\r\n";
                
                $insert = strpos($test, "\nurl");
                if ($insert !== false) {
                    $test = substr($test, 0, $insert + 1) . 
                            $append . 
                            substr($test, $insert + 1);
                } else {
                    $test = "run=$assigned_run\r\n" + $test;
                }
            }

            if (!$done)
                $delete = false;
                
            if (isset($testLock) && $testLock) {
                flock($testLock, LOCK_UN);
                fclose($testLock);
            }
        }
    }
}
?>
