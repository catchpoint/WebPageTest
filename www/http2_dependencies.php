<?php
include 'common.inc';
require_once('object_detail.inc');
require_once('page_data.inc');
require_once('draw.inc');
require_once('contentColors.inc');
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestRunResults.php';

// not functional; just to declare what to expect from common.inc
global $testPath, $run, $cached, $step, $id, $url, $test;
$testInfo = TestInfo::fromFiles($testPath);
$testStepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);
$requests = $testStepResult->getRequests();
$connections = array();
$streams = array();
$parents = array();
$styles = array();

$row_data = array();
foreach ($requests as $request) {
  if (isset($request['socket']) &&
      isset($request['http2_stream_id']) &&
      isset($request['host']) &&
      isset($request['url'])) {
    $connection = strval($request['socket']);

    if (!isset($connections[$connection])) {
      // Create the root entry for this connection
      $connections[$connection] = $request['host'];
      $label = $request['host'];
      if (isset($request['ip_addr']))
        $label .= "<br>({$request['ip_addr']})";
      $tooltip = $request['host'];
      $data = array("v" => $connection, "f" => $label);
      $row = array($data, "", $tooltip);
      $row_data[] = $row;
    }

    // Create the row entry for the request
    $parent = $connection;
    if (isset($request['http2_stream_dependency']) && $request['http2_stream_dependency'] != 0) {
      $parent = "$connection:{$request['http2_stream_dependency']}";
      $parents[$parent] = $connection;
    }
    $stream = strval($request['http2_stream_id']);
    $id = "$connection:$stream";
    $label = isset($request['number']) ? "{$request['number']}: " : "";
    $label .= get_short_path($request['url']);
    $label .= "<br>stream: $stream";
    if (isset($request['http2_stream_weight'])) {
      $label .= ", weight: {$request['http2_stream_weight']}";
      if (isset($request['http2_stream_exclusive']) && $request['http2_stream_exclusive'])
        $label .= 'x';
    }
    $tooltip = isset($request['full_url']) ? $request['full_url'] : 'https://' . $request['host'] . $request['url'];
    $data = array("v" => $id, "f" => $label);
    $row = array($data, $parent, $tooltip);
    $row_data[] = $row;
    $streams[$id] = $id;

    // Set the coloring for the cell
    $row_num = strval(count($row_data) - 1);
    $style = "";
    $color = NULL;
    if (isset($request['contentType'])) {
      $color = GetMimeColor($request['contentType'], $request['url']);
      $light_color = ScaleRgb($color, 0.65);
      $border_color = sprintf("#%02x%02x%02x", $color[0], $color[1], $color[2]);
      $css_color = sprintf("#%02x%02x%02x", $light_color[0], $light_color[1], $light_color[2]);
      $style = "border-color: $border_color; background-color: $css_color;";
    }
    if (strlen($style)) {
      $styles[$row_num] = $style;
    }
  }
}

// Go through all parents and ensure nodes exist for each.
foreach ($parents as $id => $connection) {
  if (!isset($streams[$id])) {
    // special-case the Firefox ghost streams
    if ($id == "$connection:3") {
      $row_data[] = array(array("v" => $id, "f" => "leader<br>weight: 200"), $connection, "leader");
    } elseif ($id == "$connection:5") {
      $row_data[] = array(array("v" => $id, "f" => "other<br>weight: 100"), $connection, "other");
    } elseif ($id == "$connection:7") {
      $row_data[] = array(array("v" => $id, "f" => "background"), $connection, "background");
    } elseif ($id == "$connection:9") {
      $row_data[] = array(array("v" => $id, "f" => "speculative"), "$connection:7", "speculative");
      if (!isset($streams["$connection:7"])) {
        $row_data[] = array(array("v" => "$connection:7", "f" => "background"), $connection, "background");
        $streams["$connection:7"] = "$connection:7";
      }
    } elseif ($id == "$connection:11") {
      $row_data[] = array(array("v" => $id, "f" => "follower"), "$connection:3", "follower");
      if (!isset($streams["$connection:3"])) {
        $row_data[] = array(array("v" => "$connection:3", "f" => "leader"), $connection, "leader");
        $streams["$connection:3"] = "$connection:3";
      }
    } elseif ($id == "$connection:13") {
      $row_data[] = array(array("v" => $id, "f" => "urgentStart<br>weight: 240"), $connection, "urgentStart");
    } else {
      // Create an empty stream on the connection
      $row_data[] = array(array("v" => $id, "f" => "group"), $connection, "group");
    }
  }
  $streams[$id] = $id;
}

function get_short_path($path) {
  $separator = strpos($path, '?');
  if ($separator) {
    $path = substr($path, 0, $separator);
  }
  $base = basename($path);
  if (strlen($base) > 0)
    $path = $base;
  if (strlen($path) > 30) {
    $path = '...' . substr($path, -27);
  }
  return $path;
}

?>
<!DOCTYPE html>
<html>
    <head>
    <style type="text/css">
      .chart_node {
          text-align: center;
          vertical-align: middle;
          font-family: arial,helvetica;
          cursor: default;
          border: 2px solid #b5d9ea;
          background-color: #edf7ff;
          white-space: nowrap;
      }
    </style>
    <script src="https://www.gstatic.com/charts/loader.js"></script>
    <script>
      google.charts.load('current', {packages:["orgchart"]});
      google.charts.setOnLoadCallback(drawChart);

      function drawChart() {
        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Name');
        data.addColumn('string', 'Parent');
        data.addColumn('string', 'ToolTip');

        <?php
        // Add the actual chart data
        echo 'data.addRows(' . json_encode($row_data) . ");\n";

        // Add the node-specific styles
        foreach($styles as $row_num => $style) {
          echo "data.setRowProperty($row_num, 'style', '$style');\n";
        }
        ?>

        var chart = new google.visualization.OrgChart(document.getElementById('chart_div'));
        chart.draw(data, {allowHtml:true, allowCollapse:false, nodeClass:'chart_node'});
      }
    </script>
    </head>
    <body>
    <div id="chart_div"></div>
    </body>
</html>
