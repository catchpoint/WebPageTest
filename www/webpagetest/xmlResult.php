<?php
$msStart = microtime(true);

//$debug=true;
include 'common.inc';
require_once('page_data.inc');

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
    if( isset($test['test']['completeTime']) )
    {
        $pageData = loadAllPageData($testPath);

        $msLoad = microtime(true);

        // if we don't have an url, try to get it from the page results
        if( !strlen($url) )
            $url = $pageData[1][0]['URL'];

        header ('Content-type: text/xml');
        echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
        echo "<response>";
        echo "<statusCode>200</statusCode>";
        echo "<statusText>Ok</statusText>";
        if( strlen($_REQUEST['r']) )
            echo "<requestId>{$_REQUEST['r']}</requestId>";
        echo "<data>";
        
        // spit out the calculated averages
        $fv = null;
        $rv = null;
        $pageStats = calculatePageStats($pageData, $fv, $rv);
        
        echo "<testId>$id</testId>";
        if (isset($test['testinfo']))
        {
            if( @strlen($test['testinfo']['url']) )
                echo "<testUrl>" . htmlentities($test['testinfo']['url']) . "</testUrl>";
            if( @strlen($test['testinfo']['location']) )
                echo "<location>{$test['testinfo']['location']}</location>";
            if( @strlen($test['testinfo']['connectivity']) )
                echo "<connectivity>{$test['testinfo']['connectivity']}</connectivity>";
            if( @strlen($test['testinfo']['label']) )
                echo "<label>" . htmlentities($test['testinfo']['label']) . "</label>";
            if( @strlen($test['testinfo']['completed']) )
                echo "<completed>" . date("r",$test['testinfo']['completed']) . "</completed>";
        }
        $runs = count($pageData);
        echo "<runs>$runs</runs>";
        echo "<average>";
        echo "<firstView>";
        foreach( $fv as $key => $val )
            echo "<$key>" . number_format($val,0, '.', '') . "</$key>";
        echo "</firstView>";
        if( isset($rv) )
        {
            echo "<repeatView>";
            foreach( $rv as $key => $val )
                echo "<$key>" . number_format($val,0, '.', '') . "</$key>";
            echo "</repeatView>";
        }
        echo "</average>";

        // output the median run data
        $fvMedian = GetMedianRun($pageData, 0);
        if( $fvMedian )
        {
            echo "<median>";
            echo "<firstView>";
            echo "<run>$fvMedian</run>";
            foreach( $pageData[$fvMedian][0] as $key => $val )
                echo "<$key>$val</$key>";
            if( $pagespeed )
            {
                $score = GetPageSpeedScore("$testPath/{$fvMedian}_pagespeed.txt");
                if( strlen($score) )
                    echo "<PageSpeedScore>$score</PageSpeedScore>";
            }
            echo "</firstView>";
            
            if( isset($rv) )
            {
                $rvMedian = GetMedianRun($pageData, 1);
                if($rvMedian)
                {
                    echo "<repeatView>";
                    echo "<run>$rvMedian</run>";
                    foreach( $pageData[$rvMedian][1] as $key => $val )
                        echo "<$key>$val</$key>";
                    if( $pagespeed )
                    {
                        $score = GetPageSpeedScore("$testPath/{$rvMedian}_Cached_pagespeed.txt");
                        if( strlen($score) )
                            echo "<PageSpeedScore>$score</PageSpeedScore>";
                    }
                    echo "</repeatView>";
                }
            }
            echo "</median>";
        }

        // spit out the raw data for each run
        $host  = $_SERVER['HTTP_HOST'];
        $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
        $path = substr($testPath, 1);

        for( $i = 1; $i <= $runs; $i++ )
        {
            echo "<run>";
            echo "<id>$i</id>";

            // first view
            if( isset( $pageData[$i] ) )
            {
                if( isset( $pageData[$i][0] ) )
                {
                    echo "<firstView>";
                    echo "<results>";
                    foreach( $pageData[$i][0] as $key => $val )
                        echo "<$key>$val</$key>";
                    if( $pagespeed )
                    {
                        $score = GetPageSpeedScore("$testPath/{$i}_pagespeed.txt");
                        if( strlen($score) )
                            echo "<PageSpeedScore>$score</PageSpeedScore>";
                    }
                    echo "</results>";

                    // links to the relevant pages
                    echo "<pages>";
                    echo "<details>http://$host$uri/result/$id/$i/details/</details>";
                    echo "<checklist>http://$host$uri/result/$id/$i/performance_optimization/</checklist>";
                    echo "<report>http://$host$uri/result/$id/$i/optimization_report/</report>";
                    echo "<breakdown>http://$host$uri/result/$id/$i/breakdown/</breakdown>";
                    echo "<domains>http://$host$uri/result/$id/$i/domains/</domains>";
                    echo "<screenShot>http://$host$uri/result/$id/$i/screen_shot/</screenShot>";
                    echo "</pages>";
                    
                    // urls for the relevant images
                    echo "<thumbnails>";
                    echo "<waterfall>http://$host$uri/result/$id/{$i}_waterfall_thumb.png</waterfall>";
                    echo "<checklist>http://$host$uri/result/$id/{$i}_optimization_thumb.png</checklist>";
                    echo "<screenShot>http://$host$uri/result/$id/{$i}_screen_thumb.jpg</screenShot>";
                    echo "</thumbnails>";

                    echo "<images>";
                    echo "<waterfall>http://$host$uri$path/{$i}_waterfall.png</waterfall>";
                    echo "<connectionView>http://$host$uri$path/{$i}_connection.png</connectionView>";
                    echo "<checklist>http://$host$uri$path/{$i}_optimization.png</checklist>";
                    echo "<screenShot>http://$host$uri$path/{$i}_screen.jpg</screenShot>";
                    echo "</images>";

                    // raw results
                    echo "<rawData>";
                    echo "<headers>http://$host$uri$path/{$i}_report.txt</headers>";
                    echo "<pageData>http://$host$uri$path/{$i}_IEWPG.txt</pageData>";
                    echo "<requestsData>http://$host$uri$path/{$i}_IEWTR.txt</requestsData>";
                    echo "<utilization>http://$host$uri$path/{$i}_progress.csv</utilization>";
                    echo "</rawData>";
                    
                    // video frames
                    if( $test['test']['video'])
                    {
                        $frames = loadVideo("$testPath/video_{$i}");
                        if( $frames && count($frames) )
                        {
                            echo "<videoFrames>";
                            foreach( $frames as $time => $frameFile )
                            {
                                echo "<frame>";
                                echo "<time>" . number_format((double)$time / 10.0, 1) . "</time>";
                                echo "<image>http://$host$uri$path/video_{$i}/$frameFile</image>";
                                echo "</frame>";
                            }
                            echo "</videoFrames>";
                        }
                    }
                    
                    echo "</firstView>";
                }

                // repeat view
                if( isset( $pageData[$i][1] ) )
                {
                    echo "<repeatView>";
                    echo "<results>";
                    foreach( $pageData[$i][1] as $key => $val )
                        echo "<$key>$val</$key>";
                    if( $pagespeed )
                    {
                        $score = GetPageSpeedScore("$testPath/{$i}_Cached_pagespeed.txt");
                        if( strlen($score) )
                            echo "<PageSpeedScore>$score</PageSpeedScore>";
                    }
                    echo "</results>";

                    // links to the relevant pages
                    echo "<pages>";
                    echo "<details>http://$host$uri/result/$id/$i/details/cached/</details>";
                    echo "<checklist>http://$host$uri/result/$id/$i/performance_optimization/cached/</checklist>";
                    echo "<report>http://$host$uri/result/$id/$i/optimization_report/cached/</report>";
                    echo "<breakdown>http://$host$uri/result/$id/$i/breakdown/</breakdown>";
                    echo "<domains>http://$host$uri/result/$id/$i/domains/</domains>";
                    echo "<screenShot>http://$host$uri/result/$id/$i/screen_shot/cached/</screenShot>";
                    echo "</pages>";
                    
                    // urls for the relevant images
                    echo "<thumbnails>";
                    echo "<waterfall>http://$host$uri/result/$id/{$i}_Cached_waterfall_thumb.png</waterfall>";
                    echo "<checklist>http://$host$uri/result/$id/{$i}_Cached_optimization_thumb.png</checklist>";
                    echo "<screenShot>http://$host$uri/result/$id/{$i}_Cached_screen_thumb.jpg</screenShot>";
                    echo "</thumbnails>";

                    echo "<images>";
                    echo "<waterfall>http://$host$uri$path/{$i}_Cached_waterfall.png</waterfall>";
                    echo "<connectionView>http://$host$uri$path/{$i}_Cached_connection.png</connectionView>";
                    echo "<checklist>http://$host$uri$path/{$i}_Cached_optimization.png</checklist>";
                    echo "<screenShot>http://$host$uri$path/{$i}_Cached_screen.jpg</screenShot>";
                    echo "</images>";

                    // raw results
                    echo "<rawData>";
                    echo "<headers>http://$host$uri$path/{$i}_Cached_report.txt</headers>";
                    echo "<pageData>http://$host$uri$path/{$i}_Cached_IEWPG.txt</pageData>";
                    echo "<requestsData>http://$host$uri$path/{$i}_Cached_IEWTR.txt</requestsData>";
                    echo "<utilization>http://$host$uri$path/{$i}_Cached_progress.csv</utilization>";
                    echo "</rawData>";
                    
                    // video frames
                    if( $test['test']['video'] )
                    {
                        $frames = loadVideo("$testPath/video_{$i}_cached");
                        if( $frames && count($frames) )
                        {
                            echo "<videoFrames>";
                            foreach( $frames as $time => $frameFile )
                            {
                                echo "<frame>";
                                echo "<time>" . number_format((double)$time / 10.0, 1) . "</time>";
                                echo "<image>http://$host$uri$path/video_{$i}_cached/$frameFile</image>";
                                echo "</frame>";
                            }
                            echo "</videoFrames>";
                        }
                    }
                    
                    echo "</repeatView>";
                }
            }

            echo "</run>";
        }

        echo "</data>";
        echo "</response>";

        $msElapsed = number_format( microtime(true) - $msStart, 3 );
        $msElapsedLoad = number_format( $msLoad - $msStart, 3 );
        logMsg("xmlResult ($id): {$msElapsed}s ({$msElapsedLoad}s to load page data)");
    }
    else
    {
        header ('Content-type: text/xml');
        echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
        echo "<response>";
        if( strlen($_REQUEST['r']) )
            echo "<requestId>{$_REQUEST['r']}</requestId>";

        // see if it was a valid test
        if( $test['test']['runs'] )
        {
            if( isset($test['test']['startTime']) )
            {
                echo "<statusCode>101</statusCode>";
                echo "<statusText>Test Started</statusText>";
                echo "<data>";
                echo "<startTime>{$test['test']['startTime']}</startTime>";
                echo "</data>";
            }
            else
            {
                echo "<statusCode>100</statusCode>";
                echo "<statusText>Test Pending</statusText>";
            }
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
}

/**
* Load and sort the video frame files into an arrray
* 
* @param mixed $path
*/
function loadVideo($path)
{
    $frames = null;
    
    if( is_dir($path) )
    {
        $files = glob( $path . '/frame_*.jpg', GLOB_NOSORT );
        if( $files && count($files) )
        {
            $frames = array();
            foreach( $files as $file )
            {
                $file = basename($file);
                $parts = explode('_', $file);
                if( count($parts) >= 2 )
                {
                    $index = (int)$parts[1];
                    $frames[$index] = $file;
                }
            }
            
            
            // sort the frames in order
            ksort($frames, SORT_NUMERIC);
        }
    }
    
    return $frames;
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

    if( gz_is_file("$testPath/tests.json") )
    {
        echo "<statusCode>200</statusCode>";
        echo "<statusText>Ok</statusText>";
        if( strlen($_REQUEST['r']) )
            echo "<requestId>{$_REQUEST['r']}</requestId>";
        $tests = json_decode(gz_file_get_contents("$testPath/tests.json"), true);
        if( count($tests) )
        {
            $host  = $_SERVER['HTTP_HOST'];
            $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');

            echo "<data>";
            foreach( $tests as &$test )
            {
                echo "<test>";
                echo "<testId>{$test['id']}</testId>";
                echo "<testUrl>" . htmlentities($test['url']) . "</testUrl>";
                echo "<xmlUrl>http://$host$uri/xmlResult/{$test['id']}/</xmlUrl>";
                echo "<userUrl>http://$host$uri/result/{$test['id']}/</userUrl>";
                echo "<summaryCSV>http://$host$uri/result/{$test['id']}/page_data.csv</summaryCSV>";
                echo "<detailCSV>http://$host$uri/result/{$test['id']}/requests.csv</detailCSV>";
                echo "</test>";
            }
            echo "</data>";
        }
        else
        {
            echo "<statusCode>403</statusCode>";
            echo "<statusText>No test data for test ID: $id</statusText>";
            echo "<data>";
            echo "</data>";
        }
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
