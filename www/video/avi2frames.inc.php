<?php

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
      if (preg_match('/^(?P<run>[0-9]+)(?P<cached>_Cached)?_video.(?P<ext>avi|mp4)$/', $file, $matches)) {
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
function ProcessAVIVideo(&$test, $testPath, $run, $cached) {
    $cachedText = '';
    if( $cached )
        $cachedText = '_Cached';
    $orange_leader = true;
    $videoFile = "$testPath/$run{$cachedText}_video.avi";
    $crop = '';
    if (!is_file($videoFile)) {
      $crop = '-vf crop=in_w:in_h-80:0:80 ';
      $orange_leader = false;
      $videoFile = "$testPath/$run{$cachedText}_video.mp4";
    }
    // trim the video to align with the capture if we have timestamps for both
    $trim = '';
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
        if (!is_dir($videoDir)) {
            mkdir($videoDir, 0777, true);
            $videoFile = realpath($videoFile);
            $videoDir = realpath($videoDir);
            if (strlen($videoFile) && strlen($videoDir)) {
                if (Video2PNG($videoFile, $videoDir, $crop, $trim)) {
                    EliminateDuplicateAVIFiles($videoDir);
                    $lastImage = ProcessVideoFrames($videoDir, $orange_leader, $renderStart);
                    $screenShot = "$testPath/$run{$cachedText}_screen.jpg";
                    if (isset($lastImage) &&
                        !is_file($screenShot) &&
                        is_file($lastImage))
                        copy($lastImage, $screenShot);
                }
            }
        }
    }
}

/**
* Use ffmpeg to extract the given video file to individual frames at 10fps
* 
* @param mixed $infile
* @param mixed $outdir
*/
function Video2PNG($infile, $outdir, $crop, $trim) {
    $ret = false;
    $result;
    $command = "ffmpeg -i \"$infile\" -r 10 $crop$trim\"$outdir/image-%4d.png\"";
    $retStr = exec($command, $output, $result);
    $files = glob("$outdir/image*.png");
    if (count($files))
        $ret = true;
    return $ret;
}

/**
* De-dupe the video frames and compress them for normal WPT processing
* 
* @param mixed $videoDir
*/
function ProcessVideoFrames($videoDir, $orange_leader, $renderStart) {
  $startFrame = 0;
  $lastFrame = 0;
  $renderFrame = 0;
  $renderBaseline = 0;
  if (isset($renderStart))
    $renderBaseline = ceil($renderStart / 100);
  $lastImage = null;
  $orangeDetected = $orange_leader ? false : true;
  $files = glob("$videoDir/image*.png");
  foreach ($files as $file) {
    if (preg_match('/image-(?P<frame>[0-9]+).png$/', $file, $matches)) {
      $currentFrame = $matches['frame'];
      if (!$startFrame) {
        if (!$orangeDetected) {
          $orangeDetected = IsOrangeAVIFrame($file, $videoDir);
        } elseif (IsBlankAVIFrame($file, $videoDir)) {
          $startFrame = $currentFrame;
          $lastImage = "$videoDir/frame_0000.jpg";
          CopyAVIFrame($file, $lastImage);
        }
      } else {
        if ($renderBaseline) {
          if (!$renderFrame)
            $renderFrame = $currentFrame;
          $lastImage = "$videoDir/frame_" . sprintf('%04d', $currentFrame - $renderFrame + $renderBaseline) . '.jpg';
        } else {
          $lastImage = "$videoDir/frame_" . sprintf('%04d', $currentFrame - $startFrame) . '.jpg';
        }
        CopyAVIFrame($file, $lastImage);
      }
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
  $command = "convert \"images/video_white.png\" \\( \"$file\" -shave 5x125 -resize 200x200! \\) miff:- | compare -metric AE - -fuzz 10% null: 2>&1";
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
function IsOrangeAVIFrame($file, $videoDir) {
  $ret = false;
  $command = "convert  \"images/video_orange.png\" \\( \"$file\" -shave 5x125 -resize 200x200! \\) miff:- | compare -metric AE - -fuzz 10% null: 2>&1";
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
function EliminateDuplicateAVIFiles($videoDir) {
  $previousFile = null;
  $previousMD5 = null;
  $files = glob("$videoDir/image*.png");
  foreach ($files as $file) {
    $duplicate = false;
    $currentMD5 = md5_file($file);
    if ($currentMD5 !== false && $currentMD5 == $previousMD5)    
      $duplicate = true;
    elseif (isset($previousFile)) {
      $command = "convert  \"$previousFile\" \"$file\" -crop +0+125 miff:- | compare -metric AE - -fuzz 10% null: 2>&1";
      $differentPixels = shell_exec($command);
      if (isset($differentPixels) && strlen($differentPixels) && $differentPixels < 100)
        $duplicate = true;
    }
    if ($duplicate) {
      unlink($file);
    } else {
      $previousFile = $file;
      $previousMD5 = $currentMD5;
    }
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
?>
