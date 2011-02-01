<?php
chdir('..');
include('common.inc');
require_once('./lib/pclzip.lib.php');
header('Content-type: text/plain');
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
set_time_limit(300);
$location = $_REQUEST['location'];
$key = $_REQUEST['key'];
$done = $_REQUEST['done'];
$id = $_REQUEST['id'];

if( $_REQUEST['video'] )
{
    if( isset($_FILES['file']) )
    {
        $dir = './' . GetVideoPath($id);
        $dest = $dir . '/video.mp4';
        move_uploaded_file($_FILES['file']['tmp_name'], $dest);
    }

    // update the ini file
    $iniFile = $dir . '/video.ini';
    $ini = file_get_contents($iniFile);
    $ini .= 'completed=' . date('c') . "\r\n";
    file_put_contents($iniFile, $ini);
}
else
{
    // load all of the locations
    $locations = parse_ini_file('./settings/locations.ini', true);
    $settings = parse_ini_file('./settings/settings.ini');

    $locKey = $locations[$location]['key'];

    logMsg("\n\nWork received for test: $id, location: $location, key: $key\n");

    if( (!strlen($locKey) || !strcmp($key, $locKey)) || !strcmp($_SERVER['REMOTE_ADDR'], "127.0.0.1") )
    {
        // update the location time
        if( strlen($location) )
        {
            if( !is_dir('./work/times') )
                mkdir('./work/times');
            touch( "./work/times/$location.tm" );
        }
        
        if( !isset($_FILES['file']) )
            logMsg(" No uploaded file attached\n");
        
        // figure out the path to the results
        $testPath = './' . GetTestPath($id);
        $ini = parse_ini_file("$testPath/testinfo.ini");
            
        // extract the zip file
        if( isset($_FILES['file']) )
        {
            logMsg(" Extracting uploaded file '{$_FILES['file']['tmp_name']}' to '$testPath'\n");
            $archive = new PclZip($_FILES['file']['tmp_name']);
            $list = $archive->extract(PCLZIP_OPT_PATH, "$testPath/", PCLZIP_OPT_REMOVE_ALL_PATH);
            
            // compress the text data files
            $f = scandir($testPath);
            foreach( $f as $textFile )
            {
                logMsg( "Checking $textFile\n" );
                if( is_file("$testPath/$textFile") )
                {
                    $parts = pathinfo($textFile);
                    $ext = $parts['extension'];
                    if( !strcasecmp( $ext, 'txt') || !strcasecmp( $ext, 'json') || !strcasecmp( $ext, 'csv') )
                    {
                        // delete the optimization file (generated dynamically now)
                        // or any files with sensitive data if we were asked to
                        if( strpos($textFile, '_optimization') )
                            unlink("$testPath/$textFile");
                        elseif( $ini['sensitive'] && strpos($textFile, '_report') )
                            unlink("$testPath/$textFile");
                        else
                        {
                            logMsg( "Compressing $testPath/$textFile\n" );
                            
                            if( gz_compress("$testPath/$textFile") )
                                unlink("$testPath/$textFile");
                        }
                    }
                }
            }
        }
        
        // see if the test is complete
        if( $done )
        {
            // do pre-complete post-processing
            require_once('video.inc');
            MoveVideoFiles($testPath);
            BuildVideoScripts($testPath);
            
            $test = file_get_contents("$testPath/testinfo.ini");
            $time = time();
            $now = date("m/d/y G:i:s", $time);

            // update the completion time if it isn't already set
            if( !strpos($test, 'completeTime') )
            {
                $complete = "[test]\r\ncompleteTime=$now";
                $out = str_replace('[test]', $complete, $test);
                file_put_contents("$testPath/testinfo.ini", $out);
            }

            if( gz_is_file("$testPath/testinfo.json") )
            {
                $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
                if( !isset($testInfo['completed']) )
                {
                    $testInfo['completed'] = $time;
                    gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfo));
                }
            }
            
            // clean up the backup of the job file
            $backupDir = $locations[$location]['localDir'] . '/testing';
            if( is_dir($backupDir) )
            {
                $files = glob("$backupDir/$id.*", GLOB_NOSORT);
                foreach($files as $file)
                    unlink($file);
            }
            
            // see if it is an industry benchmark test
            if( strlen($ini['industry']) && strlen($ini['industry_page']) )
            {
                // lock the industry list
                // we will just lock it against ourselves to protect against  simultaneous updates
                // we will let the readers get whatever they can
                if( !is_dir('./video/dat') )
                    mkdir('./video/dat');
                    
                $lockFile = fopen( './video/dat/lock.dat', "a+b",  false);
                if( $lockFile )
                {
                    $ok = false;
                    $count = 0;
                    while( !$ok &&  $count < 500 )
                    {
                        $count++;
                        if( flock($lockFile, LOCK_EX) )
                            $ok = true;
                        else
                            usleep(10000);
                    }

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
                        
                    fclose($lockFile);
                }
            }
            
            // delete all of the videos except for the median run?
            if( $ini['median_video'] )
                KeepMedianVideo($testPath);
            
            // do any other post-processing (e-mail notification for example)
            if( isset($settings['notifyFrom']) && is_file("$testPath/testinfo.ini") )
            {
                $test = parse_ini_file("$testPath/testinfo.ini",true);
                if( strlen($test['test']['notify']) )
                    notify( $test['test']['notify'], $settings['notifyFrom'], $id, $testPath, $settings['host'] );
            }
            
            // send a callback request
            if( isset($testInfo) && isset($testInfo['callback']) && strlen($testInfo['callback']) )
            {
                // build up the url we are going to ping
                $url = $testInfo['callback'];
                if( strncasecmp($url, 'http', 4) )
                    $url = "http://" . $url;
                if( strpos($url, '?') == false )
                    $url .= '?';
                else
                    $url .= '&';
                $url .= "id=$id";
                
                // set a 10 second timeout on the request
                $ctx = stream_context_create(array('http' => array('timeout' => 10))); 

                // send the request (we don't care about the response)
                file_get_contents($url, 0, $ctx);
            }
            
            // run the AFT processing for the current test (in the background)
            // TODO - move the processing to the actual test machine
            if( $test['test']['aft'] )
                shell_exec("/usr/local/php5/bin/php -f ./work/aft.php '$id' > /dev/null &");
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
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=iso-8859-1\r\n";
    $headers .= "From: $from\r\n";
    $headers .= "Reply-To: $from";
    
    $url;
    if( gz_is_file("$testPath/url.txt") )
        $url = htmlspecialchars(gz_file_get_contents("$testPath/url.txt"));
    $shorturl = substr($url, 0, 40);
    if( strlen($url) > 40 )
        $shorturl .= '...';
    
    $subject = "Test results for $shorturl";
    
    if( !isset($host) )
        $host  = $_SERVER['HTTP_HOST'];

    // calculate the results
    require_once 'page_data.inc';
    $pageData = loadAllPageData($testPath);
    $fv = null;
    $rv = null;
    $pageStats = calculatePageStats($pageData, $fv, $rv);
    if( isset($fv) )
    {
        $load = number_format($fv['loadTime'] / 1000.0, 3);
        $render = number_format($fv['render'] / 1000.0, 3);
        $requests = number_format($fv['requests'],0);
        $bytes = number_format($fv['bytesIn'] / 1024, 0);
        $result = "http://$host/result/$id";
        
        // capture the optimization report
        require_once '../optimization.inc';
        ob_start();
        dumpOptimizationReport($testPath, 1, 0);
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
            the page required <b>$requests requests</b> and <b>$bytes KB</b>.</p>
            <p>Here is what the page looked like when it loaded (click the image for a larger view):<br><a href=\"$result/1/screen_shot/\"><img src=\"$result/1_screen_thumb.jpg\"></a></p>
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
function KeepMedianVideo($testPath)
{
    require_once 'page_data.inc';
    $pageData = loadAllPageData($testPath);
    $run = GetMedianRun($pageData, 0);
    if( $run )
    {
        $dir = opendir($testPath);
        if( $dir )
        {
            while($file = readdir($dir)) 
            {
                $path = $testPath  . "/$file/";
                if( is_dir($path) && !strncmp($file, 'video_', 6) && $file != "video_$run" )
                    delTree("$path/");
            }

            closedir($dir);
        }
    }
}
?>

