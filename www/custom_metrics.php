<?php 
include 'common.inc';
require_once('page_data.inc');
$page_keywords = array('View Custom Metrics','Webpagetest','Website Speed Test','Page Speed');
$page_description = "View Custom Metrics";
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - View Custom Metrics</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="author" content="Patrick Meenan">
        <?php $gaTemplate = 'ViewCSI'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            include 'header.inc';
            ?>
            
            <div id="result">
            <?php
            if (isset($pageData) &&
                is_array($pageData) &&
                array_key_exists($run, $pageData) &&
                is_array($pageData[$run]) &&
                array_key_exists($cached, $pageData[$run]) &&
                array_key_exists('custom', $pageData[$run][$cached]) &&
                is_array($pageData[$run][$cached]['custom']) &&
                count($pageData[$run][$cached]['custom'])) {
              echo '<h1>Custom Metrics</h1>';
              echo '<table class="pretty">';
              foreach ($pageData[$run][$cached]['custom'] as $metric) {
                if (array_key_exists($metric, $pageData[$run][$cached])) {
                  echo '<tr><th>' . htmlspecialchars($metric) . '</th><td>';
                  echo htmlspecialchars($pageData[$run][$cached][$metric]);
                  echo '</td></tr>';
                }
              }
              echo '</table>';
            } else {
              echo '<h1>No custom metrics reported</h1>';
            }
            ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>

<?php
function GetCSIData() {
    global $id;
    global $testPath;
    global $runs;
    global $testInfo;
    
    $csi = array();
    $csi['fv'] = array();
    for ($run = 1; $run <= $runs; $run++) {
        $params = ParseCsiInfo($id, $testPath, $run, 0, true);
        foreach ($params as $name => $value) {
            if (!array_key_exists($name, $csi['fv']))
                $csi['fv'][$name] = array();
            $csi['fv'][$name][$run] = $value;
        }
    }
    
    if (!$testInfo['fvonly']) {
        $csi['rv'] = array();
        for ($run = 1; $run <= $runs; $run++) {
            $params = ParseCsiInfo($id, $testPath, $run, 1, true);
            foreach ($params as $name => $value) {
                if (!array_key_exists($name, $csi['rv']))
                    $csi['rv'][$name] = array();
                $csi['rv'][$name][$run] = $value;
            }
        }
    }
    
    return $csi;
}

function CSITable($runs, &$data) {
    echo '<table class="pretty"><tr><th></th>';
    for ($run = 1; $run <= $runs; $run++)
        echo "<th>Run $run</th>";
    echo '</tr>';
    foreach( $data as $name => &$values ) {
        if ($name != 'rt' && $name != 'e' ) {
            echo "<tr><td><b>$name</b></td>";
            for ($run = 1; $run <= $runs; $run++) {
                echo '<td>';
                if (array_key_exists($run, $values))
                    echo $values[$run];
                echo '</td>';
            }
            echo '</tr>';
        }
    }
    echo '</table>';
}
?>