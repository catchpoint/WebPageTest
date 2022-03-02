<?php


if( $experiment ){

    $diffMetrics = array( 
        "TTFB" => "Time to First Byte", 
        "StartRender" => "Start Render",
        "firstContentfulPaint" => "First Contentful Paint",
        "SpeedIndex" => "Speed Index",
        "chromeUserTiming.LargestContentfulPaint" => "Largest Contentful Paint",
        "chromeUserTiming.CumulativeLayoutShift" => "Cumulative Layout Shift",
        "TotalBlockingTime" => "Total Blocking Time",
        "FullyLoaded" => "Fully Loaded",
        "BytesIn" => "Total Bytes"
    );

    echo '<h2>Experiment Results</h2>';

    echo '<p>This experiment incorportated the following changes:' . $test['testinfo']['label'] . '</p>';

    if( isset( $metaInfo ) ){

        echo "<p>Experiment URLs: 
            <a href=\"". $experimentTestHref ."\">Experiment Result</a>
            <a href=\"". $controlTestHref ."\">Control Test Result</a>
            <a href=\"". $originalTestHref ."\">Original Source Test</a>
        </p>";

    }
    

    echo "<p>Here's how your experiment impacted your metrics:</p>";
                                
     echo "<ul>";
        foreach($diffMetrics as $key => $metric){
            $experimentMetric = $tests[1]['stepResult']->getMetric($key);
            $thisDiff = $tests[0]['stepResult']->getMetric($key) - experimentMetric;
            if($thisDiff !== 0){
               echo "<li><p>$metric: <strong>$experimentMetric ms </strong>  <em>This is " . abs($thisDiff) . "ms" . ( $thisDiff >= 0 ? " faster!" : " slower!" ) ."</em></p></li>";
            }
        }
     echo "</ul>";

        
}

?>