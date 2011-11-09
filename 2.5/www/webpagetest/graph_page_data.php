<?php 
include 'common.inc';
$page_keywords = array('Graph Page Data','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Graph Page Data.";
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
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
                            'TTFB' => 'Time to First Byte (ms)',
                            'render' => 'Start Render Time (ms)',
                            'fullyLoaded' => 'Fully Loaded Time (ms)',
                            'bytesIn' => 'Bytes In',
                            'requests' => 'Requests');
            foreach($metrics as $metric => $label) {
                $img = "/graph/page_metric.php?metric=$metric&label=" . urlencode($label);
                echo "<br><p><img src=\"$img\"></p>";
            }
            ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
