<?php

if( $experiment ){

    // compare render-blocking scripts
    $experimentBlockingReqs = array();
    $experimentRequests = $tests[0]['stepResult']->getRequests();
    foreach ($experimentRequests as $request) {
        if( $request['renderBlocking'] === "blocking" || $request['renderBlocking'] === "in_body_parser_blocking"  ){
            array_push($experimentBlockingReqs, $request['url'] );
        }
    }

    $controlBlockingReqs = array();
    $controlRequests = $tests[1]['stepResult']->getRequests();
    foreach ($controlRequests as $request) {
        if(  $request['renderBlocking'] === "blocking" || $request['renderBlocking'] === "in_body_parser_blocking" ){
            array_push($controlBlockingReqs, $request['url'] );
        }
    }

    $blockingReqsDiff = count($controlBlockingReqs) - count($experimentBlockingReqs);



    $diffMetrics = array( 
        //array( "TTFB", "Time to First Byte", "s"), 
        array( "StartRender", "Start Render", "s"),
        array( "firstContentfulPaint", "First Contentful Paint", "s"),
        array( "SpeedIndex", "Speed Index", "s"),
        array( "chromeUserTiming.LargestContentfulPaint", "Largest Contentful Paint", "s"),
        array( "chromeUserTiming.CumulativeLayoutShift", "Cumulative Layout Shift", "", array("Better","Worse")),
        array( "TotalBlockingTime", "Total Blocking Time", "s"),
        array( "visualComplete", "Visual Complete", "s"),
        array( "FullyLoaded", "Fully Loaded", "s"),
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
                        $thisDiff = floatval(removeLeadingZero(round($thisDiff,3)));
                        if(abs($thisDiff) > 0){
                            echo '<th align="center" valign="middle">' . $metric[1] . '</th>';
                        }
                    }

                    // additional non-metric comparisons
                    if( $blockingReqsDiff !== 0){
                        echo '<th align="center" valign="middle">Render-Blocking Requests</th>';
                    }

                ?>
            </tr>
            <tr>
                <?php 
                    foreach($diffMetrics as $metric){
                        $experimentMetric = $tests[0]['stepResult']->getMetric($metric[0]);
                        $controlMetric = $tests[1]['stepResult']->getMetric($metric[0]);
                        $thisDiff = $controlMetric - $experimentMetric;
                        $units = "<span class=\"units\">".$metric[2]."</span>";
                        $changeTerms = array("Faster","Slower");
                        if( $metric[3] ){
                            $changeTerms = $metric[3];
                        }
                        $thisDiff = floatval(removeLeadingZero(round($thisDiff,3)));
                        $experimentMetric = floatval(removeLeadingZero(round($experimentMetric,3)));
                        $controlMetric = floatval(removeLeadingZero(round($controlMetric,3)));

                        $change = '<span class="metric_change"><em>' . ( $thisDiff >= 0 ? $changeTerms[0] : $changeTerms[1] ) . '</em></span>';
                        

                        
                        if(abs($thisDiff) > 0){
                            if( $metric[2] === "s" ){
                                $thisDiff = round($thisDiff / 1000,2);
                                $experimentMetric = round($experimentMetric / 1000,2);
                                $controlMetric = round($controlMetric / 1000,2);
                            }
                            $compare = '<span class="metric_experiment"><span>Experiment:</span><span>' . $experimentMetric .  $units . '</span></span>';
                            $compare .= '<span class="metric_control"><span>Control:</span><span>' . $controlMetric .  $units . '</span></span>';
                            echo '<td id="TTFB" valign="middle" class="'. ( $thisDiff >= 0 ? "good" : "poor" ) .'">'. abs($thisDiff) . $units . $change . $compare . '</td>';
                        }
                    }

                    // additional non-metric comparisons
                    if( $blockingReqsDiff !== 0 ){
                        $changeTerms = array("Fewer","More");
                        $units = "";
                        $change = '<span class="metric_change"><em>' . ( $blockingReqsDiff >= 0 ? $changeTerms[0] : $changeTerms[1] ) . '</em></span>';
                        $compare = '<span class="metric_experiment"><span>Experiment:</span><span>' . count($experimentBlockingReqs) .  $units . '</span></span>';
                        $compare .= '<span class="metric_control"><span>Control:</span><span>' . count($controlBlockingReqs) .  $units . '</span></span>';

                        echo '<td id="TTFB" valign="middle" class="'. ( $blockingReqsDiff >= 0 ? "good" : "poor" ) .'">'. abs($blockingReqsDiff) . $units . $change . $compare . '</td>';
                    }
                ?>
            </tr>
        </tbody>
    </table>
</div>


<?php } ?>