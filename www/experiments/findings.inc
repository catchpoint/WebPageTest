<?php

if( $experiment ){
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
}
?>
<div class="scrollableTable">
    <table id="tableResults" class="pretty">
        <tbody>
            <tr class="metric_labels">
                <?php 
                    foreach($diffMetrics as $metric){
                        $experimentMetric = $tests[0]['stepResult']->getMetric($metric[0]);
                        $thisDiff = $tests[1]['stepResult']->getMetric($metric[0]) - $experimentMetric;
                        if($thisDiff !== 0){
                            echo '<th align="center" valign="middle">' . $metric[1] . '</th>';
                        }
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
                        $change = '<span class="metric_change"><em>' . ( $thisDiff >= 0 ? $changeTerms[0] : $changeTerms[1] ) . '</em></span>';
                        if($thisDiff !== 0){
                            echo '<td id="TTFB" valign="middle" class="'. ( $thisDiff >= 0 ? "good" : "poor" ) .'">'. removeLeadingZero(round(abs($thisDiff),3)) . $units . $change . '</td>';
                        }
                    }
                ?>
            </tr>
        </tbody>
    </table>
</div>