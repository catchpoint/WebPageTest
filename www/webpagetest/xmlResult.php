<?php
$msStart = microtime(true);
define('RESTORE_DATA_ONLY', true);

//$debug=true;
include 'common.inc';
require_once('page_data.inc');
require_once('testStatus.inc');
require_once('video/visualProgress.inc.php');

// stub-out requests from M4_SpeedTestService
//if( strpos($_SERVER['HTTP_USER_AGENT'], 'M4_SpeedTestService') !== false )
//    exit();

// see if we are sending abbreviated results
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
        if( strlen($_REQUEST['r']) )
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
            if( @strlen($test['testinfo']['location']) )
                echo "<location>{$test['testinfo']['location']}</location>\n";
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
        }
        $runs = max(array_keys($pageData));
        echo "<runs>$runs</runs>\n";
        echo "<average>\n";
        echo "<firstView>\n";
        foreach( $fv as $key => $val )
            echo "<$key>" . number_format($val,0, '.', '') . "</$key>\n";
        echo "</firstView>\n";
        if( isset($rv) )
        {
            echo "<repeatView>\n";
            foreach( $rv as $key => $val )
                echo "<$key>" . number_format($val,0, '.', '') . "</$key>\n";
            echo "</repeatView>\n";
        }
        echo "</average>\n";

        // output the median run data
        $fvMedian = GetMedianRun($pageData, 0);
        if( $fvMedian )
        {
            echo "<median>\n";
            echo "<firstView>\n";
            echo "<run>$fvMedian</run>\n";
            foreach( $pageData[$fvMedian][0] as $key => $val )
                echo "<$key>" . xml_entities($val) . "</$key>\n";
            if( $pagespeed )
            {
                $score = GetPageSpeedScore("$testPath/{$fvMedian}_pagespeed.txt");
                if( strlen($score) )
                    echo "<PageSpeedScore>$score</PageSpeedScore>\n";
            }
            $progress = GetVisualProgress($testPath, $fvMedian, 0);
            if (isset($progress) && is_array($progress) && array_key_exists('FLI', $progress)) {
                echo "<SpeedIndex>{$progress['FLI']}</SpeedIndex>\n";
            }
            if( FRIENDLY_URLS )
                echo "<PageSpeedData>http://$host$uri/result/$id/{$fvMedian}_pagespeed.txt</PageSpeedData>\n";
            else
                echo "<PageSpeedData>http://$host$uri//getgzip.php?test=$id&amp;file={$fvMedian}_pagespeed.txt</PageSpeedData>\n";
            echo "</firstView>\n";
            
            if( isset($rv) )
            {
                $rvMedian = GetMedianRun($pageData, 1);
                if($rvMedian)
                {
                    echo "<repeatView>\n";
                    echo "<run>$rvMedian</run>\n";
                    foreach( $pageData[$rvMedian][1] as $key => $val )
                        echo "<$key>" . xml_entities($val) . "</$key>\n";
                    if( $pagespeed )
                    {
                        $score = GetPageSpeedScore("$testPath/{$rvMedian}_Cached_pagespeed.txt");
                        if( strlen($score) )
                            echo "<PageSpeedScore>$score</PageSpeedScore>\n";
                    }
                    $progress = GetVisualProgress($testPath, $rvMedian, 1);
                    if (isset($progress) && is_array($progress) && array_key_exists('FLI', $progress)) {
                        echo "<SpeedIndex>{$progress['FLI']}</SpeedIndex>\n";
                    }
                    if( FRIENDLY_URLS )
                        echo "<PageSpeedData>http://$host$uri/result/$id/{$rvMedian}_Cached_pagespeed.txt</PageSpeedData>\n";
                    else
                        echo "<PageSpeedData>http://$host$uri//getgzip.php?test=$id&amp;file={$rvMedian}_Cached_pagespeed.txt</PageSpeedData>\n";
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
                    foreach( $pageData[$i][0] as $key => $val )
                        echo "<$key>" . xml_entities($val) . "</$key>\n";
                    if( $pagespeed )
                    {
                        $score = GetPageSpeedScore("$testPath/{$i}_pagespeed.txt");
                        if( strlen($score) )
                            echo "<PageSpeedScore>$score</PageSpeedScore>\n";
                    }
                    $progress = GetVisualProgress($testPath, $i, 0);
                    if (isset($progress) && is_array($progress) && array_key_exists('FLI', $progress)) {
                        echo "<SpeedIndex>{$progress['FLI']}</SpeedIndex>\n";
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
                    echo "<screenShot>http://$host$uri/result/$id/{$i}_screen_thumb.jpg</screenShot>\n";
                    echo "</thumbnails>\n";

                    echo "<images>\n";
                    echo "<waterfall>http://$host$uri$path/{$i}_waterfall.png</waterfall>\n";
                    echo "<connectionView>http://$host$uri$path/{$i}_connection.png</connectionView>\n";
                    echo "<checklist>http://$host$uri$path/{$i}_optimization.png</checklist>\n";
                    echo "<screenShot>http://$host$uri$path/{$i}_screen.jpg</screenShot>\n";
                    if( is_file("$testPath/{$i}_screen.png") )
                        echo "<screenShotPng>http://$host$uri$path/{$i}_screen.png</screenShotPng>\n";
                    echo "</images>\n";

                    // raw results
                    echo "<rawData>";
                    echo "<headers>http://$host$uri$path/{$i}_report.txt</headers>\n";
                    echo "<pageData>http://$host$uri$path/{$i}_IEWPG.txt</pageData>\n";
                    echo "<requestsData>http://$host$uri$path/{$i}_IEWTR.txt</requestsData>\n";
                    echo "<utilization>http://$host$uri$path/{$i}_progress.csv</utilization>\n";
                    echo "<PageSpeedData>http://$host$uri/result/$id/{$i}_pagespeed.txt</PageSpeedData>\n";
                    echo "</rawData>\n";
                    
                    // video frames
                    if( $test['test']['video'])
                    {
                        $frames = loadVideo("$testPath/video_{$i}");
                        if( $frames && count($frames) )
                        {
                            echo "<videoFrames>\n";
                            foreach( $frames as $time => $frameFile )
                            {
                                echo "<frame>\n";
                                echo "<time>" . number_format((double)$time / 10.0, 1) . "</time>\n";
                                echo "<image>http://$host$uri$path/video_{$i}/$frameFile</image>\n";
                                $ms = $time * 100;
                                if (isset($progress) && is_array($progress) && 
                                    array_key_exists('frames', $progress) && array_key_exists($ms, $progress['frames'])) {
                                    echo "<VisuallyComplete>{$progress['frames'][$ms]['progress']}</VisuallyComplete>\n";
                                }
                                echo "</frame>\n";
                            }
                            echo "</videoFrames>\n";
                        }
                    }
                    
                    echo "</firstView>\n";
                }

                // repeat view
                if( isset( $pageData[$i][1] ) )
                {
                    echo "<repeatView>\n";
                    echo "<results>\n";
                    foreach( $pageData[$i][1] as $key => $val )
                        echo "<$key>" . xml_entities($val) . "</$key>\n";
                    if( $pagespeed )
                    {
                        $score = GetPageSpeedScore("$testPath/{$i}_Cached_pagespeed.txt");
                        if( strlen($score) )
                            echo "<PageSpeedScore>$score</PageSpeedScore>\n";
                    }
                    $progress = GetVisualProgress($testPath, $i, 1);
                    if (isset($progress) && is_array($progress) && array_key_exists('FLI', $progress)) {
                        echo "<SpeedIndex>{$progress['FLI']}</SpeedIndex>\n";
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
                    echo "<screenShot>http://$host$uri/result/$id/{$i}_Cached_screen_thumb.jpg</screenShot>\n";
                    echo "</thumbnails>\n";

                    echo "<images>\n";
                    echo "<waterfall>http://$host$uri$path/{$i}_Cached_waterfall.png</waterfall>\n";
                    echo "<connectionView>http://$host$uri$path/{$i}_Cached_connection.png</connectionView>\n";
                    echo "<checklist>http://$host$uri$path/{$i}_Cached_optimization.png</checklist>\n";
                    echo "<screenShot>http://$host$uri$path/{$i}_Cached_screen.jpg</screenShot>\n";
                    echo "</images>\n";

                    // raw results
                    echo "<rawData>\n";
                    echo "<headers>http://$host$uri$path/{$i}_Cached_report.txt</headers>\n";
                    echo "<pageData>http://$host$uri$path/{$i}_Cached_IEWPG.txt</pageData>\n";
                    echo "<requestsData>http://$host$uri$path/{$i}_Cached_IEWTR.txt</requestsData>\n";
                    echo "<utilization>http://$host$uri$path/{$i}_Cached_progress.csv</utilization>\n";
                    echo "<PageSpeedData>http://$host$uri/result/$id/{$i}_Cached_pagespeed.txt</PageSpeedData>\n";
                    echo "</rawData>\n";
                    
                    // video frames
                    if( $test['test']['video'] )
                    {
                        $frames = loadVideo("$testPath/video_{$i}_cached");
                        if( $frames && count($frames) )
                        {
                            echo "<videoFrames>\n";
                            foreach( $frames as $time => $frameFile )
                            {
                                echo "<frame>\n";
                                echo "<time>" . number_format((double)$time / 10.0, 1) . "</time>\n";
                                echo "<image>http://$host$uri$path/video_{$i}_cached/$frameFile</image>\n";
                                $ms = $time * 100;
                                if (isset($progress) && is_array($progress) && 
                                    array_key_exists('frames', $progress) && array_key_exists($ms, $progress['frames'])) {
                                    echo "<VisuallyComplete>{$progress['frames'][$ms]['progress']}</VisuallyComplete>\n";
                                }
                                echo "</frame>\n";
                            }
                            echo "</videoFrames>\n";
                        }
                    }
                    
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
