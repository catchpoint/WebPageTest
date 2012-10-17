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
    $frames = GetVisualProgress($testPath, $run, $cached);
}

$colorSpace='RGB';
if (array_key_exists('colorSpace', $_GET)) {
    $colorSpace=$_GET['colorSpace'];
}
$channels = array('R', 'G', 'B');
if ($colorSpace == 'HSV') {
    $channels = array('H', 'S', 'V');
} elseif ($colorSpace == 'YUV') {
    $channels = array('Y', 'U', 'V');
}
$weights = array(1,1,1);
for ($i = 0; $i < 3; $i++) {
    if (array_key_exists("w$i", $_GET) && $_GET["w$i"] >= 0) {
        $weights[$i] = $_GET["w$i"];
    }
}
$buckets = 256;
if (array_key_exists('buckets', $_GET) && $_GET['buckets'] > 0 && $_GET['buckets'] <= 256) {
    $buckets=$_GET['buckets'];
}
$resample = 2;
if (array_key_exists('resample', $_GET) && $_GET['resample'] >= 2) {
    $resample=$_GET['resample'];
}
$options = array('colorSpace' => $colorSpace, 'weights' => $weights, 'buckets' => $buckets, 'resample' => $resample);
$customFrames = GetVisualProgress($testPath, $run, $cached, $options);
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
            echo '<div id="options">';
            echo '<form id="optionsForm" name="options" method="get" action="visualProgress.php">';
            echo "<input type=\"hidden\" name=\"test\" value=\"$id\">";
            echo "<input type=\"hidden\" name=\"run\" value=\"$run\">";
            echo "<input type=\"hidden\" name=\"cached\" value=\"$cached\">";
            echo 'Color Space: ';
            echo '<input type="radio" name="colorSpace" value="RGB"';
            if ($colorSpace == 'RGB') {
                echo ' checked';
            }
            echo '> RGB  <input type="radio" name="colorSpace" value="HSV"';
            if ($colorSpace == 'HSV') {
                echo ' checked';
            }
            echo '> HSV  <input type="radio" name="colorSpace" value="YUV"';
            if ($colorSpace == 'YUV') {
                echo ' checked';
            }
            echo '> YUV<br>';
            echo 'Color Channel Weights: ';
            for ($i = 0; $i < 3; $i++) {
                echo "{$channels[$i]} <input type=\"input\" name=\"w$i\" value=\"{$weights[$i]}\" size=\"3\" /> ";
            }
            echo '<br>';
            echo "Histogram Buckets (1-256): <input type=\"input\" name=\"buckets\" value=\"$buckets\" size=\"3\" /><br>";
            echo "Resample Images (must be smaller than 1/2): 1 / <input type=\"input\" name=\"resample\" value=\"$resample\" size=\"3\" /><br>";
            echo '<input id="SubmitBtn" type="submit" value="Update">';
            echo '</form></div>';
            echo '<table class="frames">';
            echo '<tr><th>Time</th><th>Video Frame</th><th>Baseline<br>Speed Index: ' . $frames['SpeedIndex'] . '</th><th>Customized<br>Speed Index: ' . $customFrames['SpeedIndex'] .'</th></tr>';
            if (isset($frames) && array_key_exists('frames', $frames)) {
                foreach ($frames['frames'] as $time => &$frame) {
                    echo '<tr><td>'. number_format($time / 1000.0, 3) . 's</td>';
                    $img = $frame['path'];
                    $thumb = "/thumbnail.php?test=$id&width=200&file=video_$run$cachedText/{$frame['file']}";
                    echo "<td><a href=\"$img\"><img src=\"$thumb\"></a></td>";
                    echo "<td>{$frame['progress']}%</td>";
                    echo "<td>{$customFrames['frames'][$time]['progress']}%</td>";
                    echo "</tr>";
                }
            }
            ?>
            </table>
        </div>
    </body>
</html>
