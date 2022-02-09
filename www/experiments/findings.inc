<?php
$experiment = false;
$experimentsRan = "";
if( isset($tests) && $sameIDs ){
    // See if all tests are the same ID or from a compared recipe not
    $experimentPath = GetTestPath($tests[1]['id']);
    $experimentInfo = TestInfo::fromFiles($experimentPath);
    $scriptInfo = $experimentInfo->getRawData()['testinfo']['script'];
    $experiment = strpos($scriptInfo, "recipes.webpagetest.workers.dev");
    $experimentsRan = preg_match('/x-recipes: ([^\s]+)/', $scriptInfo, $matches);
}






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
    
    

    echo '<h2>Experiment Results!</h2>';
    //echo $matches[1];

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

     echo '<video id="player" controls autoplay muted="" preload="auto" poster="https://www.webpagetest.org/video/poster.php?tests='. $tests[0]['id'] .','. $tests[1]['id'] .'&amp;bg=2a3c64&amp;&text=ffffff&amp;end=visual">
        <source src="https://www.webpagetest.org/video/video.php?tests='. $tests[0]['id'] .','. $tests[1]['id'] .'&amp;bg=2a3c64&amp;&text=ffffff&amp;end=visual" type="video/mp4">
    </video>';
        
}

?>