<?php
if(extension_loaded('newrelic')) { 
    newrelic_add_custom_tracer('GetUpdate');
    newrelic_add_custom_tracer('GetVideoJob');
    newrelic_add_custom_tracer('GetJobFile');
}

chdir('..');
$debug = false;
include 'common.inc';
set_time_limit(600);

$json = false;
if($_GET['f'] == 'json')
    $json = true;
$location = $_GET['location'];
$key = $_GET['key'];
$recover = $_GET['recover'];
$pc = $_GET['pc'];
$ec2 = $_GET['ec2'];
$tester = null;
if( isset($ec2) && strlen($ec2) )
    $tester = $ec2;
elseif( isset($pc) && strlen($pc) )
    $tester = $pc;
else
    $tester = trim($_SERVER['REMOTE_ADDR']);
    
logMsg("getwork.php location:$location tester:$tester ex2:$ec2 recover:$recover");

// see if there is an update
$done = false;
if( !$done && $_GET['ver'] )
    $done = GetUpdate();
    
// see if there is a video  job
if( !$done && $_GET['video'] )
    $done = GetVideoJob();

if( !$done )
    $done = GetJob();

// send back a blank result if we didn't have anything
if( !$done )
{
    header('Content-type: text/plain');
    header("Cache-Control: no-cache, must-revalidate");
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
}

    
/**
* Get an actual task to complete
* 
*/
function GetJob()
{
    $done = false;

    global $location;
    global $key;
    global $pc;
    global $ec2;
    global $tester;
    global $recover;
    global $json;
    
    // load all of the locations
    $locations = parse_ini_file('./settings/locations.ini', true);
    BuildLocations($locations);

    $workDir = $locations[$location]['localDir'];
    $locKey = $locations[$location]['key'];
    if( strlen($workDir) && (!strlen($locKey) || !strcmp($key, $locKey)) )
    {
        // see if the tester is marked as being offline
        $offline = false;
        if( strlen($ec2) && strlen($locations[$location]['ec2']) && is_file('./ec2/ec2.inc.php') )
        {
            logMsg("Checking $ec2 to see if it is offline");
            require_once('./ec2/ec2.inc.php');
            if( !EC2_CheckInstance($location, $locations[$location]['ec2'], $ec2) )
            {
                logMsg("$ec2 is offline");
                $offline = true;
            }
        }
        
        if( $lock = LockLocation($location) )
        {
            // make sure the work directory actually exists
            if( !is_dir($workDir) )
                mkdir($workDir, 0777, true);
            
            // load the tester information
            $testers = json_decode(file_get_contents("./tmp/$location.tm"), true);
            if( !count($testers) )
                $testers = array();
            if( !isset($testers[$tester]) )
                $testers[$tester] = array();
            elseif( !is_array($testers[$tester]) )
            {
                unset($testers[$tester]);
                $testers[$tester] = array();
            }

            // make sure the tester isn't marked as offline (usually when shutting down EC2 instances)                
            if( !$testers[$tester]['offline'] )
            {
                // go through the backup directory and restore any that are over an hour old
                // We prefix the files with an underscore to identify that they have been recovered 
                // so we don't try to back them up
                $fileName = null;
                $recovered = false;
                $backupDir = "$workDir/testing";
                $backups = scandir($backupDir);
                $now = time();
                foreach( $backups as $file )
                {
                    if( is_file( "$backupDir/$file" ) )
                    {
                        $fileTime = filemtime("$backupDir/$file");
                        if( $fileTime && $fileTime < $now )
                        {
                            // Check if the file should be recovered due to time or if a given tester requested it
                            $elapsed = $now - $fileTime;
                            if( $elapsed > 3600 )
                            {
                                $fileName = "$backupDir/$file";
                                $recovered = true;
                                break;
                            }
                            elseif (isset($recover) && $recover && strlen($tester) && strpos($file,$tester) === 0) 
                            {
                                $fileName = "$backupDir/$file";
                                $recovered = true;
                                break;
                            }
                        }
                    }
                }

                if( !isset($fileName) )
                    $fileName = GetJobFile($workDir);
                
                if( isset($fileName) && strlen($fileName) )
                {
                    $done = true;
                    
                    if( $json)
                        header ("Content-type: application/json");
                    else
                        header('Content-type: text/plain');
                    header("Cache-Control: no-cache, must-revalidate");
                    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

                    // send the test info to the test agent
                    $testInfo = file_get_contents($fileName);
                    if( isset($recover) && $recover && !$recovered )
                    {
                        if( !is_dir($backupDir) )
                            mkdir($backupDir, 0777, true);
                        $fileBase = basename($fileName);
                        $backupFile = $backupDir . '/' . $tester . "_" . $fileBase;
                        if( rename($fileName, $backupFile) )
                            touch($backupFile);
                        else
                            unlink($fileName);
                    }
                    else
                        unlink($fileName);
                    
                    if( $json )
                    {
                        $testJson = array();
                        $script = '';
                        $isScript = false;
                        $lines = explode("\r\n", $testInfo);
                        foreach($lines as $line)
                        {
                            if( strlen(trim($line)) )
                            {
                                if( $isScript )
                                {
                                    if( strlen($script) )
                                        $script .= "\r\n";
                                    $script .= $line;
                                }
                                elseif( !strcasecmp($line, '[Script]') )
                                    $isScript = true;
                                else
                                {
                                    $pos = strpos($line, '=');
                                    if( $pos > -1 )
                                    {
                                        $key = trim(substr($line, 0, $pos));
                                        $value = trim(substr($line, $pos + 1));
                                        if( strlen($key) && strlen($value) )
                                        {
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
                    
                    // extract the test ID from the job file
                    if( preg_match('/Test ID=([^\r\n]+)\r/i', $testInfo, $matches) )
                        $testId = trim($matches[1]);

                    if( isset($testId) )
                    {
                        // figure out the path to the results
                        $testPath = './' . GetTestPath($testId);

                        // flag the test with the start time
                        $ini = file_get_contents("$testPath/testinfo.ini");
                        $time = time();
                        $start = "[test]\r\nstartTime=" . date("m/d/y G:i:s", $time);
                        $out = str_replace('[test]', $start, $ini);
                        file_put_contents("$testPath/testinfo.ini", $out);
                        
                        if( gz_is_file("$testPath/testinfo.json") )
                        {
                            $testInfoJson = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
                            $testInfoJson['tester'] = $tester;
                            $testInfoJson['started'] = $time;
                            gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfoJson));
                        }
                    }
                }
                    
                // keep track of the last time this location reported in
                $now = time();
                $testers[$tester]['updated'] = $now;
                $testers[$tester]['ip'] = $_SERVER['REMOTE_ADDR'];
                $testers[$tester]['pc'] = $pc;
                $testers[$tester]['ec2'] = $ec2;
                $testers[$tester]['ver'] = $_GET['ver'];
                $testers[$tester]['test'] = $testId;
                if( isset($testId) )
                {
                    $testers[$tester]['last'] = $now;
                }
                else
                {
                    // keep track of the FIRST idle request as the last work time so we can have an accurate "idle time"
                    if( isset($testers[$tester]['test']) && strlen($testers[$tester]['test']) )
                        $testers[$tester]['last'] = $now;
                    unset($testers[$tester]['test']);
                }
                        
                // delete any testers in this location that haven't checked in in over an hour
                foreach( $testers as $name => &$data )
                {
                    if( $now > $data['updated'] )
                    {
                        $elapsed = $now - $data['updated'];
                        if( $elapsed > 3600 )
                            unset( $testers[$name] );
                    }
                }
                        
                // zero out the tracked page loads in case some got lost
                if( !$done )
                {
                    $tests = json_decode(file_get_contents("./tmp/$location.tests"), true);
                    if( $tests )
                    {
                        $tests['tests'] = 0;
                        file_put_contents("./tmp/$location.tests", json_encode($tests));
                    }
                }
            }
            
            if ($testers)
                file_put_contents("./tmp/$location.tm", json_encode($testers));

            UnlockLocation($lock);
        }
    }
    
    return $done;
}

/**
* Get the next job from the work queue
* 
* @param mixed $workDir
*/
function GetNextJobFile($workDir)
{
    $fileName = null;
    
    // get a list of all of the files in the directory and store them indexed by filetime
    $files = array();
    $f = scandir($workDir);
    foreach( $f as $file )
    {
        $fileTime = filemtime("$workDir/$file");
        if( $fileTime && !isset($files[$fileTime]) )
            $files[$fileTime] = $file;
        else
            $files[] = $file;
    }
    
    // sort it by time
    ksort($files);
    
    // loop through all of the possible extension types in priority order
    $priority = array( "url", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9" );
    foreach( $priority as $ext )
    {
        foreach( $files as $file )
        {
            if(is_file("$workDir/$file"))
            {
                $parts = pathinfo($file);
                if( !strcasecmp( $parts['extension'], $ext) )
                {
                    $fileName = "$workDir/$file";
                    break 2;
                }
            }
        }
    }

    return $fileName;
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

                        logMsg("Video job $testFile sent to $tester from $location");
                        readfile_chunked($testFile);
                        $ret = true;
                        
                        // delete the test file
                        unlink($testFile);
                    }

                    closedir($dir);
                }
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
            if( $update['ver'] && (int)$update['ver'] != (int)$_GET['ver'] )
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

?>
