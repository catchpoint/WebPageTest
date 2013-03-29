<?php

/**
* Walk the given directory and convert every AVI found into the format WPT expects
* 
* @param mixed $testPath
*/
function ProcessAllAVIVideos($testPath) {
    $files = scandir($testPath);
    foreach ($files as $file) {
        if (preg_match('/^(?P<run>[0-9]+)(?P<cached>_Cached)?_video.avi$/', $file, $matches)) {
            $run = $matches['run'];
            $cached = 0;
            if (array_key_exists('cached', $matches) && strlen($matches['cached']))
                $cached = 1;
            ProcessAVIVideo($testPath, $run, $cached);
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
function ProcessAVIVideo($testPath, $run, $cached) {
    $cachedText = '';
    if( $cached )
        $cachedText = '_Cached';
    $videoFile = "$testPath/$run{$cachedText}_video.avi";
    if (is_file($videoFile)) {
        $videoDir = "$testPath/video_$run" . strtolower($cachedText);
        if (!is_dir($videoDir)) {
            mkdir($videoDir, 0777, true);
            $videoFile = realpath($videoFile);
            $videoDir = realpath($videoDir);
            if (strlen($videoFile) && strlen($videoDir)) {
                if (Video2PNG($videoFile, $videoDir)) {
                    EliminateDuplicateAVIFiles($videoDir);
                    $lastImage = ProcessVideoFrames($videoDir);
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
function Video2PNG($infile, $outdir) {
    $ret = false;
    $result;
    $command = "ffmpeg -i \"$infile\" -r 10 \"$outdir/image-%4d.png\"";
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
function ProcessVideoFrames($videoDir) {
  $startFrame = 0;
  $lastFrame = 0;
  $lastImage = null;
  $orangeDetected = false;
  $whiteDetected = false;
  $files = glob("$videoDir/image*.png");
  foreach ($files as $file) {
    if (preg_match('/image-(?P<frame>[0-9]+).png$/', $file, $matches)) {
      $currentFrame = $matches['frame'];
      $im = imagecreatefrompng($file);
      if ($im !== false) {
        if ($orangeDetected) {
          if (!$whiteDetected)
            $whiteDetected = !IsOrangeAVIFrame($im);
          if ($whiteDetected) {
            if (!$startFrame)
              $startFrame = $currentFrame;
            $lastImage = "$videoDir/frame_" . sprintf('%04d', $currentFrame - $startFrame) . '.jpg';
            imageinterlace($im, 1);
            imagejpeg($im, $lastImage, 75);
          }
        } else {
          $orangeDetected = IsOrangeAVIFrame($im);
        }
        imagedestroy($im);
      }
      unlink($file);
    }
  }
  return $lastImage;
}

/**
* Check to see if the given frame is an "orange" marker frame
* 
* @param mixed $im
*/
function IsOrangeAVIFrame($im) {
  $ret = false;
  $width = imagesx($im);
  $height = imagesy($im);
  if ($width && $height) {
    $midX = intval($width / 2);
    $midY = intval($height / 2);
    $blue = ImageColorAt($im, $midX, $midY) & 0x0000FF;
    if ($blue < 0x50)
      $ret = true;
  }
  return $ret;
}

/**
* Go through the video files and delete the ones that have identical md5 hashes
* (in a series)
* 
* @param mixed $videoDir
*/
function EliminateDuplicateAVIFiles($videoDir) {
    $previousMD5 = null;
    $files = glob("$videoDir/image*.png");
    foreach ($files as $file) {
        $currentMD5 = md5_file($file);
        if ($currentMD5 !== false && $currentMD5 == $previousMD5)
            unlink($file);
        $previousMD5 = $currentMD5;
    }
}
?>
