<?php
$msStart = microtime(true);
define('RESTORE_DATA_ONLY', true);

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
        $host  = $_SERVER['HTTP_HOST'];
        $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
        $path = substr($testPath, 1);

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
        if( FRIENDLY_URLS )
            echo "<summary>http://$host$uri/result/$id/</summary>";
        else
            echo "<summary>http://$host$uri/results.php?test=$id</summary>";
        if (isset($test['testinfo']))
        {
            if( @strlen($test['testinfo']['url']) )
                echo "<testUrl>" . xml_entities($test['testinfo']['url']) . "</testUrl>";
            if( @strlen($test['testinfo']['location']) )
                echo "<location>{$test['testinfo']['location']}</location>";
            if( @strlen($test['testinfo']['connectivity']) )
            {
                echo "<connectivity>{$test['testinfo']['connectivity']}</connectivity>";
                if( $test['testinfo']['bwIn'] && $test['testinfo']['bwOut'] )
                {
                    echo "<bwDown>{$test['testinfo']['bwIn']}</bwDown>";
                    echo "<bwUp>{$test['testinfo']['bwOut']}</bwUp>";
                    echo "<latency>{$test['testinfo']['latency']}</latency>";
                    echo "<plr>{$test['testinfo']['plr']}</plr>";
                }
            }
            if( @strlen($test['testinfo']['label']) )
                echo "<label>" . xml_entities($test['testinfo']['label']) . "</label>";
            if( @strlen($test['testinfo']['completed']) )
                echo "<completed>" . date("r",$test['testinfo']['completed']) . "</completed>";
        }
        $runs = max(array_keys($pageData));
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
                echo "<$key>" . xml_entities($val) . "</$key>";
            if( $pagespeed )
            {
                $score = GetPageSpeedScore("$testPath/{$fvMedian}_pagespeed.txt");
                if( strlen($score) )
                    echo "<PageSpeedScore>$score</PageSpeedScore>";
            }
            if( FRIENDLY_URLS )
                echo "<PageSpeedData>http://$host$uri/result/$id/{$fvMedian}_pagespeed.txt</PageSpeedData>";
            else
                echo "<PageSpeedData>http://$host$uri//getgzip.php?test=$id&amp;file={$fvMedian}_pagespeed.txt</PageSpeedData>";
            echo "</firstView>";
            
            if( isset($rv) )
            {
                $rvMedian = GetMedianRun($pageData, 1);
                if($rvMedian)
                {
                    echo "<repeatView>";
                    echo "<run>$rvMedian</run>";
                    foreach( $pageData[$rvMedian][1] as $key => $val )
                        echo "<$key>" . xml_entities($val) . "</$key>";
                    if( $pagespeed )
                    {
                        $score = GetPageSpeedScore("$testPath/{$rvMedian}_Cached_pagespeed.txt");
                        if( strlen($score) )
                            echo "<PageSpeedScore>$score</PageSpeedScore>";
                    }
                    if( FRIENDLY_URLS )
                        echo "<PageSpeedData>http://$host$uri/result/$id/{$rvMedian}_Cached_pagespeed.txt</PageSpeedData>";
                    else
                        echo "<PageSpeedData>http://$host$uri//getgzip.php?test=$id&amp;file={$rvMedian}_Cached_pagespeed.txt</PageSpeedData>";
                    echo "</repeatView>";
                }
            }
            echo "</median>";
        }

        // spit out the raw data for each run
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
                        echo "<$key>" . xml_entities($val) . "</$key>";
                    if( $pagespeed )
                    {
                        $score = GetPageSpeedScore("$testPath/{$i}_pagespeed.txt");
                        if( strlen($score) )
                            echo "<PageSpeedScore>$score</PageSpeedScore>";
                    }
                    echo "</results>";

                    // links to the relevant pages
                    echo "<pages>";
                    if( FRIENDLY_URLS )
                    {
                        echo "<details>http://$host$uri/result/$id/$i/details/</details>";
                        echo "<checklist>http://$host$uri/result/$id/$i/performance_optimization/</checklist>";
                        echo "<breakdown>http://$host$uri/result/$id/$i/breakdown/</breakdown>";
                        echo "<domains>http://$host$uri/result/$id/$i/domains/</domains>";
                        echo "<screenShot>http://$host$uri/result/$id/$i/screen_shot/</screenShot>";
                    }
                    else
                    {
                        echo "<details>http://$host$uri/details.php?test=$id&amp;run=$i</details>";
                        echo "<checklist>http://$host$uri/performance_optimization.php?test=$id&amp;run=$i</checklist>";
                        echo "<breakdown>http://$host$uri/breakdown.php?test=$id&amp;run=$i</breakdown>";
                        echo "<domains>http://$host$uri/domains.php?test=$id&amp;run=$i</domains>";
                        echo "<screenShot>http://$host$uri/screen_shot.php?test=$id&amp;run=$i</screenShot>";
                    }
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
                    if( is_file("$testPath/{$i}_screen.png") )
                        echo "<screenShotPng>http://$host$uri$path/{$i}_screen.png</screenShotPng>";
                    echo "</images>";

                    // raw results
                    echo "<rawData>";
                    echo "<headers>http://$host$uri$path/{$i}_report.txt</headers>";
                    echo "<pageData>http://$host$uri$path/{$i}_IEWPG.txt</pageData>";
                    echo "<requestsData>http://$host$uri$path/{$i}_IEWTR.txt</requestsData>";
                    echo "<utilization>http://$host$uri$path/{$i}_progress.csv</utilization>";
                    echo "<PageSpeedData>http://$host$uri/result/$id/{$i}_pagespeed.txt</PageSpeedData>";
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
                        echo "<$key>" . xml_entities($val) . "</$key>";
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
                    echo "<PageSpeedData>http://$host$uri/result/$id/{$i}_Cached_pagespeed.txt</PageSpeedData>";
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


function xml_entities($text, $charset = 'Windows-1252')
{
    // First we encode html characters that are also invalid in xml
    $text = htmlentities($text, ENT_COMPAT, $charset, false);
   
    // XML character entity array from Wiki
    // Note: &apos; is useless in UTF-8 or in UTF-16
    $arr_xml_special_char = array("&quot;","&amp;","&apos;","&lt;","&gt;");
   
    // Building the regex string to exclude all strings with xml special char
    $arr_xml_special_char_regex = "(?";
    foreach($arr_xml_special_char as $key => $value){
        $arr_xml_special_char_regex .= "(?!$value)";
    }
    $arr_xml_special_char_regex .= ")";
   
    // Scan the array for &something_not_xml; syntax
    $pattern = "/$arr_xml_special_char_regex&([a-zA-Z0-9]+;)/";
   
    // Replace the &something_not_xml; with &amp;something_not_xml;
    $replacement = '&amp;${1}';
    return preg_replace($pattern, $replacement, $text);
}
?>
