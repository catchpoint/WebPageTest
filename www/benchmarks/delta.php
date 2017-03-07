<?php
chdir('..');
include 'common.inc';
require_once('./benchmarks/data.inc.php');
$page_keywords = array('Benchmarks','Webpagetest','Website Speed Test','Page Speed');
$page_description = "WebPagetest benchmark test details";
$benchmark = '';
if (array_key_exists('benchmark', $_REQUEST)) {
    $benchmark = $_REQUEST['benchmark'];
    $info = GetBenchmarkInfo($benchmark);
    if (array_key_exists('options', $info) && array_key_exists('median_run', $info['options'])) {
        $median_metric = $info['options']['median_run'];
    }
}
$test_time = 0;
if (array_key_exists('time', $_REQUEST))
    $test_time = $_REQUEST['time'];
else {
    // figure out the time of the most recent test
    if (is_dir("./results/benchmarks/$benchmark/data")) {
        $files = scandir("./results/benchmarks/$benchmark/data");
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
}
$metrics = array('docTime' => 'Load Time (onload)', 
                'SpeedIndex' => 'Speed Index',
                'TTFB' => 'Time to First Byte', 
                'basePageSSLTime' => 'Base Page SSL Time',
                'titleTime' => 'Time to Title', 
                'render' => 'Time to Start Render', 
                'domContentLoadedEventStart' => 'DOM Content Loaded',
                'visualComplete' => 'Time to Visually Complete', 
                'lastVisualChange' => 'Last Visual Change',
                'fullyLoaded' => 'Load Time (Fully Loaded)', 
                'server_rtt' => 'Estimated RTT to Server',
                'docCPUms' => 'CPU Busy Time',
                'domElements' => 'Number of DOM Elements', 
                'connections' => 'Connections', 
                'requests' => 'Requests (Fully Loaded)', 
                'requestsDoc' => 'Requests (onload)', 
                'bytesInDoc' => 'Bytes In (KB - onload)', 
                'bytesIn' => 'Bytes In (KB - Fully Loaded)', 
                'js_bytes' => 'Javascript Bytes (KB)', 
                'js_requests' => 'Javascript Requests', 
                'css_bytes' => 'CSS Bytes (KB)', 
                'css_requests' => 'CSS Requests', 
                'image_bytes' => 'Image Bytes (KB)', 
                'image_requests' => 'Image Requests',
                'flash_bytes' => 'Flash Bytes (KB)', 
                'flash_requests' => 'Flash Requests', 
                'html_bytes' => 'HTML Bytes (KB)', 
                'html_requests' => 'HTML Requests', 
                'text_bytes' => 'Text Bytes (KB)', 
                'text_requests' => 'Text Requests',
                'other_bytes' => 'Other Bytes (KB)', 
                'other_requests' => 'Other Requests',
                'browser_version' => 'Browser Version'
                );
$metric = 'SpeedIndex';
if (!$info['video']) {
    unset($metrics['SpeedIndex']);
    $metric = 'docTime';
}
if (array_key_exists('metric', $_REQUEST))
    $metric = $_REQUEST['metric'];
$ref = null;
if (array_key_exists('ref', $_REQUEST) && array_key_exists($_REQUEST['ref'], $info['configurations']))
    $ref = $_REQUEST['ref'];
if (!isset($ref)) {
    foreach ($info['configurations'] as $config => &$configData) {
        $ref = $config;
        break;
    }
}

?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Benchmark Comparison</title>
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
            echo "<script type=\"text/javascript\" src=\"{$GLOBALS['cdnPath']}/js/site.js?v=" . VER_JS . "\"></script>\n";
            $site_js_loaded = true;
            ?>
            
            <div class="translucent">
            <?php
            if (isset($info) && array_key_exists('links', $info)) {
                echo '<div style="clear:both; padding-bottom: 0.5em;">Benchmark Information: ';
                $link_count = 0;
                foreach ($info['links'] as $link_label => $link_url) {
                    if ($link_count) {
                        echo " - ";
                    }
                    echo "<a href=\"$link_url\">$link_label</a>";
                    $link_count++;
                }
                echo '</div>';
            }
            ?>
            <div style="clear:both;">
                <div style="float:left;" class="notes">
                    Click on a data point in the chart to see the full test data (waterfall, etc) for the given data point.<br>
                    Highlight an area of the chart to zoom in on that area and double-click to zoom out.
                    <?php
                    if (isset($info) && array_key_exists('notes', $info)) {
                        echo '<br>';
                        echo $info['notes'];
                    }
                    ?>
                </div>
                <div style="float: right;">
                    <form name="metric" method="get" action="delta.php">
                        <?php
                        echo "<input type=\"hidden\" name=\"benchmark\" value=\"" . htmlspecialchars($benchmark) . "\">";
                        echo "<input type=\"hidden\" name=\"time\" value=\"" . htmlspecialchars($test_time) . "\">";
                        ?>
                        Metric <select name="metric" size="1" onchange="this.form.submit();">
                        <?php
                        foreach( $metrics as $m => $metricLabel) {
                            $selected = '';
                            if ($m == $metric) {
                                $selected = ' selected';
                            }
                            echo "<option value=\"$m\"$selected>$metricLabel</option>\n";
                        }
                        echo '</select><br>Compare To <select name="ref" size="1" onchange="this.form.submit();">';
                        foreach ($info['configurations'] as $config => &$configData) {
                            $selected = '';
                            if ($config == $ref) {
                                $selected = ' selected';
                            }
                            echo "<option value=\"$config\"$selected>{$configData['title']}</option>\n";
                        }
                        ?>
                        </select>
                    </form>
                </div>
            </div>
            <div style="clear:both;">
            <br>
            </div>
            <div id="hidden" style="display:none;"></div>
            <div style="text-align:center; clear:both;">
                <script type="text/javascript">
                    var charts = new Array();
                    function SelectedPoint(p, data, ref, cmp, cached) {
                        <?php
                            echo "var benchmark=\"" . htmlspecialchars($benchmark) . "\";\n";
                            echo "var medianMetric=\"" . htmlspecialchars($median_metric) . "\";\n";
                        ?>
                        var index = p.yval.toFixed(5);
                        var menu = '<div><h4>View test for ' + data[index].url + '</h4>';
                        menu += '<a href="/result/' + data[index].ref + '/?medianMetric=' + medianMetric + '" target="_blank">' + ref + '</a><br>';
                        menu += '<a href="/result/' + data[index].cmp + '/?medianMetric=' + medianMetric + '" target="_blank">' + cmp + '</a><br>';
                        var compare = "/video/compare.php?ival=100&medianMetric=" + medianMetric + "&tests=";
                        compare += encodeURIComponent(data[index].ref + "-l:" + ref.replace("-","").replace(":",""));
                        compare += "," + encodeURIComponent(data[index].cmp + "-l:" + cmp.replace("-","").replace(":",""));
                        menu += '<br><a href="' + compare + '">Filmstrip Comparison</a>';
                        menu += '</div>';
                        $.modal(menu, {overlayClose:true});
                    }
                </script>
            </div>
            <?php
            if (isset($info) && array_key_exists('configurations', $info) && count($info['configurations']) > 1) {
                echo "<h1>{$info['title']}</h1>";
                if (array_key_exists('description', $info))
                    echo "<p>{$info['description']}</p>\n";
                if ($info['expand'] && count($info['locations'] > 1)) {
                    foreach ($info['locations'] as $location => $label) {
                        if (is_numeric($label))
                            $label = $location;
                        echo "<h2>{$metrics[$metric]} - $label <span class=\"small\">(<a name=\"$metric\" href=\"#$metric$location\">direct link</a>)</span></h2>\n";
                        DisplayBenchmarkData($info, $metric, $location);
                    }
                } else {
                    echo "<h2>{$metrics[$metric]} <span class=\"small\">(<a name=\"$metric\" href=\"#$metric\">direct link</a>)</span></h2>\n";
                    DisplayBenchmarkData($info, $metric);
                }
            }
            echo "<hr><h2>Test Errors <span class=\"small\">(<a name=\"errors\" href=\"#errors\">direct link</a>)</span></h2>\n";
            if (GetTestErrors($errors, $benchmark, $test_time)) {
                foreach($errors as &$configuration) {
                    if (count($configuration['locations'])) {
                        echo "<h2>{$configuration['label']}</h2>\n";
                        foreach($configuration['locations'] as &$location) {
                            echo "<h3>{$location['label']}</h3>\n";
                            if (count($location['urls'])) {
                                echo "<ul>";
                                foreach($location['urls'] as &$url) {
                                    echo "<li>" . htmlspecialchars($url['url']) . " - ";
                                    $first = true;
                                    foreach( $url['errors'] as &$test ) {
                                        if ($first)
                                            $first = false;
                                        else
                                            echo ", ";
                                        $cached = '';
                                        if ($test['cached'])
                                            $cached = 'cached/';
                                        echo "<a href=\"/result/{$test['id']}/{$test['run']}/details/$cached\">{$test['error']}</a>";
                                    }
                                    echo "</li>";
                                }
                                echo "</ul>";
                            } else {
                                echo "No Errors Detected";
                            }
                        }
                    }
                }
            } else {
                echo "No Errors Detected";
            }
            ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
<?php
function DisplayBenchmarkData(&$benchmark, $metric, $loc = null) {
    global $count;
    global $aggregate;
    global $test_time;
    global $ref;
    $annotations = null;
    $compare = array();
    foreach ($benchmark['configurations'] as $config => &$configData) {
        if ($config != $ref)
            $compare[] = $config;
    }
    foreach( $compare as $config ) {
        $refLabel = htmlspecialchars($ref);
        if (array_key_exists('title', $benchmark['configurations'][$ref])) {
            $refLabel = htmlspecialchars($benchmark['configurations'][$ref]['title']);
        }
        $configLabel = htmlspecialchars($config);
        if (array_key_exists('title', $benchmark['configurations'][$config])) {
            $configLabel = htmlspecialchars($benchmark['configurations'][$config]['title']);
        }
        $chart_title = "$configLabel vs. $refLabel";
        $tsv = LoadDeltaTSV($benchmark['name'], $ref, $config, 0, $metric, $test_time, $meta, $loc);
        if (isset($tsv) && strlen($tsv)) {
            $count++;
            $id = "g$count";
            echo "<div class=\"chart-container\"><div id=\"$id\" class=\"benchmark-chart\"></div><div id=\"{$id}_legend\" class=\"benchmark-legend\"></div></div><br>\n";
            echo "<script type=\"text/javascript\">
                    var {$id}meta = " . json_encode($meta) . ";
                    var {$id}legend = document.getElementById('{$id}_legend');
                    $id = new Dygraph(
                        document.getElementById(\"$id\"),
                        \"" . str_replace("\t", '\t', str_replace("\n", '\n', $tsv)) . "\",
                        {drawPoints: true,
                        strokeWidth: 0.0,
                        labelsSeparateLines: true,
                        labelsDiv: document.getElementById('hidden'),
                        colors: ['#ed2d2e', '#008c47', '#1859a9', '#662c91', '#f37d22', '#a11d20', '#b33893', '#010101'],
                        axes: {x: {valueFormatter: function(delta) {
                                    var num = delta * 100;
                                    return num.toFixed(2) + '%';
                                  }, 
                                  axisLabelFormatter: function(delta) {
                                    var num = delta * 100;
                                    return num.toFixed(0) + '%';
                                  }},
                               y: {
                                    valueRange: [0,105]
                               }},
                        pointClickCallback: function(e, p) {SelectedPoint(p, {$id}meta, '$refLabel', '$configLabel', false);},
                        highlightCallback: function(e, x, pts, row) {
                            var percentile = pts[0].yval;
                            var index = percentile.toFixed(5);
                            var delta = x * 100;
                            delta = delta.toFixed(2);
                            var url = {$id}meta[index].url;
                            {$id}legend.innerHTML = url + '<br>Delta: <b>' + delta + '%</b><br>percentile: ' + percentile.toFixed(0);
                        },
                        unhighlightCallback: function(e) {
                            {$id}legend.innerHTML = '';
                        },
                        title: \"$chart_title\",
                        legend: \"always\"}
                    );
                    charts.push('$id');";
            echo "</script>\n";
        }
        if (!array_key_exists('fvonly', $benchmark) || !$benchmark['fvonly']) {
            $chart_title = "$configLabel vs. $refLabel (Repeat View)";
            $tsv = LoadDeltaTSV($benchmark['name'], $ref, $config, 1, $metric, $test_time, $meta, $loc);
            if (isset($tsv) && strlen($tsv)) {
                $count++;
                $id = "g$count";

                echo "<br><div class=\"chart-container\"><div id=\"$id\" class=\"benchmark-chart\"></div><div id=\"{$id}_legend\" class=\"benchmark-legend\"></div></div>\n";
                echo "<script type=\"text/javascript\">
                        var {$id}meta = " . json_encode($meta) . ";
                        var {$id}legend = document.getElementById('{$id}_legend');
                        $id = new Dygraph(
                            document.getElementById(\"$id\"),
                            \"" . str_replace("\t", '\t', str_replace("\n", '\n', $tsv)) . "\",
                            {drawPoints: true,
                            strokeWidth: 0.0,
                            labelsSeparateLines: true,
                            labelsDiv: document.getElementById('{$id}_legend'),
                            colors: ['#ed2d2e', '#008c47', '#1859a9', '#662c91', '#f37d22', '#a11d20', '#b33893', '#010101'],
                            axes: {x: {valueFormatter: function(delta) {
                                        var num = delta * 100;
                                        return num.toFixed(2) + '%';
                                      }, 
                                      axisLabelFormatter: function(delta) {
                                        var num = delta * 100;
                                        return num.toFixed(0) + '%';
                                      }}},
                            pointClickCallback: function(e, p) {SelectedPoint({$id}meta[p.yval], '$refLabel', '$configLabel', true);},
                            highlightCallback: function(e, x, pts, row) {
                                var percentile = pts[0].yval;
                                var index = percentile.toFixed(5);
                                var delta = x * 100;
                                delta = delta.toFixed(2);
                                var url = {$id}meta[index].url;
                                {$id}legend.innerHTML = url + '<br>Delta: <b>' + delta + '%</b><br>percentile: ' + percentile.toFixed(0);
                            },
                            unhighlightCallback: function(e) {
                                {$id}legend.innerHTML = '';
                            },
                            title: \"$chart_title\",
                            legend: \"always\"}
                        );
                        charts.push('$id');";
                echo "</script>\n";
            }
        }
    }
}    
?>
