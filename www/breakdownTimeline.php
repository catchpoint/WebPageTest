<?php
include 'common.inc';
include 'breakdown.inc';
require_once('contentColors.inc');
include 'waterfall.inc';
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
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Processing Breakdown';
            include 'header.inc';
            $progress = GetVisualProgress($testPath, $run, $cached);
            if (isset($progress) &&
                is_array($progress) &&
                array_key_exists('DevTools', $progress) &&
                is_array($progress['DevTools']) &&
                array_key_exists('processing', $progress['DevTools']))
              $processing = $progress['DevTools']['processing'];
            if (isset($processing)) {
              arsort($processing);
              $mapping = array('EvaluateScript' => 'Scripting',
                               'FunctionCall' => 'Scripting',
                               'GCEvent' => 'Scripting',
                               'TimerFire' => 'Scripting',
                               'Layout' => 'Rendering',
                               'RecalculateStyles' => 'Rendering',
                               'Paint' => 'Painting',
                               'DecodeImage' => 'Painting',
                               'ResizeImage' => 'Painting',
                               'CompositeLayers' => 'Painting',
                               'ResourceReceivedData' => 'Loading',
                               'ParseHTML' => 'Loading',
                               'ResourceReceiveResponse' => 'Loading');
              $groups = array('Scripting' => 0, 'Rendering' => 0, 'Painting' => 0, 'Loading' => 0, 'Other' => 0);
              $groupColors = array('Scripting' => '#f1c453',
                                   'Rendering' => '#9a7ee6',
                                   'Painting' => '#71b363',
                                   'Loading' => '#70a2e3',
                                   'Other' => '#cbd1d9');
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
                    <th colspan="2">
                    <h2>Main thread processing breakdown</h2>
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
                        <div class="table" id="tableEvents" style="width: 300px;"></div>
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
            groups.addRows(<?php echo count($groups); ?>);
            var groupColors = new Array();

            var events = new google.visualization.DataTable();
            events.addColumn('string', 'Event');
            events.addColumn('number', 'Time (ms)');
            events.addRows(<?php echo count($processing); ?>);
            var eventColors = new Array();
            <?php
            $index = 0;
            foreach($groups as $type => $time)
            {
                echo "groups.setValue($index, 0, '$type');\n";
                echo "groups.setValue($index, 1, $time);\n";
                $color = $groupColors[$type];
                echo "groupColors.push('$color');\n";
                $index++;
            }
            $index = 0;
            foreach($processing as $type => $time)
            {
                echo "events.setValue($index, 0, '$type');\n";
                echo "events.setValue($index, 1, $time);\n";
                $group = 'Other';
                if (array_key_exists($type, $mapping))
                  $group = $mapping[$type];
                $color = $groupColors[$group];
                echo "eventColors.push('$color');\n";
                $index++;
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