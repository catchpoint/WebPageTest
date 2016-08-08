<?php
include __DIR__ . '/common.inc';
require_once __DIR__ . '/breakdown.inc';
require_once __DIR__ . '/contentColors.inc';
require_once __DIR__ . '/waterfall.inc';
require_once __DIR__ . '/page_data.inc';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestPaths.php';
require_once __DIR__ . '/include/TestRunResults.php';
require_once __DIR__ . '/include/ConnectionViewHtmlSnippet.php';

$page_keywords = array('Content Breakdown','MIME Types','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Website content breakdown by mime type$testLabel";

$testInfo = TestInfo::fromFiles($testPath);
$firstViewResults = TestRunResults::fromFiles($testInfo, $run, false);
$repeatViewResults = null;

// walk through the requests and group them by mime type
$breakdownFv = getJSFriendlyBreakdown(new TestPaths($testPath, $run, false, 1));
$breakdownRv = array();
if(!$testInfo->isFirstViewOnly()) {
    $repeatViewResults = TestRunResults::fromFiles($testInfo, $run, true);
    $breakdownRv = getJSFriendlyBreakdown(new TestPaths($testPath, $run, true, 1));
}
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest Content Breakdown<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Content Breakdown'; include ('head.inc'); ?>
        <style type="text/css">
            td {
                text-align:center; 
                vertical-align:middle; 
                padding:1em;
            }

            div.bar {
                height:12px; 
                margin-top:auto; 
                margin-bottom:auto;
            }

            table.legend td {
                white-space:nowrap; 
                text-align:left; 
                vertical-align:top; 
                padding:0;
            }

            h2 {
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Content Breakdown';
            include 'header.inc';
            ?>
            <h2>Content breakdown by MIME type (First  View)</h2>
            <table align="center" id="breakdownFv">
                <tr>
                    <td>
                        <div class="pieRequests" style="width:450px; height:300px;"></div>
                    </td>
                    <td>
                        <div class="pieBytes" style="width:450px; height:300px;"></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="tableRequests" style="width: 100%;"></div>
                    </td>
                    <td>
                        <div class="tableBytes" style="width: 100%;"></div>
                    </td>
                </tr>
            </table>
            <div style="text-align:center;">
            <h3 name="connection">Connection View (First View)</h3>
            <?php
                $snippet = new ConnectionViewHtmlSnippet($testInfo, $firstViewResults->getStepResult(1));
                echo $snippet->create();
            ?>
            </div>

            <?php if ($repeatViewResults) { ?>
            <br><hr><br>
            <h2>Content breakdown by MIME type (Repeat  View)</h2>
            <table align="center" id="breakdownRv">
                <tr>
                    <td>
                        <div class="pieRequests" style="width:450px; height:300px;"></div>
                    </td>
                    <td>
                        <div class="pieBytes" style="width:450px; height:300px;"></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="tableRequests" style="width: 100%;"></div>
                    </td>
                    <td>
                        <div class="tableBytes" style="width: 100%;"></div>
                    </td>
                </tr>
            </table>
            <div style="text-align:center;">
            <h3 name="connection">Connection View (Repeat View)</h3>
            <?php
            $snippet = new ConnectionViewHtmlSnippet($testInfo, $repeatViewResults->getStepResult(1));
            echo $snippet->create();
            ?>
            </div>
        <?php } ?>
        </div>
        
        <?php include('footer.inc'); ?>

        <!--Load the AJAX API-->
        <script type="text/javascript" src="<?php echo $GLOBALS['ptotocol']; ?>://www.google.com/jsapi"></script>
        <script type="text/javascript">
    
        // Load the Visualization API and the table package.
        google.load('visualization', '1', {'packages':['table', 'corechart']});
        google.setOnLoadCallback(initTables);

        function initTables() {
            var breakdownFv = <?php echo json_encode($breakdownFv); ?>;
            drawTable(breakdownFv, $('#breakdownFv'));
            <?php if (count($breakdownRv)) { ?>
            var breakdownRv = <?php echo json_encode($breakdownRv); ?>;
            drawTable(breakdownRv, $('#breakdownRv'));
            <?php } ?>
        }

        function rgb2html(rgb) {
            return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
        }

        function drawTable(breakdown, parentNode) {
            parentNode = $(parentNode);
            var numData = breakdown.length;
            var data = new google.visualization.DataTable();
            data.addColumn('string', 'MIME Type');
            data.addColumn('number', 'Requests');
            data.addColumn('number', 'Bytes');
            data.addRows(numData);
            var requests = new google.visualization.DataTable();
            requests.addColumn('string', 'Content Type');
            requests.addColumn('number', 'Requests');
            requests.addRows(numData);
            var colors = new Array();
            var bytes = new google.visualization.DataTable();
            bytes.addColumn('string', 'Content Type');
            bytes.addColumn('number', 'Bytes');
            bytes.addRows(numData);
            for (var i = 0; i < numData; i++) {
                data.setValue(i, 0, breakdown[i]['type']);
                data.setValue(i, 1, breakdown[i]['requests']);
                data.setValue(i, 2, breakdown[i]['bytes']);
                requests.setValue(i, 0, breakdown[i]['type']);
                requests.setValue(i, 1, breakdown[i]['requests']);
                bytes.setValue(i, 0, breakdown[i]['type']);
                bytes.setValue(i, 1, breakdown[i]['bytes']);
                colors.push(rgb2html(breakdown[i]['color']));
            }

            var viewRequests = new google.visualization.DataView(data);
            viewRequests.setColumns([0, 1]);
            
            var tableRequests = new google.visualization.Table(parentNode.find('div.tableRequests')[0]);
            tableRequests.draw(viewRequests, {showRowNumber: false, sortColumn: 1, sortAscending: false});

            var viewBytes = new google.visualization.DataView(data);
            viewBytes.setColumns([0, 2]);
            
            var tableBytes = new google.visualization.Table(parentNode.find('div.tableBytes')[0]);
            tableBytes.draw(viewBytes, {showRowNumber: false, sortColumn: 1, sortAscending: false});
            
            var pieRequests = new google.visualization.PieChart(parentNode.find('div.pieRequests')[0]);
            google.visualization.events.addListener(pieRequests, 'ready', function(){markUserTime('aft.Requests Pie');});
            pieRequests.draw(requests, {width: 450, height: 300, title: 'Requests', colors: colors});

            var pieBytes = new google.visualization.PieChart(parentNode.find('div.pieBytes')[0]);
            google.visualization.events.addListener(pieBytes, 'ready', function(){markUserTime('aft.Bytes Pie');});
            pieBytes.draw(bytes, {width: 450, height: 300, title: 'Bytes', colors: colors});
        }
        </script>
    </body>
</html>
