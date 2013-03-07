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
    $files = glob("$videoDir/image*.png");
    foreach ($files as $file) {
        if (preg_match('/image-(?P<frame>[0-9]+).png$/', $file, $matches)) {
            $currentFrame = $matches['frame'];
            $current = imagecreatefrompng($file);
            if ($current !== false) {
                $dupe = false;
                $width = imagesx($current);
                $height = imagesy($current);
                // See if we are processing the virst video frame
                if (!isset($previous)) {
                    if (GetCropRect($current, $crop)) {
                        $startFrame = $currentFrame;
                    } else {
                        imagedestroy($current);
                        unlink($file);
                        continue;
                    }
                }
                CropAVIImage($current, $crop);
                if (isset($previous)) {
                    // check for the blank->orange->blank sequence
                    if ($lastFrame == $startFrame) {
                        if (IsOrangeAVIFrame($current)) {
                            imagedestroy($current);
                            imagedestroy($previous);
                            unset($previous);
                            unset($crop);
                            $startFrame = 0;
                            unlink($file);
                            if (isset($lastImage))
                                unlink($lastImage);
                            continue;
                        }
                    }
                    $dupe = ImagesMatch($current, $previous);
                }
                if (!$dupe) {
                    $lastImage = "$videoDir/frame_" . sprintf('%04d', $currentFrame - $startFrame) . '.jpg';
                    imageinterlace($current, 1);
                    imagejpeg($current, $lastImage, 75);
                }
                if (isset($previous))
                    imagedestroy($previous);
                $previous = $current;
                $lastFrame = $currentFrame;
            }
            unlink($file);
        }
    }
    if (isset($previous))
        imagedestroy($previous);
    return $lastImage;
}

/**
* Find the viewport for the given browser video frame (assuming it is a solid color)
* 
* @param mixed $im
*/
function GetCropRect($im, &$crop) {
    $valid = false;
    $crop = null;
    $width = imagesx($im);
    $height = imagesy($im);
    if ($width && $height) {
        $midX = intval($width / 2);
        $midY = intval($height / 2);
        $background = ImageColorAt($im, $midX, $midY) & 0xF0F0F0;
        $white = 0xF0F0F0;
        if ($background == $white) {
            $crop = array('left' => 0, 'top' => 0, 'right' => $width - 1, 'bottom' => $height - 1);
            $y = $midY;
            for ($x = $midX; $x >= 0; $x--) {
                $rgb = ImageColorAt($im, $x, $y) & 0xF0F0F0;
                if ($rgb !== $background) {
                    $crop['left'] = $x + 1;
                    break;
                }
            }
            for ($x = $midX; $x < $width; $x++) {
                $rgb = ImageColorAt($im, $x, $y) & 0xF0F0F0;
                if ($rgb !== $background) {
                    $crop['right'] = $x - 1;
                    break;
                }
            }
            $x = $midX;
            for ($y = $midY; $y >= 0; $y--) {
                $rgb = ImageColorAt($im, $x, $y) & 0xF0F0F0;
                if ($rgb !== $background) {
                    $crop['top'] = $y + 1;
                    break;
                }
            }
            for ($y = $midY; $y < $height; $y++) {
                $rgb = ImageColorAt($im, $x, $y) & 0xF0F0F0;
                if ($rgb !== $background) {
                    $crop['bottom'] = $y - 1;
                    break;
                }
            }
            $cropWidth = $crop['right'] - $crop['left'] + 1;
            $cropHeight = $crop['bottom'] - $crop['top'] + 1;
            // make sure it is fully white and at least 90% of the 
            // width and 50% of the height of the original image.
            $blank = true;
            for ($y = $crop['top']; $y <= $crop['bottom']; $y++) {
                for ($x = $crop['left']; $x <= $crop['right']; $x++) {
                    $rgb = ImageColorAt($im, $x, $y) & 0xF0F0F0;
                    if ($rgb != $background) {
                        $blank = false;
                        break(2);
                    }
                }
            }
            if ($blank &&
                ($cropWidth / $width) > 0.9 &&
                ($cropHeight / $height) > 0.5) {
                $valid = true;
            } else {
                unset($crop);
            }
        }
    }
    return $valid;
}

/**
* See if the two given images are identical
* 
* @param mixed $im1
* @param mixed $im2
*/
function ImagesMatch($im1, $im2) {
    $match = true;
    $w1 = imagesx($im1);
    $h1 = imagesy($im1);
    $w2 = imagesx($im2);
    $h2 = imagesy($im2);
    if ($w1 && $w1 == $w2 &&
        $h1 && $h1 == $h2) {
        for ($y = 0; $y < $h1; $y++) {
            for ($x = 0; $x < $w1; $x++) {
                $rgb1 = ImageColorAt($im1, $x, $y) & 0xF0F0F0;
                $rgb2 = ImageColorAt($im2, $x, $y) & 0xF0F0F0;
                if ($rgb1 != $rgb2) {
                    $match = false;
                    break 2;
                }
            }
        }
    }
    return $match;
}

/**
* Crop the given image if necessary
* 
* @param mixed $im
* @param mixed $crop
*/
function CropAVIImage(&$im, $crop) {
    $width = imagesx($im);
    $height = imagesy($im);
    if (isset($crop) && $width && $height) {
        $left = 0;
        $top = 0;
        $right = $width - 1;
        $bottom = $height - 1;
        if (array_key_exists('left', $crop) &&
            array_key_exists('top', $crop) &&
            array_key_exists('right', $crop) &&
            array_key_exists('bottom', $crop) &&
            ($crop['left'] != $left ||
             $crop['right'] != $right ||
             $crop['top'] != $top ||
             $crop['bottom'] != $bottom)) {
             $newWidth = $crop['right'] - $crop['left'] + 1;
             $newHeight = $crop['bottom'] - $crop['top'] + 1;
             $tmp = imagecreatetruecolor($newWidth, $newHeight);                 
             if ($tmp !== false) {
                 if (imagecopy($tmp, $im, 0, 0, $crop['left'], $crop['top'], $newWidth, $newHeight)) {
                     $old = $im;
                     $im = $tmp;
                     imagedestroy($old);
                 } else {
                     imagedestroy($tmp);
                 }
             }
        }
    }
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

// Detect the solid-orange video frames in case of
// a blank -> orange -> blank sequence.
// Need to crop-down a bit to deal with the shading
// that the browser adds.
function IsOrangeAVIFrame($im) {
    $orange = false;
    $width = imagesx($im);
    $height = imagesy($im);
    $left = intval($width * 0.1);
    $top = intval($height * 0.1);
    $background = ImageColorAt($im, $left, $top) & 0xF0F0F0;
    $check = 0xD05010;
    if ($background == $check) {
        $orange = true;
        for ($y = $top; $y < $height - $top && $orange; $y++) {
            for ($x = $left; $x < $width - $left && $orange; $x++) {
                $rgb = ImageColorAt($im, $x, $y) & 0xF0F0F0;
                if ($rgb != $background) {
                    $orange = false;
                }
            }
        }
    }
    return $orange;
}
?>
