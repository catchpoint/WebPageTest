<?php 
include 'common.inc';
require_once('page_data.inc');
require_once('graph_page_data.inc');
$page_keywords = array('Graph Page Data','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Graph Page Data.";
$chartData = array();
$pageData = loadAllPageData($testPath);
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Graph Page Data</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="author" content="Patrick Meenan">
        <?php $gaTemplate = 'Graph'; include ('head.inc'); ?>
        <style type="text/css">
        h2 {
          text-align: left;
          font-size:  large;
        }
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            include 'header.inc';
            ?>
            
            <div id="result">
            <h1>Test Result Data Plots</h1>
            <?php
            $metrics = array('docTime' => 'Load Time (onload - ms)', 
                            'SpeedIndex' => 'Speed Index',
                            'TTFB' => 'Time to First Byte (ms)', 
                            'render' => 'Time to Start Render (ms)', 
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
                            'browser_version' => 'Browser Version');
            $customMetrics = null;
            $csiMetrics = null;
            $userTimings = null;
            foreach ($pageData as &$pageRun)
              foreach ($pageRun as &$data) {
                if (array_key_exists('userTime', $data))
                  $metrics['userTime'] = 'Last User Timing Mark';
                if (array_key_exists('custom', $data) && is_array($data['custom']) && count($data['custom'])) {
                  if (!isset($customMetrics))
                    $customMetrics = array();
                  foreach ($data['custom'] as $metric) {
                    if (!array_key_exists($metric, $customMetrics))
                      $customMetrics[$metric] = "Custom metric - $metric";
                  }
                }
                foreach($data as $metric => $value) {
                  if (substr($metric, 0, 9) == 'userTime.') {
                    if (!isset($userTimings))
                      $userTimings = array();
                    $userTimings[$metric] = 'User Timing - ' . substr($metric, 9);
                  }
                }
                $timingCount = count($userTimings);
                if (array_key_exists('CSI', $data) && is_array($data['CSI']) && count($data['CSI'])) {
                  if (!isset($csiMetrics))
                    $csiMetrics = array();
                  foreach ($data['CSI'] as $metric) {
                    if (preg_match('/^[0-9\.]+$/', $data["CSI.$metric"]) &&
                        !array_key_exists($metric, $csiMetrics)) {
                      $csiMetrics[$metric] = "CSI - $metric";
                    }
                  }
                }
              }
            if (array_key_exists('testinfo', $test) && !$test['testinfo']['video']) {
                unset($metrics['SpeedIndex']);
            }
            foreach($metrics as $metric => $label) {
                InsertChart($metric, $label);
            }
            if (isset($customMetrics) && is_array($customMetrics) && count($customMetrics)) {
              echo '<h1 id="custom">Custom Metrics</h1>';
              foreach($customMetrics as $metric => $label) {
                InsertChart($metric, $label);
              }
            }
            if (isset($userTimings) && is_array($userTimings) && count($userTimings)) {
              echo '<h1 id="UserTiming"><a href="http://www.w3.org/TR/user-timing/">W3C User Timing marks</a></h1>';
              foreach($userTimings as $metric => $label) {
                InsertChart($metric, $label);
              }
            }
            if (isset($csiMetrics) && is_array($csiMetrics) && count($csiMetrics)) {
              echo '<h1 id="CSI">CSI Metrics</h1>';
              foreach($csiMetrics as $metric => $label) {
                InsertChart("CSI.$metric", $label);
              }
            }
            ?>
            </div>
            
            <?php include('footer.inc'); ?>
            <script type="text/javascript" src="//www.google.com/jsapi"></script>
            <script type="text/javascript">
                <?php
                    $runs = $test['testinfo']['runs'];
                    if (array_key_exists('discard', $test['testinfo'])) {
                        $runs -= $test['testinfo']['discard'];
                    }
                    echo "var chartData = " . json_encode($chartData) . ";\n";
                    echo "var runs = $runs;\n";
                    echo "var fvonly = {$test['testinfo']['fvonly']};\n";
                ?>
                google.load("visualization", "1", {packages:["corechart"]});
                google.setOnLoadCallback(drawChart);
                function drawChart() {
                    for (metric in chartData) {
                      chart_metric = chartData[metric];
                      var data = new google.visualization.DataTable();

                      // We construct the series plotting option, which
                      // depends on each column in chart_metric except the
                      // first.  For simplicity, we extract from all columns
                      // and then drop the first.
                      series = [];
                      for (column in chart_metric['columns']) {
                        chartColumn = chart_metric['columns'][column];
                        data.addColumn('number', chartColumn.label);
                        if (chartColumn.line) {
                          series = series.concat({color: chartColumn.color});
                        } else {
                          series = series.concat({color: chartColumn.color,
                            lineWidth: 0, pointSize: 3});
                        }
                      }
                      series.shift();

                      // Values is a map from run number (1-indexed) to value.
                      for (i = 1; i <= runs; i++) {
                        row = []
                        for (column in chart_metric['columns']) {
                           // If run i is missing, we add a cell with
                            // an undefined array element as a placeholder.
                          cell = chart_metric['columns'][column].values[i];
                          row = row.concat([cell]);

                        }
                        data.addRow(row);
                      }
                      var options = {
                          width: 800,
                          height: 400,
                          lineWidth: 1,
                          hAxis: {gridlines: {count: runs}},
                          series: series
                      }
                      var chart = new google.visualization.LineChart(
                          document.getElementById(chartData[metric].div));
                      chart.draw(data, options);

                    }
                }
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
function InsertChart($metric, $label) {
  global $pageData;
  global $chartData;
  global $test;
  global $median_metric;
  if (array_key_exists('testinfo', $test)) {
    // Write HTML for chart
    $div = "{$metric}Chart";
    $runs = $test['testinfo']['runs'];
    if (array_key_exists('discard', $test['testinfo']))
      $runs -= $test['testinfo']['discard'];
    echo "<h2 id=\"$metric\">" . htmlspecialchars($label) . "</h2>";
    echo "<div id=\"$div\" class=\"chart\"></div>\n";

    // Add data in Chart object to $chartData for later chart construction.
    $chartColumns = array();
    $chartColumns[] = ChartColumn::runs($runs);
    $chartColumnsFirstView = ChartColumn::dataMedianColumns(
      $pageData, 0, $metric, $median_metric, 'blue', 'lightblue', 'First View');
    $fvonly = $test['testinfo']['fvonly'];
    if ($fvonly) {
      $chartColumns = array_merge($chartColumns, $chartColumnsFirstView);
    } else {
      $chartColumnsRepeatView = ChartColumn::dataMedianColumns(
        $pageData, 1, $metric, $median_metric, 'red', 'pink', 'Repeat View');
      $chartColumns = array_merge(
        $chartColumns, $chartColumnsFirstView, $chartColumnsRepeatView);
    }
    $chart = new Chart($div, $chartColumns);
    $chartData[$metric] = $chart;
  }
}
?>
