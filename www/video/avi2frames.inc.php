<?php
require_once('devtools.inc.php');

/**
* Walk the given directory and convert every AVI found into the format WPT expects
* 
* @param mixed $testPath
*/
function ProcessAllAVIVideos($testPath) {
  if (is_dir($testPath)) {
    if(gz_is_file("$testPath/testinfo.json"))
      $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
    $files = scandir($testPath);
    foreach ($files as $file) {
      if (preg_match('/^(?P<run>[0-9]+)(?P<cached>_Cached)?(_video|_appurify).(?P<ext>avi|mp4)$/', $file, $matches)) {
        $run = $matches['run'];
        $cached = 0;
        if (array_key_exists('cached', $matches) && strlen($matches['cached']))
            $cached = 1;
        ProcessAVIVideo($testInfo, $testPath, $run, $cached);
      }
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
function ProcessAVIVideo(&$test, $testPath, $run, $cached, $needLock = true) {
    if ($needLock)
      $testLock = LockTest($testPath);
    $videoCodeVersion = 3;
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
        $needsProcessing = true;
        if (is_dir($videoDir) && is_file("$videoDir/video.json")) {
          $videoInfo = json_decode(file_get_contents("$videoDir/video.json"), true);
          if ($videoInfo &&
              is_array($videoInfo) &&
              array_key_exists('ver', $videoInfo) &&
              $videoInfo['ver'] === $videoCodeVersion)
            $needsProcessing = false;
        }
        if ($needsProcessing) {
            if (is_dir($videoDir))
              delTree($videoDir);
            if (!is_dir($videoDir))
              mkdir($videoDir, 0777, true);
            $videoFile = realpath($videoFile);
            $videoDir = realpath($videoDir);
            if (strlen($videoFile) && strlen($videoDir)) {
                if (Video2PNG($videoFile, $videoDir, $crop)) {
                    $startOffset = DevToolsGetVideoOffset($testPath, $run, $cached, $endTime);
                    FindAVIViewport($videoDir, $startOffset, $endTime, $viewport);
                    EliminateDuplicateAVIFiles($videoDir, $viewport);
                    $lastImage = ProcessVideoFrames($videoDir, $renderStart);
                    $screenShot = "$testPath/$run{$cachedText}_screen.jpg";
                    if (isset($lastImage) && is_file($lastImage)) {
                      //unlink($videoFile);
                      if (!is_file($screenShot))
                          copy($lastImage, $screenShot);
                    }
                }
            }
            $videoInfo = array('ver' => $videoCodeVersion);
            if (isset($viewport))
              $videoInfo['viewport'] = $viewport;
            file_put_contents("$videoDir/video.json", json_encode($videoInfo));
        }
    }
    UnlockTest($testLock);
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

  $command = "ffmpeg -report -v debug -i \"$infile\" -vsync 0 -vf \"fps=fps=60$crop,scale=iw*min(400/iw\,400/ih):ih*min(400/iw\,400/ih),decimate\" \"$outdir/img-%d.png\"";
  $result;
  exec($command, $output, $result);
  $logFiles = glob("$outdir/ffmpeg*.log");
  if ($logFiles && count($logFiles)) {
    $logFile = $logFiles[0];
    $lines = file($logFile);
    if ($lines && is_array($lines) && count($lines)) {
      $frameCount = 0;
      foreach ($lines as $line) {
        if (preg_match('/decimate.*pts:(?P<timecode>[0-9]+).*drop_count:-[0-9]+/', $line, $matches)) {
          $frameCount++;
          $frameTime = ceil((intval($matches['timecode']) * 1000) / 60);
          $src = "$outdir/img-$frameCount.png";
          $dest = "$outdir/image-" . sprintf("%06d", $frameTime) . ".png";
          if (is_file($src)) {
            $ret = true;
            rename($src, $dest);
          }
        }
      }
    }
    foreach ($logFiles as $logFile)
      unlink($logFile);
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
function ProcessVideoFrames($videoDir, $renderStart) {
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
  $command = "convert \"images/video_white.png\" \\( \"$file\" -shave 15x55 -resize 200x200! \\) miff:- | compare -metric AE - -fuzz 10% null: 2>&1";
  $differentPixels = shell_exec($command);
  //logMsg("($differentPixels) $command", "$videoDir/video.log", true);
  if (isset($differentPixels) && strlen($differentPixels) && $differentPixels < 100)
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
  $command = "convert  \"images/video_orange.png\" \\( \"$file\" -gravity Center -crop 80x50%+0+0 -resize 200x200! \\) miff:- | compare -metric AE - -fuzz 10% null: 2>&1";
  $differentPixels = shell_exec($command);
  //logMsg("($differentPixels) $command", "$videoDir/video.log", true);
  if (isset($differentPixels) && strlen($differentPixels) && $differentPixels < 100)
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
  $previousFile = null;
  $files = glob("$videoDir/image*.png");
  $crop = '+0+55';
  if (isset($viewport)) {
    // ignore a 4-pixel header on the actual viewport to allow for the progress bar
    $margin = 4;
    $top = $viewport['y'] + $margin;
    $height = max($viewport['height'] - $margin, 1);
    $left = $viewport['x'];
    $width = $viewport['width'];
    $crop = "{$width}x{$height}+{$left}+{$top}";
  }
  foreach ($files as $file) {
    $duplicate = false;
    if (isset($previousFile)) {
      $command = "convert  \"$previousFile\" \"$file\" -crop $crop miff:- | compare -metric AE - -fuzz 1% null: 2>&1";
      //$command = "convert  \"$previousFile\" \"$file\" -crop $crop miff:- | compare -metric AE - null: 2>&1";
      $differentPixels = shell_exec($command);
      if (isset($differentPixels) && strlen($differentPixels) && $differentPixels == 0)
        $duplicate = true;
    }
    if ($duplicate) {
      unlink($file);
    } else
      $previousFile = $file;
  }
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
function FindAVIViewport($videoDir, $startOffset, $endTime, &$viewport) {
  $files = glob("$videoDir/image*.png");
  if ($files && count($files) && IsOrangeAVIFrame($files[0])) {
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
    unlink($files[0]);
    $fileCount = count($files);
    $firstFrame = null;
    for($i = 1; $i < $fileCount; $i++) {
      $file = $files[$i];
      if (preg_match('/image-(?P<frame>[0-9]+).png$/', $file, $matches)) {
        $currentFrame = intval($matches['frame']);
        if (!isset($firstFrame))
          $firstFrame = $currentFrame;
        $frameTime = $currentFrame - $firstFrame;
        if ($startOffset)
          $frameTime = max($frameTime - $startOffset, 0);
        if (!$endTime || $frameTime <= $endTime) {
          $dest = "$videoDir/image-" . sprintf('%06d', $frameTime) . ".png";
          if (is_file($dest))
            unlink($dest);
          rename($file, $dest);
        } else {
          unlink($file);
        }
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
?>
