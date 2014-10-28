<?php
chdir('..');
require_once('common_lib.inc');
require_once('video/visualProgress.inc.php');
ignore_user_abort(true);
set_time_limit(600);

// Globals used throughout the video render
$width = 800;
$height = 600;
$padding = 2;
$minThumbnailSize = 100;
$black = null;
$textColor = null;
$image_bytes = null;
$timeFont = __DIR__ . '/font/sourcesanspro-semibold.ttf';
$labelFont = __DIR__ . '/font/sourcesanspro-semibold.ttf';
$labelHeight = 30;
$timeHeight = 50;
$timePadding = 4;
$maxAspectRatio = 0;
$min_font_size = 8;
$videoExtendTime = 3000;

// Load the information about the video that needs rendering
if (isset($_REQUEST['id'])) {
  $videoId = trim($_REQUEST['id']);
  $videoPath = './' . GetVideoPath($_REQUEST['id']);
  if (!is_file("$videoPath/video.ini")) {
    $optionsFile = "$videoPath/testinfo.json";
    if (gz_is_file($optionsFile)) {
      $tests = json_decode(gz_file_get_contents($optionsFile), true);
      if (isset($tests) && !is_array($tests))
        unset($tests);
    }
  }
}

// Render the video
if (isset($tests) && count($tests)) {
//  $lock = Lock("video-$videoId", false, 600);
//  if ($lock) {
    RenderVideo($tests);
//    $ini .= 'completed=' . gmdate('c') . "\r\n";
//    file_put_contents("$videoPath/video.ini", $ini);
//    Unlock($lock);
//  }
}

function RenderVideo(&$tests) {
  global $width, $height, $maxAspectRatio, $videoExtendTime;
  
  // Figure out the end time of the video and
  // make sure all of the tests are restored.
  $videoEnd = 0;
  foreach($tests as &$test) {
    if (isset($test['id']))
      RestoreTest($test['id']);
    if (isset($test['end']) && is_numeric($test['end']) && $test['end'] > $videoEnd)
      $videoEnd = $test['end'];
    if (isset($test['path']) &&
        isset($test['run']) &&
        isset($test['cached'])) {
      $progress = GetVisualProgress("./{$test['path']}", $test['run'], $test['cached']);
      if (isset($progress) && is_array($progress) && isset($progress['frames'])) {
        $test['frames'] = $progress['frames'];
        if (count($test['frames'])) {
          $frame = current($test['frames']);
          $dim = getimagesize("./{$frame['path']}");
          $test['aspect'] = $dim[0] / $dim[1];
          if ($test['aspect'] > $maxAspectRatio)
            $maxAspectRatio = $test['aspect'];
        }
      }
    }
  }
  
  if ($videoEnd > 0) {
    $videoEnd += $videoExtendTime;
    $frameCount = ceil($videoEnd * 60 / 1000);  // 60fps
    CalculateVideoDimensions($tests);
    $im = imagecreatetruecolor($width, $height);
    if ($im !== false) {
      RenderFrames($tests, $frameCount, $im);
      imagedestroy($im);
    }
  }
}

/**
* Figure out the dimensions of the resulting video
* 
*/
function CalculateVideoDimensions(&$tests) {
  global $width, $height, $minThumbnailSize, $padding, $labelHeight, $timeHeight, $timePadding, $maxAspectRatio;
  
  $count = count($tests);
  if ($count <= 25) {
    if ($maxAspectRatio < 1) {
      // all mobile, 4 across before going to 2 rows
      $rows = ($count <= 16) ? ceil($count / 4) : ceil($count / 5);
    } else {
      // wide-aspect (desktop)
      if ($count <= 9)
        $rows = ceil($count / 3);
      elseif ($count <= 16)
        $rows = ceil($count / 4);
      else
        $rows = ceil($count / 5);
    }
  } else {
    $rows = max(floor(sqrt($count)), 1);
  }
  $columns = max(ceil($count / $rows), 1);
  
  $cellWidth = max(floor($width / $columns), $minThumbnailSize + $padding);
  $cellHeight = max(floor($height - (($labelHeight + $timeHeight) * $rows) / $rows), $minThumbnailSize + $padding);
  
  $videoWidth = ($cellWidth * $columns) + $padding;
  $width = floor(($videoWidth + 7) / 8) * 8;  // Multiple of 8
  
  // Tighten the row sizes to fit each video (keep columns fixed for labeling)
  $row_h = array();
  foreach ($tests as $position => &$test) {
    $row = floor($position / $columns);
    $column = $position % $columns;
    if (isset($row_h[$row]) && $row_h[$row] > 0)
      $row_h[$row] = min($row_h[$row], $test['aspect']);
    else
      $row_h[$row] = $test['aspect'];
  }
  $height = 0;
  foreach ($row_h as $row => $aspect) {
    if ($aspect > 0)
      $row_h[$row] = min($cellHeight, ceil($cellWidth / $aspect));
    else
      $row_h[$row] = $cellHeight;
    $height += $row_h[$row];
  }
  $videoHeight = $height + $padding + (($labelHeight + $timeHeight) * $rows);
  $height = floor(($videoHeight + 7) / 8) * 8;  // Multiple of 8

  // figure out the left and right margins
  $left = floor(($width - $videoWidth) / 2);
  $top = floor(($height - $videoHeight) / 2);

  // Figure out the placement of each video  
  $y = $top + $labelHeight;
  foreach ($tests as $position => &$test) {
    $row = floor($position / $columns);
    $column = $position % $columns;
    if ($column == 0 && $row > 0)
      $y += $row_h[$row - 1] + $timeHeight + $labelHeight;
    
    // Thumbnail image
    $test['thumbRect'] = array();
    $test['thumbRect']['x'] = $left + ($column * $cellWidth) + $padding;
    $test['thumbRect']['y'] = $y + $padding;
    $test['thumbRect']['width'] = $cellWidth - $padding;
    $test['thumbRect']['height'] = $row_h[$row] - $padding;
    
    // Label
    $test['labelRect'] = array();
    $test['labelRect']['x'] = $left + ($column * $cellWidth) + $padding;
    $test['labelRect']['y'] = $y - $labelHeight + $padding;
    $test['labelRect']['width'] = $cellWidth - $padding;
    $test['labelRect']['height'] = $labelHeight - $padding;
    
    // Time
    $test['timeRect'] = array();
    $test['timeRect']['x'] = $left + ($column * $cellWidth) + $padding;
    $test['timeRect']['y'] = $y + $padding + $timePadding + $row_h[$row];
    $test['timeRect']['width'] = $cellWidth - $padding;
    $test['timeRect']['height'] = $timeHeight - $timePadding;
  }
}

/**
* Render the actual video frames
* 
* @param mixed $tests
* @param mixed $frameCount
* @param mixed $im
*/
function RenderFrames(&$tests, $frameCount, $im) {
  global $width, $height, $black, $videoPath, $image_bytes, $textColor;
  
  // prepare the image (black background)
  $black = imagecolorallocate($im, 0, 0, 0);
  $textColor = imagecolorallocate($im, 255, 255, 255);
  imagefilledrectangle($im, 0, 0, $width - 1, $height - 1, $black);
  $firstImage = true;
  
  // set up ffmpeg
  $descriptors = array(0 => array("pipe", "r"));
  $videoFile = realpath($videoPath) . '/video.mp4';
  if (is_file($videoFile))
    unlink($videoFile);
  $command = "ffmpeg -f image2pipe -r 60 -vcodec png -i - ".
                  "-vcodec libx264 -r 60 -crf 26 -g 30 ".
                  "-y \"$videoFile\"";
  $ffmpeg = proc_open($command, $descriptors, $pipes);
  if (is_resource($ffmpeg)){
    DrawLabels($tests, $im);
    for ($frame = 0; $frame < $frameCount; $frame++) {
      RenderFrame($tests, $frame, $im);
      if (isset($image_bytes)) {
        fwrite($pipes[0], $image_bytes);
        if ($firstImage) {
          file_put_contents("$videoPath/video.png", $image_bytes);
          $firstImage = false;
        }
      }
    }
    fclose($pipes[0]);
    proc_close($ffmpeg);
  }
}

/**
* Render an individual frame
* 
* @param mixed $tests
* @param mixed $frame
* @param mixed $im
*/
function RenderFrame(&$tests, $frame, $im) {
  global $videoPath, $image_bytes;
  $updated = false;
  $frameTime = ceil($frame * 1000 / 60);
  foreach ($tests as &$test) {
    if (DrawTest($test, $frameTime, $im))
      $updated = true;
  }
  if ($updated) {
    $image_bytes = null;
    ob_start();
    imagepng($im);
    $image_bytes = ob_get_contents();
    ob_end_clean();
  }
}

/**
* Draw the labels for all of the tests
* 
*/
function DrawLabels($tests, $im) {
  global $min_font_size, $labelFont;
  // First, go through and pick a font size that will fit all of the labels
  $maxLabelLen = 30;
  do {
    $font_size = GetLabelFontSize($tests);
    if ($font_size < $min_font_size) {
      // go through and trim the length of all the labels
      foreach($tests as &$test) {
        if (isset($test['label']) && strlen($test['label']) > $maxLabelLen) {
          $test['label'] = substr($test['label'], 0, $maxLabelLen) . '...';
        }
      }
      $maxLabelLen--;
    }
  } while($font_size < $min_font_size);
  
  if ($font_size > $min_font_size) {
    foreach($tests as &$test) {
      if (isset($test['label']) && strlen($test['label'])) {
        $rect = $test['labelRect'];
        CenterText($im, $rect['x'], $rect['y'], $rect['width'], $rect['height'], $font_size, $test['label'], $labelFont);
      }
    }
  }
}

function GetLabelFontSize($tests) {
  global $labelFont;
  $font_size = null;
  foreach($tests as $test) {
    if (isset($test['label']) && strlen($test['label'])) {
      $size = GetFontSize($test['labelRect']['width'], $test['labelRect']['height'], $test['label'], $labelFont);
      if (!isset($font_size) || $size < $font_size)
        $font_size = $size;
    }
  }
  return $font_size;
}

/**
* Draw the appropriate thumbnail for the given frame
* 
* @param mixed $test
* @param mixed $frameTime
* @param mixed $im
*/
function DrawTest(&$test, $frameTime, $im) {
  global $black;
  $updated = false;

  // find the closest video frame <= the target time
  $frame_ms = null;
  foreach ($test['frames'] as $ms => $frame) {
    if ($ms <= $frameTime && $ms <= $test['end'] && (!isset($frame_ms) || $ms > $frame_ms))
      $frame_ms = $ms;
  }
  $path = null;
  if (isset($frame_ms))
    $path = $test['frames'][$frame_ms]['path'];
  
  $need_grey = false;
  if (!isset($test['done']) && $frameTime > $test['end']) {
    $need_grey = true;
    $test['done'] = true;
  }
    
  // see if we actually need to draw anything
  if (isset($path) && (!isset($test['lastFrame']) || $test['lastFrame'] !== $path || $need_grey)) {
    $test['lastFrame'] = $path;
    $thumb = imagecreatefromjpeg("./$path");
    if ($thumb) {
      if ($need_grey)
        imagefilter($thumb, IMG_FILTER_GRAYSCALE);
      // Scale and center the thumbnail aspect-correct in the area reserved for it
      $rect = $test['thumbRect'];
      $thumb_w = imagesx($thumb);
      $thumb_h = imagesy($thumb);
      $scale = min($rect['width'] / $thumb_w, $rect['height'] / $thumb_h);
      $w = min(floor($thumb_w * $scale), $rect['width']);
      $h = min(floor($thumb_h * $scale), $rect['height']);
      $x = $rect['x'] + floor(($rect['width'] - $w) / 2);
      $y = $rect['y'] + floor(($rect['height'] - $h) / 2);
      imagefilledrectangle($im, $x, $y, $x + $w, $y + $h, $black);
      fastimagecopyresampled($im, $thumb, $x, $y, 0, 0, $w, $h, $thumb_w, $thumb_h, 4);
      imagedestroy($thumb);
      $updated = true;
    }
  }

  if ($frameTime <= $test['end'] && DrawFrameTime($test, $frameTime, $im, $test['timeRect']))
    $updated = true;

  return $updated;
}

function DrawFrameTime(&$test, $frameTime, $im, $rect) {
  global $timeHeight, $black, $timeFont;
  static $font_size = 0;
  static $ascent = 0;
  $updated = false;
  
  if (!$font_size)
    $font_size = GetFontSize($rect['width'], $rect['height'], "000.00", $timeFont);
  if (!$ascent && $font_size) {
    $box = imagettfbbox($font_size, 0, $timeFont, "12345678.90");
    $ascent = abs($box[7]);
  }
    
  $seconds = floor($frameTime / 1000);
  $tenths = floor($frameTime / 100) % 10;
  $time = "$seconds.$tenths";
  if (!isset($test['last_time']) || $test['last_time'] !== $time) {
    $updated = true;
    $test['last_time'] = $time;
    imagefilledrectangle($im, $rect['x'], $rect['y'], $rect['x'] + $rect['width'], $rect['y'] + $rect['height'], $black);
    CenterText($im, $rect['x'], $rect['y'], $rect['width'], $rect['height'], $font_size, $time, $timeFont, $ascent);
  }
  
  return $updated;
}

function GetFontSize($width, $height, $text, $font) {
  $small = 0;
  $big = 100;
  $size = 50;
  do {
    $last_size = $size;
    $box = imagettfbbox($size, 0, $font, $text);
    $w = abs($box[4] - $box[0]);
    $h = abs($box[5] - $box[1]);
    if ($w < $width && $h < $height) {
      $small = $size;
      $size = floor($size + (($big - $size) / 2));
    } else {
      $big = $size;
      $size = floor($size - (($size - $small) / 2));
    }
  } while ($last_size !== $size && $size > 0);
  
  return $size;
}

function CenterText($im, $x, $y, $w, $h, $size, $text, $font, $ascent = null) {
  global $textColor;
  $ret = null;
  if (!$size)
    $size = GetFontSize($w, $h, $text);
  if ($size) {
    $box = imagettfbbox($size, 0, $font, $text);
    if (!isset($ascent))
      $ascent = abs($box[7]);
    $out_w = abs($box[4] - $box[0]);
    $out_h = abs($box[5] - $box[1]);
    $left = floor($x + (($w - $out_w) / 2));
    $top = floor($y + (($h - $out_h) / 2)) + $ascent;
    $ret = imagettftext($im, $size, 0, $left, $top, $textColor, $font, $text);
  }
  return $ret;
}
?>
