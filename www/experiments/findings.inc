<?php

if ($experiment) {
    // compare render-blocking scripts
    $experimentBlockingReqs = array();
    $experimentRequests = $tests[0]['stepResult']->getRequests();
    foreach ($experimentRequests as $request) {
        if ($request['renderBlocking'] === "blocking" || $request['renderBlocking'] === "in_body_parser_blocking") {
            array_push($experimentBlockingReqs, $request['url']);
        }
    }

    $controlBlockingReqs = array();
    $controlRequests = $tests[1]['stepResult']->getRequests();
    foreach ($controlRequests as $request) {
        if ($request['renderBlocking'] === "blocking" || $request['renderBlocking'] === "in_body_parser_blocking") {
            array_push($controlBlockingReqs, $request['url']);
        }
    }

    $blockingReqsDiff = count($controlBlockingReqs) - count($experimentBlockingReqs);


    // item args: metric key name, readable name, units, optional comparative terms if not faster/slower, available for optional ttfb removal
    $diffMetrics = array(
        array("render", "Start Render", "s", null, true),
        array("firstContentfulPaint", "First Contentful Paint", "s", null, true),
        array("SpeedIndex", "Speed Index", "s", null, true),
        array("chromeUserTiming.LargestContentfulPaint", "Largest Contentful Paint", "s", null, true),
        array("chromeUserTiming.CumulativeLayoutShift", "Cumulative Layout Shift", "", array("Better", "Worse"), false),
        array("TotalBlockingTime", "Total Blocking Time", "s", null, false),
        //array("visualComplete", "Visual Complete", "s", null, true),
        array("carbon-footprint", "Carbon Footprint", "g", array("Lighter", "Heavier"), false),
        array("bytesIn", "Page Weight", "KB", array("Lighter", "Heavier"), false)
    );

    // see if there's a notable diff in TTFB first, which is usually unrelated to the experiment
    // offer a link and query string to ignore ttfb in some metrics
    $experimentTTFB = $tests[0]['stepResult']->getMetric("TTFB");
    $controlTTFB = $tests[1]['stepResult']->getMetric("TTFB");
    $ttfbDiff = $tests[1]['stepResult']->getMetric("TTFB") - $tests[0]['stepResult']->getMetric("TTFB");
    $ttfbDiffClean = floatval(removeLeadingZero(round($ttfbDiff, 3)));
    $ttfbDiffClean = abs(round($ttfbDiffClean / 1000, 2));
    $ttfbDiffNotable = abs($ttfbDiff) > 100;
    $removeTTFBfromDiffs = isset($_GET['ignoreTTFB']);


    ?>
    <div class="scrollableTable">
        <table id="tableResults" class="pretty">
            <tbody>
                <tr class="metric_labels">
                    <?php
                    foreach ($diffMetrics as $metric) {
                        $experimentMetric = $tests[0]['stepResult']->getMetric($metric[0]);
                        $controlMetric = $tests[1]['stepResult']->getMetric($metric[0]);

                        if ($metric[0] === "carbon-footprint") {
                            $experimentMetric = $experimentMetric['sustainable-web-design'];
                            $controlMetric = $controlMetric['sustainable-web-design'];
                        }

                        if ($ttfbDiffNotable && $removeTTFBfromDiffs && $metric[4]) {
                            $experimentMetric = $experimentMetric - $experimentTTFB;
                            $controlMetric = $controlMetric - $controlTTFB;
                        }
                        $thisDiff = $controlMetric - $experimentMetric;

                        $thisDiff = floatval(removeLeadingZero(round($thisDiff, 3)));
                        if ($metric[0] === "bytesIn") {
                            $thisDiff = round($thisDiff / 1024);
                        }
                        if (abs($thisDiff) > 0) {
                            echo '<th align="center" valign="middle">' . $metric[1] . '</th>';
                        }
                    }

                    // additional non-metric comparisons
                    if ($blockingReqsDiff !== 0) {
                        echo '<th align="center" valign="middle">Blocking Requests</th>';
                    }

                    ?>
                </tr>
                <tr>
                    <?php
                    foreach ($diffMetrics as $metric) {
                        $experimentMetric = $tests[0]['stepResult']->getMetric($metric[0]);
                        $controlMetric = $tests[1]['stepResult']->getMetric($metric[0]);
                        if ($metric[0] === "carbon-footprint") {
                            $experimentMetric = $experimentMetric['sustainable-web-design'];
                            $controlMetric = $controlMetric['sustainable-web-design'];
                        }
                        if ($ttfbDiffNotable && $removeTTFBfromDiffs && $metric[4]) {
                            $experimentMetric = $experimentMetric - $experimentTTFB;
                            $controlMetric = $controlMetric - $controlTTFB;
                        }
                        $thisDiff = $controlMetric - $experimentMetric;
                        $units = '<span class="units">' . $metric[2] . '</span>';
                        $changeTerms = array("Faster", "Slower");
                        if ($metric[3]) {
                            $changeTerms = $metric[3];
                        }
                        $thisDiff = floatval(removeLeadingZero(round($thisDiff, 3)));
                        $experimentMetric = floatval(removeLeadingZero(round($experimentMetric, 3)));
                        $controlMetric = floatval(removeLeadingZero(round($controlMetric, 3)));

                        if ($metric[0] === "bytesIn") {
                            $experimentMetric = round($experimentMetric / 1024, 0);
                            $controlMetric = round($controlMetric / 1024, 0);
                            $thisDiff = round($thisDiff / 1024);
                        }

                        $change = '<span class="metric_change"><em>' . ($thisDiff >= 0 ? $changeTerms[0] : $changeTerms[1]) . '</em></span>';



                        if (abs($thisDiff) > 0) {
                            if ($metric[2] === "s") {
                                $thisDiff = round($thisDiff / 1000, 2);
                                $experimentMetric = round($experimentMetric / 1000, 2);
                                $controlMetric = round($controlMetric / 1000, 2);
                            }
                            $compare = '<span class="metric_experiment"><span>Experiment:</span><span>' . $experimentMetric .  $units . '</span></span>';
                            $compare .= '<span class="metric_control"><span>Control:</span><span>' . $controlMetric .  $units . '</span></span>';
                            echo '<td id="TTFB" valign="middle" class="' . ($thisDiff >= 0 ? "good" : "poor") . '">' . abs($thisDiff) . $units . $change . $compare . '</td>';
                        }
                    }

                    // additional non-metric comparisons
                    if ($blockingReqsDiff !== 0) {
                        $changeTerms = array("Fewer", "More");
                        $units = "";
                        $change = '<span class="metric_change"><em>' . ($blockingReqsDiff >= 0 ? $changeTerms[0] : $changeTerms[1]) . '</em></span>';
                        $compare = '<span class="metric_experiment"><span>Experiment:</span><span>' . count($experimentBlockingReqs) .  $units . '</span></span>';
                        $compare .= '<span class="metric_control"><span>Control:</span><span>' . count($controlBlockingReqs) .  $units . '</span></span>';

                        echo '<td id="TTFB" valign="middle" class="' . ($blockingReqsDiff >= 0 ? "good" : "poor") . '">' . abs($blockingReqsDiff) . $units . $change . $compare . '</td>';
                    }
                    ?>
                </tr>
            </tbody>
        </table>
    </div>


<?php }

if ($ttfbDiffNotable) {
    if ($removeTTFBfromDiffs) {
        echo '<p class="ttfb_experiment_warning"><strong>Note:</strong> The metric comparisons above exclude differences in response time that exist between the median experiment and control runs of this experiment. <a href="' . $experimentResultsHref . '">View this comparison with TTFB differences included</a>.';
    } else {
        echo '<p class="ttfb_experiment_warning"><strong>Note:</strong> This experiment had a ' . $ttfbDiffClean . 's difference in response time between the median experiment and control runs, which can make other metric changes seem more significant than they really are. To examine the variability of response times in all test runs, you can <a href="/graph_page_data.php?tests=' . $tests[0]["id"] . ',' . $tests[1]['id'] . '&medianMetric=ttfb&control=1">plot full results</a>. Or, you can <a href="' . $experimentResultsHref . '&ignoreTTFB">view this comparison with TTFB removed from relevant metric comparisons</a>.';
    }
}

?>
