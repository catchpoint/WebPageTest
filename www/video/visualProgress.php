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
$cachedText = '';
if ($run) {
    $videoPath = "$testPath/video_{$run}";
    if( $cached ) {
        $videoPath .= '_cached';
        $cachedText = '_cached';
    }
    $frames = GetVisualProgress($testPath, $run, $cached /*, array('nocache' => 1) */);
}
function GetSIProgress($time) {
    global $frames;
    $progress = 0;
    foreach($frames['DevTools']['VisualProgress'] as $progressTime => $prog) {
        if ($progressTime <= $time)
            $progress = intval($prog * 100);
        else
            break;
    }
    return $progress;
}
?>
<!DOCTYPE html>
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
            #options {
                width: 100%;
                text-align: left;
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
            echo '<table class="frames">';
            echo '<tr><th>Time</th><th>Video Frame</th><th>Baseline<br>Speed Index: ' .  $pageData[$run][$cached]['SpeedIndex'] . 
                    '<br>Visually Complete: ' . $pageData[$run][$cached]['visualComplete'] . 
                    '</th><th>Dev Tools<br>Speed Index: ' . $pageData[$run][$cached]['SpeedIndexDT'] .
                    '<br>Visually Complete: ' . $pageData[$run][$cached]['VisuallyCompleteDT'] . '</th></tr>';
            if (isset($frames) && array_key_exists('frames', $frames)) {
                foreach ($frames['frames'] as $time => &$frame) {
                    echo '<tr><td>'. number_format($time / 1000.0, 3) . 's</td>';
                    $img = $frame['path'];
                    $thumb = "/thumbnail.php?test=$id&width=200&file=video_$run$cachedText/{$frame['file']}";
                    echo "<td><a href=\"$img\"><img src=\"$thumb\"></a></td>";
                    echo "<td>{$frame['progress']}%</td>";
                    echo "<td>" . GetSIProgress($time) . "%</td>";
                    echo "</tr>";
                }
            }
            ?>
            </table>
        </div>
    </body>
</html>
