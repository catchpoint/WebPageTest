<?php
$msStart = microtime(true);

//$debug=true;
require_once('common.inc');
require_once('page_data.inc');
require_once('testStatus.inc');
require_once('video/visualProgress.inc.php');
require_once('domains.inc');
require_once('breakdown.inc');
require_once('devtools.inc.php');

// see if we are sending abbreviated results
$pagespeed = 0;
if (array_key_exists('pagespeed', $_REQUEST))
  $pagespeed = (int)$_REQUEST['pagespeed'];

if( isset($test['test']) && $test['test']['batch'] )
    BatchResult($id, $testPath);
else
{
    // see if the test is actually finished
    $status = GetTestStatus($id);
    if( isset($test['test']['completeTime']) )
    {
        $host  = $_SERVER['HTTP_HOST'];
        $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
        $path = substr($testPath, 1);

        $pageData = loadAllPageData($testPath);

        $msLoad = microtime(true);

        // if we don't have an url, try to get it from the page results
        if( !strlen($url) )
            $url = $pageData[1][0]['URL'];

        header ('Content-type: text/xml');
        echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        echo "<response>\n";
        echo "<statusCode>200</statusCode>\n";
        echo "<statusText>Ok</statusText>\n";
        if( array_key_exists('r', $_REQUEST) && strlen($_REQUEST['r']) )
            echo "<requestId>{$_REQUEST['r']}</requestId>\n";
        echo "<data>\n";
        
        // spit out the calculated averages
        $fv = null;
        $rv = null;
        $pageStats = calculatePageStats($pageData, $fv, $rv);
        
        echo "<testId>$id</testId>\n";
        if( FRIENDLY_URLS )
            echo "<summary>http://$host$uri/result/$id/</summary>\n";
        else
            echo "<summary>http://$host$uri/results.php?test=$id</summary>\n";
        if (isset($test['testinfo']))
        {
            if( @strlen($test['testinfo']['url']) )
                echo "<testUrl>" . xml_entities($test['testinfo']['url']) . "</testUrl>\n";
            if( @strlen($test['testinfo']['location']) ) {
                $locstring = $test['testinfo']['location'];
                if( @strlen($test['testinfo']['browser']) )
                    $locstring .= ':' . $test['testinfo']['browser'];
                echo "<location>$locstring</location>\n";
            }
            if ( @strlen($test['test']['location']) )
                echo "<from>" . xml_entities($test['test']['location']) . "</from>\n";
            if( @strlen($test['testinfo']['connectivity']) )
            {
                echo "<connectivity>{$test['testinfo']['connectivity']}</connectivity>\n";
                echo "<bwDown>{$test['testinfo']['bwIn']}</bwDown>\n";
                echo "<bwUp>{$test['testinfo']['bwOut']}</bwUp>\n";
                echo "<latency>{$test['testinfo']['latency']}</latency>\n";
                echo "<plr>{$test['testinfo']['plr']}</plr>\n";
            }
            if( @strlen($test['testinfo']['label']) )
                echo "<label>" . xml_entities($test['testinfo']['label']) . "</label>\n";
            if( @strlen($test['testinfo']['completed']) )
                echo "<completed>" . gmdate("r",$test['testinfo']['completed']) . "</completed>\n";
            if( @strlen($test['testinfo']['testerDNS']) )
                echo "<testerDNS>" . xml_entities($test['testinfo']['testerDNS']) . "</testerDNS>\n";
        }
        $runs = max(array_keys($pageData));
        echo "<runs>$runs</runs>\n";
        echo "<successfulFVRuns>" . CountSuccessfulTests($pageData, 0) . "</successfulFVRuns>\n";
        if( isset($rv) ) {
            echo "<successfulRVRuns>" . CountSuccessfulTests($pageData, 1) . "</successfulRVRuns>\n";
        }
        echo "<average>\n";
        echo "<firstView>\n";
        foreach( $fv as $key => $val ) {
          $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
          echo "<$key>" . number_format($val,0, '.', '') . "</$key>\n";
        }
        echo "</firstView>\n";
        if( isset($rv) )
        {
            echo "<repeatView>\n";
            foreach( $rv as $key => $val ) {
              $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
              echo "<$key>" . number_format($val,0, '.', '') . "</$key>\n";
            }
            echo "</repeatView>\n";
        }
        echo "</average>\n";
        echo "<standardDeviation>\n";
        echo "<firstView>\n";
        foreach( $fv as $key => $val ) {
          $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
          echo "<$key>" . PageDataStandardDeviation($pageData, $key, 0) . "</$key>\n";
        }
        echo "</firstView>\n";
        if( isset($rv) )
        {
            echo "<repeatView>\n";
            foreach( $rv as $key => $val ) {
              $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
              echo "<$key>" . PageDataStandardDeviation($pageData, $key, 1) . "</$key>\n";
            }
            echo "</repeatView>\n";
        }
        echo "</standardDeviation>\n";

        // output the median run data
        $fvMedian = GetMedianRun($pageData, 0, $median_metric);
        if( $fvMedian )
        {
            echo "<median>\n";
            echo "<firstView>\n";
            echo "<run>$fvMedian</run>\n";
            foreach( $pageData[$fvMedian][0] as $key => $val ) {
              $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
              echo "<$key>" . xml_entities($val) . "</$key>\n";
            }
            if (gz_is_file("$testPath/{$fvMedian}_pagespeed.txt")) {
              if( $pagespeed )
              {
                  $score = GetPageSpeedScore("$testPath/{$fvMedian}_pagespeed.txt");
                  if( strlen($score) )
                      echo "<PageSpeedScore>$score</PageSpeedScore>\n";
              }
              if( FRIENDLY_URLS )
                  echo "<PageSpeedData>http://$host$uri/result/$id/{$fvMedian}_pagespeed.txt</PageSpeedData>\n";
              else
                  echo "<PageSpeedData>http://$host$uri//getgzip.php?test=$id&amp;file={$fvMedian}_pagespeed.txt</PageSpeedData>\n";
            }
            xmlDomains($id, $testPath, $fvMedian, 0);
            xmlBreakdown($id, $testPath, $fvMedian, 0);
            xmlRequests($id, $testPath, $fvMedian, 0);
            StatusMessages($id, $testPath, $fvMedian, 0);
            ConsoleLog($id, $testPath, $fvMedian, 0);
            echo "</firstView>\n";
            
            if( isset($rv) )
            {
                $rvMedian = GetMedianRun($pageData, 1, $median_metric);
                if($rvMedian)
                {
                    echo "<repeatView>\n";
                    echo "<run>$rvMedian</run>\n";
                    foreach( $pageData[$rvMedian][1] as $key => $val ) {
                      $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
                      echo "<$key>" . xml_entities($val) . "</$key>\n";
                    }
                    if (gz_is_file("$testPath/{$fvMedian}_Cached_pagespeed.txt")) {
                      if( $pagespeed )
                      {
                          $score = GetPageSpeedScore("$testPath/{$rvMedian}_Cached_pagespeed.txt");
                          if( strlen($score) )
                              echo "<PageSpeedScore>$score</PageSpeedScore>\n";
                      }
                      if( FRIENDLY_URLS )
                          echo "<PageSpeedData>http://$host$uri/result/$id/{$rvMedian}_Cached_pagespeed.txt</PageSpeedData>\n";
                      else
                          echo "<PageSpeedData>http://$host$uri//getgzip.php?test=$id&amp;file={$rvMedian}_Cached_pagespeed.txt</PageSpeedData>\n";
                    }
                    xmlDomains($id, $testPath, $fvMedian, 1);
                    xmlBreakdown($id, $testPath, $fvMedian, 1);
                    xmlRequests($id, $testPath, $fvMedian, 1);
                    StatusMessages($id, $testPath, $fvMedian, 1);
                    ConsoleLog($id, $testPath, $fvMedian, 1);
                    echo "</repeatView>\n";
                }
            }
            echo "</median>\n";
        }

        // spit out the raw data for each run
        for( $i = 1; $i <= $runs; $i++ )
        {
            echo "<run>\n";
            echo "<id>$i</id>\n";

            // first view
            if( isset( $pageData[$i] ) )
            {
                if( isset( $pageData[$i][0] ) )
                {
                    echo "<firstView>\n";
                    echo "<results>\n";
                    foreach( $pageData[$i][0] as $key => $val ) {
                      $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
                      echo "<$key>" . xml_entities($val) . "</$key>\n";
                    }
                    if( $pagespeed )
                    {
                        $score = GetPageSpeedScore("$testPath/{$i}_pagespeed.txt");
                        if( strlen($score) )
                            echo "<PageSpeedScore>$score</PageSpeedScore>\n";
                    }
                    echo "</results>\n";

                    // links to the relevant pages
                    echo "<pages>\n";
                    if( FRIENDLY_URLS )
                    {
                        echo "<details>http://$host$uri/result/$id/$i/details/</details>\n";
                        echo "<checklist>http://$host$uri/result/$id/$i/performance_optimization/</checklist>\n";
                        echo "<breakdown>http://$host$uri/result/$id/$i/breakdown/</breakdown>\n";
                        echo "<domains>http://$host$uri/result/$id/$i/domains/</domains>\n";
                        echo "<screenShot>http://$host$uri/result/$id/$i/screen_shot/</screenShot>\n";
                    }
                    else
                    {
                        echo "<details>http://$host$uri/details.php?test=$id&amp;run=$i</details>\n";
                        echo "<checklist>http://$host$uri/performance_optimization.php?test=$id&amp;run=$i</checklist>\n";
                        echo "<breakdown>http://$host$uri/breakdown.php?test=$id&amp;run=$i</breakdown>\n";
                        echo "<domains>http://$host$uri/domains.php?test=$id&amp;run=$i</domains>\n";
                        echo "<screenShot>http://$host$uri/screen_shot.php?test=$id&amp;run=$i</screenShot>\n";
                    }
                    echo "</pages>\n";
                    
                    // urls for the relevant images
                    echo "<thumbnails>\n";
                    echo "<waterfall>http://$host$uri/result/$id/{$i}_waterfall_thumb.png</waterfall>\n";
                    echo "<checklist>http://$host$uri/result/$id/{$i}_optimization_thumb.png</checklist>\n";
                    if( is_file("$testPath/{$i}_screen.jpg") )
                      echo "<screenShot>http://$host$uri/result/$id/{$i}_screen_thumb.jpg</screenShot>\n";
                    echo "</thumbnails>\n";

                    echo "<images>\n";
                    echo "<waterfall>http://$host$uri$path/{$i}_waterfall.png</waterfall>\n";
                    echo "<connectionView>http://$host$uri$path/{$i}_connection.png</connectionView>\n";
                    echo "<checklist>http://$host$uri$path/{$i}_optimization.png</checklist>\n";
                    if( is_file("$testPath/{$i}_screen.jpg") )
                      echo "<screenShot>http://$host$uri$path/{$i}_screen.jpg</screenShot>\n";
                    if( is_file("$testPath/{$i}_screen.png") )
                        echo "<screenShotPng>http://$host$uri$path/{$i}_screen.png</screenShotPng>\n";
                    echo "</images>\n";

                    // raw results
                    echo "<rawData>";
                    if (gz_is_file("$testPath/{$i}_report.txt"))
                      echo "<headers>http://$host$uri$path/{$i}_report.txt</headers>\n";
                    if (is_file("$testPath/{$i}_bodies.zip"))
                        echo "<bodies>http://$host$uri$path/{$i}_bodies.zip</bodies>\n";
                    if (gz_is_file("$testPath/{$i}_IEWPG.txt"))
                      echo "<pageData>http://$host$uri$path/{$i}_IEWPG.txt</pageData>\n";
                    if (gz_is_file("$testPath/{$i}_IEWTR.txt"))
                      echo "<requestsData>http://$host$uri$path/{$i}_IEWTR.txt</requestsData>\n";
                    if (gz_is_file("$testPath/{$i}_progress.csv"))
                      echo "<utilization>http://$host$uri$path/{$i}_progress.csv</utilization>\n";
                    if (gz_is_file("$testPath/{$i}_pagespeed.txt"))
                      echo "<PageSpeedData>http://$host$uri/result/$id/{$i}_pagespeed.txt</PageSpeedData>\n";
                    echo "</rawData>\n";
                    
                    // video frames
                    $startOffset = array_key_exists('testStartOffset', $pageData[$i][0]) ? intval(round($pageData[$i][0]['testStartOffset'])) : 0;
                    $progress = GetVisualProgress($testPath, $i, 0, null, null, $startOffset);
                    if (array_key_exists('frames', $progress) && is_array($progress['frames']) && count($progress['frames'])) {
                      echo "<videoFrames>\n";
                      foreach($progress['frames'] as $ms => $frame) {
                          echo "<frame>\n";
                          echo "<time>$ms</time>\n";
                          echo "<image>http://$host$uri$path/video_{$i}/{$frame['file']}</image>\n";
                          echo "<VisuallyComplete>{$frame['progress']}</VisuallyComplete>\n";
                          echo "</frame>\n";
                      }
                      echo "</videoFrames>\n";
                    }
                    if (isset($progress) &&
                        is_array($progress) &&
                        array_key_exists('DevTools', $progress) &&
                        is_array($progress['DevTools'])) {
                        if (array_key_exists('processing', $progress['DevTools'])) {
                          echo "<processing>\n";
                          foreach ($progress['DevTools']['processing'] as $key => $value)
                            echo "<$key>$value</$key>\n";
                          echo "</processing>\n";
                        }
                        if (array_key_exists('VisualProgress', $progress['DevTools'])) {
                          echo "<VisualProgress>\n";
                          foreach ($progress['DevTools']['VisualProgress'] as $key => $value)
                            echo "<progress>\n<time>$key</time>\n<VisuallyComplete>$value</VisuallyComplete>\n</progress>\n";
                          echo "</VisualProgress>\n";
                        }
                    }
                    
                    xmlDomains($id, $testPath, $i, 0);
                    xmlBreakdown($id, $testPath, $i, 0);
                    xmlRequests($id, $testPath, $i, 0);
                    StatusMessages($id, $testPath, $i, 0);
                    ConsoleLog($id, $testPath, $i, 0);
                    echo "</firstView>\n";
                }

                // repeat view
                if( isset( $pageData[$i][1] ) )
                {
                    echo "<repeatView>\n";
                    echo "<results>\n";
                    foreach( $pageData[$i][1] as $key => $val ) {
                      $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
                      echo "<$key>" . xml_entities($val) . "</$key>\n";
                    }
                    if( $pagespeed )
                    {
                        $score = GetPageSpeedScore("$testPath/{$i}_Cached_pagespeed.txt");
                        if( strlen($score) )
                            echo "<PageSpeedScore>$score</PageSpeedScore>\n";
                    }
                    echo "</results>\n";

                    // links to the relevant pages
                    echo "<pages>\n";
                    echo "<details>http://$host$uri/result/$id/$i/details/cached/</details>\n";
                    echo "<checklist>http://$host$uri/result/$id/$i/performance_optimization/cached/</checklist>\n";
                    echo "<report>http://$host$uri/result/$id/$i/optimization_report/cached/</report>\n";
                    echo "<breakdown>http://$host$uri/result/$id/$i/breakdown/</breakdown>\n";
                    echo "<domains>http://$host$uri/result/$id/$i/domains/</domains>\n";
                    echo "<screenShot>http://$host$uri/result/$id/$i/screen_shot/cached/</screenShot>\n";
                    echo "</pages>\n";
                    
                    // urls for the relevant images
                    echo "<thumbnails>\n";
                    echo "<waterfall>http://$host$uri/result/$id/{$i}_Cached_waterfall_thumb.png</waterfall>\n";
                    echo "<checklist>http://$host$uri/result/$id/{$i}_Cached_optimization_thumb.png</checklist>\n";
                    if( is_file("$testPath/{$i}_Cached_screen.jpg") )
                      echo "<screenShot>http://$host$uri/result/$id/{$i}_Cached_screen_thumb.jpg</screenShot>\n";
                    echo "</thumbnails>\n";

                    echo "<images>\n";
                    echo "<waterfall>http://$host$uri$path/{$i}_Cached_waterfall.png</waterfall>\n";
                    echo "<connectionView>http://$host$uri$path/{$i}_Cached_connection.png</connectionView>\n";
                    echo "<checklist>http://$host$uri$path/{$i}_Cached_optimization.png</checklist>\n";
                    if( is_file("$testPath/{$i}_Cached_screen.jpg") )
                      echo "<screenShot>http://$host$uri$path/{$i}_Cached_screen.jpg</screenShot>\n";
                    if( is_file("$testPath/{$i}_Cached_screen.png") )
                        echo "<screenShotPng>http://$host$uri$path/{$i}_Cached_screen.png</screenShotPng>\n";
                    echo "</images>\n";

                    // raw results
                    echo "<rawData>\n";
                    if (gz_is_file("$testPath/{$i}_Cached_report.txt"))
                      echo "<headers>http://$host$uri$path/{$i}_Cached_report.txt</headers>\n";
                    if (is_file("$testPath/{$i}_Cached_bodies.zip"))
                        echo "<bodies>http://$host$uri$path/{$i}_Cached_bodies.zip</bodies>\n";
                    if (gz_is_file("$testPath/{$i}_Cached_IEWPG.txt"))
                      echo "<pageData>http://$host$uri$path/{$i}_Cached_IEWPG.txt</pageData>\n";
                    if (gz_is_file("$testPath/{$i}_Cached_IEWTR.txt"))
                      echo "<requestsData>http://$host$uri$path/{$i}_Cached_IEWTR.txt</requestsData>\n";
                    if (gz_is_file("$testPath/{$i}_Cached_progress.csv"))
                      echo "<utilization>http://$host$uri$path/{$i}_Cached_progress.csv</utilization>\n";
                    if (gz_is_file("$testPath/{$i}_Cached_pagespeed.txt"))
                      echo "<PageSpeedData>http://$host$uri/result/$id/{$i}_Cached_pagespeed.txt</PageSpeedData>\n";
                    echo "</rawData>\n";
                    
                    // video frames
                    $startOffset = array_key_exists('testStartOffset', $pageData[$i][1]) ? intval(round($pageData[$i][1]['testStartOffset'])) : 0;
                    $progress = GetVisualProgress($testPath, $i, 1, null, null, $startOffset);
                    if (array_key_exists('frames', $progress) && is_array($progress['frames']) && count($progress['frames'])) {
                      echo "<videoFrames>\n";
                      foreach($progress['frames'] as $ms => $frame) {
                          echo "<frame>\n";
                          echo "<time>$ms</time>\n";
                          echo "<image>http://$host$uri$path/video_{$i}_cached/{$frame['file']}</image>\n";
                          echo "<VisuallyComplete>{$frame['progress']}</VisuallyComplete>\n";
                          echo "</frame>\n";
                      }
                      echo "</videoFrames>\n";
                    }
                    if (isset($progress) &&
                        is_array($progress) &&
                        array_key_exists('DevTools', $progress) &&
                        is_array($progress['DevTools']) &&
                        array_key_exists('processing', $progress['DevTools'])) {
                        echo "<processing>\n";
                        foreach ($progress['DevTools']['processing'] as $key => $value)
                          echo "<$key>$value</$key>\n";
                        echo "</processing>\n";
                    }
                    
                    xmlDomains($id, $testPath, $i, 1);
                    xmlBreakdown($id, $testPath, $i, 1);
                    xmlRequests($id, $testPath, $i, 1);
                    StatusMessages($id, $testPath, $i, 1);
                    ConsoleLog($id, $testPath, $i, 1);
                    echo "</repeatView>\n";
                }
            }

            echo "</run>\n";
        }

        echo "</data>\n";
        echo "</response>\n";

        $msElapsed = number_format( microtime(true) - $msStart, 3 );
        $msElapsedLoad = number_format( $msLoad - $msStart, 3 );
        logMsg("xmlResult ($id): {$msElapsed}s ({$msElapsedLoad}s to load page data)");
    }
    else
    {
        header ('Content-type: text/xml');
        echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        echo "<response>\n";
        if( strlen($_REQUEST['r']) )
            echo "<requestId>{$_REQUEST['r']}</requestId>\n";

        // see if it was a valid test
        if( $test['test']['runs'] )
        {
            if( isset($test['test']['startTime']) )
            {
                echo "<statusCode>101</statusCode>\n";
                echo "<statusText>Test Started</statusText>\n";
                echo "<data>\n";
                echo "<startTime>{$test['test']['startTime']}</startTime>\n";
                echo "</data>\n";
            }
            else
            {
                echo "<statusCode>100</statusCode>\n";
                echo "<statusText>Test Pending</statusText>\n";
            }
        }
        else
        {
            echo "<statusCode>404</statusCode>\n";
            echo "<statusText>Invalid Test ID: $id</statusText>\n";
            echo "<data>\n";
            echo "</data>\n";
        }

        echo "</response>\n";
    }
}

/**
* Dump a breakdown of the requests and bytes by domain
*/
function xmlDomains($id, $testPath, $run, $cached) {
    if (array_key_exists('domains', $_REQUEST) && $_REQUEST['domains']) {
        echo "<domains>\n";
        $requests;
        $breakdown = getDomainBreakdown($id, $testPath, $run, $cached, $requests);
        foreach ($breakdown as $domain => &$values) {
            $domain = strrev($domain);
            echo "<domain host=\"" . xml_entities($domain) . "\">\n";
            echo "<requests>{$values['requests']}</requests>\n";
            echo "<bytes>{$values['bytes']}</bytes>\n";
            echo "<connections>{$values['connections']}</connections>\n";
            echo "</domain>\n";
        }
        echo "</domains>\n";
    }
}

/**
* Dump a breakdown of the requests and bytes by mime type
*/
function xmlBreakdown($id, $testPath, $run, $cached) {
    if (array_key_exists('breakdown', $_REQUEST) && $_REQUEST['breakdown']) {
        echo "<breakdown>\n";
        $requests;
        $breakdown = getBreakdown($id, $testPath, $run, $cached, $requests);
        foreach ($breakdown as $mime => &$values) {
            $domain = strrev($domain);
            echo "<$mime>\n";
            echo "<requests>{$values['requests']}</requests>\n";
            echo "<bytes>{$values['bytes']}</bytes>\n";
            echo "</$mime>\n";
        }
        echo "</breakdown>\n";
    }
}


/**
* Dump information about all of the requests
*/
function xmlRequests($id, $testPath, $run, $cached) {
    if (array_key_exists('requests', $_REQUEST) && $_REQUEST['requests']) {
        echo "<requests>\n";
        $secure = false;
        $haveLocations = false;
        $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false, true);
        foreach ($requests as &$request) {
            echo "<request number=\"{$request['number']}\">\n";
            foreach ($request as $field => $value) {
                if (!is_array($value))
                  echo "<$field>" . xml_entities($value) . "</$field>\n";
            }
            if (array_key_exists('headers', $request) && is_array($request['headers'])) {
              echo "<headers>\n";
              if (array_key_exists('request', $request['headers']) && is_array($request['headers']['request'])) {
                echo "<request>\n";
                foreach ($request['headers']['request'] as $value)
                  echo "<header>" . xml_entities($value) . "</header>\n";
                echo "</request>\n";
              }
              if (array_key_exists('response', $request['headers']) && is_array($request['headers']['response'])) {
                echo "<response>\n";
                foreach ($request['headers']['response'] as $value)
                  echo "<header>" . xml_entities($value) . "</header>\n";
                echo "</response>\n";
              }
              echo "</headers>\n";
            }
            echo "</request>\n";
        }
        echo "</requests>\n";
    }
}

/**
* Dump any logged browser status messages
* 
* @param mixed $id
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function StatusMessages($id, $testPath, $run, $cached) {
    $cachedText = '';
    if ($cached)
        $cachedText = '_Cached';
    $statusFile = "$testPath/$run{$cachedText}_status.txt";
    if (gz_is_file($statusFile)) {
        echo "<status>\n";
        $messages = array();
        $lines = gz_file($statusFile);
        foreach($lines as $line) {
            $line = trim($line);
            if (strlen($line)) {
                $parts = explode("\t", $line);
                $time = xml_entities(trim($parts[0]));
                $message = xml_entities(trim($parts[1]));
                echo "<entry>\n";
                echo "<time>$time</time>\n";
                echo "<message>$message</message>\n";
                echo "</entry>\n";
            }
        }
        echo "</status>\n";
    }
}

/**
* Dump the console log if we have one
* 
* @param mixed $id
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function ConsoleLog($id, $testPath, $run, $cached) {
    $consoleLog = DevToolsGetConsoleLog($testPath, $run, $cached);
    if (isset($consoleLog) && is_array($consoleLog) && count($consoleLog)) {
        echo "<consoleLog>\n";
        foreach( $consoleLog as &$entry ) {
            echo "<entry>\n";
            echo "<source>" . xml_entities($entry['source']) . "</source>\n";
            echo "<level>" . xml_entities($entry['level']) . "</level>\n";
            echo "<message>" . xml_entities($entry['text']) . "</message>\n";
            echo "<url>" . xml_entities($entry['url']) . "</url>\n";
            echo "<line>" . xml_entities($entry['line']) . "</line>\n";
            echo "</entry>\n";
        }
        echo "</consoleLog>\n";
    }
}

/**
* Send back the data for a batch test (just the list of test ID's)
* 
* @param mixed $id
* @param mixed $testPath
*/
function BatchResult($id, $testPath)
{
    header ('Content-type: text/xml');
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
    echo "<response>";
    if( strlen($_REQUEST['r']) )
        echo "<requestId>{$_REQUEST['r']}</requestId>";

    $tests = null;
    if( gz_is_file("$testPath/bulk.json") )
        $tests = json_decode(gz_file_get_contents("$testPath/bulk.json"), true);
    elseif( gz_is_file("$testPath/tests.json") )
    {
        $legacyData = json_decode(gz_file_get_contents("$testPath/tests.json"), true);
        $tests = array();
        $tests['variations'] = array();
        $tests['urls'] = array();
        foreach( $legacyData as &$legacyTest )
            $tests['urls'][] = array('u' => $legacyTest['url'], 'id' => $legacyTest['id']);
    }
        
    if( count($tests['urls']) )
    {
        echo "<statusCode>200</statusCode>";
        echo "<statusText>Ok</statusText>";
        if( strlen($_REQUEST['r']) )
            echo "<requestId>{$_REQUEST['r']}</requestId>";

        $host  = $_SERVER['HTTP_HOST'];
        $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');

        echo "<data>";
        foreach( $tests['urls'] as &$test )
        {
            echo "<test>";
            echo "<testId>{$test['id']}</testId>";
            echo "<testUrl>" . xml_entities($test['u']) . "</testUrl>";
            echo "<xmlUrl>http://$host$uri/xmlResult/{$test['id']}/</xmlUrl>";
            echo "<userUrl>http://$host$uri/result/{$test['id']}/</userUrl>";
            echo "<summaryCSV>http://$host$uri/result/{$test['id']}/page_data.csv</summaryCSV>";
            echo "<detailCSV>http://$host$uri/result/{$test['id']}/requests.csv</detailCSV>";
            echo "</test>";

            // go through all of the variations as well
            foreach( $test['v'] as $variationIndex => $variationId )
            {
                echo "<test>";
                echo "<testId>$variationId</testId>";
                echo "<testUrl>" . xml_entities(CreateUrlVariation($test['u'], $tests['variations'][$variationIndex]['q'])) . "</testUrl>";
                echo "<xmlUrl>http://$host$uri/xmlResult/$variationId/</xmlUrl>";
                echo "<userUrl>http://$host$uri/result/$variationId/</userUrl>";
                echo "<summaryCSV>http://$host$uri/result/$variationId/page_data.csv</summaryCSV>";
                echo "<detailCSV>http://$host$uri/result/$variationId/requests.csv</detailCSV>";
                echo "</test>";
            }
        }
        echo "</data>";
    }
    else
    {
        echo "<statusCode>404</statusCode>";
        echo "<statusText>Invalid Test ID: $id</statusText>";
        echo "<data>";
        echo "</data>";
    }

    echo "</response>";
}
?>
