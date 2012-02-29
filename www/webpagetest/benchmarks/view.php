<?php
chdir('..');
include 'common.inc';
include './benchmarks/data.inc.php';
$page_keywords = array('Benchmarks','Webpagetest','Website Speed Test','Page Speed');
$page_description = "WebPagetest benchmark details";
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Benchmark details</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
        <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
        <meta name="author" content="Patrick Meenan">
        <?php $gaTemplate = 'About'; include ('head.inc'); ?>
        <script type="text/javascript" src="/js/dygraph-combined.js"></script>
        <style type="text/css">
        .benchmark-chart { clear: both; width: 800px; height: 350px; margin-left: auto; margin-right: auto;}
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Benchmarks';
            include 'header.inc';
            ?>
            
            <div class="translucent">
            <?php
            $metrics = array('docTime' => 'Load Time (onload)', 
                            'TTFB' => 'Time to First Byte', 
                            'titleTime' => 'Time to Title', 
                            'render' => 'Time to Start Render', 
                            'fullyLoaded' => 'Load Time (Fully Loaded)', 
                            'domElements' => 'Number of DOM Elements', 
                            'connections' => 'Connections', 
                            'requests' => 'Requests (Fully Loaded)', 
                            'requestsDoc' => 'Requests (onload)', 
                            'bytesInDoc' => 'Bytes In (KB - onload)', 
                            'bytesIn' => 'Bytes In (KB - Fully Loaded)', 
                            'js_bytes' => 'Javascript Bytes (KB)', 
                            'js_requests' => 'Javascript Requests', 
                            'css_bytes' => 'CSS Bytes (KB)', 
                            'css_requests' => 'CSS Requests', 
                            'image_bytes' => 'Image Bytes (KB)', 
                            'image_requests' => 'Image Requests',
                            'flash_bytes' => 'Flash Bytes (KB)', 
                            'flash_requests' => 'Flash Requests', 
                            'html_bytes' => 'HTML Bytes (KB)', 
                            'html_requests' => 'HTML Requests', 
                            'text_bytes' => 'Text Bytes (KB)', 
                            'text_requests' => 'Text Requests',
                            'other_bytes' => 'Other Bytes (KB)', 
                            'other_requests' => 'Other Requests');
            if (array_key_exists('benchmark', $_REQUEST)) {
                $benchmark = $_REQUEST['benchmark'];
                $info = GetBenchmarkInfo($benchmark);
                echo "<h1>{$info['title']}</h1>";
                if (array_key_exists('description', $info))
                    echo "<p>{$info['description']}</p>\n";
                foreach( $metrics as $metric => $label) {
                    if (array_key_exists('title', $benchmark))
                        $title = $benchmark['title'];
                    else
                        $title = $benchmark['name'];
                    $bm = urlencode($benchmark['name']);
                    echo "<h2>$label</h2>\n";
                    if (array_key_exists('description', $benchmark))
                        echo "<p>{$benchmark['description']}</p>\n";
                    $tsv = LoadDataTSV($benchmark, 0, $metric, 'avg');
                    if (isset($tsv) && strlen($tsv)) {
                        $count++;
                        $id = "g$count";
                        echo "<div id=\"$id\" class=\"benchmark-chart\"></div>\n";
                        echo "<script type=\"text/javascript\">
                                $id = new Dygraph(
                                    document.getElementById(\"$id\"),
                                    \"" . str_replace("\t", '\t', str_replace("\n", '\n', $tsv)) . "\",
                                    {drawPoints: true,
                                    title: \"$label (First View)\",
                                    legend: \"always\"}
                                );
                              </script>\n";
                    }
                    if (!array_key_exists('fvonly', $benchmark) || !$benchmark['fvonly']) {
                        $tsv = LoadDataTSV($benchmark, 1, $metric, 'avg');
                        if (isset($tsv) && strlen($tsv)) {
                            $count++;
                            $id = "g$count";
                            echo "<br><div id=\"$id\" class=\"benchmark-chart\"></div>\n";
                            echo "<script type=\"text/javascript\">
                                    $id = new Dygraph(
                                        document.getElementById(\"$id\"),
                                        \"" . str_replace("\t", '\t', str_replace("\n", '\n', $tsv)) . "\",
                                        {drawPoints: true,
                                        title: \"$label (Repeat View)\",
                                        legend: \"always\"}
                                    );
                                  </script>\n";
                        }
                    }
                }
            }
            ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
