<?php
chdir('..');
include 'common.inc';
set_time_limit(600);

// see if there is an update
$done = false;
if( !$done && $_GET['ver'] )
    $done = GetUpdate();
    
// see if there is a video  job
if( !$done && $_GET['video'] )
    $done = GetVideoJob();

if( !$done )
{
    $location = $_GET['location'];
    $key = $_GET['key'];
    $pc = $_GET['pc'];
    $ec2 = $_GET['ec2'];
    $tester = null;
    if( isset($ec2) && strlen($ec2) )
        $tester = $ec2;
    elseif( isset($pc) && strlen($pc) )
        $tester = $pc;
    
    // load all of the locations
    $locations = parse_ini_file('./settings/locations.ini', true);

    $workDir = $locations[$location]['localDir'];
    $locKey = $locations[$location]['key'];
    if( strlen($workDir) && (!strlen($locKey) || !strcmp($key, $locKey)) )
    {
        // see if the tester is marked as being offline
        $offline = false;
        if( isset($tester) && is_file("./work/testers/$location/$tester.offline") )
            $offline = true;
        
        if( !$offline )
        {
            // make sure the work directory actually exists
            if( !is_dir($workDir) )
                mkdir($workDir, 0777, true);
                
            // lock the working directory for the given location
            $lockFile = fopen( $workDir . '/lock.dat', 'a+b',  false);
            if( $lockFile )
            {
                if( flock($lockFile, LOCK_EX) )
                {
                    // go through the backup directory and restore any that are over an hour old
                    // We prefix the files with an underscore to identify that they have been recovered 
                    // so we don't try to back them up
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
                                $elapsed = $now - $fileTime;
                                if( $elapsed > 3600 )
                                {
                                    rename( "$backupDir/$file", "$workDir/_$file" );
                                    touch("$workDir/_$file");
                                }
                            }
                        }
                    }
                    
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
                    
                    $fileName;
                    $fileExt;
                    $testId;
                    
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
                                    $testId = trim(basename($file, ".$ext"), '_');
                                    $fileName = "$workDir/$file";
                                    $fileExt = $parts['extension'];
                                    break 2;
                                }
                            }
                        }
                    }
                    
                    if( isset($fileName) && strlen($fileName) )
                    {
                        $done = true;
                        
                        header('Content-type: text/plain');
                        header("Cache-Control: no-cache, must-revalidate");
                        header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

                        $testInfo = file_get_contents($fileName);

                        // make a backup of the job file
                        if( !is_dir($backupDir) )
                            mkdir($backupDir, 0777, true);
                        
                        $fileBase = basename($fileName);
                        if( $fileBase == trim($fileBase, '_') )
                        {
                            $backupFile = $backupDir . '/' . $fileBase;
                            rename($fileName, $backupFile);
                            touch($backupFile);
                        }
                        else
                            unlink($fileName);

                        // new-style files are totally self-contained
                        // detect them and deal with the legacy files
                        if( strncasecmp($testInfo, 'Test ID=', 8) )
                            echo "Test ID=$testId\r\nurl=" . $testInfo;
                        else
                            echo $testInfo;
                        
                        $ok = true;
                        
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
                            $testInfoJson['started'] = $time;
                            gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfoJson));
                        }
                    }
                    
                    // keep track of the last time this location reported in
                    if( !is_dir('./work/times') )
                        mkdir('./work/times');
                    if( isset($tester) && strlen($tester) )
                    {
                        // store the last time for each PC
                        $times = json_decode(file_get_contents("./work/times/$location.tm"), true);
                        if( !count($times) )
                            $times = array();
                            
                        // store information about what the tester is currently doing
                        if( !isset($times[$tester]) )
                            $times[$tester] = array();
                        elseif( !is_array($times[$tester]) )
                        {
                            unset($times[$tester]);
                            $times[$tester] = array();
                        }

                        $now = time();
                        $times[$tester]['updated'] = $now;
                        $times[$tester]['ip'] = $_SERVER['REMOTE_ADDR'];
                        $times[$tester]['pc'] = $pc;
                        $times[$tester]['ec2'] = $ec2;
                        if( isset($testId) )
                        {
                            $times[$tester]['test'] = $testId;
                            $times[$tester]['last'] = $now;
                        }
                        else
                        {
                            // keep track of the FIRST idle request as the last work time so we can have an accurate "idle time"
                            if( isset($times[$tester]['test']) && strlen($times[$tester]['test']) )
                                $times[$tester]['last'] = $now;
                                
                            unset($times[$tester]['test']);
                        }
                        file_put_contents("./work/times/$location.tm", json_encode($times));
                    }
                    else
                    {        
                        touch( "./work/times/$location.tm" );
                    }
                }

                fclose($lockFile);
            }
        }
    }
}

// if we didn't have work to hand out, try updating the rss feeds (5% of the time)
if( !$done && (rand(1, 100) <= 5) )
{
    include('updateFeeds.php');
}

// send back a blank result if we didn't have anything
if( !$done )
{
    header('Content-type: text/plain');
    header("Cache-Control: no-cache, must-revalidate");
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
}

/**
* See if there is a video rendering job that needs to be done
* 
*/
function GetVideoJob()
{
    $ret = false;
    
    $videoDir = './work/video';
    if( is_dir($videoDir) )
    {
        // lock the directory
        $lockFile = fopen( $videoDir . '/lock.dat', 'a+b',  false);
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
    $ret = false;
    
    // see if the client sent a version number
    if( $_GET['ver'] )
    {
        // see if we have any software updates
        if( is_file('./work/update/update.ini') && is_file('./work/update/update.zip') )
        {
            $update = parse_ini_file('./work/update/update.ini');
            if( $update['ver'] && (int)$update['ver'] != (int)$_GET['ver'] )
            {
                header('Content-Type: application/zip');
                header("Cache-Control: no-cache, must-revalidate");
                header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

                readfile_chunked('./work/update/update.zip');
                $ret = true;
            }
        }
    }
    
    return $ret;
}

?>
