<?php 
include 'common.inc';
require_once('page_data.inc');
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
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            include 'header.inc';
            ?>
            
            <div id="result">
            <h2>Test Result Data Plots</h2>
            <?php
            $metrics = array('loadTime' => 'Load Time (ms)',
                            'SpeedIndex' => 'Speed Index',
                            'TTFB' => 'Time to First Byte (ms)',
                            'render' => 'Start Render Time (ms)',
                            'fullyLoaded' => 'Fully Loaded Time (ms)',
                            'bytesIn' => 'Bytes In',
                            'requests' => 'Requests');
            if (array_key_exists('testinfo', $test) && !$test['testinfo']['video']) {
                unset($metrics['SpeedIndex']);
            }
            foreach($metrics as $metric => $label) {
                InsertChart($metric, $label);
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
                        var data = new google.visualization.DataTable();
                        data.addColumn('number', 'Run');
                        data.addColumn('number', 'First View');
                        data.addColumn('number', 'First View Median');
                        if (!fvonly) {
                            data.addColumn('number', 'Repeat View');
                            data.addColumn('number', 'Repeat View Median');
                        }
                        for (i = 1; i <= runs; i++) {
                            if (fvonly) {
                                data.addRow([i, chartData[metric].fv.data[i], chartData[metric].fv.median]);
                            } else {
                                data.addRow([i, chartData[metric].fv.data[i], chartData[metric].fv.median, chartData[metric].rv.data[i], chartData[metric].rv.median]);
                            }
                        }
                        var options = {
                                        width: 800,
                                        height: 400,
                                        lineWidth: 1,
                                        hAxis: {gridlines: {count: runs}},
                                        title: chartData[metric].title,
                                        series: [{color: 'blue', lineWidth: 0, pointSize: 3}, {color: 'blue', visibleInLegend: false}, {color: 'red', lineWidth: 0, pointSize: 3}, {color: 'red', visibleInLegend: false}]
                                        };
                        var chart = new google.visualization.LineChart(document.getElementById(chartData[metric].div));
                        chart.draw(data, options);
                    }
                }
            </script>
        </div>
    </body>
</html>

<?php
function InsertChart($metric, $label) {
    global $pageData;
    global $chartData;
    global $test;
    global $median_metric;
    if (array_key_exists('testinfo', $test)) {
        $div = "{$metric}Chart";
        $runs = $test['testinfo']['runs'];
        if (array_key_exists('discard', $test['testinfo'])) {
            $runs -= $test['testinfo']['discard'];
        }
        echo "<div id=\"$div\" class=\"chart\"></div>\n";
        $chart = array('div' => $div, 'title' => $label, 'fv' => array('data' => array()));
        $chart['fv']['median'] = $pageData[GetMedianRun($pageData, 0, $median_metric)][0][$metric];
        $fvonly = $test['testinfo']['fvonly'];
        if (!$fvonly) {
            $chart['rv'] = array('data' => array());
            $chart['rv']['median'] = $pageData[GetMedianRun($pageData, 1, $median_metric)][1][$metric];
        }
        for ($i = 1; $i <= $runs; $i++) {
            $chart['fv']['data'][$i] = $pageData[$i][0][$metric];
            if (!$fvonly) {
                $chart['rv']['data'][$i] = $pageData[$i][1][$metric];
            }
        }
        $chartData[$metric] = $chart;
    }
}
?>