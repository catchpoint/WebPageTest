<?php
/**
* Calculate the progress for all of the images in a given directory
*/
function GetVisualProgress($testPath, $run, $cached) {
    $frames = null;
    $video_directory = "$testPath/video_{$run}";
    if ($cached)
        $video_directory .= '_cached';
    $cache_file = "$testPath/$run.$cached.visual.dat";
    $dirty = false;
    $current_version = 3;
    if (gz_is_file($cache_file)) {
        $frames = json_decode(gz_file_get_contents($cache_file), true);
        if (!array_key_exists('frames', $frames) || !array_key_exists('version', $frames))
            unset($frames);
        elseif(array_key_exists('version', $frames) && $frames['version'] !== $current_version)
            unset($frames);
    }
    if (!isset($frames) || !count($frames)) {
        $old_cache_file = "$video_directory/progress.dat";
        if (gz_is_file($old_cache_file)) {
            $dirty = true;
            $frames = json_decode(gz_file_get_contents($old_cache_file), true);
            if (!array_key_exists('frames', $frames) || !array_key_exists('version', $frames))
                unset($frames);
            elseif(array_key_exists('version', $frames) && $frames['version'] !== $current_version)
                unset($frames);
            unlink($old_cache_file);
        }
    }
    if ((!isset($frames) || !count($frames)) && is_dir($video_directory)) {
        $frames = array('version' => $current_version);
        $frames['frames'] = array();
        $dirty = true;
        $base_path = substr($video_directory, 1);
        $files = scandir($video_directory);
        $last_file = null;
        $first_file = null;
        foreach ($files as $file) {
            if (strpos($file,'frame_') !== false && strpos($file,'.hist') === false) {
                $parts = explode('_', $file);
                if (count($parts) >= 2) {
                    if (!isset($first_file))
                        $first_file = $file;
                    $last_file = $file;
                    $time = ((int)$parts[1]) * 100;
                    $frames['frames'][$time] = array( 'path' => "$base_path/$file",
                                            'file' => $file);
                }
            } 
        }
        if (count($frames['frames']) == 1) {
            foreach($frames['frames'] as $time => &$frame) {
                $frame['progress'] = 100;
                $frames['complete'] = $time;
            }
        } elseif (  isset($first_file) && strlen($first_file) && 
                    isset($last_file) && strlen($last_file) && count($frames['frames'])) {
            $start_histogram = GetImageHistogram("$video_directory/$first_file");
            $final_histogram = GetImageHistogram("$video_directory/$last_file");
            foreach($frames['frames'] as $time => &$frame) {
                $histogram = GetImageHistogram("$video_directory/{$frame['file']}");
                $frame['progress'] = CalculateFrameProgress($histogram, $start_histogram, $final_histogram);
                if ($frame['progress'] == 100 && !array_key_exists('complete', $frames)) {
                    $frames['complete'] = $time;
                }
            }
        }
    }
    if (isset($frames) && !array_key_exists('FLI', $frames)) {
        $dirty = true;
        $frames['FLI'] = CalculateFeelsLikeIndex($frames);
    }
    if ($dirty && isset($frames) && count($frames))
        gz_file_put_contents($cache_file,json_encode($frames));
    return $frames;
}

/**
* Calculate histograms for each color channel for the given image
*/
function GetImageHistogram($image_file) {
    $histogram = null;
    $ext = strripos($image_file, '.jpg');
    if ($ext !== false) {
        $histogram_file = substr($image_file, 0, $ext) . '.hist';
    }
    // first, see if we have a client-generated histogram
    if (isset($histogram_file) && is_file($histogram_file)) {
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
    if (!isset($histogram)) {
        $im = imagecreatefromjpeg($image_file);
        if ($im !== false) {
            $width = imagesx($im);
            $height = imagesy($im);
            if ($width > 0 && $height > 0) {
                $histogram = array();
                $histogram['r'] = array();
                $histogram['g'] = array();
                $histogram['b'] = array();
                for ($i = 0; $i < 256; $i++) {
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
                            $histogram['r'][$r]++;
                            $histogram['g'][$g]++;
                            $histogram['b'][$b]++;
                        }
                    }
                }
            }
        }
    }
    return $histogram;
}

/**
* Calculate how close a given histogram is to the final
*/
function CalculateFrameProgress(&$histogram, &$start_histogram, &$final_histogram) {
    $progress = 0;
    $channels = array('r', 'g', 'b');
    foreach ($channels as $channel) {
        $total = 0;
        $achieved = 0;
        for ($i = 0; $i < 256; $i++) {
            $total += abs($final_histogram[$channel][$i] - $start_histogram[$channel][$i]);
        }
        for ($i = 0; $i < 256; $i++) {
            
            $achieved += min(abs($final_histogram[$channel][$i] - $start_histogram[$channel][$i]), abs($histogram[$channel][$i] - $start_histogram[$channel][$i]));
        }
        $progress += ($achieved / $total) / count($channels);
    }
    return round($progress * 100);
}

/**
* Boil the frame loading progress down to a single number
*/
function CalculateFeelsLikeIndex(&$frames) {
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
?>
