<?php
chdir('..');
include('common.inc');
require_once('./lib/pclzip.lib.php');
header('Content-type: text/plain');
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
set_time_limit(60*5*10);
ignore_user_abort(true);
$location = $_REQUEST['location'];
$key = $_REQUEST['key'];
$done = $_REQUEST['done'];
$id = $_REQUEST['id'];
$har = $_REQUEST['har'];

if( $_REQUEST['video'] )
{
    logMsg("Video file $id received from $location");
    
    $dir = './' . GetVideoPath($id);
    if( isset($_FILES['file']) )
    {
        $dest = $dir . '/video.mp4';
        move_uploaded_file($_FILES['file']['tmp_name'], $dest);

        // update the ini file
        $iniFile = $dir . '/video.ini';
        $ini = file_get_contents($iniFile);
        $ini .= 'completed=' . date('c') . "\r\n";
        file_put_contents($iniFile, $ini);
    }
}
else
{
    // load all of the locations
    $locations = parse_ini_file('./settings/locations.ini', true);
    BuildLocations($locations);
    
    $settings = parse_ini_file('./settings/settings.ini');

    $locKey = $locations[$location]['key'];

    logMsg("\n\nWork received for test: $id, location: $location, key: $key\n");

    if( (!strlen($locKey) || !strcmp($key, $locKey)) || !strcmp($_SERVER['REMOTE_ADDR'], "127.0.0.1") )
    {
        // update the location time
        if( strlen($location) )
        {
            if( !is_dir('./tmp') )
                mkdir('./tmp');
            touch( "./tmp/$location.tm" );
        }
        
        if( !isset($_FILES['file']) )
            logMsg(" No uploaded file attached\n");
        
        // figure out the path to the results
        $testPath = './' . GetTestPath($id);
        $ini = parse_ini_file("$testPath/testinfo.ini");
            
        if (isset($har) && $har && isset($_FILES['file']['tmp_name']))
        {
            ProcessHAR($testPath);
        }
        elseif( isset($_FILES['file']) )
        {
            // extract the zip file
            logMsg(" Extracting uploaded file '{$_FILES['file']['tmp_name']}' to '$testPath'\n");
            $archive = new PclZip($_FILES['file']['tmp_name']);
            $list = $archive->extract(PCLZIP_OPT_PATH, "$testPath/", PCLZIP_OPT_REMOVE_ALL_PATH);
        }

        // compress the text data files
        if( isset($_FILES['file']) )
        {
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
        
        $time = time();
        if( gz_is_file("$testPath/testinfo.json") )
        {
            $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
            if( isset($testInfo) )
                $testInfo['last_updated'] = $time;
        }
            
        // see if the test is complete
        if( $done )
        {
            $perTestTime = 0;
            $testCount = 0;
            $beaconUrl = null;
            if( strlen($settings['showslow'])  )
            {
                $beaconUrl = $settings['showslow'] . '/beacon/webpagetest/';
                if( strlen($settings['showslow_key'])  )
                    $beaconUrl .= '?key=' . trim($settings['showslow_key']);
                if( $settings['beaconRate'] && rand(1, 100) > $settings['beaconRate'] )
                    unset($beaconUrl);
                else
                    $testInfo['showslow'] = 1;
            }

            // do pre-complete post-processing
            require_once('video.inc');
            MoveVideoFiles($testPath);
            BuildVideoScripts($testPath);
            
            require_once 'page_data.inc';
            $pageData = loadAllPageData($testPath);
            $medianRun = GetMedianRun($pageData, 0);

            $test = file_get_contents("$testPath/testinfo.ini");
            $now = date("m/d/y G:i:s", $time);

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
                        }
                        fclose($lockFile);
                    }
                }
            }
            
            // clean up the backup of the job file
            $backupDir = $locations[$location]['localDir'] . '/testing';
            if( is_dir($backupDir) )
            {
                $files = glob("$backupDir/*$id.*", GLOB_NOSORT);
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
                    }
                        
                    fclose($lockFile);
                }
            }
            
            // delete all of the videos except for the median run?
            if( $ini['median_video'] )
                KeepVideoForRun($testPath, $medianRun);
            
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
            
            // send a beacon?
            if( strlen($beaconUrl) )
            {
                @include('./work/beacon.inc');
                @SendBeacon($beaconUrl, $id, $testPath, $testInfo, $pageData);
            }
            
            // archive the test result
            require_once('archive.inc');
            ArchiveTest($id);
        }
        
        if( isset($testInfo) )
            gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfo));
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
    
    $pageData = loadAllPageData($testPath);
    $url = trim($pageData[1][0]['URL']);
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
function KeepVideoForRun($testPath, $run)
{
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

function ProcessHAR($testPath)
{
    require_once('./lib/pcltar.lib.php3');
    require_once('./lib/pclerror.lib.php3');
    require_once('./lib/pcltrace.lib.php3');
    global $done;

    // From the mobile agents we get the zip file with sub-folders
    if( isset($_FILES['file']) )
    {
        //var_dump($_FILES['file']);
        logMsg(" Extracting uploaded file '{$_FILES['file']['tmp_name']}' to '$testPath'\n");
        if ($_FILES['file']['type'] == "application/tar" || preg_match("/\.tar$/",$_FILES['file']['name']))
            $list = PclTarExtract($_FILES['file']['tmp_name'],"$testPath","/","tar");
        else if (preg_match("/\.zip$/",$_FILES['file']['name']))
        {
            $archive = new PclZip($_FILES['file']['tmp_name']);
            $list = $archive->extract(PCLZIP_OPT_PATH, "$testPath/");
        }
        else
            move_uploaded_file($_FILES['file']['tmp_name'], $testPath . "/" . $_FILES['file']['name']);
    }

    // TODO(skerner): Should be able to always do har processing if there is a
    // HAR file.  Will need to test mobile agents.
    if (!$done) {
      logMsg("Processing har, but not done.  Potential backward compatibility issues.");
    }

    if (true)  // TODO(skerner): indentation.
    {
        // Save the json HAR file
        $rawHar = file_get_contents("{$testPath}/results.har");

        // Parsethe json file
        $parsedHar = json_decode($rawHar, true);
        if (!$parsedHar)
        {
            logMsg("Failed to parse json file");
        }
        else
        {
            // Keep meta data about a page from iterating the entries
            $pageData;

            // Iterate the pages
            foreach ($parsedHar['log']['pages'] as $pagecount => $page)
            {
                $pageref = $page['id'];
                $curPageData;

                // Extract direct page data and save in data array
                $curPageData["url"] = $page['title'];

                $startFull = $page['startedDateTime'];
                if (preg_match("/^(.+)T(.+)\.\d+[+-]\d\d:?\d\d$/",
                               $startFull, $matches)) {
                  $curPageData["startDate"] = $matches[1];
                  $curPageData["startTime"] = $matches[2];
                  $curPageData["startFull"] = $startFull;
                } else {
                  logMalformedInput(
                      "Failed to parse page key 'startedDateTime'.  ".
                       "Value of key is '$startFull'.");
                }

                if (array_key_exists('onRender', $page['pageTimings'])) {
                  $curPageData["onRender"] = $page['pageTimings']['onRender'];
                } else if (array_key_exists('_onRender',$page['pageTimings'])) {
                  $curPageData["onRender"] = $page['pageTimings']['_onRender'];
                } else {
                  logMsg("onRender not set for page $pageref");
                  $curPageData["onRender"] = UNKNOWN_TIME;
                }

                $curPageData["docComplete"] = $page['pageTimings']['onContentLoad'];
                $curPageData["fullyLoaded"] = $page['pageTimings']['onLoad'];
                // TODO: Remove this patch for files missing the data
                if ($curPageData["docComplete"] <= 0)
                  $curPageData["docComplete"] = $curPageData["fullyLoaded"];
                if ($curPageData["onRender"] <= 0)
                  $curPageData["onRender"] = 0;

                if (!preg_match("/^https?:\/\/([^\/?]+)(((?:\/|\\?).*$)|$)/",
                                $curPageData["url"], $urlMatches))
                  logMalformedInput("HAR error: Could not match host in URL ".
                                    $curPageData["url"]);

                $curPageData["host"] = $urlMatches[1];

                // Some clients encode the run number and cache status in the
                // page name.  Others give the information in properties on the
                // pageTimings record.  Prefer the explicit properties.  Fall
                // back to decoding the information from the name of the page
                // record.
                if (array_key_exists('_runNumber', $page))
                {
                  $curPageData["run"] = $page['_runNumber'];
                  $curPageData["cached"] = $page['_cacheWarmed'];
                }
                else if (preg_match("/page_(\d+)_([01])/", $pageref, $matches))
                {
                  $curPageData["run"] = $matches[1];
                  $curPageData["cached"] = $matches[2];
                }
                else
                {
                  logMalformedInput("HAR error: Could not get runs or cache status, from ".
                                    "pages array or page name \"$pageref\".");
                  // Sensible defaults:
                  $curPageData["run"] =  1;
                  $curPageData["cached"] = 0;
                }

                if ($curPageData["run"] <= 0)
                  logMalformedInput("HAR error: \$curPageData[\"run\"] should always be positive.  ".
                                    "Value is ".$curPageData["run"]);

                $curPageData["title"] =
                  ($curPageData["cached"] ? "Cached-" : "Cleared Cache-") .
                      "Run_" . $curPageData["run"]  . 
                      "^" . $curPageData["url"];

                // Define filename prefix
                $curPageData["runFilePrefix"] = $testPath . "/" . $curPageData["run"] . "_";

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

                // Start by stating the time-to-first-byte is the page load time, will be updated as we iterate requets
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
            }

            // Sort the entries by start time. This is done across runs, but
            // since each of them references its own page it shouldn't matter
            $sortedEntries;
            foreach ($parsedHar['log']['entries'] as $entrycount => $entry)
            {
                // We use the textual start date as key, which should work fine for ISO dates
                $start = $entry['startedDateTime'];
                $sortedEntries[$start . "-" . $entrycount] = $entry;
            }
            ksort($sortedEntries);


            // Iterate the entries
            foreach ($sortedEntries as $entind => $entry)
            {
                // Get the pageref
                $startedDateTime = $entry['startedDateTime'];
                $pageref = $entry['pageref'];
                $curPageData = $pageData[$pageref];

                $reqEnt = $entry['request'];
                $respEnt = $entry['response'];
                $cacheEnt = $entry['cache'];
                $timingsEnt = $entry['timings'];
                    
                // Extract the variables
                $reqHttpVer = $reqEnt['httpVersion'];
                $respHttpVer = $respEnt['httpVersion'];
                if (preg_match("/^(.+)T(.+)\.\d+[+-]\d\d:?\d\d$/",
                               $startedDateTime, $matches)) {
                  $reqDate = $matches[1];
                  $reqTime = $matches[2];
                } else {
                  logMalformedInput(
                      "Sorted entry key 'startedDateTime' could ".
                      "not be parsed.  Value is '$startedDateTime'");
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
                // For now, ignore status 0 responses, as we assume these are cached resources
                if ($reqRespCode == "0") {
                    logMsg("Skipping resp 0 resource " . $reqEnt['url']);
                    continue;
                }
                $reqRespCodeText = $respEnt['statusText'];
                $reqLoadTime = 0 + $entry['time'];
                // The specific times are currently unavailable, and set to arbitrary values
                $reqDnsTime = 0; // + $timingEnt['dns'];
                $reqConnectTime = 0; // + $timingEnt['connect'];
                $reqSslTime = 0;
                $reqTTFB = 0; //$timingEnt['wait'] + $reqDnsTime + $reqConnectTime + $timingEnt['send'];

                // The list is sorted by time, so use the first resource as the real start time,
                // since the start time on the page isn't always reliable (likely a bug, but this will do for now)
                if ($curPageData["calcStarTime"] == 0) {
                    $curPageData["calcStarTime"] = $startedDateTime;
                    $curPageData["startFull"] = $startedDateTime;
                }

                $reqStartTime = getDeltaMilliseconds($curPageData["startFull"], $startedDateTime);
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
                $reqIpAddr = "127.0.0.1";
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
                    "$reqLoadTime\t" . 
                    "$reqTTFB\t" . 
                    "$reqStartTime\t" . 
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
                    "$reqDnsTime\t" . 
                    "$reqConnectTime\t" . 
                    "$reqSslTime\t" . 
                    "\t" . //"Gzip Total Bytes\t" . 
                    "\t" . //"Gzip Savings\t" . 
                    "\t" . //"Minify Total Bytes\t" . 
                    "\t" . //"Minify Savings\t" . 
                    "\t" . //"Image Total Bytes\t" . 
                    "\t" . //"Image Savings\t" . 
                    "\t" . //"Cache Time (sec)\t" . 
                    "\t" . //"Real Start Time (ms)\t" . 
                    "\t" . //"Full Time to Load (ms)\t" . 
                    "0\r\n", //"Optimization Checked\r\n
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
                    "      Time to first byte: $reqTTFB milliseconds\r\n".
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
                    
                // If this request started earlier than the current TTFB, make it the page's TTFB
                if ($curPageData["TTFB"] > $reqStartTime)
                {
                    $curPageData["TTFB"] = $reqStartTime;
                }
                    
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
    }
}

/**
 * Calculate the delta in milliseconds between two string dates
 *
 * @param before
 * @param after
 */
function GetDeltaMilliseconds($before, $after)
{
    // Extract the date and milliseconds from the
    if (!preg_match("/^.*\.(\d+)[+-]\d\d:?\d\d$/", $before, $matches)) {
      logMalformedInput("Failed to parse date: $before");
      return UNKNOWN_TIME;
    }

    $millisBefore = (double)$matches[1] / 1000.0;

    if (!preg_match("/^.*\.(\d+)[+-]\d\d:?\d\d$/", $after, $matches)) {
      logMalformedInput("Failed to parse date: $after");
      return UNKNOWN_TIME;
    }

    $millisAfter = (double)$matches[1] / 1000.0;

    // Get the secs before & after
    $secsBefore = (double)strtotime($before) + $millisBefore;
    $secsAfter = (double)strtotime($after) + $millisAfter;

    // Calculate the number of seconds between the two
    $deltaSeconds = $secsAfter - $secsBefore;

    // Turn the delta into millis, adding the millis delta
    $deltaMillis = (int)($deltaSeconds*1000.0);

    return $deltaMillis;
}
?>

