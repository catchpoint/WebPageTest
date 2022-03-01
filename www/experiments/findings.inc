<?php
$experiment = false;
$experimentsRan = "";
if( isset($tests) && $sameIDs ){
    // See if all tests are the same ID or from a compared recipe not
    $experimentPath = GetTestPath($tests[1]['id']);
    $experimentInfo = TestInfo::fromFiles($experimentPath);
    $scriptInfo = $experimentInfo->getRawData()['testinfo']['script'];
    $metaInfo = $experimentInfo->getRawData()['testinfo']['metadata'];
    $experiment = strpos($scriptInfo, "recipes.webpagetest.workers.dev");
    $experimentsRan = preg_match('/x-recipes: ([^\s]+)/', $scriptInfo, $matches);

}




if( $experiment ){

    if( isset( $metaInfo ) ){
        $metaInfo = json_decode( $metaInfo );


        $originalTestUrlGenerator = UrlGenerator::create(FRIENDLY_URLS, "", $metaInfo->experiment->source_test, 0, 1 );
        $originalTestHref = $originalTestUrlGenerator->resultSummary();

        $controlTestUrlGenerator = UrlGenerator::create(FRIENDLY_URLS, "", $metaInfo->experiment->control_test, 0, 1 );
        $controlTestHref = $controlTestUrlGenerator->resultSummary();

        $experimentTestUrlGenerator = UrlGenerator::create(FRIENDLY_URLS, "", $tests[1]['id'], 0, 1 );
        $experimentTestHref = $experimentTestUrlGenerator->resultSummary();


    }
    
    

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

    if( isset( $metaInfo ) ){

        echo "<p>Experiment URLs: 
            <a href=\"". $originalTestHref ."\">Source Test</a>
            <a href=\"". $controlTestHref ."\">Control Test</a>
            <a href=\"". $experimentTestHref ."\">Experiment Test</a>
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

     echo '<video id="player" controls autoplay muted="" preload="auto" poster="/video/poster.php?tests='. $tests[0]['id'] .','. $tests[1]['id'] .'&amp;bg=2a3c64&amp;&text=ffffff&amp;end=visual">
        <source src="/video/video.php?tests='. $tests[0]['id'] .','. $tests[1]['id'] .'&amp;bg=2a3c64&amp;&text=ffffff&amp;end=visual" type="video/mp4">
    </video>';
        
}

?>