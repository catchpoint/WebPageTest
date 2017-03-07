<?php
  $baseDir = getcwd();
  chdir('..');
  set_time_limit(600);
  require_once('video/avi2frames.inc.php');
  $algorithms = array('Original', 'Original+white', 'EMD', 'EMD Relative', 'EMD Path');
  $viewport = null;
?>
<!DOCTYPE html>
<html>
<head>
<style type="text/css">
  table {width: 100%;}
  th {
    background-color: #E4E1AB;
    padding: 1em;
  }
  table.container td {
    vertical-align: top;
    padding: 1em;
  }
  td.video-list {
    white-space: nowrap;
    background-color: #C6CAE2;
    width: 0px;
  }
  td.video-result {
    background-color: #E5E5E5;
    width: 99%;
  }
  li.selected {
    background-color: #FFF752;
  }
  table.results {
    border-collapse:collapse;
  }
  table.results td, table.results th{
    border: 1px solid black;
    vertical-align: middle;
    text-align: center;
  }
  table.results img {
    max-width:200px;
    max-height:200px;
    -ms-interpolation-mode: bicubic;
  }
  table.thumbs {
    width: 600px;
    margin-left: auto;
    margin-right: auto;
  }
  table.thumbs th {
    background-color: inherit;
    font-weight: normal;
    padding: 1em;
  }
  table.thumbs td {
    vertical-align: top;
    text-align: left;
    padding: 0;
  }
  table.thumbs img {
    max-width:200px;
    max-height:200px;
    -ms-interpolation-mode: bicubic;
  }
  #compare_visual_progress {
    height: 300px;
    width: 100%;
    background-color: #fff;
  }
  #stats {
    text-align: left;
  }
  #svg {
    width: 200px;
    height: 100px;
    float:left;
    margin-right: 1em;
    background-color: #fff;
  }
  #algorithms {
    margin-top: 1em;
    margin-bottom: 1em;
  }
  #algorithms th {
    background-color: inherit;
    padding: 0;
    text-align: left;
  }
  #algorithms td {
    padding: 0;
    text-align: left;
  }
  a:link {color:#0000FF;}      /* unvisited link */
  a:visited {color:#0000FF;}  /* visited link */
</style>
</head>
<body>
  <table class="container">
  <tr><th colspan=2>Speed Index/Visual Progress Algorithm Comparison</th></tr>
  <tr>
    <td class="video-list">
    <?php
      PopulateVideoList();
    ?>
    </td>
    <td class="video-result">
    <?php
      PopulateResult();
    ?>
    </td>
  </tr>
  </table>
</body>
</html>
<?php
function PopulateVideoList() {
  global $baseDir;
  $currentVideo = array_key_exists('video', $_REQUEST) ? $_REQUEST['video'] : '';
  $videos = array();
  $files = scandir($baseDir);
  foreach ($files as $file) {
    if (is_file("$baseDir/$file") && stripos($file, '.mp4') !== false) {
      $videos[] = basename($file, '.mp4');
    }
  }
  if (count($videos)) {
    echo '<p>Click on a video to see it\'s analysis.</p>';
    echo '<ul>';
    foreach($videos as $video) {
      $selected = $video === $currentVideo ? ' class="selected"' : '';
      echo "<li$selected><a href=\"index.php?video=" . urlencode($video) . "\">" . htmlspecialchars($video) . "</a></li>";
    }
    echo "</ul>\n";
  } else {
    echo '<p>No video files were found.</p>';
  }
}

function PopulateResult() {
  global $baseDir;
  global $viewport;
  $currentVideo = array_key_exists('video', $_REQUEST) ? $_REQUEST['video'] : '';
  if (strlen($currentVideo)) {
    ProcessVideo($currentVideo);
    $info = json_decode(file_get_contents("$baseDir/$currentVideo/video.json"), true);
    if (isset($info) && is_array($info) && array_key_exists('viewport', $info))
      $viewport = $info['viewport'];
    $progress = array();
    $progress['video'] = $currentVideo;
    $progress['videoDir'] = "$baseDir/$currentVideo";
    $progress['frames'] = LoadFrames($currentVideo);
    $progress['progress'] = array();
    VisualProgressOriginal($progress, 'Original', true);
    VisualProgressOriginal($progress, 'Original+white', false);
    VisualProgressEMD($progress, 'EMD');
    VisualProgressEMDRelative($progress, 'EMD Relative');
    VisualProgressEMDPath($progress, 'EMD Path');
    DisplayResults($progress);
  } else {
    echo '<p>Select a video in the list to see it\'s analysis</p>';
  }
}

function ProcessVideo($video) {
  global $baseDir;
  $videoDir = "$baseDir/$video";
  $videoFile = "$baseDir/$video.mp4";
  $videoCodeVersion = 1;
  if (is_file($videoFile)) {
    if (!is_dir($videoDir))
      mkdir($videoDir, 0777);
    if (!is_file("$videoDir/video.json")) {
      $videoFile = realpath($videoFile);
      $videoDir = realpath($videoDir);
      if (Video2PNG($videoFile, $videoDir, '')) {
        FindAVIViewport($videoDir, 0, $viewport);
        EliminateDuplicateAVIFiles($videoDir, $viewport);
      }
      $videoInfo = array('ver' => $videoCodeVersion);
      if (isset($viewport))
        $videoInfo['viewport'] = $viewport;
      file_put_contents("$videoDir/video.json", json_encode($videoInfo));
    }
  }
}

function LoadFrames($video) {
  $frames = array();
  global $baseDir;
  $videoDir = "$baseDir/$video";
  $files = scandir($videoDir);
  foreach ($files as $file) {
    if (is_file("$videoDir/$file") && preg_match('/^image-(?P<time>[0-9]+)\.png$/i', $file, $matches))
      $frames[intval($matches['time'])] = $file;
  }
  ksort($frames, SORT_NUMERIC);
  return $frames;
}

function DisplayResults(&$progress) {
  global $algorithms;
  global $baseDir;
  echo '<div id="compare_visual_progress" class="compare-graph"></div>';
  end($progress['frames']);
  $lastFrame = current($progress['frames']);
  $endTime = key($progress['frames']);
  reset($progress['frames']);
  $firstFrame = current($progress['frames']);
  echo '<table class="thumbs">';
  echo '<tr><th colspan=3>Hover over or select a point on the chart to view the thumbnail and calculated progress.</th></tr><tr>';
  echo "<td class=\"image\"><img src=\"" . htmlspecialchars($progress['video']) . "/$firstFrame\"></td>";
  echo "<td class=\"image\"><img id=\"videoFrame\" src=\"" . htmlspecialchars($progress['video']) . "/$firstFrame\"></td>";
  echo "<td class=\"image\"><img src=\"" . htmlspecialchars($progress['video']) . "/$lastFrame\"></td>";
  echo '</tr>';
  echo "<tr><td>Start (0%)</td><td id=\"stats\"></td><td>Speed Index ($endTime ms):";
  foreach ($algorithms as $algorithm) {
    echo "<br>{$progress['speedindex'][$algorithm]} - $algorithm";
  }
  echo "</td></tr>";
  echo '</table><div>';
  echo "<table id='algorithms'>";
  echo "<tr><td rowspan=5><img id=\"svg\" src=\"speedindex.svg\"></td><th>Original</th><td>Percent of pixels that have reached their end color, not including white pixels.</td></tr>";
  echo "<tr><th>Original+white</th><td>Percent of pixels that have reached their end color.</td></tr>";
  echo "<tr><th>EMD</th><td><a href=\"http://en.wikipedia.org/wiki/Earth_mover's_distance\">Earth mover's distance</a>. 1 - (F / G).</td></tr>";
  echo "<tr><th>EMD Relative</th><td><a href=\"http://en.wikipedia.org/wiki/Earth_mover's_distance\">Earth mover's distance</a>. E / (E + F).</td></tr>";
  echo "<tr><th>EMD Path</th><td><a href=\"http://en.wikipedia.org/wiki/Earth_mover's_distance\">Earth mover's distance</a>. (A + B) / (A + B + C + D).</td></tr>";
  echo "</table></div>";
  echo '<table class="results">';
  echo '<tr><th>Time (ms)</th><th>Image</th>';
  foreach ($algorithms as $label) {
    echo '<th>' . htmlspecialchars($label) . '<br>' . $progress['speedindex'][$label] . '</th>';
  }
  echo '</tr>';
  $progress_end = 0;
  foreach ($progress['frames'] as $time => $file) {
    if ($time > $progress_end)
      $progress_end = $time;
    echo '<tr>';
    echo "<td class=\"time\">$time</td>";
    echo "<td class=\"image\"><img src=\"" . htmlspecialchars($progress['video']) . "/$file\"></td>";
    foreach ($algorithms as $algorithm) {
      $value = '';
      if (array_key_exists($time, $progress['progress'][$algorithm]))
        $value = number_format($progress['progress'][$algorithm][$time], 1) . ' %';
      echo '<td>' . htmlspecialchars($value) . '</td>';
    }
    echo '</tr>';
  }
  echo '</table>';
  echo "<script type=\"text/javascript\" src=\"//www.google.com/jsapi\"></script>'\n";
  echo "<script type=\"text/javascript\">\n";
  echo "google.load('visualization', '1', {'packages':['table', 'corechart']});\n";
  echo "google.setOnLoadCallback(drawCharts);\n";
  echo "var selectedImage = document.getElementById('videoFrame');\n";
  echo "var selectedStat = document.getElementById('stats');\n";
  echo "var selectedFrame = undefined;\n";
  echo "var progressChart = undefined;\n";
  echo "var frames = {";
  $first = true;
  foreach ($progress['frames'] as $time => $file) {
    if ($first) {
      echo "\n";
      $first = false;
    } else {
      echo ",\n";
    }
    echo "$time: {'img': '" . htmlspecialchars($progress['video']) . "/$file', 'label':'($time ms)";
    foreach ($algorithms as $algorithm) {
      $value = '';
      if (array_key_exists($time, $progress['progress'][$algorithm]))
        $value = number_format($progress['progress'][$algorithm][$time], 1) . ' %';
      echo "<br>$value - $algorithm";
    }
    echo "'}";
  }
  echo "};\n";
  echo "function onSelect() {\n";
  echo "selected = progressChart.getSelection();\n";
  echo "if (selected.length) {\n";
  echo "selectedFrame = selected[0].row * 100;\n";
  echo "window.location.hash = selectedFrame;\n";
  echo "selectFrame(selectedFrame);\n";
  echo "} else {\n";
  echo "selectedFrame = undefined;\n";
  echo "}\n";
  echo "};\n";
  echo "function onMouseOver(data) {\n";
  echo "if (selectedFrame == undefined) selectFrame(data['row'] * 100);\n";
  echo "};\n";
  echo "function selectFrame(ms) {\n";
  echo "ms = parseInt(ms) || 0;\n";
  echo "var closest = 0;\n";
  echo "for (time in frames) {\n";
  echo "if (parseInt(time) <= parseInt(ms) && parseInt(time) > closest) closest = parseInt(time);\n";
  echo "}\n";
  echo "selectedStat.innerHTML = ms + ' ms ' + frames[closest].label;\n";
  echo "selectedImage.src = frames[closest].img;\n";
  echo "};\n";
  echo "selectFrame(parseInt(window.location.hash.slice(1)));\n";
  echo "function drawCharts() {\n";
  echo "var dataProgress = google.visualization.arrayToDataTable([\n";
  echo "  ['Time (ms)'";
  foreach($algorithms as $label)
    echo ", '$label'";
  echo "]";
  for ($ms = 0; $ms < $progress_end + 100; $ms += 100) {
    echo ",\n  ['" . number_format($ms / 1000, 1) . "'";
    $frame_ms = 0;
    foreach ($progress['frames'] as $time => $file) {
      if ($time <= $ms && $time > $frame_ms)
        $frame_ms = $time;
    }
    foreach($algorithms as $algorithm) {
      $value = '';
      if (array_key_exists($frame_ms, $progress['progress'][$algorithm]))
        $value = number_format($progress['progress'][$algorithm][$frame_ms], 1);
      echo ", $value";
    }
    echo "]";
  }
  echo "]);\n"; // end of dataProgress
  echo "progressChart = new google.visualization.LineChart(document.getElementById('compare_visual_progress'));\n";
  echo "google.visualization.events.addListener(progressChart, 'onmouseover', onMouseOver);\n";
  echo "google.visualization.events.addListener(progressChart, 'select', onSelect);\n";
  echo "progressChart.draw(dataProgress, {title: 'Visual Progress (%)', hAxis: {title: 'Time (Seconds)'}, chartArea: {width: '70%'}});\n";
  echo "}\n";
  echo "</script>\n";
}

function VisualProgressOriginal(&$progress, $label, $ignoreWhite) {
  $progress['progress'][$label] = array();
  end($progress['frames']);
  $last = $progress['videoDir'] . '/' . current($progress['frames']);
  $lastHistogram = Histogram($last, $ignoreWhite, 'RGB');
  reset($progress['frames']);
  $first = $progress['videoDir'] . '/' . current($progress['frames']);
  $firstHistogram = Histogram($first, $ignoreWhite, 'RGB');
  foreach ($progress['frames'] as $time => $file) {
    $file = "{$progress['videoDir']}/$file";
    if ($file === $first) {
      $progress['progress'][$label][$time] = 0;
    } elseif ($file === $last) {
      $progress['progress'][$label][$time] = 100;
    } else {
      $histogram = Histogram($file, $ignoreWhite, 'RGB');
      $progress['progress'][$label][$time] = CalculateFrameProgress($histogram, $firstHistogram, $lastHistogram);
    }
  }
  $progress['speedindex'][$label] = CalculateSpeedIndex($progress['progress'][$label]);
}

function VisualProgressEMD(&$progress, $label, $colorSpace = 'RGB') {
  $progress['progress'][$label] = array();
  end($progress['frames']);
  $last = $progress['videoDir'] . '/' . current($progress['frames']);
  $lastHistogram = Histogram($last, false, $colorSpace);
  reset($progress['frames']);
  $first = $progress['videoDir'] . '/' . current($progress['frames']);
  $firstHistogram = Histogram($first, false, $colorSpace);
  $totalDistance = EarthMoversDistance($firstHistogram, $lastHistogram);
  foreach ($progress['frames'] as $time => $file) {
    $file = "{$progress['videoDir']}/$file";
    if ($file === $first) {
      $progress['progress'][$label][$time] = 0;
    } elseif ($file === $last) {
      $progress['progress'][$label][$time] = 100;
    } else {
      $histogram = Histogram($file, false, $colorSpace);
      $distance = EarthMoversDistance($histogram, $lastHistogram);
      $moved = max($totalDistance - $distance, 0);
      $progress['progress'][$label][$time] = ($moved / $totalDistance) * 100.0;
    }
  }
  $progress['speedindex'][$label] = CalculateSpeedIndex($progress['progress'][$label]);
}

function VisualProgressEMDRelative(&$progress, $label, $colorSpace = 'RGB') {
  $progress['progress'][$label] = array();
  end($progress['frames']);
  $last = $progress['videoDir'] . '/' . current($progress['frames']);
  $lastHistogram = Histogram($last, false, $colorSpace);
  reset($progress['frames']);
  $first = $progress['videoDir'] . '/' . current($progress['frames']);
  $firstHistogram = Histogram($first, false, $colorSpace);
  foreach ($progress['frames'] as $time => $file) {
    $file = "{$progress['videoDir']}/$file";
    if ($file === $first) {
      $progress['progress'][$label][$time] = 0;
    } elseif ($file === $last) {
      $progress['progress'][$label][$time] = 100;
    } else {
      $histogram = Histogram($file, false, $colorSpace);
      $moved = EarthMoversDistance($firstHistogram, $histogram);
      $remaining = EarthMoversDistance($histogram, $lastHistogram);
      $progress['progress'][$label][$time] = ($moved / ($moved + $remaining)) * 100.0;
    }
  }
  $progress['speedindex'][$label] = CalculateSpeedIndex($progress['progress'][$label]);
}

function VisualProgressEMDPath(&$progress, $label, $colorSpace = 'RGB') {
  $progress['progress'][$label] = array();
  end($progress['frames']);
  $last = $progress['videoDir'] . '/' . current($progress['frames']);
  reset($progress['frames']);
  $first = $progress['videoDir'] . '/' . current($progress['frames']);
  $cumulativeDistance = array();
  $total = 0;
  $previousHistogram = null;
  foreach ($progress['frames'] as $time => $file) {
    $histogram = Histogram("{$progress['videoDir']}/$file", false, $colorSpace);
    if (isset($previousHistogram)) {
      $total += EarthMoversDistance($previousHistogram, $histogram);
      $cumulativeDistance[$time] = $total;
    }
    $previousHistogram = $histogram;
  }
  foreach ($progress['frames'] as $time => $file) {
    $file = "{$progress['videoDir']}/$file";
    if ($file === $first) {
      $progress['progress'][$label][$time] = 0;
    } elseif ($file === $last) {
      $progress['progress'][$label][$time] = 100;
    } else {
      $progress['progress'][$label][$time] = ($cumulativeDistance[$time] / $total) * 100.0;
    }
  }
  $progress['speedindex'][$label] = CalculateSpeedIndex($progress['progress'][$label]);
}


/**
* Calculate a RGB histogram excluding white pixels
* 
* @param mixed $image_file
* @param mixed $ignoreWhite - bool - should white pixels be ignored
* @param mixed $colorSpace - string - RGB, HSV or YUV
*/
function Histogram($image_file, $ignoreWhite, $colorSpace = 'RGB') {
  global $viewport;
  $histogram = null;
  $nowhite = $ignoreWhite ? '.nowhite' : '';
  $histogram_file = "$image_file$nowhite.$colorSpace.hist";
  if (is_file($histogram_file)) {
    $histogram = json_decode(file_get_contents($histogram_file));
  } else {
    $im = imagecreatefrompng($image_file);
    if ($im !== false) {
      $right = imagesx($im);
      $bottom = imagesy($im);
      $left = 0;
      $top = 0;
      if (isset($viewport)) {
        $left = $viewport['x'];
        $top = $viewport['y'];
        $right = $left + $viewport['width'];
        $bottom = $top + $viewport['height'];
      }
      $histogram = array(array(), array(), array());
      $buckets = 256;
      for ($i = 0; $i < $buckets; $i++) {
        $histogram[0][$i] = 0;
        $histogram[1][$i] = 0;
        $histogram[2][$i] = 0;
      }
      for ($y = $top; $y < $bottom; $y++) {
        for ($x = $left; $x < $right; $x++) {
          $rgb = ImageColorAt($im, $x, $y);
          $r = ($rgb >> 16) & 0xFF;
          $g = ($rgb >> 8) & 0xFF;
          $b = $rgb & 0xFF;
          // ignore white pixels
          if (!$ignoreWhite || $r != 255 || $g != 255 || $b != 255) {
            if ($colorSpace == 'HSV')
              RGB_TO_HSV($r, $g, $b);
            elseif ($colorSpace == 'YUV')
              RGB_TO_YUV($r, $g, $b);
            $histogram[0][$r]++;
            $histogram[1][$g]++;
            $histogram[2][$b]++;
          }
        }
      }
      imagedestroy($im);
      unset($im);
      file_put_contents($histogram_file, json_encode($histogram));
    }
  }
  return $histogram;
}

/**
* Earth mover's distance.

  http://en.wikipedia.org/wiki/Earth_mover's_distance
  First, normalize the two histograms. Then, treat the two histograms as
  piles of dirt, and calculate the cost of turning one pile into the other.

  To do this, calculate the difference in one bucket between the two
  histograms. Then carry it over in the calculation for the next bucket.
  In this way, the difference is weighted by how far it has to move.
  
  Adapted from the Chromium Implementation:
  https://code.google.com/p/chromium/codesearch#chromium/src/tools/telemetry/telemetry/core/bitmap.py&l=24
  
  if len(hist1) != len(hist2):
    raise ValueError('Trying to compare histograms '
      'of different sizes, %s != %s' % (len(hist1), len(hist2)))

  n1 = sum(hist1)
  n2 = sum(hist2)
  if n1 == 0:
    raise ValueError('First histogram has 0 pixels in it.')
  if n2 == 0:
    raise ValueError('Second histogram has 0 pixels in it.')

  total = 0
  remainder = 0
  for value1, value2 in zip(hist1, hist2):
    remainder += value1 * n2 - value2 * n1
    total += abs(remainder)
  assert remainder == 0, (
      '%s pixel(s) left over after computing histogram distance.'
      % abs(remainder))
  return abs(float(total) / n1 / n2)
    
* 
* @param mixed $start
* @param mixed $end
*/
function EarthMoversDistance(&$hist1, &$hist2) {
  $distance = 0;
  $channels = count($hist1);
  for ($channel = 0; $channel < $channels; $channel++) {
    $buckets = count($hist1[$channel]);
    $total = 0;
    $remainder = 0;
    for ($bucket = 0; $bucket < $buckets; $bucket++) {
      $remainder += $hist1[$channel][$bucket] - $hist2[$channel][$bucket];
      $total += abs($remainder);
    }
    $distance += $total;
  }
  return $distance;
}

/**
* Convert RGB values (0-255) into HSV values (and force it into a 0-255 range)
* Return the values in-place (R = H, G = S, B = V)
*
* @param mixed $R
* @param mixed $G
* @param mixed $B
*/
function RGB_TO_HSV(&$R, &$G, &$B) {
   $HSL = array();

   $var_R = ($R / 255);
   $var_G = ($G / 255);
   $var_B = ($B / 255);

   $var_Min = min($var_R, $var_G, $var_B);
   $var_Max = max($var_R, $var_G, $var_B);
   $del_Max = $var_Max - $var_Min;

   $V = $var_Max;

   if ($del_Max == 0) {
      $H = 0;
      $S = 0;
   } else {
      $S = $del_Max / $var_Max;

      $del_R = ( ( ( $var_Max - $var_R ) / 6 ) + ( $del_Max / 2 ) ) / $del_Max;
      $del_G = ( ( ( $var_Max - $var_G ) / 6 ) + ( $del_Max / 2 ) ) / $del_Max;
      $del_B = ( ( ( $var_Max - $var_B ) / 6 ) + ( $del_Max / 2 ) ) / $del_Max;

      if      ($var_R == $var_Max) $H = $del_B - $del_G;
      else if ($var_G == $var_Max) $H = ( 1 / 3 ) + $del_R - $del_B;
      else if ($var_B == $var_Max) $H = ( 2 / 3 ) + $del_G - $del_R;

      if ($H<0) $H++;
      if ($H>1) $H--;
   }

   $R = min(max((int)($H * 255), 0), 255);
   $G = min(max((int)($S * 255), 0), 255);
   $B = min(max((int)($V * 255), 0), 255);
}

/**
* Convert RGB in-place to YUV
*/
function RGB_TO_YUV(&$r, &$g, &$b) {
    $Y = (0.257 * $r) + (0.504 * $g) + (0.098 * $b) + 16;
    $U = -(0.148 * $r) - (0.291 * $g) + (0.439 * $b) + 128;
    $V = (0.439 * $r) - (0.368 * $g) - (0.071 * $b) + 128;
    $r = min(max((int)$Y, 0), 255);
    $g = min(max((int)$U, 0), 255);
    $b = min(max((int)$V, 0), 255);
}

/**
* Calculate how close a given histogram is to the final
*/
function CalculateFrameProgress(&$histogram, &$start_histogram, &$final_histogram) {
  $progress = 0;
  $channelCount = count($histogram);
  foreach ($histogram as $channel => &$values) {
    $total = 0;
    $achieved = 0;
    $buckets = count($values);
    for ($i = 0; $i < $buckets; $i++) 
      $total += abs($final_histogram[$channel][$i] - $start_histogram[$channel][$i]);
    for ($i = 0; $i < $buckets; $i++)
      $achieved += min(abs($final_histogram[$channel][$i] - $start_histogram[$channel][$i]), abs($histogram[$channel][$i] - $start_histogram[$channel][$i]));
    $progress += ($achieved / $total) / $channelCount;
  }
  return ($progress * 100);
}

function CalculateSpeedIndex(&$frames) {
    $last_ms = 0;
    $last_progress = 0;
    $index = 0;
    foreach($frames as $time => &$progress) {
      $elapsed = $time - $last_ms;
      $index += $elapsed * (1.0 - $last_progress);
      $last_ms = $time;
      $last_progress = $progress / 100.0;
    }
    $index = (int)($index);

    return $index;
}

?>
