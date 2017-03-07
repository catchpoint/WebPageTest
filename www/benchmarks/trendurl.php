<?php
chdir('..');
include 'common.inc';
set_time_limit(600);
require_once('./benchmarks/data.inc.php');
$page_keywords = array('Benchmarks','Webpagetest','Website Speed Test','Page Speed');
$page_description = "WebPagetest benchmark details";
$aggregate = 'median';
if (array_key_exists('aggregate', $_REQUEST))
    $aggregate = $_REQUEST['aggregate'];
$benchmark = '';
if (array_key_exists('benchmark', $_REQUEST)) {
    $benchmark = $_REQUEST['benchmark'];
    $info = GetBenchmarkInfo($benchmark);
    if (array_key_exists('options', $info) && array_key_exists('median_run', $info['options'])) {
        $median_metric = $info['options']['median_run'];
    }
}
$url = '';
if (array_key_exists('url', $_REQUEST))
    $url = $_REQUEST['url'];
if (array_key_exists('f', $_REQUEST)) {
    $out_data = array();
} else {
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Benchmark trended URL</title>
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
            
            <div class="translucent">
            <div style="clear:both;">
                <div style="float:left;" class="notes">
                    Click on a data point in the chart to see the full test data (waterfall, etc) for the given data point.<br>
                    Highlight an area of the chart to zoom in on that area and double-click to zoom out.
                </div>
                <div style="float: right;">
                    <form name="aggregation" method="get" action="trendurl.php">
                        <?php
                        echo "<input type=\"hidden\" name=\"benchmark\" value=\"" . htmlspecialchars($benchmark) . "\">";
                        echo '<input type="hidden" name="url" value="' . htmlentities($url) . '">';
                        ?>
                        Time Period <select name="days" size="1" onchange="this.form.submit();">
                            <option value="7" <?php if ($days == 7) echo "selected"; ?>>Week</option>
                            <option value="31" <?php if ($days == 31) echo "selected"; ?>>Month</option>
                            <option value="93" <?php if ($days == 93) echo "selected"; ?>>3 Months</option>
                            <option value="183" <?php if ($days == 183) echo "selected"; ?>>6 Months</option>
                            <option value="366" <?php if ($days == 366) echo "selected"; ?>>Year</option>
                            <option value="all" <?php if ($days == 0) echo "selected"; ?>>All</option>
                        </select>
                    </form>
                </div>
            </div>
            <div style="clear:both;">
            </div>
            <script type="text/javascript">
            function SelectedPoint(meta, time, cached) {
                <?php
                echo "var url = \"" . htmlspecialchars($url) . "\";\n";
                echo "var medianMetric=\"" . htmlspecialchars($median_metric) . "\";\n";
                ?>
                var menu = '<div><h4>View test for ' + url + '</h4>';
                var compare = "/video/compare.php?ival=100&medianMetric=" + medianMetric + "&tests=";
                var graph_compare = "/graph_page_data.php?tests=";
                time = parseInt(time / 1000, 10);
                var ok = false;
                if (meta[time] != undefined) {
                    for(i = 0; i < meta[time].length; i++) {
                        ok = true;
                        menu += '<a href="/result/' + meta[time][i]['test'] + '/?medianMetric=' + medianMetric + '" target="_blank">' + meta[time][i]['label'] + '</a><br>';
                        if (i) {
                            compare += ",";
                            graph_compare += ",";
                        }
                            compare += encodeURIComponent(meta[time][i]['test'] + "-l:" + meta[time][i]['label'].replace("-","").replace(":","") + "-c:" + (cached ? 1 : 0));
                            graph_compare += encodeURIComponent(meta[time][i]['test'] + "-l:" + meta[time][i]['label'].replace("-","").replace(":",""));
                    }
                    graph_compare += "&" + (cached ? "rv" : "fv") + "=1";
                    menu += '<br><a href="' + compare + '">Filmstrip Comparison</a>';
                    menu += '<br><a href="' + graph_compare + '">Graph Comparison</a>';
                }
                menu += '</div>';
                if (ok) {
                    $.modal(menu, {overlayClose:true});
                }
            }
            </script>
            <?php
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
                            'browser_version' => 'Browser Version');
            if (!$info['video']) {
                unset($metrics['SpeedIndex']);
            }
            if (array_key_exists('metrics', $info) && is_array($info['metrics'])) {
              foreach ($info['metrics'] as $metric => $label) {
                $metrics[$metric] = $label;
              }
            }
            if (!isset($out_data)) {
                echo "<h1>{$info['title']} - " . htmlspecialchars($url) . "</h1>";
                if (array_key_exists('description', $info))
                    echo "<p>" . htmlspecialchars($info['description']) . "</p>\n";
                echo "<p>Displaying the median run for " . htmlspecialchars($url) . " trended over time</p>";
            }
            foreach( $metrics as $metric => $label) {
                if (!isset($out_data)) {
                    echo "<h2>$label <span class=\"small\">(<a name=\"$metric\" href=\"#$metric\">direct link</a>)</span></h2>\n";
                }
                if ($info['expand'] && count($info['locations'] > 1)) {
                    foreach ($info['locations'] as $location => $label) {
                        if (is_numeric($label))
                            $label = $location;
                        DisplayBenchmarkData($info, $metric, $location, $label);
                    }
                } else {
                    DisplayBenchmarkData($info, $metric);
                }
            }
if (!isset($out_data)) {
            ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
<?php
} else {
    // spit out the raw data
    header ("Content-type: application/json; charset=utf-8");
    echo json_encode($out_data);
}

/**
* Display the charts for the given benchmark/metric
* 
* @param mixed $benchmark
*/
function DisplayBenchmarkData(&$benchmark, $metric, $loc = null, $title = null) {
    global $count;
    global $aggregate;
    global $url;
    global $out_data;
    $bmname = $benchmark['name'];
    if (isset($loc)) {
        $bmname .= ".$loc";
    }
    $chart_title = '';
    if (isset($title))
        $chart_title = "title: \"" . htmlspecialchars($title) . " (First View)\",";
    $tsv = LoadTrendDataTSV($benchmark['name'], 0, $metric, $url, $loc, $annotations, $meta);
    if (isset($out_data)) {
        if (!array_key_exists($bmname, $out_data)) {
            $out_data[$bmname] = array();
        }
        $out_data[$bmname][$metric] = array();
        $out_data[$bmname][$metric]['FV'] = TSVEncode($tsv);
        foreach ($out_data[$bmname][$metric]['FV'] as $index => &$entry) {
          if (is_array($entry) && array_key_exists('time', $entry)) {
            if (array_key_exists($entry['time'], $meta)) {
              $entry['tests'] = array();
              foreach($meta[$entry['time']] as $index => $value) {
                if (is_array($value) &&
                    array_key_exists('label', $value) &&
                    array_key_exists('test', $value)) {
                  $entry['tests'][$value['label']] = $value['test'];
                }
              }
            }
          }
        }
    }
    if (!isset($out_data) && isset($tsv) && strlen($tsv)) {
        $count++;
        $id = "g$count";
        echo "<div class=\"chart-container\"><div id=\"$id\" class=\"benchmark-chart\"></div><div id=\"{$id}_legend\" class=\"benchmark-legend\"></div></div><br>\n";
        echo "<script type=\"text/javascript\">
                var {$id}meta = " . json_encode($meta) . ";
                $id = new Dygraph(
                    document.getElementById(\"$id\"),
                    \"" . str_replace("\t", '\t', str_replace("\n", '\n', $tsv)) . "\",
                    {drawPoints: true,
                    rollPeriod: 1,
                    showRoller: true,
                    labelsSeparateLines: true,
                    colors: ['#ed2d2e', '#008c47', '#1859a9', '#662c91', '#f37d22', '#a11d20', '#b33893', '#010101'],
                    labelsDiv: document.getElementById('{$id}_legend'),
                    pointClickCallback: function(e, p) {SelectedPoint({$id}meta, p.xval, false);},
                    $chart_title
                    legend: \"always\"}
                );";
        if (isset($annotations) && count($annotations)) {
            echo "$id.setAnnotations(" . json_encode($annotations) . ");\n";
        }
        echo "</script>\n";
    }
    if (!array_key_exists('fvonly', $benchmark) || !$benchmark['fvonly']) {
        if (isset($title))
            $chart_title = "title: \"" . htmlspecialchars($title) . " (Repeat View)\",";
        $tsv = LoadTrendDataTSV($benchmark['name'], 1, $metric, $url, $loc, $annotations, $meta);
        if (isset($out_data)) {
            $out_data[$bmname][$metric]['RV'] = TSVEncode($tsv);
            foreach ($out_data[$bmname][$metric]['RV'] as $index => &$entry) {
              if (is_array($entry) && array_key_exists('time', $entry)) {
                if (array_key_exists($entry['time'], $meta)) {
                  $entry['tests'] = array();
                  foreach($meta[$entry['time']] as $index => $value) {
                    if (is_array($value) &&
                        array_key_exists('label', $value) &&
                        array_key_exists('test', $value)) {
                      $entry['tests'][$value['label']] = $value['test'];
                    }
                  }
                }
              }
            }
        }
        if (!isset($out_data) && isset($tsv) && strlen($tsv)) {
            $count++;
            $id = "g$count";
            echo "<br><div class=\"chart-container\"><div id=\"$id\" class=\"benchmark-chart\"></div><div id=\"{$id}_legend\" class=\"benchmark-legend\"></div></div>\n";
            echo "<script type=\"text/javascript\">
                    var {$id}meta = " . json_encode($meta) . ";
                    $id = new Dygraph(
                        document.getElementById(\"$id\"),
                        \"" . str_replace("\t", '\t', str_replace("\n", '\n', $tsv)) . "\",
                        {drawPoints: true,
                        rollPeriod: 1,
                        showRoller: true,
                        labelsSeparateLines: true,
                        colors: ['#ed2d2e', '#008c47', '#1859a9', '#662c91', '#f37d22', '#a11d20', '#b33893', '#010101'],
                        labelsDiv: document.getElementById('{$id}_legend'),
                        pointClickCallback: function(e, p) {SelectedPoint({$id}meta, p.xval, true);},
                        $chart_title
                        legend: \"always\"}
                    );";
            if (isset($annotations) && count($annotations)) {
                echo "$id.setAnnotations(" . json_encode($annotations) . ");\n";
            }
            echo "</script>\n";
        }
    }
}    
?>
