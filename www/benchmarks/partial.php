<?php
chdir('..');
include 'common.inc';
require_once('./benchmarks/data.inc.php');
$page_keywords = array('Benchmarks','Webpagetest','Website Speed Test','Page Speed');
$page_description = "WebPagetest benchmark partial results";
if (array_key_exists('benchmark', $_REQUEST)) {
    $benchmark = $_REQUEST['benchmark'];
    $info = GetBenchmarkInfo($benchmark);
}
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Benchmarks</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
        <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
        <meta name="author" content="Patrick Meenan">
        <?php $gaTemplate = 'About'; include ('head.inc'); ?>
        <script type="text/javascript" src="/js/dygraph-combined.js?v=1.0.1"></script>
        <style type="text/css">
        .chart-container { clear: both; width: 875px; height: 350px; margin-left: auto; margin-right: auto; padding: 0;}
        .benchmark-chart { float: left; width: 700px; height: 350px; }
        .benchmark-legend { float: right; width: 150px; height: 350px; }
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Benchmarks';
            include 'header.inc';
            ?>
            
            <script type="text/javascript">
            function SelectedPoint(benchmark, metric, series, time, cached) {
                time = parseInt(time / 1000, 10);
                var isCached = 0;
                if (cached)
                    isCached = 1;
                var menu = '<div><h4>View details:</h4>';
                var scatter = "viewtest.php?benchmark=" + encodeURIComponent(benchmark) + "&metric=" + encodeURIComponent(metric) + "&cached=" + isCached + "&time=" + time;
                var delta = "delta.php?benchmark=" + encodeURIComponent(benchmark) + "&metric=" + encodeURIComponent(metric) + "&time=" + time;
                menu += '<a href="' + scatter + '">Scatter Plot</a><br>';
                menu += '<a href="' + delta + '">Comparison Distribution</a><br>';
                menu += '</div>';
                $.modal(menu, {overlayClose:true});
            }
            </script>
            <div class="translucent">
            <div style="clear:both;">
            </div>
            <?php
            echo '<h1>Benchmark Test Runs:</h1>';
            echo '<table class="pretty">';
            if (is_file("./results/benchmarks/$benchmark/state.json")) {
                $state = json_decode(file_get_contents("./results/benchmarks/$benchmark/state.json"), true);
                if (array_key_exists('running', $state) && $state['running'] &&
                    array_key_exists('tests', $state) && is_array($state['tests'])) {
                  $now = time();
                  if ($now > $state['last_run'])
                    $elapsed = $now - $state['last_run'];
                  $total = count($state['tests']);
                  $row = 0;
                  foreach ($state['tests'] as &$test) {
                    $row++;
                    $label = $test['label'];
                    if (strlen($label) > 40)
                      $label = substr($label, 0, 40) . '...';
                    $label = htmlspecialchars($label);
                    $class = $row % 2 ? 'odd' : 'even';
                    echo "<tr class=\"$class\"><td class=\"$class\">{$test['config']}</td><td class=\"$class\">$label</td><td class=\"$class\"><a href=\"/results.php?test={$test['id']}\">{$test['id']}</a></td><td class=\"$class\">";
                    if (is_array($test) && array_key_exists('completed', $test) && $test['completed']) {
                      echo 'Completed';
                      $completed++;
                    }
                    echo "</td></tr>";
                  }
                }
            }
            echo '</table>';
            if ($total) {
              $hours = intval(floor($elapsed / 3600));
              $elapsed -= $hours * 3600;
              $minutes = intval(floor($elapsed / 60));
              echo "<br><p>Completed $completed of $total tests in $hours hours and $minutes minutes.</p>";
            } else {
              echo 'Not Running';
            }
            ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
