<?php
require_once('devtools.inc.php');
if(extension_loaded('newrelic')) { 
  newrelic_add_custom_tracer('ProcessAVIVideo');
  newrelic_add_custom_tracer('Video2PNG');
  newrelic_add_custom_tracer('FindAVIViewport');
  newrelic_add_custom_tracer('EliminateDuplicateAVIFiles');
  newrelic_add_custom_tracer('ProcessVideoFrames');
}

/**
* Re-process all of the video for an existing test
* 
* @param mixed $id
*/
function ReprocessVideo($id) {
  $testPath = './' . GetTestPath($id);
  if (is_dir($testPath)) {
    $lock = LockTest($id);
    if (isset($lock)) {
      $cacheFiles = glob("$testPath/*.dat.gz");
      if ($cacheFiles && is_array($cacheFiles) && count($cacheFiles)) {
        foreach($cacheFiles as $cacheFile)
          unlink($cacheFile);
      }
      $videoFiles = glob("$testPath/*.mp4");
      if ($videoFiles && is_array($videoFiles) && count($videoFiles)) {
        foreach($videoFiles as $video) {
          if (preg_match('/^.*\/(?P<run>[0-9]+)(?P<cached>_Cached)?_video\.mp4$/i', $video, $matches)) {
            $run = $matches['run'];
            $cached = array_key_exists('cached', $matches) ? 1 : 0;
            $videoDir = "$testPath/video_$run";
            if ($cached)
              $videoDir .= '_cached';
            delTree($videoDir, false);
            ProcessAVIVideo($id, $testPath, $run, $cached);
          }
        }
      }
      UnlockTest($lock);
    }
  }
}

/**
* Convert an AVI video capture into the video frames the WPT is expecting
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function ProcessAVIVideo(&$test, $testPath, $run, $cached) {
  $cachedText = '';
  if( $cached )
    $cachedText = '_Cached';
  $videoFile = "$testPath/$run{$cachedText}_video.avi";
  $crop = '';
  if (!is_file($videoFile))
    $videoFile = "$testPath/$run{$cachedText}_video.mp4";
  if (!is_file($videoFile)) {
    $crop = ',crop=in_w:in_h-80:0:80';
    $videoFile = "$testPath/$run{$cachedText}_appurify.mp4";
  }
  // trim the video to align with the capture if we have timestamps for both
  $renderStart = null;
  if (array_key_exists('appurify_tests', $test) &&
      is_array($test['appurify_tests']) &&
      array_key_exists($run, $test['appurify_tests']) &&
      is_array($test['appurify_tests'][$run])) {
    require_once('page_data.inc');
    $page_data = loadPageRunData($testPath, $run, $cached);
    if (isset($page_data) &&
        is_array($page_data) &&
        array_key_exists('render', $page_data))
      $renderStart = $page_data['render'];
  }
  if (is_file($videoFile)) {
    $videoDir = "$testPath/video_$run" . strtolower($cachedText);
    if (!is_file("$videoDir/video.json")) {
      if (is_dir($videoDir))
        delTree($videoDir, false);
      if (!is_dir($videoDir))
        mkdir($videoDir, 0777, true);
      $videoFile = realpath($videoFile);
      $videoDir = realpath($videoDir);
      if (strlen($videoFile) && strlen($videoDir)) {
        if (Video2PNG($videoFile, $videoDir, $crop)) {
          $startOffset = DevToolsGetVideoOffset($testPath, $run, $cached, $endTime);
          FindAVIViewport($videoDir, $startOffset, $viewport);
          EliminateDuplicateAVIFiles($videoDir, $viewport);
          $lastImage = ProcessVideoFrames($videoDir, $renderStart, $viewport);
          $screenShot = "$testPath/$run{$cachedText}_screen.jpg";
          if (isset($lastImage) && is_file($lastImage)) {
            //unlink($videoFile);
            if (!is_file($screenShot))
              copy($lastImage, $screenShot);
          }
        }
      }
      $videoInfo = array();
      if (isset($viewport))
        $videoInfo['viewport'] = $viewport;
      file_put_contents("$videoDir/video.json", json_encode($videoInfo));
    }
  }
}

/**
* Use ffmpeg to extract the given video file to individual frames at 10fps
* 
* @param mixed $infile
* @param mixed $outdir
*/
function Video2PNG($infile, $outdir, $crop) {
  $ret = false;
  $oldDir = getcwd();
  chdir($outdir);

  $command = "ffmpeg -v debug -i \"$infile\" -vsync 0 -vf \"decimate=hi=0:lo=0:frac=0,scale=iw*min(400/iw\,400/ih):ih*min(400/iw\,400/ih)\" \"$outdir/img-%d.png\" 2>&1";
  $result;
  exec($command, $output, $result);
  if ($output && is_array($output) && count($output)) {
    $frameCount = 0;
    foreach ($output as $line) {
      if (preg_match('/keep pts:[0-9]+ pts_time:(?P<timecode>[0-9\.]+)/', $line, $matches)) {
        $frameCount++;
        $frameTime = ceil($matches['timecode'] * 1000);
        $src = "$outdir/img-$frameCount.png";
        $destFile = "video-" . sprintf("%06d", $frameTime) . ".png";
        $dest = "$outdir/$destFile";
        if (is_file($src)) {
          $ret = true;
          rename($src, $dest);
        }
      }
    }
  }

  $junkImages = glob("$outdir/img*.png");
  if ($junkImages && is_array($junkImages) && count($junkImages)) {
    foreach ($junkImages as $img)
      unlink($img);
  }
  chdir($oldDir);
  return $ret;
}

/**
* De-dupe the video frames and compress them for normal WPT processing
* 
* @param mixed $videoDir
*/
function ProcessVideoFrames($videoDir, $renderStart, $viewport) {
  $startFrame = null;
  $lastFrame = 0;
  $renderFrame = 0;
  $lastImage = null;
  $files = glob("$videoDir/image*.png");
  foreach ($files as $file) {
    if (preg_match('/image-(?P<frame>[0-9]+).png$/', $file, $matches)) {
      $frame_ms = intval($matches['frame']);
      if (!isset($startFrame)) {
        $startFrame = $frame_ms;
        $lastImage = "$videoDir/ms_000000.jpg";
      } else {
        if ($renderStart) {
          if (!$renderFrame)
            $renderFrame = $frame_ms;
          $lastImage = "$videoDir/ms_" . sprintf('%06d', $frame_ms - $renderFrame + $renderStart) . '.jpg';
        } else {
          $lastImage = "$videoDir/ms_" . sprintf('%06d', $frame_ms - $startFrame) . '.jpg';
        }
      }
      CopyAVIFrame($file, $lastImage);
      CreateHistogram($file, str_replace('.jpg', '.hist', $lastImage), $viewport);
      unlink($file);
    }
  }
  return $lastImage;
}

function CopyAVIFrame($src, $dest) {
  shell_exec("convert \"$src\" -interlace Plane -quality 75 \"$dest\"");
}

function IsBlankAVIFrame($file, $videoDir) {
  $ret = false;
  $white = realpath('images/video_white.png');
  $command = "convert \"$white\" \\( \"$file\" -shave 15x55 -resize 200x200! \\) miff:- | compare -metric AE - -fuzz 10% null: 2>&1";
  $differentPixels = shell_exec($command);
  //logMsg("($differentPixels) $command", "$videoDir/video.log", true);
  if (isset($differentPixels) &&
      strlen($differentPixels) &&
      preg_match('/^[0-9]+$/', $differentPixels) &&
      $differentPixels < 100)
    $ret = true;
  return $ret;
}

/**
* Check to see if the given frame is an "orange" marker frame.
* We need to be kind of loose for the definition of orange since
* it varies a bit from capture to capture.
* 
* @param mixed $im
*/
function IsOrangeAVIFrame($file) {
  $ret = false;
  $orange = realpath('./images/video_orange.png');
  $command = "convert  \"$orange\" \\( \"$file\" -gravity Center -crop 80x50%+0+0 -resize 200x200! \\) miff:- | compare -metric AE - -fuzz 10% null: 2>&1";
  $differentPixels = shell_exec($command);
  //logMsg("($differentPixels) $command", "$videoDir/video.log", true);
  if (isset($differentPixels) &&
      strlen($differentPixels) &&
      preg_match('/^[0-9]+$/', $differentPixels) &&
      $differentPixels < 100)
    $ret = true;
  return $ret;
}

/**
* Go through the video files and delete the ones that have identical md5 hashes
* (in a series)
* 
* @param mixed $videoDir
*/
function EliminateDuplicateAVIFiles($videoDir, $viewport) {
  $crop = '+0+55';
  if (isset($viewport)) {
    // Ignore a 4-pixel header on the actual viewport to allow for the progress bar and
    // a 6 pixel right margin to allow for the scroll bar that fades in and out.
    $topMargin = 4;
    $rightMargin = 6;
    $top = $viewport['y'] + $topMargin;
    $height = max($viewport['height'] - $topMargin, 1);
    $left = $viewport['x'];
    $width = max($viewport['width'] - $rightMargin, 1);
    $crop = "{$width}x{$height}+{$left}+{$top}";
  }

  // Do a first pass looking for the first non-blank frame with an allowance
  // for up to a 2% per-pixel difference for noise in the white field.
  $files = glob("$videoDir/image*.png");
  $blank = $files[0];
  $count = count($files);
  for ($i = 1; $i < $count; $i++) {
    if (AreAVIFramesDuplicate($blank, $files[$i], 2, $crop))
      unlink($files[$i]);
    else
      break;
  }
  
  // Do a second pass looking for the last frame but with an allowance for up
  // to a 10% difference in individual pixels to deal with noise around text.
  $files = glob("$videoDir/image*.png");
  $files = array_reverse($files);
  $count = count($files);
  $duplicates = array();
  if ($count > 2) {
    $baseline = $files[0];
    $previousFrame = $baseline;
    for ($i = 1; $i < $count; $i++) {
      if (AreAVIFramesDuplicate($baseline, $files[$i], 10, $crop)) {
        $duplicates[] = $previousFrame;
        $previousFrame = $files[$i];
      } else {
        break;
      }
    }
    if (count($duplicates)) {
      foreach ($duplicates as $file)
        unlink($file);
    }
  }

  // Do a third pass that eliminates frames with duplicate content.
  $previousFile = null;
  $files = glob("$videoDir/image*.png");
  foreach ($files as $file) {
    $duplicate = false;
    if (isset($previousFile))
      $duplicate = AreAVIFramesDuplicate($previousFile, $file, 0, $crop);
    if ($duplicate)
      unlink($file);
    else
      $previousFile = $file;
  }
}

function AreAVIFramesDuplicate($image1, $image2, $fuzzPct = 0, $crop = null) {
  $duplicate = false;
  $fuzzStr = '';
  if ($fuzzPct)
    $fuzzStr = "-fuzz $fuzzPct% ";
  $cropStr = '';
  if (isset($crop))
    $cropStr = "-crop $crop ";
  $command = "convert  \"$image1\" \"$image2\" {$cropStr}miff:- | compare -metric AE - {$fuzzStr}null: 2>&1";
  $differentPixels = shell_exec($command);
  if (isset($differentPixels) &&
      strlen($differentPixels) &&
      preg_match('/^[0-9]+$/', $differentPixels) &&
      $differentPixels == 0)
    $duplicate = true;
  return $duplicate;
}

/**
* Take a ms duration and convert it to HH:MM:SS.xxx fiormat
* 
* @param mixed $duration
*/
function msToHMS($duration) {
  $ms = number_format($duration - floor($duration), 3) * 1000;
  $duration = floor($duration);
  $H = $duration % 3600;
  $duration -= $H * 3600;
  $M = $duration / 60;
  $S = $duration % 60;
  $formatted = sprintf("%02d:%02d:%02d.%03d", $H, $M, $S, $ms);
}

/**
* If the first frame is orange, use the orage to detect the viewport
* and re-number the remaining frames
* 
* @param mixed $videoDir
* @param mixed $viewport
*/
function FindAVIViewport($videoDir, $startOffset, &$viewport) {
  $files = glob("$videoDir/video-*.png");
  if ($files && count($files)) {
    if (IsOrangeAVIFrame($files[0])) {
      // load the image and figure out the viewport area (orange)
      $im = imagecreatefrompng($files[0]);
      if ($im) {
        $width = imagesx($im);
        $height = imagesy($im);
        $x = floor($width / 2);
        $y = floor($height / 2);
        $orange = imagecolorat($im, $x, $y);
        $left = null;
        while (!isset($left) && $x >= 0) {
          if (!PixelColorsClose(imagecolorat($im, $x, $y), $orange))
            $left = $x + 1;
          else
            $x--;
        }
        if (!isset($left))
          $left = 0;
        $x = floor($width / 2);
        $right = null;
        while (!isset($right) && $x < $width) {
          if (!PixelColorsClose(imagecolorat($im, $x, $y), $orange))
            $right = $x - 1;
          else
            $x++;
        }
        if (!isset($right))
          $right = $width;
        $x = floor($width / 2);
        $top = null;
        while (!isset($top) && $y >= 0) {
          if (!PixelColorsClose(imagecolorat($im, $x, $y), $orange))
            $top = $y + 1;
          else
            $y--;
        }
        if (!isset($top))
          $top = 0;
        $y = floor($height / 2);
        $bottom = null;
        while (!isset($bottom) && $y < $height) {
          if (!PixelColorsClose(imagecolorat($im, $x, $y), $orange))
            $bottom = $y - 1;
          else
            $y++;
        }
        if (!isset($bottom))
          $bottom = $height;
        if ($left || $top || $right != $width || $bottom != $height)
          $viewport = array('x' => $left, 'y' => $top, 'width' => ($right - $left), 'height' => ($bottom - $top));
      }

      // Remove all of the orange video frames.
      do {
        $file = array_shift($files);
        unlink($file);
      }while (count($files) && IsOrangeAVIFrame($files[0]));
    }
    $fileCount = count($files);
    $firstFrame = null;
    for($i = 0; $i < $fileCount; $i++) {
      $file = $files[$i];
      if (preg_match('/video-(?P<frame>[0-9]+).png$/', $file, $matches)) {
        $currentFrame = intval($matches['frame']);
        if (!isset($firstFrame))
          $firstFrame = $currentFrame;
        $frameTime = $currentFrame - $firstFrame;
        if ($startOffset)
          $frameTime = max($frameTime - $startOffset, 0);
        $dest = "$videoDir/image-" . sprintf('%06d', $frameTime) . ".png";
        if (is_file($dest))
          unlink($dest);
        rename($file, $dest);
      }
    }
  }
}

function PixelColorsClose($rgb, $reference) {
  $match = true;
  $pixel = array(($rgb >> 16) & 0xFF, ($rgb >> 8) & 0xFF, $rgb & 0xFF);
  $ref = array(($reference >> 16) & 0xFF, ($reference >> 8) & 0xFF, $reference & 0xFF);
  for ($i = 0; $i < 3; $i++)
    if (abs($ref[$i] - $pixel[$i]) > 25)
      $match = false;
  return $match;
}

function CreateHistogram($image_file, $histogram_file, $viewport) {
  $histogram = null;
  if (stripos($image_file, '.png') !== false)
    $im = imagecreatefrompng($image_file);
  elseif (stripos($image_file, '.jpg') !== false)
    $im = imagecreatefromjpeg($image_file);
  if ($im !== false) {
    $width = imagesx($im);
    $height = imagesy($im);
    if (isset($viewport)) {
      // Ignore a 4-pixel header on the actual viewport to allow for the progress bar.
      $margin = 4;
      $top = $viewport['y'] + $margin;
      $left = $viewport['x'];
      $bottom = min($top + $viewport['height'] - $margin, $height);
      $right = min($left + $viewport['width'], $width);
    } else {
      $top = 0;
      $left = 0;
      $bottom = $height;
      $right = $width;
    }
    if ($right > $left && $bottom > $top) {
      $histogram = array();
      $histogram['r'] = array();
      $histogram['g'] = array();
      $histogram['b'] = array();
      for ($i = 0; $i < 256; $i++) {
        $histogram['r'][$i] = 0;
        $histogram['g'][$i] = 0;
        $histogram['b'][$i] = 0;
      }
      $slop = 5;
      for ($y = $top; $y < $bottom; $y++) {
        for ($x = $left; $x < $right; $x++) {
          $rgb = ImageColorAt($im, $x, $y);
          $r = ($rgb >> 16) & 0xFF;
          $g = ($rgb >> 8) & 0xFF;
          $b = $rgb & 0xFF;
          // ignore white pixels (allowing for slop)
          if ($r < 255 - $slop || $g < 255 - $slop || $b < 255 - $slop) {
            $histogram['r'][$r]++;
            $histogram['g'][$g]++;
            $histogram['b'][$b]++;
          }
        }
      }
      file_put_contents($histogram_file, json_encode($histogram));
    }
    imagedestroy($im);
    unset($im);
  }
}
?>
