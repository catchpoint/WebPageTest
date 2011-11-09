<?php
include 'common.inc';
include 'page_data.inc';

// only support batch tests for now
if( isset($test['test']) && $test['test']['batch'] )
{
    header("Content-disposition: attachment; filename={$id}_aggregate.csv");
    header("Content-type: text/csv");
    
    // load the test data
    $fvOnly = $test['test']['fvonly'];
    $tests = null;
    if( gz_is_file("$testPath/tests.json") )
    {
        $legacyData = json_decode(gz_file_get_contents("$testPath/tests.json"), true);
        $tests = array();
        $tests['variations'] = array();
        $tests['urls'] = array();
        foreach( $legacyData as &$legacyTest )
            $tests['urls'][] = array('u' => $legacyTest['url'], 'id' => $legacyTest['id']);
    }
    elseif( gz_is_file("$testPath/bulk.json") )
        $tests = json_decode(gz_file_get_contents("$testPath/bulk.json"), true);
    if( isset($tests) )
    {
        // list of metrics that will be produced
        // for each of these, the median, average and std dev. will be calculated
        $metrics = array(   'docTime' => 'Document Complete', 
                            'fullyLoaded' => 'Fully Loaded', 
                            'TTFB' => 'First Byte',
                            'render' => 'Start Render',
                            'bytesInDoc' => 'Bytes In (Doc)',
                            'requestsDoc' => 'Requests (Doc)' );
        
        // generate the header row of stats
        echo '"Test","URL","FV Successful Tests",';
        foreach( $metrics as $metric )
            echo "\"FV $metric Median\",\"FV $metric Avg\",\"FV $metric Std. Dev\",";
        if( !$fvOnly )
        {
            echo '"RV Successful Tests",';
            foreach( $metrics as $metric )
                echo "\"RV $metric Median\",\"RV $metric Avg\",\"RV $metric Std. Dev\",";
        }
        foreach( $tests['variations'] as &$variation )
        {
            $label = $variation['l'];
            echo "\"$label URL\",\"$label FV Successful Tests\",";
            foreach( $metrics as $metric )
                echo "\"$label FV $metric Median\",\"$label FV $metric Avg\",\"$label FV $metric Std. Dev\",";
            if( !$fvOnly )
            {
                echo "\"$label RV Successful Tests\",";
                foreach( $metrics as $metric )
                    echo "\"$label RV $metric Median\",\"$label RV $metric Avg\",\"$label RV $metric Std. Dev\",";
            }
        }
        echo "\r\n";
        
        // and now the actual data
        foreach( $tests['urls'] as &$test )
        {
            $label = $test['l'];
            $url = $test['u'];
            $testPath = './' . GetTestPath($test['id']);
            $pageData = loadAllPageData($testPath);
            if( count($pageData) )
            {
                echo "\"$label\",\"$url\",";
                $cached = 0;
                if( !$fvOnly )
                    $cached = 1;
                for( $cacheVal = 0; $cacheVal <= $cached; $cacheVal++ )
                {
                    $count = CountSuccessfulTests($pageData, $cacheVal);
                    echo "\"$count\",";
                    foreach( $metrics as $metric => $metricLabel )
                    {
                        CalculateAggregateStats($pageData, $cacheVal, $metric, $median, $avg, $stdDev);
                        echo "\"$median\",\"$avg\",\"$stdDev\",";
                    }
                }
                foreach( $tests['variations'] as $variationIndex => &$variation )
                {
                    $urlVariation = CreateUrlVariation($url, $variation['q']);
                    echo "\"$urlVariation\",";
                    $id = $test['v'][$variationIndex];
                    $pageData = loadAllPageData($testPath);
                    for( $cacheVal = 0; $cacheVal <= $cached; $cacheVal++ )
                    {
                        if( count($pageData) )
                        {
                            $count = CountSuccessfulTests($pageData, $cacheVal);
                            echo "\"$count\",";
                            foreach( $metrics as $metric => $metricLabel )
                            {
                                CalculateAggregateStats($pageData, $cacheVal, $metric, $median, $avg, $stdDev);
                                echo "\"$median\",\"$avg\",\"$stdDev\",";
                            }
                        }
                        else
                        {
                            echo '"",';
                            foreach( $metrics as $metric => $metricLabel )
                                echo '"","","",';
                        }
                    }
                }                
            }
            echo "\r\n";
        }
    }    
}
else
{
    header("HTTP/1.0 404 Not Found");
}
?>
