<?php
if(extension_loaded('newrelic')) {
    newrelic_add_custom_tracer('GetVisualProgress');
    newrelic_add_custom_tracer('GetImageHistogram');
}
require_once('devtools.inc.php');

/**
* Calculate the progress for all of the images in a given directory
*/
function GetVisualProgress($testPath, $run, $cached, $options = null, $end = null, $startOffset = null) {
  // TODO: in the long run this function might get redundant as the version below is more flexible
  $frames = null;
  $testPath = $testPath[0] == '.' || $testPath[0] == "/" ? $testPath : "./$testPath";
  $localPaths = new TestPaths($testPath, $run, $cached);
  $testInfo = GetTestInfo($testPath);
  $completed = IsTestRunComplete($run, $testInfo);
  return GetVisualProgressForStep($localPaths, $completed, $options, $end, $startOffset);
}

/**
 * Retrieves the visual progress for a run/step, based on the files passed through $localPaths
 *
 * @param TestPaths $localPaths TestPaths object for this step/run
 * @param bool $runCompleted If the run was completed
 * @param array $options Options for image histogram
 * @param float|int $end Optional end value
 * @param float|int $startOffset Optional start offset
 * @return array|null The visual progress as an array or null
 */
function GetVisualProgressForStep($localPaths, $runCompleted, $options = null, $end = null, $startOffset = null) {
  $frames = null;
  $video_directory = $localPaths->videoDir();
  $cache_file = $localPaths->visualDataCacheFile();
  if (!isset($startOffset))
    $startOffset = 0;
  $visual_data_file = $localPaths->visualDataFile();
  $histograms_file = $localPaths->histogramsFile();
  if (gz_is_file($visual_data_file)) {
    $visual_data = json_decode(gz_file_get_contents($visual_data_file), true);
    // see if we are processing an externally-uploaded visual data file
    if (isset($visual_data['timespans']['page_load']['startOffset']))
      $startOffset += $visual_data['timespans']['page_load']['startOffset'];
  }
  $dirty = false;
  $current_version = VIDEO_CODE_VERSION;
  if (isset($end)) {
    if (is_numeric($end))
      $end = (int)($end * 1000);
    else
      unset($end);
  }
  if (!isset($end) && !isset($options) && gz_is_file($cache_file)) {
    $frames = json_decode(gz_file_get_contents($cache_file), true);
    if (isset($frames)) {
      if (is_array($frames)) {
        if (!array_key_exists('frames', $frames) || !array_key_exists('version', $frames))
          unset($frames);
        elseif(array_key_exists('version', $frames) && $frames['version'] !== $current_version)
          unset($frames);
      } else {
        unset($frames);
      }
    }
  }    
  $base_path = substr($video_directory, 1);
  if ((!isset($frames) || !count($frames)) && (is_dir($video_directory) || gz_is_file($histograms_file))) {
    $frames = array('version' => $current_version);
    $frames['frames'] = array();
    $dirty = true;
    if (is_dir($video_directory)) {
      $files = scandir($video_directory);
      $last_file = null;
      $first_file = null;
      $previous_file = null;
      foreach ($files as $file) {
        if (strpos($file,'frame_') !== false && strpos($file,'.hist') === false) {
          $parts = explode('_', $file);
          if (count($parts) >= 2) {
            $time = (((int)$parts[1]) * 100) - $startOffset;
            if ($time >= 0 && (!isset($end) || $time <= $end)) {
              if (isset($previous_file) && !array_key_exists(0, $frames['frames']) && $time > 0) {
                $frames['frames'][0] = array('path' => "$base_path/$previous_file",
                                             'file' => $previous_file);
                $first_file = $previous_file;
              } elseif (!isset($first_file))
                $first_file = $file;
              $last_file = $file;
              $frames['frames'][$time] = array('path' => "$base_path/$file",
                                               'file' => $file);
            }
            $previous_file = $file;
          }
        } elseif (strpos($file,'ms_') !== false && strpos($file,'.hist') === false) {
          $parts = explode('_', $file);
          if (count($parts) >= 2) {
            $time = intval($parts[1]) - $startOffset;
            if ($time >= 0 && (!isset($end) || $time <= $end)) {
              if (isset($previous_file) && !array_key_exists(0, $frames['frames']) && $time > 0) {
                $frames['frames'][0] = array('path' => "$base_path/$previous_file",
                                             'file' => $previous_file);
                $first_file = $previous_file;
              } elseif (!isset($first_file))
                $first_file = $file;
              $last_file = $file;
              $frames['frames'][$time] = array('path' => "$base_path/$file",
                                               'file' => $file);
            }
            $previous_file = $file;
          }
        }
      }
      if (count($frames['frames']) == 1) {
        foreach($frames['frames'] as $time => &$frame) {
          $frame['progress'] = 100;
          $frames['complete'] = $time;
        }
      } elseif (isset($first_file) && strlen($first_file) &&
                isset($last_file) && strlen($last_file) && count($frames['frames'])) {
        $histograms = null;
        if (gz_is_file($histograms_file))
          $histograms = json_decode(gz_file_get_contents($histograms_file), true);
        $start_histogram = GetImageHistogram("$video_directory/$first_file", $options, $histograms);
        $final_histogram = GetImageHistogram("$video_directory/$last_file", $options, $histograms);
        foreach($frames['frames'] as $time => &$frame) {
          $histogram = GetImageHistogram("$video_directory/{$frame['file']}", $options, $histograms);
          $frame['progress'] = CalculateFrameProgress($histogram, $start_histogram, $final_histogram, 5);
          if ($frame['progress'] == 100 && !array_key_exists('complete', $frames))
            $frames['complete'] = $time;
        }
      }
    } elseif (gz_is_file($histograms_file)) {
      $raw = json_decode(gz_file_get_contents($histograms_file), true);
      $histograms = array();
      foreach ($raw as $h) {
        if (isset($h['time']) && isset($h['histogram']))
          $histograms[$h['time']] = $h['histogram'];
      }
      ksort($histograms, SORT_NUMERIC);
      $final_histogram = end($histograms);
      $start_histogram = reset($histograms);
      foreach ($histograms as $time => $histogram) {
        $frames['frames'][$time] = array();
        $progress = CalculateFrameProgress($histogram, $start_histogram, $final_histogram, 5);
        $frames['frames'][$time]['progress'] = $progress;
        if ($progress == 100 && !isset($frames['complete']))
          $frames['complete'] = $time;
      }
    }
  }
  if (isset($frames) && !array_key_exists('SpeedIndex', $frames)) {
    $dirty = true;
    $frames['SpeedIndex'] = CalculateSpeedIndex($frames);
  }
  if (isset($frames)) {
    $frames['visualComplete'] = 0;
    foreach($frames['frames'] as $time => &$frame) {
      if ($frame['progress'] > 0 && !array_key_exists('startRender', $frames))
        $frames['startRender'] = $time;
      if (!isset($frames['visualComplete85']) && $frame['progress'] >= 85)
        $frames['visualComplete85'] = $time;
      if (!$frames['visualComplete'] && $frame['progress'] == 100)
        $frames['visualComplete'] = $time;
      // fix up the frame paths in case we have a cached version referencing a relay path
      if (isset($frame['path']))
        $frame['path'] = $base_path . '/' . basename($frame['path']);
    }
  }
  if ($runCompleted && !isset($end) && !isset($options) && $dirty && isset($frames) && count($frames))
    gz_file_put_contents($cache_file,json_encode($frames));
  return $frames;
}

/**
* Calculate histograms for each color channel for the given image
*/
function GetImageHistogram($image_file, $options, $histograms) {
  $histogram = null;
  
  $ext = strripos($image_file, '.jpg');
  if ($ext !== false) {
      $histogram_file = substr($image_file, 0, $ext) . '.hist';
  } else {
    $ext = strripos($image_file, '.png');
    if ($ext !== false)
        $histogram_file = substr($image_file, 0, $ext) . '.hist';
  }
  
  if (isset($histograms)) {
    // figure out the timestamp for the video frame in ms
    $ms = null;
    if (preg_match('/ms_(?P<ms>[0-9]+)\.(png|jpg)/i', $image_file, $matches))
      $ms = intval($matches['ms']);
    elseif (preg_match('/frame_(?P<ms>[0-9]+)\.(png|jpg)/i', $image_file, $matches))
      $ms = intval($matches['ms']) * 100;
    foreach($histograms as &$hist) {
      if (isset($hist['histogram']) && isset($hist['time']) && $hist['time'] == $ms) {
        $histogram = $hist['histogram'];
        break;
      }
    }
  }
  
  // See if we have the old-style histograms (separate files)
  if (!isset($histogram) && !isset($options) && isset($histogram_file) && is_file($histogram_file)) {
      $histogram = json_decode(file_get_contents($histogram_file), true);
      if (!is_array($histogram) ||
          !array_key_exists('r', $histogram) ||
          !array_key_exists('g', $histogram) ||
          !array_key_exists('b', $histogram) ||
          count($histogram['r']) != 256 ||
          count($histogram['g']) != 256 ||
          count($histogram['b']) != 256) {
          unset($histogram);
      }
  }

  // generate a histogram from the image itself
  if (!isset($histogram) && !GetSetting('disable_image_processing')) {
      $im = imagecreatefromjpeg($image_file);
      if ($im !== false) {
          $width = imagesx($im);
          $height = imagesy($im);
          if ($width > 0 && $height > 0) {
              // default a resample to 1/4 in each direction which will significantly speed up processing with minimal impact to accuracy.
              // This is only for calculations done on the server.  Histograms from the client look at every pixel
              $resample = 8;
              if (isset($options) && array_key_exists('resample', $options))
                  $resample = $options['resample'];
              if ($resample > 2) {
                  $oldWidth = $width;
                  $oldHeight = $height;
                  $width = intval(($width * 2) / $resample);
                  $height = intval(($height * 2) / $resample);
                  $tmp = imagecreatetruecolor($width, $height);
                  fastimagecopyresampled($tmp, $im, 0, 0, 0, 0, $width, $height, $oldWidth, $oldHeight, 3);
                  imagedestroy($im);
                  $im = $tmp;
                  unset($tmp);
              }
              $histogram = array();
              $histogram['r'] = array();
              $histogram['g'] = array();
              $histogram['b'] = array();
              $buckets = 256;
              if (isset($options) && array_key_exists('buckets', $options) && $options['buckets'] >= 1 && $options['buckets'] <= 256) {
                  $buckets = $options['buckets'];
              }
              for ($i = 0; $i < $buckets; $i++) {
                  $histogram['r'][$i] = 0;
                  $histogram['g'][$i] = 0;
                  $histogram['b'][$i] = 0;
              }
              for ($y = 0; $y < $height; $y++) {
                  for ($x = 0; $x < $width; $x++) {
                      $rgb = ImageColorAt($im, $x, $y);
                      $r = ($rgb >> 16) & 0xFF;
                      $g = ($rgb >> 8) & 0xFF;
                      $b = $rgb & 0xFF;
                      // ignore white pixels
                      if ($r != 255 || $g != 255 || $b != 255) {
                          if (isset($options) && array_key_exists('colorSpace', $options) && $options['colorSpace'] != 'RGB') {
                              if ($options['colorSpace'] == 'HSV') {
                                  RGB_TO_HSV($r, $g, $b);
                              } elseif ($options['colorSpace'] == 'YUV') {
                                  RGB_TO_YUV($r, $g, $b);
                              }
                          }
                          $bucket = (int)(($r + 1.0) / 256.0 * $buckets) - 1;
                          $histogram['r'][$bucket]++;
                          $bucket = (int)(($g + 1.0) / 256.0 * $buckets) - 1;
                          $histogram['g'][$bucket]++;
                          $bucket = (int)(($b + 1.0) / 256.0 * $buckets) - 1;
                          $histogram['b'][$bucket]++;
                      }
                  }
              }
          }
          imagedestroy($im);
          unset($im);
      }
      if (!isset($options) && isset($histogram_file) && !is_file($histogram_file) && isset($histogram))
        file_put_contents($histogram_file, json_encode($histogram));
  }
  return $histogram;
}

/**
* Calculate how close a given histogram is to the final
*/
function CalculateFrameProgress(&$histogram, &$start_histogram, &$final_histogram, $slop) {
  $progress = 0;
  $channels = isset($histogram) ? array_keys($histogram) : array();
  $channelCount = count($channels);
  if ($channelCount > 0) {
    foreach ($channels as $index => $channel) {
      $total = 0;
      $matched = 0;
      $buckets = count($histogram[$channel]);
      
      // First build an array of the actual changes in the current histogram.
      $available = array();
      for ($i = 0; $i < $buckets; $i++)
        $available[$i] = abs($histogram[$channel][$i] - $start_histogram[$channel][$i]);

      // Go through the target differences and subtract any matches from the array as we go,
      // counting how many matches we made.
      for ($i = 0; $i < $buckets; $i++) {
        $target = abs($final_histogram[$channel][$i] - $start_histogram[$channel][$i]);
        if ($target) {
          $total += $target;
          $min = max(0, $i - $slop);
          $max = min($buckets - 1, $i + $slop);
          for ($j = $min; $j <= $max; $j++) {
            $thisMatch = min($target, $available[$j]);
            $available[$j] -= $thisMatch;
            $matched += $thisMatch;
            $target -= $thisMatch;
          }
        }
      }
      if ($total > 0) {
        $progress += ($matched / $total) / $channelCount;
      }
    }
  }
  return floor($progress * 100);
}

/**
* Boil the frame loading progress down to a single number
*/
function CalculateSpeedIndex(&$frames) {
    $index = null;
    if (array_key_exists('frames', $frames)) {
        $last_ms = 0;
        $last_progress = 0;
        $index = 0;
        foreach($frames['frames'] as $time => &$frame) {
            $elapsed = $time - $last_ms;
            $index += $elapsed * (1.0 - $last_progress);
            $last_ms = $time;
            $last_progress = $frame['progress'] / 100.0;
        }
    }
    $index = (int)($index);

    return $index;
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
?>
