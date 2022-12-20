<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
// We intend to change to "?tests" but also allow "?test" so as to not break existing links.
$tests = (isset($_REQUEST['tests'])) ? $_REQUEST['tests'] : $_REQUEST['test'];
$tests = preg_replace('/[^a-zA-Z0-9,_\.\-:\ ]/', '', $tests);

// Get choice of statistical control from request URL.
$statControl = 'None'; // 'None' or index starting with 1 into list of tests.
if (array_key_exists('control', $_REQUEST)) {
    $statControl = $_REQUEST['control'];
}

// Pull out the test IDs and labels from the "tests" parameter.
$compTests = explode(',', $tests);
$testsId = array(); // Test IDs
$testsLabel = array(); // String labels corresponding to the test IDs.
// TODO(geening): Handle the same parameters as supported in the filmstrip view.
// https://github.com/WPO-Foundation/webpagetest/blob/master/www/video/filmstrip.inc.php#L17
foreach ($compTests as $t) {
    $parts = explode('-', $t);
    $testsId[] = $parts[0];
    if ((count($parts) == 2) && preg_match("/^l:(.*)/", $parts[1], $matches)) {
        $testsLabel[] = $matches[1];
    } else {
        $testsLabel[] = $parts[0];
    }
}

// If there is exactly one test, populate variables so header code will pick it up.
if (count($testsId) == 1) {
    $_GET['test'] = $testsId[0];
    $_REQUEST['test'] = $testsId[0];
}
include 'common.inc';
require_once('page_data.inc');
require_once('graph_page_data.inc');
$page_keywords = array('Graph Page Data', 'Webpagetest', 'Website Speed Test', 'Page Speed', 'comparison');
$page_description = "Graph Page Data Comparison.";

foreach ($testsId as $id) {
    RestoreTest($id);
}

# We intend to change to "?tests" but also allow "?test" so as to not break existing links.
# TODO(mgl): Support -l:<label> after the test IDs as in video/compare.php
$chartData = array();  // @var Chart[] All charts to be graphed

$testsPath = array_map("GetTestPath", $testsId);
$testsInfo = array_map("GetTestInfo", $testsPath);
$pagesData = array_map("loadAllPageData", $testsPath);

// Whether to show first and/or repeat views.
// Default to showing first view if no views are indicated in the URL.
$views = array();
$rv = (isset($_REQUEST['rv'])) ? $_REQUEST['rv'] : 0;
$fv = (isset($_REQUEST['fv'])) ? $_REQUEST['fv'] : (1 - $rv);
if ($fv) {
    $views[] = 0;
}
if ($rv) {
    $views[] = 1;
}

// Whether to show median run and/or median value
$median_run = (isset($_REQUEST['median_run'])) ? $_REQUEST['median_run'] : 0;
$median_value = (isset($_REQUEST['median_value'])) ? $_REQUEST['median_value']  : 0;

//whether to set charts v-axis to 0
$zero_start = (isset($_REQUEST['zero_start'])) ? "true" : "false";

// TODO(geening): Have a cleaner way to support more than 8 tests with
// distinct-looking colors.
$colors = array('#ed2d2e', '#008c47', '#1859a9', '#662c91', '#f37d22', '#a11d20', '#b33893', '#010101');
$light_colors = array_map("lighten", $colors);

// Figure out what characteristics will be common to all lines in each graph.
$common_labels = array();
if (count($testsId) == 1) {
    $common_labels[] = $testsLabel[0];
}
if (count($views) == 1) {
    $common_labels[] = (($views[0] == '1') ? 'Repeat View' : 'First View');
}
$common_label = implode(" ", $common_labels);

?>
<!DOCTYPE html>
<html lang="en-us">

<head>
    <title>WebPageTest - Graph Page Data</title>
    <script>
        document.documentElement.classList.add('has-js');
    </script>
    <meta http-equiv="charset" content="iso-8859-1">
    <?php include('head.inc'); ?>
    <style>
        .chartStats {
            clear: both;
            text-align: left;
        }

        .chartStats table {
            margin-left: 0;
        }

        .chartStats td {
            text-align: right !important;
        }

        .chart {
            min-height: 500px;
        }
    </style>
</head>

<body class="result">
    <?php
    if (count($testsId) == 1) {
        $tab = 'Test Result';
        $subtab = "Graphed Page Data";
    }
    include 'header.inc';
    ?>


    <div class="results_main_contain">
        <div class="results_main">




            <div class="results_and_command">

                <div class="results_header">
                    <h2>Graph Page Data Comparison</h2>
                    <p>Use this page to plot the results for each run in your test to help you spot outliers and patterns.</p>
                </div>
            </div>


            <div id="result" class="results_body">
                <?php
                if (count($testsId) != 1) {
                    ?>
                    <div id="test_results-container">
                        <div class="test_results">
                            <div class="test_results-content">
                            <?php
                }
                ?>
                            <div>
                                <form class="simple_form" name="cached" method="get" action="graph_page_data.php">
                                    <?php
                                    echo "<input type=\"hidden\" name=\"tests\" value=\"$tests\">";
                                    echo "<input type=\"hidden\" name=\"medianMetric\" value=\"$median_metric\">";
                                    ?>
                                    <fieldset>
                                        <legend>View:</legend>
                                        <input type="checkbox" name="fv" id="fv" value="1" <?php if ($fv == '1') {
                                                                                                echo "checked";
                                                                                           } ?>><label for="fv">First</label>
                                        <input type="checkbox" name="rv" id="rv" value="1" <?php if ($rv == '1') {
                                                                                                echo "checked";
                                                                                           } ?>><label for="rv">Repeat</label>
                                    </fieldset>
                                    <fieldset>
                                        <legend>Median:</legend>
                                        <input type="checkbox" id="median_value" name="median_value" value="1" <?php if ($median_value == '1') {
                                                                                                                    echo "checked";
                                                                                                               } ?>><label for="median_value">Of plotted metric</label>
                                        <input type="checkbox" name="median_run" id="median_run" value="1" <?php if ($median_run == '1') {
                                                                                                                echo "checked";
                                                                                                           } ?>><label for="median_run">Run with median
                                            <?php echo $median_metric; ?></label>
                                    </fieldset>
                                    <fieldset>
                                        <legend>Chart customization</legend>
                                        <input type="checkbox" name="zero_start" value="true" <?php if ($zero_start == 'true') {
                                                                                                    echo "checked";
                                                                                              } ?>>
                                        <label for="zero_start">Force Vertical Axis of Charts to Start at Zero</label>
                                    </fieldset>
                                    <label for="control">Statistical Comparison Against</label> <select id="control" name="control" size="1" onchange="this.form.submit();">
                                        <option value="NOSTAT" <?php if ($statControl === "NOSTAT") {
                                                                    echo " selected";
                                                               } ?>>None</option>
                                        <?php
                                        foreach ($pagesData as $key => $pageData) {
                                            $selectedString = ((string)$key === $statControl) ? " selected" : "";
                                            echo "<option value=\"$key\"$selectedString>" . $testsLabel[$key] . "</option>";
                                        }
                                        ?>
                                    </select>

                                    <p>
                                        <strong>Tests:</strong>
                                        <?php
                                        for ($i = 0; $i < count($testsId); $i++) {
                                            echo "<br>" . $testsId[$i] . "-l:" . $testsLabel[$i];
                                        }
                                        ?>
                                    </p>
                                    <input type="submit" value="Plot Results">
                                </form>
                            </div>

                            <div id="result" class="">

                                <?php
                                $web_vitals = array();
                                foreach ($pagesData as &$pageData) {
                                    foreach ($pageData as &$pageRun) {
                                        foreach ($pageRun as &$data) {
                                            if (isset($data['firstContentfulPaint'])) {
                                                $web_vitals['firstContentfulPaint'] = 'First Contentful Paint (ms)';
                                            }
                                            if (isset($data['chromeUserTiming.LargestContentfulPaint'])) {
                                                $web_vitals['chromeUserTiming.LargestContentfulPaint'] = 'Largest Contentful Paint (ms)';
                                            }
                                            if (isset($data['chromeUserTiming.CumulativeLayoutShift'])) {
                                                $web_vitals['chromeUserTiming.CumulativeLayoutShift'] = 'Cumulative Layout Shift';
                                            }
                                            if (isset($data['TotalBlockingTime'])) {
                                                $web_vitals['TotalBlockingTime'] = 'Total Blocking Time (ms)';
                                            }
                                        }
                                    }
                                }
                                if (count($web_vitals)) {
                                    echo '<h2>Web Vitals</h2>';
                                    foreach ($web_vitals as $metric => $label) {
                                        InsertChart($metric, $label);
                                    }
                                }
                                if (count($common_labels) > 0) {
                                    echo "<h3>${common_label}</h3>";
                                }
                                ?>
                                <?php
                                $metrics = array(
                                    'docTime' => 'Load Time (onload - ms)',
                                    'loadEventStart' => 'Browser-reported Load Time (Navigation Timing onload)',
                                    'domContentLoadedEventStart' => 'DOM Content Loaded (Navigation Timing)',
                                    'SpeedIndex' => 'Speed Index',
                                    'TTFB' => 'Time to First Byte (ms)',
                                    'basePageSSLTime' => 'Base Page SSL Time (ms)',
                                    'render' => 'Time to Start Render (ms)',
                                    'LastInteractive' => 'Time to Interactive (ms) - Beta',
                                    'visualComplete' => 'Time to Visually Complete (ms)',
                                    'lastVisualChange' => 'Last Visual Change (ms)',
                                    'titleTime' => 'Time to Title (ms)',
                                    'fullyLoaded' => 'Fully Loaded (ms)',
                                    'server_rtt' => 'Estimated RTT to Server (ms)',
                                    'docCPUms' => 'CPU Busy Time',
                                    'domElements' => 'Number of DOM Elements',
                                    'connections' => 'Connections',
                                    'requests' => 'Requests (Fully Loaded)',
                                    'requestsDoc' => 'Requests (onload)',
                                    'bytesInDoc' => 'Bytes In (onload)',
                                    'bytesIn' => 'Bytes In (Fully Loaded)',
                                    'browser_version' => 'Browser Version'
                                );
                                $customMetrics = null;
                                $userTimings = null;
                                $elementTimings = null;
                                $userMeasures = null;
                                foreach ($pagesData as &$pageData) {
                                    foreach ($pageData as &$pageRun) {
                                        foreach ($pageRun as &$data) {
                                            if (array_key_exists('userTime', $data)) {
                                                $metrics['userTime'] = 'Last User Timing Mark';
                                            }
                                            if (array_key_exists('custom', $data) && is_array($data['custom']) && count($data['custom'])) {
                                                if (!isset($customMetrics)) {
                                                    $customMetrics = array();
                                                }
                                                foreach ($data['custom'] as $metric) {
                                                    if (!array_key_exists($metric, $customMetrics)) {
                                                        $customMetrics[$metric] = "Custom metric - $metric";
                                                    }
                                                }
                                            }
                                            foreach ($data as $metric => $value) {
                                                if (substr($metric, 0, 9) == 'userTime.') {
                                                    if (!isset($userTimings)) {
                                                        $userTimings = array();
                                                    }
                                                    $userTimings[$metric] = 'User Timing - ' . substr($metric, 9);
                                                } elseif (substr($metric, 0, 18) == 'userTimingMeasure.') {
                                                    if (!isset($userMeasures)) {
                                                        $userMeasures = array();
                                                    }
                                                    $userMeasures[$metric] = 'User Timing Measure - ' . substr($metric, 18);
                                                } elseif (substr($metric, 0, 14) == 'elementTiming.') {
                                                    if (!isset($elementTimings)) {
                                                        $elementTimings = array();
                                                    }
                                                    $elementTimings[$metric] = 'Element Timing - ' . substr($metric, 14);
                                                }
                                            }

                                            $elementTimingCount = count($elementTimings);
                                            $timingCount = count($userTimings);
                                            $measuresCount = count($userMeasures);
                                        }
                                    }
                                }

                                if ($removeSpeedIndex) {
                                    unset($metrics['SpeedIndex']);
                                }

                                foreach ($metrics as $metric => $label) {
                                    InsertChart($metric, $label);
                                }
                                if (isset($customMetrics) && is_array($customMetrics) && count($customMetrics)) {
                                    echo '<h2 id="custom">Custom Metrics</h2>';
                                    foreach ($customMetrics as $metric => $label) {
                                        InsertChart($metric, $label);
                                    }
                                }
                                if (isset($elementTimings) && is_array($elementTimings) && count($elementTimings)) {
                                    echo '<h2 id="ElementTiming"><a href="https://wicg.github.io/element-timing/" target="_blank" rel="noopener">Element Timings</a></h2>';
                                    foreach ($elementTimings as $metric => $label) {
                                        InsertChart($metric, $label);
                                    }
                                }
                                if (isset($userTimings) && is_array($userTimings) && count($userTimings)) {
                                    echo '<h2 id="UserTiming"><a href="http://www.w3.org/TR/user-timing/" target="_blank" rel="noopener">W3C User Timing marks</a></h2>';
                                    foreach ($userTimings as $metric => $label) {
                                        InsertChart($metric, $label);
                                    }
                                }
                                if (isset($userMeasures) && is_array($userMeasures) && count($userMeasures)) {
                                    echo '<h2 id="UserTimingMeasure"><a href="http://www.w3.org/TR/user-timing/#dom-performance-measure" target="_blank" rel="noopener">W3C User Timing measures</a></h2>';
                                    foreach ($userMeasures as $metric => $label) {
                                        InsertChart($metric, $label);
                                    }
                                }
                                ?>
                            </div>
                            </div>
                            <?php
                            // this is not great, admittedly. Right now some divs are opened in header and closed in footer
                            // if a single test is being viewed. We'll need to pull that out at some point to clean this up.
                            if (count($testsId) != 1) {
                                ?>
                        </div>
                    </div>
                                <?php
                            }
                            ?>
                <?php include('footer.inc'); ?>
            </div>
        </div>
        <script src="//www.google.com/jsapi"></script>
        <script>
            <?php
            $chartDataJson = json_encode($chartData);
            // If JSON encode fails due to inf and nan, replace those occurences with '0' in the serialized output then retry.
            if (json_last_error() == JSON_ERROR_INF_OR_NAN) {
                $chartDataJson = json_encode(unserialize(str_replace(array('NAN;', 'INF;'), '0;', serialize($chartData))));
            }
            echo "var chartData = " . $chartDataJson . ";\n";
            echo "var runs = $num_runs;\n";
            echo "var zeroStart = $zero_start;\n";
            ?>
            <?php include('assets/js/graph_page_data.js'); ?>
        </script>
    </div>
</body>

</html>

<?php

/**
 * InsertChart adds a chart for the given $metric, with the given $label, to
 * global $chartData, and outputs the HTML container elements for the chart.
 *
 * @param string $metric Metric to add
 * @param string $label Label corresponding to metric
 */
function InsertChart($metric, $label)
{
    global $chartData;
    global $num_runs; // @var integer Number of runs
    global $views;
    global $colors;
    global $light_colors;
    global $median_metric;
    global $pagesData;
    global $testsInfo;
    global $testsLabel;
    global $median_value;
    global $median_run;
    global $statControl;

    // Make sure we have data for the metric and that it is numeric
    $metric_ok = false;
    foreach ($views as $cached) {
        foreach ($pagesData as $key => $pageData) {
            $values = values($pageData, $cached, $metric, true);
            if (isset($values)) {
                foreach ($values as $value) {
                    if (is_numeric($value)) {
                        $metric_ok = true;
                        break;
                    }
                }
            }
        }
        if ($metric_ok) {
            break;
        }
    }
    if (!$metric_ok) {
        return;
    }

    $num_runs = max(array_map("numRunsFromTestInfo", $testsInfo));

    // Write HTML for chart
    $div = "{$metric}Chart";

    echo "<h4 id=\"$metric\">" . htmlspecialchars($label) . "</h4>";
    if (!$testsInfo) {
        return;
    }
    $chartColumns = array(ChartColumn::runs($num_runs));
    $compareTable = array();
    $view_index = 0;

    if ($num_runs >= 3) {
        echo '<div class="chartStats scrollableTable"><table class="pretty details">';
        echo '<thead><tr><th class="pin"></th><th>Mean</th><th>Median</th><th>p25</th><th>p75</th><th>p75-p25</th><th>StdDev</th><th>CV</th></tr></thead>';
        foreach ($views as $cached) {
            // For each run in that view
            $pageData = reset($pagesData);

            foreach ($pagesData as $key => $pageData) {
                echo '<tbody><tr>';
                $label = ($cached == '1') ? 'Repeat View' : 'First View';
                echo "<th style=\"text-align: right;\">$label<br/>$testsLabel[$key]</th>";
                $values = values($pageData, $cached, $metric, true);
                sort($values, SORT_NUMERIC);
                $sum = array_sum($values);
                $count = count($values);
                $mean = $count ? number_format($sum / $count, 3, '.', '') : 0;
                echo "<td>$mean</td>";
                $median = $values[intval($count / 2)];
                echo "<td>$median</td>";
                $p25 = $values[intval($count * 0.25)];
                echo "<td>$p25</td>";
                $p75 = $values[intval($count * 0.75)];
                echo "<td>$p75</td>";
                echo "<td>" . ($p75 - $p25) . "</td>";
                $sqsum = 0;
                foreach ($values as $value) {
                    $sqsum += pow($value - $mean, 2);
                }
                $stddev = $count ? number_format(sqrt($sqsum / $count), 3, '.', '') : 0;
                echo "<td>$stddev</td>";
                if ($mean > 0) {
                    echo "<td>" . number_format(($stddev / $mean) * 100, 3, '.', '') . "%</td>";
                } else {
                    echo "<td></td>";
                }

                echo '</tr></tbody>';
            }
        }
        echo '</table></div>';
    }

    // For each view (first / repeat) that we want to show
    foreach ($views as $cached) {
        $statValues = array();
        $statLabels = array();

        // For each run in that view
        foreach ($pagesData as $key => $pageData) {
            // Construct label from those descriptive attributes that are not
            // common to all variants.
            $labels = array();
            if (count($pagesData) > 1) {
                $labels[] = $testsLabel[$key];
            }
            if (count($views) > 1) {
                $labels[] = ($cached == '1') ? 'Repeat View' : 'First View';
            }

            // Prepare Chart object and add to $chartData for later chart construction.
            // If $view_index is greater than the number of colors, we will pass NULL
            // as a color, which will lead to GViz choosing a color.
            $chartColumnsAdd = ChartColumn::dataMedianColumns(
                $pageData,
                $cached,
                $metric,
                $median_metric,
                $colors[$view_index],
                $light_colors[$view_index],
                $labels,
                $num_runs,
                $median_run,
                $median_value
            );
            $chartColumns = array_merge($chartColumns, $chartColumnsAdd);
            $view_index++;

            // If doing a statistical comparison, prepare raw values and labels.
            if (($statControl !== 'NOSTAT') && (count($pagesData) >= 1)) {
                $statValues[] = values($pageData, $cached, $metric, true);
                $statLabels[] = implode(" ", $labels);
            }
        }
        if (is_file('lib/PHPStats/PHPStats.phar') && ($statControl !== 'NOSTAT') && (count($pagesData) >= 1)) {
            require_once('lib/PHPStats/PHPStats.phar');
            require_once('stat.inc');

            // First populate compareFrom for statistical control, if it has values
            if (count($statValues[$statControl]) > 0) {
                $statDiv = "{$metric}Stat{$cached}";
                $compareFrom = array();
                $confData = ConfData::fromArr($statLabels[$statControl], $statValues[$statControl]);
                $compareFrom[$statControl] = new CompareFrom($confData, null, null);

                foreach ($pagesData as $key => $pageData) {
                    // Skip the statistical control (we already handled it)
                    if ($key == $statControl) {
                        continue;
                    }
                    // Skip runs with missing values for the statistic.
                    if (count($statValues[$key]) == 0) {
                        continue;
                    }

                    // Populate compareFrom for $key
                    $confData = ConfData::fromArr($statLabels[$key], $statValues[$key]);
                    $pValue = \PHPStats\StatisticalTests::twoSampleTTest($statValues[$statControl], $statValues[$key]);
                    $diff = $confData->mean - $compareFrom[$statControl]->confData->mean;

                    // Derive 2-tailed p-value from 1-tailed p-view returned by twoSampleTTest.
                    $pValue = ($diff > 0) ? (2 * $pValue) : (2 * (1 - $pValue));

                    $compareFrom[$key] = new CompareFrom($confData, $diff, $pValue);
                }
                $compareTable[] = new CompareTable($statDiv, $compareFrom);
                echo "<div id=\"$statDiv\"></div>\n";
            }
        }
    }
    $chart = new Chart($div, $chartColumns, $compareTable);
    $chartData[$metric] = $chart;
    echo '<div class="overflow-container">';
    echo "<div id=\"$div\" class=\"chart\"></div></div>\n";
}
?>