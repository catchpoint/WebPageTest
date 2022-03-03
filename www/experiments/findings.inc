<?php

if( $experiment ){

    // compare render-blocking scripts
    $experimentBlockingJSReqs = array();
    $experimentRequests = $tests[0]['stepResult']->getRequests();
    foreach ($experimentRequests as $request) {
        if( $request['renderBlocking'] === "blocking" && $request['contentType'] === "application/javascript" ){
            array_push($experimentBlockingJSReqs, $request['url'] );
        }
    }

    $controlBlockingJSReqs = array();
    $controlRequests = $tests[1]['stepResult']->getRequests();
    foreach ($controlRequests as $request) {
        if( $request['renderBlocking'] === "blocking" && $request['contentType'] === "application/javascript" ){
            array_push($controlBlockingJSReqs, $request['url'] );
        }
    }

    $blockingJSReqsDiff = count($controlBlockingJSReqs) - count($experimentBlockingJSReqs);



    $diffMetrics = array( 
        array( "TTFB", "Time to First Byte", "ms"), 
        array( "StartRender", "Start Render", "ms"),
        array( "firstContentfulPaint", "First Contentful Paint", "ms"),
        array( "SpeedIndex", "Speed Index", "ms"),
        array( "chromeUserTiming.LargestContentfulPaint", "Largest Contentful Paint", "ms"),
        array( "chromeUserTiming.CumulativeLayoutShift", "Cumulative Layout Shift", "", array("Better","Worse")),
        array( "TotalBlockingTime", "Total Blocking Time", "ms"),
        array( "FullyLoaded", "Fully Loaded", "ms"),
        array( "BytesIn", "Total Bytes", "kb", array("Lighter","Heavier"))
    );   

?>
<div class="scrollableTable">
    <table id="tableResults" class="pretty">
        <tbody>
            <tr class="metric_labels">
                <?php 
                    foreach($diffMetrics as $metric){
                        $experimentMetric = $tests[0]['stepResult']->getMetric($metric[0]);
                        $thisDiff = $tests[1]['stepResult']->getMetric($metric[0]) - $experimentMetric;
                        $thisDiff = intval(removeLeadingZero(round($thisDiff,3)));
                        if($thisDiff !== 0){
                            echo '<th align="center" valign="middle">' . $metric[1] . '</th>';
                        }
                    }

                    // additional non-metric comparisons
                    if( $blockingJSReqsDiff !== 0){
                        echo '<th align="center" valign="middle">Blocking Scripts</th>';
                    }

                ?>
            </tr>
            <tr>
                <?php 
                    foreach($diffMetrics as $metric){
                        $experimentMetric = $tests[0]['stepResult']->getMetric($metric[0]);
                        $thisDiff = $tests[1]['stepResult']->getMetric($metric[0]) - $experimentMetric;
                        $units = "<span class=\"units\">".$metric[2]."</span>";
                        $changeTerms = array("Faster","Slower");
                        if( $metric[3] ){
                            $changeTerms = $metric[3];
                        }
                        $thisDiff = intval(removeLeadingZero(round($thisDiff,3)));
                        $change = '<span class="metric_change"><em>' . ( $thisDiff >= 0 ? $changeTerms[0] : $changeTerms[1] ) . '</em></span>';
                        
                        if($thisDiff !== 0){
                            echo '<td id="TTFB" valign="middle" class="'. ( $thisDiff >= 0 ? "good" : "poor" ) .'">'. abs($thisDiff) . $units . $change . '</td>';
                        }
                    }

                    // additional non-metric comparisons
                    if( $blockingJSReqsDiff !== 0 ){
                        $changeTerms = array("Fewer","More");
                        $units = "";
                        $change = '<span class="metric_change"><em>' . ( $thisDiff >= 0 ? $changeTerms[0] : $changeTerms[1] ) . '</em></span>';
                        echo '<td id="TTFB" valign="middle" class="'. ( $blockingJSReqsDiff >= 0 ? "good" : "poor" ) .'">'. $blockingJSReqsDiff . $units . $change . '</td>';
                    }
                ?>
            </tr>
        </tbody>
    </table>
</div>


<?php } ?>