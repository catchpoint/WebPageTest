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

// load the timeline data
$timelineFile = "$testPath/$run{$cachedText}_timeline.json";
$timelineText = gz_file_get_contents($timelineFile);
$timeline = json_decode($timelineText, true);
$startTime = 0;
$fullScreen = 0;
$paintEvents = array();
$regions = array();
foreach($timeline as &$entry) {
    ParseEntry($entry);
}
function ParseEntry(&$entry) {
    global $startTime;
    global $fullScreen;
    global $regions;
    $ret = false;
    $hadPaintChildren = false;
    if (array_key_exists('startTime', $entry)) {
        if ($entry['startTime'] && (!$startTime || $entry['startTime'] < $startTime)) {
            $startTime = $entry['startTime'];
        }
    }
    if(array_key_exists('children', $entry) &&
       is_array($entry['children'])) {
        foreach($entry['children'] as &$child) {
            if (ParseEntry($child))
                $hadPaintChildren = true;
        }
    }
    if (!$hadPaintChildren &&
        array_key_exists('type', $entry) &&
        !strcasecmp($entry['type'], 'Paint') &&
        array_key_exists('data', $entry) &&
        array_key_exists('width', $entry['data']) &&
        array_key_exists('height', $entry['data']) &&
        array_key_exists('x', $entry['data']) &&
        array_key_exists('y', $entry['data'])) {
        $ret = true;
        $paintEvent = $entry['data'];
        $paintEvent['startTime'] = $entry['startTime'];
        $area = $paintEvent['width'] * $paintEvent['height'];
        if ($area > $fullScreen)
            $fullScreen = $area;
        $regionName = "{$paintEvent['x']},{$paintEvent['y']} - {$paintEvent['width']}x{$paintEvent['height']}";
        if (!array_key_exists($regionName, $regions)) {
            $regions[$regionName] = $paintEvent;
            $regions[$regionName]['times'] = array();
        }
        $regions[$regionName]['times'][] = $entry['startTime'];
    }
    return $ret;
}
$total = 0.0;
$regionCount = count($regions);
foreach($regions as $name => &$region) {
    $elapsed = $event['startTime'] - $startTime;
    $area = $region['width'] * $region['height'];
    if ($area != $fullScreen && $regionCount > 1) {
        $count = count($region['times']);
        $impact = floatval($area / $count);
        foreach($region['times'] as $time) {
            $total += $impact;
            $elapsed = (int)($time - $startTime);
            if (!array_key_exists($elapsed, $paintEvents))
                $paintEvents[$elapsed] = $impact;
            else
                $paintEvents[$elapsed] += $impact;
        }
    }
}
ksort($paintEvents, SORT_NUMERIC);
$current = 0.0;
$lastTime = 0.0;
$lastProgress = 0.0;
$speedIndex = 0.0;
$siProgress = array();
foreach($paintEvents as $time => $increment) {
    $current += $increment;
    $progress = floatval(floatval($current) / floatval($total));
    $elapsed = $time - $lastTime;
    $siIncrement = floatval($elapsed) * (1.0 - $lastProgress);
    $speedIndex += $siIncrement;
    $lastProgress = $progress;
    $lastTime = $time;
    $siProgress[$time] = $progress;
}
function GetSIProgress($time) {
    global $siProgress;
    $progress = 0;
    foreach($siProgress as $progressTime => $prog) {
        if ($progressTime <= $time)
            $progress = intval($prog * 100);
        else
            break;
    }
    return $progress;
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
            echo '<tr><th>Time</th><th>Video Frame</th><th>Baseline<br>Speed Index: ' . $frames['SpeedIndex'] . '</th><th>Dev Tools<br>Speed Index: ' . intval($speedIndex) .'</th></tr>';
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
