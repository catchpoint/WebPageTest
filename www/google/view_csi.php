<?php 
chdir('..');
include 'common.inc';
require_once('object_detail.inc');
require_once('google/google_lib.inc');
$page_keywords = array('View CSI Data','Webpagetest','Website Speed Test','Page Speed');
$page_description = "View CSI Data.";
$testInfo = &$test['testinfo'];
$runs = $testInfo['runs'];
$csi = GetCSIData();
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - View CSI Data</title>
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
            <h2>First View</h2>
            <?php
            CSITable($runs, $csi['fv']);
            if (isset($csi['rv'])) {
                echo '<br><h2>Repeat View</h2>';
                CSITable($runs, $csi['rv']);
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