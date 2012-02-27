<?php
chdir('..');
include 'common.inc';
include './benchmarks/data.inc.php';
$page_keywords = array('Benchmarks','Webpagetest','Website Speed Test','Page Speed');
$page_description = "WebPagetest benchmarks";
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Benchmarks</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
        <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
        <meta name="author" content="Patrick Meenan">
        <?php $gaTemplate = 'About'; include ('head.inc'); ?>
        <script type="text/javascript" src="/js/dygraph-combined.js"></script>
        <style type="text/css">
        .benchmark-chart { clear: both; width: 600px; height: 300px; margin-left: auto; margin-right: auto;}
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
            $benchmarks = GetBenchmarks();
            $count = 0;
            foreach ($benchmarks as &$benchmark) {
                $tsv = LoadDataTSV($benchmark['name'], 0, 'docTime', 'avg');
                if (isset($tsv) && strlen($tsv)) {
                    $count++;
                    if (array_key_exists('title', $benchmark))
                        $title = $benchmark['title'];
                    else
                        $title = $benchmark['name'];
                    $bm = urlencode($benchmark['name']);
                    echo "<h2><a href=\"view.php?benchmark=$bm\">$title</a></h2>\n";
                    if (array_key_exists('description', $benchmark))
                        echo "<p>{$benchmark['description']}</p>\n";
                    $id = "g$count";
                    echo "<div id=\"$id\" class=\"benchmark-chart\"></div>\n";
                    echo "<script type=\"text/javascript\">
                            $id = new Dygraph(
                                document.getElementById(\"$id\"),
                                \"" . str_replace("\t", '\t', str_replace("\n", '\n', $tsv)) . "\",
                                {drawPoints: true,
                                legend: \"always\",
                                xlabel: \"Date\",
                                ylabel: \"Time to onload\"}
                            );
                          </script>\n";
                }
            }
            ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
