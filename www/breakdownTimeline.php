<?php
include 'common.inc';
require_once('breakdown.inc');
require_once('contentColors.inc');
require_once('waterfall.inc');
require_once('page_data.inc');

$page_keywords = array('Timeline Breakdown','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Chrome main thread processing breakdown$testLabel";

?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest Content Breakdown<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Content Breakdown'; include ('head.inc'); ?>
        <style type="text/css">
            td {
                text-align:left; 
                vertical-align:top;
                padding:1em;
            }

            div.bar {
                height:12px; 
                margin-top:auto; 
                margin-bottom:auto;
            }
            
            div.table {
              margin-left: auto;
              margin-right: auto;
            }

            td.legend {
                white-space:nowrap; 
                text-align:left; 
                vertical-align:top; 
                padding:0;
            }
            
            th.header {
              font-weight: normal;
            }
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Processing Breakdown';
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
            
            <table align="center">
                <tr>
                    <th class="header" colspan="2">
                    <h2>Main thread processing breakdown</h2>
                    Where the browser's main thread was busy, not including idle time waiting for resources <?php
                      echo " (<a href=\"/timeline/" . VER_TIMELINE . "timeline.php?test=$id&run=$run&cached=$cached\" title=\"View Chrome Dev Tools Timeline\">view timeline</a>)";
                    ?>.
                    </th>
                </tr>
                <tr>
                    <td>
                        <div id="pieGroups" style="width:450px; height:300px;"></div>
                    </td>
                    <td>
                        <div id="pieEvents" style="width:450px; height:300px;"></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="table" id="tableGroups" style="width: 200px;"></div>
                    </td>
                    <td>
                        <div class="table" id="tableEvents" style="width: 400px;"></div>
                    </td>
                </tr>
                <tr>
                    <th class="header" colspan="2">
                    <h2>Main thread time breakdown</h2>
                    All of the main thread activity including idle (waiting for resources usually) <?php
                      echo " (<a href=\"/timeline/" . VER_TIMELINE . "timeline.php?test=$id&run=$run&cached=$cached\" title=\"View Chrome Dev Tools Timeline\">view timeline</a>)";
                    ?>.
                    </th>
                </tr>
                <tr>
                    <td>
                        <div id="pieGroupsIdle" style="width:450px; height:300px;"></div>
                    </td>
                    <td>
                        <div id="pieEventsIdle" style="width:450px; height:300px;"></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="table" id="tableGroupsIdle" style="width: 200px;"></div>
                    </td>
                    <td>
                        <div class="table" id="tableEventsIdle" style="width: 400px;"></div>
                    </td>
                </tr>
            </table>
        </div>
        
        <?php include('footer.inc'); ?>

        <!--Load the AJAX API-->
        <script type="text/javascript" src="<?php echo $GLOBALS['ptotocol']; ?>://www.google.com/jsapi"></script>
        <script type="text/javascript">
    
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
            $index = 0;
            foreach($processing as $type => $time)
            {
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
            ?>
            var viewGroups = new google.visualization.DataView(groups);
            viewGroups.setColumns([0, 1]);
            
            var tableGroups = new google.visualization.Table(document.getElementById('tableGroups'));
            tableGroups.draw(viewGroups, {showRowNumber: false, sortColumn: 1, sortAscending: false});

            var pieGroups = new google.visualization.PieChart(document.getElementById('pieGroups'));
            google.visualization.events.addListener(pieGroups, 'ready', function(){markUserTime('aft.Groups Pie');});
            pieGroups.draw(viewGroups, {width: 450, height: 300, title: 'Processing Categories', colors: groupColors});

            
            var viewEvents = new google.visualization.DataView(events);
            viewEvents.setColumns([0, 1]);
            
            var tableEvents = new google.visualization.Table(document.getElementById('tableEvents'));
            tableEvents.draw(viewEvents, {showRowNumber: false, sortColumn: 1, sortAscending: false});

            var pieEvents = new google.visualization.PieChart(document.getElementById('pieEvents'));
            google.visualization.events.addListener(pieEvents, 'ready', function(){markUserTime('aft.Events Pie');});
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
            foreach($groups as $type => $time)
            {
                echo "groupsIdle.setValue($index, 0, '$type');\n";
                echo "groupsIdle.setValue($index, 1, $time);\n";
                $color = $groupColors[$type];
                echo "groupColors.push('$color');\n";
                $index++;
            }
            $index = 0;
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