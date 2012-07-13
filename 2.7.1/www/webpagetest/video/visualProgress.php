<?php
chdir('..');
include 'common.inc';
include 'page_data.inc';
include './video/visualProgress.inc.php';
$page_keywords = array('Video','comparison','Webpagetest','Website Speed Test');
$page_description = "Side-by-side video comparison of website performance.";
$title = "WebPagetest - Visual Progress";
$run = (int)(@$req_run);
if (!$run) {
    $pageData = loadAllPageData($testPath);
    $run = GetMedianRun($pageData, $cached, $median_metric);
}
if ($run) {
    $videoPath = "$testPath/video_{$run}";
    if( $cached )
        $videoPath .= '_cached';
    $frames = GetVisualProgress($testPath, $run, $cached);
}
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title><?php echo $title;?></title>
        <?php 
            $gaTemplate = 'Visual Progress'; 
            include ('head.inc'); 
        ?>
        <style type="text/css">
            div.content
            {
                text-align:center;
                background-color: black;
                color: white;
                font-family: arial,sans-serif
            }
            .link
            {
                text-decoration: none;
                color: white;
            }
            table
            {
                margin-left: auto;
                margin-right: auto;
            }
            th,td
            {
                padding: 5px 10px;
            }
        </style>
    </head>
    <body>
        <div class="page">
            <?php 
            $tab = 'Test Result';
            $videoId = $id;
            $nosubheader = true;
            include 'header.inc';
            ?>
            <?php
            if (isset($frames) && array_key_exists('complete', $frames)) {
                echo "<h1>Complete: {$frames['complete']}</h1>";
            }
            if (isset($frames) && array_key_exists('FLI', $frames)) {
                echo "<h1>Feels Like: {$frames['FLI']}</h1>";
            }
            ?>
            <table class="frames">
            <tr><th>Time</th><th>Video Frame</th><th>Progress</th></tr>
            <?php
            if (isset($frames) && array_key_exists('frames', $frames)) {
                foreach ($frames['frames'] as $time => &$frame) {
                    echo '<tr><td>'. number_format($time / 1000.0, 3) . 's</td>';
                    echo "<td><img src=\"{$frame['path']}\"></td>";
                    echo "<td>{$frame['progress']}%</td></tr>";
                }
            }
            ?>
            </table>
        </div>
    </body>
</html>
