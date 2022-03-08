<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
require_once('breakdown.inc');
require_once('contentColors.inc');
require_once('waterfall.inc');
require_once('page_data.inc');

$page_keywords = array('Timeline Breakdown','WebPageTest','Website Speed Test','Page Speed');
$page_description = "Chrome main-thread processing breakdown$testLabel";

?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title><?php echo $page_title; ?> - WebPageTest Content Breakdown</title>
        <script>document.documentElement.classList.add('has-js');</script>

        <?php $gaTemplate = 'Content Breakdown'; include ('head.inc'); ?>
       
    </head>
    <body class="result">
            <?php
            $tab = 'Test Result';
            $subtab = 'Processing';
            include 'header.inc';
            $processing = GetDevToolsCPUTime($testPath, $run, $cached);
            if (isset($processing)) {
              arsort($processing);
              $mapping = array('EvaluateScript' => 'Scripting',
                               'v8.compile' => 'Scripting',
                               'FunctionCall' => 'Scripting',
                               'GCEvent' => 'Scripting',
                               'TimerFire' => 'Scripting',
                               'EventDispatch' => 'Scripting',
                               'TimerInstall' => 'Scripting',
                               'TimerRemove' => 'Scripting',
                               'XHRLoad' => 'Scripting',
                               'XHRReadyStateChange' => 'Scripting',
                               'MinorGC' => 'Scripting',
                               'MajorGC' => 'Scripting',
                               'FireAnimationFrame' => 'Scripting',
                               'ThreadState::completeSweep' => 'Scripting',
                               'Heap::collectGarbage' => 'Scripting',
                               'ThreadState::performIdleLazySweep' => 'Scripting',

                               'Layout' => 'Layout',
                               'UpdateLayoutTree' => 'Layout',
                               'RecalculateStyles' => 'Layout',
                               'ParseAuthorStyleSheet' => 'Layout',
                               'ScheduleStyleRecalculation' => 'Layout',
                               'InvalidateLayout' => 'Layout',

                               'Paint' => 'Painting',
                               'DecodeImage' => 'Painting',
                               'Decode Image' => 'Painting',
                               'ResizeImage' => 'Painting',
                               'CompositeLayers' => 'Painting',
                               'Rasterize' => 'Painting',
                               'PaintImage' => 'Painting',
                               'PaintSetup' => 'Painting',
                               'ImageDecodeTask' => 'Painting',
                               'GPUTask' => 'Painting',
                               'SetLayerTreeId' => 'Painting',
                               'layerId' => 'Painting',
                               'UpdateLayer' => 'Painting',
                               'UpdateLayerTree' => 'Painting',
                               'Draw LazyPixelRef' => 'Painting',
                               'Decode LazyPixelRef' => 'Painting',

                               'ParseHTML' => 'Loading',
                               'ResourceReceivedData' => 'Loading',
                               'ResourceReceiveResponse' => 'Loading',
                               'ResourceSendRequest' => 'Loading',
                               'ResourceFinish' => 'Loading',
                               'CommitLoad' => 'Loading',

                               'Idle' => 'Idle');
              $groups = array('Scripting' => 0, 'Layout' => 0, 'Painting' => 0, 'Loading' => 0, 'Other' => 0, 'Idle' => 0);
              $groupColors = array('Scripting' => '#f1c453',
                                   'Layout' => '#9a7ee6',
                                   'Painting' => '#71b363',
                                   'Loading' => '#70a2e3',
                                   'Other' => '#f16161',
                                   'Idle' => '#cbd1d9');
              if (!array_key_exists('Idle', $processing))
                $processing['Idle'] = 0;
              foreach ($processing as $type => $time) {
                $group = 'Other';
                if (array_key_exists($type, $mapping))
                  $group = $mapping[$type];
                $groups[$group] += $time;
              }
            }
            ?>

<div class="results_main_contain">
            <div class="results_main">

            <div class="results_and_command">

            <div class="results_header">
                <h2>Main-thread Processing</h2>
                <p>Where the browser's main thread was busy, not including idle time waiting for resources <?php
                      echo " (<a href=\"/timeline/" . VER_TIMELINE . "timeline.php?test=$id&run=$run&cached=$cached\" title=\"View Chrome Dev Tools Timeline\">view timeline</a>)";
                    ?>.</p>
            </div>


            </div>

            <div id="result" class="results_body">
              <h3 class="hed_sub">Processing Breakdown</h3>

          
          
          <div class="breakdownFrame">
            <div class="breakdownFrame_item">
              <div id="pieGroups" ></div>
              <div class="table visualization_table" id="tableGroups" ></div>
            </div>
            <div class="breakdownFrame_item">
              <div id="pieEvents" ></div>
              <div class="table visualization_table" id="tableEvents"></div>
            </div>
          </div>

          <h3 class="hed_sub">Timing Breakdown</h3>

          <p>All of the main-thread activity including idle (waiting for resources usually) <?php
                      echo " (<a href=\"/timeline/" . VER_TIMELINE . "timeline.php?test=$id&run=$run&cached=$cached\" title=\"View Chrome Dev Tools Timeline\">view timeline</a>)";
                    ?>.</p>
          

          <div class="breakdownFrame">
          <div class="breakdownFrame_item">
            <div id="pieGroupsIdle" ></div>
            <div class="table visualization_table" id="tableGroupsIdle"></div>
          </div>
          <div class="breakdownFrame_item">
            <div id="pieEventsIdle"></div>
            <div class="table visualization_table" id="tableEventsIdle"></div>
          </div>
          </div>
          </div>


            
        </div>
        <?php include('footer.inc'); ?>
        </div></div></div>

        <!--Load the AJAX API-->
        <script src="//www.google.com/jsapi"></script>
        <script>

        // Load the Visualization API and the table package.
        google.load('visualization', '1', {'packages':['table', 'corechart']});
        google.setOnLoadCallback(drawTable);
        function drawTable() {
            var groups = new google.visualization.DataTable();
            groups.addColumn('string', 'Category');
            groups.addColumn('number', 'Time (ms)');
            groups.addRows(<?php echo (count($groups) - 1); ?>);
            var groupColors = new Array();

            var events = new google.visualization.DataTable();
            events.addColumn('string', 'Event');
            events.addColumn('number', 'Time (ms)');
            events.addRows(<?php echo (count($processing) - 1); ?>);
            var eventColors = new Array();
            <?php
            $index = 0;
            if (isset($groups) && is_array($groups) && count($groups)) {
              foreach($groups as $type => $time)
              {
                if ($type != 'Idle') {
                  echo "groups.setValue($index, 0, '$type');\n";
                  echo "groups.setValue($index, 1, $time);\n";
                  $color = $groupColors[$type];
                  echo "groupColors.push('$color');\n";
                  $index++;
                }
              }
            }
            $index = 0;
            if (isset($processing) && is_array($processing) && count($processing)) {
              foreach($processing as $type => $time) {
                if ($type != 'Idle') {
                  echo "events.setValue($index, 0, '$type');\n";
                  echo "events.setValue($index, 1, $time);\n";
                  $group = 'Other';
                  if (array_key_exists($type, $mapping))
                    $group = $mapping[$type];
                  $color = $groupColors[$group];
                  echo "eventColors.push('$color');\n";
                  $index++;
                }
              }
            }
            ?>
            var viewGroups = new google.visualization.DataView(groups);
            viewGroups.setColumns([0, 1]);

            var tableGroups = new google.visualization.Table(document.getElementById('tableGroups'));
            tableGroups.draw(viewGroups, {showRowNumber: false, sortColumn: 1, sortAscending: false});

            var pieGroups = new google.visualization.PieChart(document.getElementById('pieGroups'));
            pieGroups.draw(viewGroups, {width: 450, height: 300, title: 'Processing Categories', colors: groupColors});


            var viewEvents = new google.visualization.DataView(events);
            viewEvents.setColumns([0, 1]);

            var tableEvents = new google.visualization.Table(document.getElementById('tableEvents'));
            tableEvents.draw(viewEvents, {showRowNumber: false, sortColumn: 1, sortAscending: false});

            var pieEvents = new google.visualization.PieChart(document.getElementById('pieEvents'));
            pieEvents.draw(viewEvents, {width: 450, height: 300, title: 'Processing Events', colors: eventColors});


            var groupsIdle = new google.visualization.DataTable();
            groupsIdle.addColumn('string', 'Category');
            groupsIdle.addColumn('number', 'Time (ms)');
            groupsIdle.addRows(<?php echo count($groups); ?>);
            var groupColors = new Array();

            var eventsIdle = new google.visualization.DataTable();
            eventsIdle.addColumn('string', 'Event');
            eventsIdle.addColumn('number', 'Time (ms)');
            eventsIdle.addRows(<?php echo count($processing); ?>);
            var eventColors = new Array();
            <?php
            $index = 0;
            if (isset($groups) && is_array($groups) && count($groups)) {
              foreach($groups as $type => $time)
              {
                  echo "groupsIdle.setValue($index, 0, '$type');\n";
                  echo "groupsIdle.setValue($index, 1, $time);\n";
                  $color = $groupColors[$type];
                  echo "groupColors.push('$color');\n";
                  $index++;
              }
            }
            $index = 0;
            if (isset($processing) && is_array($processing) && count($processing)) {
              foreach($processing as $type => $time)
              {
                  echo "eventsIdle.setValue($index, 0, '$type');\n";
                  echo "eventsIdle.setValue($index, 1, $time);\n";
                  $group = 'Other';
                  if (array_key_exists($type, $mapping))
                    $group = $mapping[$type];
                  $color = $groupColors[$group];
                  echo "eventColors.push('$color');\n";
                  $index++;
              }
            }
            ?>
            var viewGroupsIdle = new google.visualization.DataView(groupsIdle);
            viewGroupsIdle.setColumns([0, 1]);

            var tableGroupsIdle = new google.visualization.Table(document.getElementById('tableGroupsIdle'));
            tableGroupsIdle.draw(viewGroupsIdle, {showRowNumber: false, sortColumn: 1, sortAscending: false});

            var pieGroupsIdle = new google.visualization.PieChart(document.getElementById('pieGroupsIdle'));
            pieGroupsIdle.draw(viewGroupsIdle, {width: 450, height: 300, title: 'Processing Categories', colors: groupColors});


            var viewEventsIdle = new google.visualization.DataView(eventsIdle);
            viewEventsIdle.setColumns([0, 1]);

            var tableEventsIdle = new google.visualization.Table(document.getElementById('tableEventsIdle'));
            tableEventsIdle.draw(viewEventsIdle, {showRowNumber: false, sortColumn: 1, sortAscending: false});

            var pieEventsIdle = new google.visualization.PieChart(document.getElementById('pieEventsIdle'));
            pieEventsIdle.draw(viewEventsIdle, {width: 450, height: 300, title: 'Processing Events', colors: eventColors});
        }
        </script>
    </body>
</html>

<?php
function rgb2html($r, $g=-1, $b=-1)
{
    if (is_array($r) && sizeof($r) == 3)
        list($r, $g, $b) = $r;

    $r = intval($r); $g = intval($g);
    $b = intval($b);

    $r = dechex($r<0?0:($r>255?255:$r));
    $g = dechex($g<0?0:($g>255?255:$g));
    $b = dechex($b<0?0:($b>255?255:$b));

    $color = (strlen($r) < 2?'0':'').$r;
    $color .= (strlen($g) < 2?'0':'').$g;
    $color .= (strlen($b) < 2?'0':'').$b;
    return '#'.$color;
}
?>
