<?php
include 'common.inc';
require_once('domains.inc');

$page_keywords = array('Domains','Webpagetest','Website Speed Test');
$page_description = "Website domain breakdown$testLabel";

// walk through the requests and group them by domain
$requestsFv;
$breakdownFv = getDomainBreakdown($id, $testPath, $run, 0, $requestsFv);
$breakdownRv = array();
$requestsRv = array();
if( (int)$test[test][fvonly] == 0 )
    $breakdownRv = getDomainBreakdown($id, $testPath, $run, 1, $requestsRv);

if (array_key_exists('f', $_REQUEST) && $_REQUEST['f'] == 'json') {
    $domains = array();
    $firstView = array();

    ksort($breakdownFv);
    foreach($breakdownFv as $domain => $data) {
        $entry = array();
        $entry['domain'] = $domain;
        $entry['bytes'] = $data['bytes'];
        $entry['requests'] = $data['requests'];
        $entry['connections'] = $data['connections'];
        $firstView[] = $entry;
    }
    $domains['firstView'] = $firstView;

    if( (int)$test[test][fvonly] == 0 ) {
        $repeatView = array();

        ksort($breakdownRv);
        foreach($breakdownRv as $domain => $data) {
            $entry = array();
            $entry['domain'] = $domain;
            $entry['bytes'] = $data['bytes'];
            $entry['requests'] = $data['requests'];
            $entry['connections'] = $data['connections'];
            $repeatView[] = $entry;
        }
        $domains['repeatView'] = $repeatView;
    }

    $output = array();
    $output['domains'] = $domains;

    json_response($output);

    exit;
}
?>


<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest Domain Breakdown<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Domain Breakdown'; include ('head.inc'); ?>
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
            $subtab = 'Domains';
            include 'header.inc';
            ?>

            <table align="center">
                <tr>
                    <th colspan="2">
                    <h2>Content breakdown by domain (First  View)</h2>
                    </th>
                </tr>
                <tr>
                    <td>
                        <div id="pieRequestsFv_div" style="width:450px; height:300px;"></div>
                    </td>
                    <td>
                        <div id="pieBytesFv_div" style="width:450px; height:300px;"></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div id="tableRequestsFv_div" style="width: 100%;"></div>
                    </td>
                    <td>
                        <div id="tableBytesFv_div" style="width: 100%;"></div>
                    </td>
                </tr>
            </table>

            <?php if( count($breakdownRv) ) { ?>
            <br><hr><br>
            <table align="center">
                <tr>
                    <th colspan="2">
                    <h2>Content breakdown by domain (Repeat  View)</h2>
                    </th>
                </tr>
                <tr>
                    <td>
                        <div id="pieRequestsRv_div" style="width:450px; height:300px;"></div>
                    </td>
                    <td>
                        <div id="pieBytesRv_div" style="width:450px; height:300px;"></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div id="tableRequestsRv_div" style="width: 100%;"></div>
                    </td>
                    <td>
                        <div id="tableBytesRv_div" style="width: 100%;"></div>
                    </td>
                </tr>
            </table>
            <?php } ?>
            
            <?php include('footer.inc'); ?>
        </div>

        <!--Load the AJAX API-->
        <script type="text/javascript" src="<?php echo $GLOBALS['ptotocol']; ?>://www.google.com/jsapi"></script>
        <script type="text/javascript">
    
        // Load the Visualization API and the table package.
        google.load('visualization', '1', {'packages':['table', 'corechart']});
        google.setOnLoadCallback(drawTable);
        function drawTable() {
            var dataFv = new google.visualization.DataTable();
            dataFv.addColumn('string', 'Domain');
            dataFv.addColumn('number', 'Requests');
            dataFv.addColumn('number', 'Bytes');
            dataFv.addRows(<?php echo count($breakdownFv); ?>);
            var fvRequests = new google.visualization.DataTable();
            fvRequests.addColumn('string', 'Domain');
            fvRequests.addColumn('number', 'Requests');
            fvRequests.addRows(<?php echo count($breakdownFv); ?>);
            var fvBytes = new google.visualization.DataTable();
            fvBytes.addColumn('string', 'Domain');
            fvBytes.addColumn('number', 'Bytes');
            fvBytes.addRows(<?php echo count($breakdownFv); ?>);
            <?php
            $index = 0;
            foreach($breakdownFv as $domain => $data)
            {
                $domain = $domain;
                echo "dataFv.setValue($index, 0, '$domain');\n";
                echo "dataFv.setValue($index, 1, {$data['requests']});\n";
                echo "dataFv.setValue($index, 2, {$data['bytes']});\n";
                echo "fvRequests.setValue($index, 0, '$domain');\n";
                echo "fvRequests.setValue($index, 1, {$data['requests']});\n";
                echo "fvBytes.setValue($index, 0, '$domain');\n";
                echo "fvBytes.setValue($index, 1, {$data['bytes']});\n";
                $index++;
            }
            ?>

            var viewRequestsFv = new google.visualization.DataView(dataFv);
            viewRequestsFv.setColumns([0, 1]);
            
            var tableRequestsFv = new google.visualization.Table(document.getElementById('tableRequestsFv_div'));
            tableRequestsFv.draw(viewRequestsFv, {showRowNumber: false, sortColumn: 1, sortAscending: false});

            var viewBytesFv = new google.visualization.DataView(dataFv);
            viewBytesFv.setColumns([0, 2]);
            
            var tableBytesFv = new google.visualization.Table(document.getElementById('tableBytesFv_div'));
            tableBytesFv.draw(viewBytesFv, {showRowNumber: false, sortColumn: 1, sortAscending: false});

            var pieRequestsFv = new google.visualization.PieChart(document.getElementById('pieRequestsFv_div'));
            google.visualization.events.addListener(pieRequestsFv, 'ready', function(){markUserTime('aft.Requests Pie');});
            pieRequestsFv.draw(fvRequests, {width: 450, height: 300, title: 'Requests'});

            var pieBytesFv = new google.visualization.PieChart(document.getElementById('pieBytesFv_div'));
            google.visualization.events.addListener(pieBytesFv, 'ready', function(){markUserTime('aft.Bytes Pie');});
            pieBytesFv.draw(fvBytes, {width: 450, height: 300, title: 'Bytes'});

            <?php if( count($breakdownRv) ) { ?>
                var dataRv = new google.visualization.DataTable();
                dataRv.addColumn('string', 'Domain');
                dataRv.addColumn('number', 'Requests');
                dataRv.addColumn('number', 'Bytes');
                dataRv.addRows(<?php echo count($breakdownRv); ?>);
                var rvRequests = new google.visualization.DataTable();
                rvRequests.addColumn('string', 'Domain');
                rvRequests.addColumn('number', 'Requests');
                rvRequests.addRows(<?php echo count($breakdownRv); ?>);
                var rvBytes = new google.visualization.DataTable();
                rvBytes.addColumn('string', 'Domain');
                rvBytes.addColumn('number', 'Bytes');
                rvBytes.addRows(<?php echo count($breakdownRv); ?>);
                <?php
                $index = 0;
                foreach($breakdownRv as $domain => $data)
                {
                    $domain = $domain;
                    echo "dataRv.setValue($index, 0, '$domain');\n";
                    echo "dataRv.setValue($index, 1, {$data['requests']});\n";
                    echo "dataRv.setValue($index, 2, {$data['bytes']});\n";
                    echo "rvRequests.setValue($index, 0, '$domain');\n";
                    echo "rvRequests.setValue($index, 1, {$data['requests']});\n";
                    echo "rvBytes.setValue($index, 0, '$domain');\n";
                    echo "rvBytes.setValue($index, 1, {$data['bytes']});\n";
                    $index++;
                }
                ?>

                var viewRequestsRv = new google.visualization.DataView(dataRv);
                viewRequestsRv.setColumns([0, 1]);
                
                var tableRequestsRv = new google.visualization.Table(document.getElementById('tableRequestsRv_div'));
                tableRequestsRv.draw(viewRequestsRv, {showRowNumber: false, sortColumn: 1, sortAscending: false});

                var viewBytesRv = new google.visualization.DataView(dataRv);
                viewBytesRv.setColumns([0, 2]);
                
                var tableBytesRv = new google.visualization.Table(document.getElementById('tableBytesRv_div'));
                tableBytesRv.draw(viewBytesRv, {showRowNumber: false, sortColumn: 1, sortAscending: false});

                var pieRequestsRv = new google.visualization.PieChart(document.getElementById('pieRequestsRv_div'));
                pieRequestsRv.draw(rvRequests, {width: 450, height: 300, title: 'Requests'});

                var pieBytesRv = new google.visualization.PieChart(document.getElementById('pieBytesRv_div'));
                pieBytesRv.draw(rvBytes, {width: 450, height: 300, title: 'Bytes'});
            <?php } ?>
        }
        </script>
    </body>
</html>