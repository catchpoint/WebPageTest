<?php
chdir('..');
include 'common.inc';
require_once('./benchmarks/data.inc.php');
$page_keywords = array('Benchmarks','Webpagetest','Website Speed Test','Page Speed');
$page_description = "WebPagetest benchmarks";
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Benchmarks</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
        <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
        <meta name="author" content="Patrick Meenan">
        <?php $gaTemplate = 'About'; include ('head.inc'); ?>
        <script type="text/javascript" src="/js/dygraph-combined.js?v=1.0.1"></script>
        <style type="text/css">
        .chart-container { clear: both; width: 875px; height: 350px; margin-left: auto; margin-right: auto; padding: 0;}
        .benchmark-chart { float: left; width: 700px; height: 350px; }
        .benchmark-legend { float: right; width: 150px; height: 350px; }
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Benchmarks';
            include 'header.inc';
            ?>
            
            <script type="text/javascript">
            function SelectedPoint(benchmark, metric, series, time, cached) {
                time = parseInt(time / 1000, 10);
                var isCached = 0;
                if (cached)
                    isCached = 1;
                var menu = '<div><h4>View details:</h4>';
                var scatter = "viewtest.php?benchmark=" + encodeURIComponent(benchmark) + "&metric=" + encodeURIComponent(metric) + "&cached=" + isCached + "&time=" + time;
                var delta = "delta.php?benchmark=" + encodeURIComponent(benchmark) + "&metric=" + encodeURIComponent(metric) + "&time=" + time;
                menu += '<a href="' + scatter + '">Scatter Plot</a><br>';
                menu += '<a href="' + delta + '">Comparison Distribution</a><br>';
                menu += '</div>';
                $.modal(menu, {overlayClose:true});
            }
            </script>
            <div class="translucent">
            <div style="clear:both;">
                <div style="float:left;" class="notes">
                    Click on a test heading to view all of the metrics for the given test.<br>
                    Click on a data point in the chart to see the scatter plot results for that specific test.<br>
                    Highlight an area of the chart to zoom in on that area and double-click to zoom out.
                </div>
                <div style="float: right;">
                    <form name="aggregation" method="get" action="index.php">
                        Aggregation <select name="aggregate" size="1" onchange="this.form.submit();">
                            <option value="avg" <?php if ($aggregate == 'avg') echo "selected"; ?>>Average</option>
                            <option value="geo-mean" <?php if ($aggregate == 'geo-mean') echo "selected"; ?>>Geometric Mean</option>
                            <option value="median" <?php if ($aggregate == 'median') echo "selected"; ?>>Median</option>
                            <option value="75pct" <?php if ($aggregate == '75pct') echo "selected"; ?>>75th Percentile</option>
                            <option value="95pct" <?php if ($aggregate == '95pct') echo "selected"; ?>>95th Percentile</option>
                            <option value="count" <?php if ($aggregate == 'count') echo "selected"; ?>>Count</option>
                        </select>
                    </form>
                </div>
            </div>
            <div style="clear:both;">
            </div>
            <?php
            $benchmarks = GetBenchmarks();
            $count = 0;
            foreach ($benchmarks as &$benchmark) {
                if (array_key_exists('title', $benchmark))
                    $title = $benchmark['title'];
                else
                    $title = $benchmark['name'];
                $bm = urlencode($benchmark['name']);
                if (!isset($out_data)) {
                    echo "<h2><a href=\"view.php?benchmark=$bm&aggregate=$aggregate\">$title</a> <span class=\"small\">(<a name=\"{$benchmark['name']}\" href=\"#{$benchmark['name']}\">direct link</a>)</span></h2>\n";
                    if (array_key_exists('description', $benchmark))
                        echo "<p>{$benchmark['description']}</p>\n";
                }
                
                if ($benchmark['expand'] && count($benchmark['locations'] > 1)) {
                    foreach ($benchmark['locations'] as $location => $label) {
                        if (is_numeric($label))
                            $label = $location;
                        DisplayBenchmarkData($benchmark, $location, $label);
                    }
                } else {
                    DisplayBenchmarkData($benchmark);
                }
            }
            ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
<?php

/**
* Display the charts for the given benchmark
* 
* @param mixed $benchmark
*/
function DisplayBenchmarkData(&$benchmark, $loc = null, $title = null) {
    global $raw_data;
    $raw_data = null;

    // figure out the time of the most recent test
    $test_time = 0;
    if (is_dir("./results/benchmarks/{$benchmark['name']}/data")) {
        $files = scandir("./results/benchmarks/{$benchmark['name']}/data");
        foreach( $files as $file ) {
            if (preg_match('/([0-9]+_[0-9]+)\..*/', $file, $matches)) {
                $UTC = new DateTimeZone('UTC');
                $date = DateTime::createFromFormat('Ymd_Hi', $matches[1], $UTC);
                $time = $date->getTimestamp();
                if ($time > $test_time)
                    $test_time = $time;
            }
        }
    }

    $out_data = array();    
    if (LoadTestData($data, $configurations, $benchmark[name], 0, 'SpeedIndex', $test_time, $meta, $loc)) {
        foreach ($data as $urlid => &$row) {
            $url = $meta[$urlid]['url'];
            $data_points = 0;
            $url_data = array();
            // figure out the maximum number of data points we have
            foreach($configurations as &$configuration) {
                foreach ($configuration['locations'] as &$location) {
                    if (array_key_exists($configuration['name'], $row) && 
                        array_key_exists($location['location'], $row[$configuration['name']]) &&
                        is_array($row[$configuration['name']][$location['location']])) {
                        $raw_values = $row[$configuration['name']][$location['location']];
                        $values = array();
                        foreach ($raw_values as $raw_value) {
                            $values[] = $raw_value['value'];
                        }
                        sort($values);
                        $count = count($values);
                        $out_str = null;
                        if ($count > 1) {
                            $median = $values[(int)($count / 2)];
                            if ($median > 0) {
                                $good_count = 0;
                                $bad_count = 0;
                                foreach($values as $value) {
                                    $delta = abs(($value - $median) / $median);
                                    if ($delta <= 0.15) {
                                        $good_count++;
                                    } else {
                                        $bad_count++;
                                    }
                                }
                                if ($good_count < 5) {
                                    $out_str = "$good_count results within 15% of median, $bad_count results not.";
                                }
                            } else {
                                $out_str = "Invalid median: $median";
                            }
                        } else {
                            $out_str = "Only $count successful runs";
                        }
                        if (isset($out_str)) {
                            echo "$url {$configuration['name']} {$location['location']}: $out_str<br>\n";
                        }
                    }
                }
            }
        }
    }
}
?>