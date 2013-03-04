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
    $lastImage = null;
    $previousMD5 = null;
    $files = glob("$videoDir/image*.png");
    $time = 0;
    foreach ($files as $file) {
        $currentMD5 = md5_file($file);
        if ($currentMD5 === false || $currentMD5 != $previousMD5) {
            $current = imagecreatefrompng($file);
            if ($current !== false) {
                $dupe = false;
                $width = imagesx($current);
                $height = imagesy($current);
                // See if we are processing the virst video frame
                if (!isset($previous)) {
                    // make sure it isn't an orange placeholder
                    $rgb = ImageColorAt($current, intval($width / 2), intval($height / 2));
                    $r = ($rgb >> 16) & 0xFF;
                    $g = ($rgb >> 8) & 0xFF;
                    $b = $rgb & 0xFF;
                    if ($r == 208 && $g == 92 && $b == 18) {
                        imagedestroy($current);
                        unlink($file);
                        continue;
                    } else
                        $crop = GetCropRect($current);
                }
                CropAVIImage($current, $crop);
                if (isset($previous))
                    $dupe = ImagesMatch($current, $previous, $crop);
                if (!$dupe) {
                    $lastImage = "$videoDir/frame_" . sprintf('%04d', $time) . '.jpg';
                    imageinterlace($current, 1);
                    imagejpeg($current, $lastImage, 75);
                }
                if (isset($previous))
                    imagedestroy($previous);
                $previous = $current;
            }
            $previousMD5 = $currentMD5;
        }
        $time++;
        unlink($file);
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
function GetCropRect($im) {
    $crop = null;
    $width = imagesx($im);
    $height = imagesy($im);
    if ($width && $height) {
        $crop = array('left' => 0, 'top' => 0, 'right' => $width - 1, 'bottom' => $height - 1);
        $midX = intval($width / 2);
        $midY = intval($height / 2);
        $background = ImageColorAt($im, $midX, $midY);
        $y = $midY;
        for ($x = $midX; $x >= 0; $x--) {
            $rgb = ImageColorAt($im, $x, $y);
            if ($rgb !== $background) {
                $crop['left'] = $x + 1;
                break;
            }
        }
        for ($x = $midX; $x < $width; $x++) {
            $rgb = ImageColorAt($im, $x, $y);
            if ($rgb !== $background) {
                $crop['right'] = $x - 1;
                break;
            }
        }
        $x = $midX;
        for ($y = $midY; $y >= 0; $y--) {
            $rgb = ImageColorAt($im, $x, $y);
            if ($rgb !== $background) {
                $crop['top'] = $y + 1;
                break;
            }
        }
        for ($y = $midY; $y < $height; $y++) {
            $rgb = ImageColorAt($im, $x, $y);
            if ($rgb !== $background) {
                $crop['bottom'] = $y - 1;
                break;
            }
        }
    }
    return $crop;
}

function ImagesMatch($im1, $im2, $crop) {
    $match = true;
    $w1 = imagesx($im1);
    $h1 = imagesy($im1);
    $w2 = imagesx($im2);
    $h2 = imagesy($im2);
    if ($w1 && $w1 == $w2 &&
        $h1 && $h1 == $h2) {
        $left = 0;
        $top = 0;
        $right = $w1 - 1;
        $bottom = $h1 - 1;
        if (isset($crop)) {
            if (array_key_exists('left', $crop) &&
                $crop['left'] > $left &&
                $crop['left'] < $right)
                $left = $crop['left'];
            if (array_key_exists('right', $crop) &&
                $crop['right'] > $left &&
                $crop['right'] < $right)
                $right = $crop['right'];
            if (array_key_exists('top', $crop) &&
                $crop['top'] > $top &&
                $crop['top'] < $bottom)
                $top = $crop['top'];
            if (array_key_exists('bottom', $crop) &&
                $crop['bottom'] > $top &&
                $crop['bottom'] < $bottom)
                $bottom = $crop['bottom'];
        }
        for ($y = $top; $y <= $bottom; $y++) {
            for ($x = $left; $x <= $right; $x++) {
                $rgb1 = ImageColorAt($im1, $x, $y);
                $rgb2 = ImageColorAt($im2, $x, $y);
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
?>
