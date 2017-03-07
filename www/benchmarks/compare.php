<?php
set_time_limit(600);
chdir('..');
include 'common.inc';
require_once('./benchmarks/data.inc.php');
$page_keywords = array('Benchmarks','Webpagetest','Website Speed Test','Page Speed');
$page_description = "WebPagetest benchmark test comparison";
$benchmarks = GetBenchmarks();
$bmData = array();
$count = 0;
$offset = 0;
if (array_key_exists('offset', $_REQUEST)) {
  $offset -= intval($_REQUEST['offset']) * 60;
}
foreach ($benchmarks as &$benchmark) {
  $entry = array();
  $entry['title'] = array_key_exists('title', $benchmark) && strlen($benchmark['title']) ? $benchmark['title'] : $benchmark['name'];
  $entry['configurations'] = array();
  foreach ($benchmark['configurations'] as $name => &$config) {
    $entry['configurations'][$name] = array();
    $entry['configurations'][$name]['title'] = htmlspecialchars(array_key_exists('title', $config) && strlen($config['title']) ? $config['title'] : $name);
    $entry['configurations'][$name]['video'] = array_key_exists('settings', $config) && array_key_exists('video', $config['settings']) && $config['settings']['video'] ? true : false;
    $entry['configurations'][$name]['locations'] = array();
    foreach ($config['locations'] as $location)
      $entry['configurations'][$name]['locations'][] = htmlspecialchars($location);
  }
  $bmData[$benchmark['name']] = $entry;
}
$configs = null;
$has_video = true;
if (array_key_exists('configs', $_REQUEST)) {
  $parts = explode(',', $_REQUEST['configs']);
  foreach ($parts as $encoded) {
    list($benchmark, $config, $location, $time) = explode('~', $encoded);
    if (array_key_exists($benchmark, $bmData) &&
        array_key_exists($config, $bmData[$benchmark]['configurations'])) {
      $entry = array('benchmark' => $benchmark,
                     'config' => $config,
                     'title' => $bmData[$benchmark]['configurations'][$config]['title'],
                     'location' => $location,
                     'time' => $time,
                     'date' => date('M j Y h:i', $time + $offset));
      if (!$bmData[$benchmark]['configurations'][$config]['video'])
        $has_video = false;
      $configs[] = $entry;
      if (isset($common)) {
        foreach($common as $key => $value) {
          if ($entry[$key] !== $value)
            unset($common[$key]);
        }
      } else {
        $common = $entry;
      }
        }
  }
  $baseline = '';
  if (count($common)) {
    if (array_key_exists('benchmark', $common))
      $baseline .= ' benchmark ' . $common['benchmark'];
    if (array_key_exists('title', $common)) {
      if (strlen($baseline))
        $baseline .= ',';
      $baseline .= ' ' . $common['title'];
    }
    if (array_key_exists('location', $common))
      $baseline .= $common['location'];
    if (array_key_exists('date', $common))
      $baseline .= ' on' . $common['location'];
  }
  $comparing = '';
  $series = array();
  foreach ($configs as &$config) {
    $label = '';
    if (!array_key_exists('benchmark', $common))
      $label .= $config['benchmark'];
    if (!array_key_exists('title', $common))
      $label .= strlen($label) ? ' ' . $config['title'] : $config['title'];
    if (!array_key_exists('location', $common))
      $label .= strlen($label) ? ' ' . $config['location'] : $config['location'];
    if (!array_key_exists('date', $common))
      $label .= strlen($label) ? ' ' . $config['date'] : $config['date'];
    $config['label'] = $label;
    $series[] = array('name' => $label);
    $comparing .= strlen($comparing) ? ' to ' . $label : $label;
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
if (!$has_video)
  unset($metrics['SpeedIndex']);
foreach ($benchmarks as &$benchmark) {
  if (array_key_exists('metrics', $benchmark) && is_array($benchmark['metrics'])) {
    foreach ($benchmark['metrics'] as $metric => $label) {
      $metrics[$metric] = $label;
    }
  }
}
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Benchmark test comparison</title>
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
        .dygraph-axis-label-x {display:none;}
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
              echo '<h2>Comparing: ' . htmlspecialchars($comparing) . '<br>From: ' . htmlspecialchars($baseline) . '</h2>';
            ?>
            <div style="clear:both;">
                <div style="float:left;" class="notes">
                    Click on a data point in the chart to see the full test data (waterfall, etc) for the given data point.<br>
                    Highlight an area of the chart to zoom in on that area and double-click to zoom out.
                </div>
            </div>
            <div style="clear:both;">
            <br>
            </div>
            <div style="text-align:center; clear:both;">
                <script type="text/javascript">
                    var charts = new Array();
                    <?php
                    echo 'var seriesData = ' . json_encode($series) . ";\n";
                    ?>
                    function ToggleSeries(checked, series) {
                        setTimeout('ToggleSeriesDelayed(' + checked + ',' + series + ');', 1);
                    }
                    function ToggleSeriesDelayed(checked,series) {
                        for(i=0; i < charts.length; i++) {
                            eval(charts[i] + '.setVisibility(' + series + ',' + checked + ');');
                        }
                    }
                    function SelectedPoint(url, tests, series, index, cached) {
                        <?php
                            echo 'var benchmark="' . htmlspecialchars($benchmark) . "\";\n";
                            echo 'var medianMetric="' . htmlspecialchars($median_metric) . "\";\n";
                        ?>
                        var menu = '<div><h4>View test for ' + url + '</h4>';
                        var compare = "/video/compare.php?ival=100&medianMetric=" + medianMetric + "&tests=";
                        var graph_compare = "/graph_page_data.php?tests=";
                        for( i = 0; i < tests.length; i++ ) {
                            menu += '<a href="/result/' + tests[i] + '/?medianMetric=' + medianMetric + '" target="_blank">' + seriesData[i].name + '</a><br>';
                            if (i) {
                                compare += ",";
                                graph_compare += ",";
                            }
                            compare += encodeURIComponent(tests[i] + "-l:" + seriesData[i].name.replace("-","").replace(":","") + "-c:" + (cached ? 1 : 0));
                            graph_compare += encodeURIComponent(tests[i] + "-l:" + seriesData[i].name.replace("-","").replace(":",""));
                        }
                        graph_compare += "&" + (cached ? "rv" : "fv") + "=1";
                        menu += '<br><a href="' + compare + '">Filmstrip Comparison</a>';
                        menu += '<br><a href="' + graph_compare + '">Graph Comparison</a>';
                        menu += '</div>';
                        $.modal(menu, {overlayClose:true});
                    }
                </script>
            </div>
            <?php
            foreach( $metrics as $metric => $label) {
                echo "<h2>" . htmlspecialchars($label) . " <span class=\"small\">(<a name=\"" . htmlspecialchars($metric) . "\" href=\"#" . htmlspecialchars($metric) . "\">direct link</a>)</span></h2>\n";
                DisplayBenchmarkData($metric);
            }
            ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
<?php
function DisplayBenchmarkData($metric) {
  global $count;
  global $configs;
  for ($cached = 0; $cached <= 1; $cached++) {
    $tsv = LoadTestComparisonTSV($configs, $cached, $metric, $meta);
    if (isset($tsv) && strlen($tsv)) {
        $count++;
        $id = "g$count";
        echo "<div class=\"chart-container\"><div id=\"$id\" class=\"benchmark-chart\"></div><div id=\"{$id}_legend\" class=\"benchmark-legend\"></div></div><br>\n";
        echo "<script type=\"text/javascript\">
                var {$id}meta = " . json_encode($meta) . ";
                $id = new Dygraph(
                    document.getElementById(\"$id\"),
                    \"" . str_replace("\t", '\t', str_replace("\n", '\n', $tsv)) . "\",
                    {drawPoints: true,
                    strokeWidth: 0.0,
                    labelsSeparateLines: true,
                    labelsDiv: document.getElementById('{$id}_legend'),
                    colors: ['#ed2d2e', '#008c47', '#1859a9', '#662c91', '#f37d22', '#a11d20', '#b33893', '#010101'],
                    axes: {x: {valueFormatter: function(urlid) {return {$id}meta[urlid].url;}}},
                    pointClickCallback: function(e, p) {SelectedPoint({$id}meta[p.xval].url, {$id}meta[p.xval]['tests'], p.name, p.xval, $cached);},
                    legend: \"always\"}
                );
                charts.push('$id');";
        if (isset($annotations) && count($annotations)) {
            echo "$id.setAnnotations(" . json_encode($annotations) . ");\n";
        }
        echo "</script>\n";
    }
  }
}    
?>
