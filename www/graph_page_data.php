<?php 
$tests = (isset($_REQUEST['tests'])) ? $_REQUEST['tests'] : $_REQUEST['test'];
$statControl = 'None';
if (array_key_exists('control', $_REQUEST)) {
  $statControl = $_REQUEST['control'];
}
$compTests = explode(',', $tests);
$testsId = array();
$testsLabel = array();
foreach($compTests as $t) {
  $parts = explode('-', $t);
  $testsId[] = $parts[0];
  if ((count($parts) == 2) && preg_match("/^l:(.*)/", $parts[1], $matches)) {
    $testsLabel[] = $matches[1];
  } else {
    $testsLabel[] = $parts[0];
  }
}

if (count($testsId) == 1) {
  $_GET['test'] = $testsId[0];
  $_REQUEST['test'] = $testsId[0];
}
include 'common.inc';
include '../lib/PHPStats.phar';
require_once('page_data.inc');
require_once('graph_page_data.inc');
require_once('stat.inc');
$page_keywords = array('Graph Page Data','Webpagetest','Website Speed Test','Page Speed', 'comparison');
$page_description = "Graph Page Data Comparison.";
$chartData = array();

foreach($testsId as $id) {
  RestoreTest($id);
}

# We intend to change to "?tests" but also allow "?test" so as to not break existing links.
# TODO(mgl): Support -l:<label> after the test IDs as in video/compare.php
$testsPath = array_map("GetTestPath", $testsId);
$testsInfo = array_map("GetTestInfo", $testsPath);
$pagesData = array_map("loadAllPageData", $testsPath);

# Whether to show first and/or repeat views.
# Default to showing first view if no views are indicated in the URL.
$views = array();
$rv = (isset($_REQUEST['rv'])) ? $_REQUEST['rv'] : 0;
$fv = (isset($_REQUEST['fv'])) ? $_REQUEST['fv'] : (1 - $rv);
if ($fv) {
  $views[] = 0;
}
if ($rv) {
  $views[] = 1;
}

# Whether to show median run and/or median value
$median_run = (isset($_REQUEST['median_run'])) ? $_REQUEST['median_run'] : 0;
$median_value = (isset($_REQUEST['median_value'])) ? $_REQUEST['median_value']  : 0;


# Remove speed index if none of the runs have video.
$removeSpeedIndex = true;
foreach ( $testsInfo as $testInfo ) {
  if ($testInfo && $testInfo['video']) {
    $removeSpeedIndex = false;
    break;
  }
}

# Color palette taken from benchmarks/view.php
# TODO(mgl): Combine this with the colors in benchmarks/view.php
# TODO(mgl): Have a cleaner way to support more than 8 tests with
# distinct-looking colors.
$colors = array('#ed2d2e', '#008c47', '#1859a9', '#662c91', '#f37d22', '#a11d20', '#b33893', '#010101');
$light_colors = array_map("lighten", $colors);

# Figure out what characteristics will be common to all lines in each graph.
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
            if (count($testsId) == 1) {
              $tab = 'Test Result';
            }
            include 'header.inc';
            ?>
            <div style="float: right;">
                <form name="cached" method="get" action="graph_page_data.php">
                    <?php
                    echo "<input type=\"hidden\" name=\"tests\" value=\"$tests\">";
                    echo "<input type=\"hidden\" name=\"medianMetric\" value=\"$median_metric\">";
                    ?>
                    View: <input type="checkbox" name="fv" value="1"
                        <?php if ($fv == '1') echo "checked"; ?> >First
                    <input type="checkbox" name="rv" value="1"
                        <?php if ($rv == '1') echo "checked"; ?> >Repeat<br>
                    Median: <input type="checkbox" name="median_value" value="1"
                        <?php if ($median_value == '1') echo "checked"; ?> >Of plotted metric
                    <input type="checkbox" name="median_run" value="1"
                        <?php if ($median_run == '1') echo "checked"; ?> >Run with median
                        <?php echo $median_metric; ?> <br>
                    Statistical Comparison Against <select id="control" name="control" size="1" onchange="this.form.submit();">
                    <option value="NOSTAT"<?php if ($statControl === "NOSTAT") echo " selected"; ?>>None</option>
                    <?php
                    foreach ($pagesData as $key=>$pageData) {
                      $selectedString = ((string)$key === $statControl) ? " selected" : "";
                      echo "<option value=\"$key\"$selectedString>" . $testsLabel[$key] . "</option>";
                    }
                    ?>
                    </select>
                    <br>
                    Tests:
                    <?php
                    for ($i = 0; $i < count($testsId); $i++) {
                      echo "<br>";
                      echo $testsId[$i];
                      echo "-l:";
                      echo $testsLabel[$i];
                    }
                    ?>
                    <br>
                    <input type="submit">
                </form>
            </div>

            <div id="result">
            <h1>Test Result Data Plots</h1>
            <?php
            if (count($common_labels) > 0) {
              echo "<h2 style='text-align: center'>${common_label}</h2>";
            }
            ?>
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
            foreach ($pagesData as &$pageData) {
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
            }

            if ($removeSpeedIndex) {
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
                    echo "var chartData = " . json_encode($chartData) . ";\n";
                    echo "var runs = $num_runs;\n";
                ?>
                google.load("visualization", "1", {packages:["corechart", "table"]});
                google.setOnLoadCallback(drawChart);
                function drawChartMetric(chart_metric) {
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
                      legend: (series.length == 1) ? 'none' : 'right',
                      width: 950,
                      height: Math.max(500, series.length * 45),
                      lineWidth: 1,
                      hAxis: {minValue: 1, maxValue: runs, gridlines: {count: runs}},
                      series: series,
                      chartArea: { width: "60%", left: 70, height: "85%" }
                  }
                  var chart = new google.visualization.LineChart(
                      document.getElementById(chart_metric.div));
                  chart.draw(data, options);

                };
                function signifString(pValue) {
                  if (!pValue) {
                    return "";
                  } else if (pValue < 0.05) {
                    return "TRUE";
                  } else {
                    return "FALSE";
                  }
                }
                function drawTableMetric(compareData) {
                  var data = new google.visualization.DataTable();
                  var selectEl = document.getElementById("control");
                  var selectId = selectEl.options[selectEl.selectedIndex].value;
                  data.addColumn('string', 'Variant');
                  data.addColumn('number', 'Count');
                  data.addColumn('string', 'Mean +/- 95% Conf. Int');
                  data.addColumn('number', 'Diff of mean from ' + compareData.compareFrom[selectId].confData.label);
                  data.addColumn('number', 'p-value (2-tailed)');
                  data.addColumn('string', 'Significant?');
                  for (index in compareData.compareFrom) {
                    confData = compareData.compareFrom[index].confData;
                    diff = compareData.compareFrom[index].diff;
                    pValue = compareData.compareFrom[index].pValue,
                    pDisplay = pValue ? ((diff > 0) ? 2 * pValue : 2 * (1 - pValue)) : null;
                    meanDisplay = confData.mean.toPrecision(6) + ' +/- ' +
                      confData.ciHalfWidth.toPrecision(6)
                    data.addRow([
                      confData.label,
                      confData.n,
                      meanDisplay,
                      diff,
                      pDisplay,
                      signifString(pDisplay)]);
                  }
                  var table = new google.visualization.Table(document.getElementById(compareData.div));
                  var formatter = new google.visualization.NumberFormat(
                    {'fractionDigits': 3});
                  formatter.format(data, 3);
                  formatter.format(data, 4);
                  table.draw(data);
                };
                function drawChart() {
                  for (metric in chartData) {
                    chart_metric = chartData[metric];
                    drawChartMetric(chart_metric);
                    if (chart_metric.compareData.length > 0) {
                      for (index in chart_metric.compareData) {
                        drawTableMetric(chart_metric.compareData[index]);
                      }
                    }
                  }
                };
            </script>
        </div>
    </body>
</html>

<?php

function compareFrom() {
}

/**
 * InsertChart adds a chart for the given $metric, with the given $label, to
 * global $chartData, and outputs the HTML container elements for the chart.
 *
 * @param string $metric Metric to add
 * @param string $label Label corresponding to metric
 */
function InsertChart($metric, $label) {
  global $chartData;
  global $num_runs;
  global $views;
  global $colors;
  global $light_colors;
  global $median_metric;
  global $pagesData;
  global $testsInfo;
  global $testsId;
  global $testsLabel;
  global $median_value;
  global $median_run;
  global $statControl;
  // Write HTML for chart
  $div = "{$metric}Chart";
  $num_runs = max(array_map("numRunsFromTestInfo", $testsInfo));
  echo "<h2 id=\"$metric\">" . htmlspecialchars($label) . "</h2>";
  if (!$testsInfo) {
    return;
  }
  $chartColumns = array(ChartColumn::runs($num_runs));
  $compareChart = array();
  $view_index = 0;
  foreach ($views as $cached) {
    $statValues = array();
    $statLabels = array();
    $compareData = NULL;
    foreach ($pagesData as $key=>$pageData) {
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
      $chartColumnsAdd = ChartColumn::dataMedianColumns($pageData, $cached,
        $metric, $median_metric, $colors[$view_index], $light_colors[$view_index], $labels,
        $num_runs, $median_run, $median_value);
      $chartColumns = array_merge($chartColumns, $chartColumnsAdd);
      $view_index++;

      // Prepare statistical comparison
      if (($statControl !== 'NOSTAT') && (count($pagesData) >= 1)) {
        $statValues[] = values($pageData, $cached, $metric, true);
        $statLabels[] = implode(" ", $labels);
      }
    }
    if (($statControl !== 'NOSTAT') && (count($pagesData) >= 1)) {
      if (count($statValues[$statControl]) > 0) {
        $statDiv = "{$metric}Stat{$cached}";
        $compareFrom = array();

        // Populate compareFrom for the statistical control
        $confData = ci($statLabels[$statControl], $statValues[$statControl]);
        $compareFrom[$statControl] = new CompareFrom($confData, NULL, NULL);
        foreach ($pagesData as $key=>$pageData) {
          if ($key == $statControl) {
            continue;
          }
          if (count($statValues[$key]) == 0) {
            continue;
          }

          // Populate compareFrom for $key
          $confData = ci($statLabels[$key], $statValues[$key]);
          $pValue = \PHPStats\StatisticalTests::twoSampleTTest($statValues[$statControl], $statValues[$key]);
          $diff = $confData->mean - $compareFrom[$statControl]->confData->mean;
          $compareFrom[$key] = new CompareFrom($confData, $diff, $pValue);
        }
        $compareChart[] = new CompareData($statDiv, $compareFrom);
        echo "<div id=\"$statDiv\"></div>\n";
      }
    }
  }
  $chart = new Chart($div, $chartColumns, $compareChart);
  $chartData[$metric] = $chart;
  echo "<div id=\"$div\" class=\"chart\"></div>\n";
}
?>
