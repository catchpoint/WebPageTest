<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

require_once __DIR__ .'/../common_lib.inc';
require_once __DIR__ . '/../archive.inc';
require_once __DIR__ . '/visualProgress.inc.php';
require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/../include/TestResults.php';
require_once __DIR__ . '/../include/TestStepResult.php';

// Build the $tests object from the request URL
function BuildRenderTests() {
    global $user;
    $tests = array();

    $endTime = 'visual';
    if( strlen($_REQUEST['end']) )
        $endTime = trim($_REQUEST['end']);
    $videoIdExtra = "";
    $bgColor = isset($_REQUEST['bg']) ? htmlspecialchars($_REQUEST['bg']) : '000000';
    $textColor = isset($_REQUEST['text']) ? htmlspecialchars($_REQUEST['text']) : 'ffffff';

    $compTests = explode(',', $_REQUEST['tests']);
    foreach($compTests as $t)
    {
        $parts = explode('-', $t);
        if( count($parts) >= 1 && $parts[0] != '' )
        {
            $test = array();
            $test['id'] = $parts[0];
            $test['cached'] = 0;
            $test['step'] = 1;
            $test['end'] = $endTime;
            $test['extend'] = false;
            $test['syncStartRender'] = "";
            $test['syncDocTime'] = "";
            $test['syncFullyLoaded'] = "";
            $test['bg'] = $bgColor;
            $test['text'] = $textColor;
            $label = null;

            if (isset($_REQUEST['labelHeight']) && is_numeric($_REQUEST['labelHeight']))
              $test['labelHeight'] = intval($_REQUEST['labelHeight']);
            if (isset($_REQUEST['timeHeight']) && is_numeric($_REQUEST['timeHeight']))
              $test['timeHeight'] = intval($_REQUEST['timeHeight']);

            if (isset($_REQUEST['slow']) && $_REQUEST['slow'])
              $test['speed'] = 0.2;

            for( $i = 1; $i < count($parts); $i++ )
            {
                $p = explode(':', $parts[$i]);
                if( count($p) >= 2 )
                {
                    if( $p[0] == 'r' )
                        $test['run'] = (int)$p[1];
                    if( $p[0] == 'l' )
                        $label = preg_replace('/[^a-zA-Z0-9 \-_]/', '', $p[1]);
                    if( $p[0] == 'c' )
                        $test['cached'] = (int)$p[1];
                    if( $p[0] == 's')
                        $test['step'] = (int)$p[1];
                    if( $p[0] == 'e' )
                        $test['end'] = trim($p[1]);
                    if( $p[0] == 'i' )
                        $test['initial'] = intval(trim($p[1]) * 1000.0);
                    // Optional extra info to sync the video with
                    if( $p[0] == 'p' )
                        $test['syncStartRender'] = (int)$p[1];
                    if( $p[0] == 'd' )
                        $test['syncDocTime'] = (int)$p[1];
                    if( $p[0] == 'f' )
                        $test['syncFullyLoaded'] = (int)$p[1];
                }
            }

            RestoreTest($test['id']);
            $test['path'] = GetTestPath($test['id']);
            $info = GetTestInfo($test['id']);
            if ($info) {
                if (array_key_exists('discard', $info) &&
                    $info['discard'] >= 1 &&
                    array_key_exists('priority', $info) &&
                    $info['priority'] >= 1) {
                    $defaultInterval = 100;
                }
                $test['url'] = $info['url'];
                $test_median_metric = GetSetting('medianMetric', 'loadTime');
                if (isset($info['medianMetric']))
                  $test_median_metric = $info['medianMetric'];
            }
            $testInfoObject = TestInfo::fromFiles("./" . $test['path']);

            if( !array_key_exists('run', $test) || !$test['run'] ) {
                $testResults = TestResults::fromFiles($testInfoObject);
                $test['run'] = $testResults->getMedianRunNumber($test_median_metric, $test['cached']);
                $runResults = $testResults->getRunResult($test['run'], $test['cached']);
                $stepResult = $runResults->getStepResult($test['step']);
            } else {
                $stepResult = TestStepResult::fromFiles($testInfoObject, $test['run'], $test['cached'], $test['step']);
            }
            $test['pageData'] = $stepResult->getRawResults();
            $test['aft'] = (int) $stepResult->getMetric('aft');

            $loadTime = $stepResult->getMetric('fullyLoaded');
            if( isset($loadTime) && (!isset($fastest) || $loadTime < $fastest) )
                $fastest = $loadTime;
            // figure out the real end time (in ms)
            if (isset($test['end'])) {
                $visualComplete = $stepResult->getMetric("visualComplete");
                $lastChange = $stepResult->getMetric("lastVisualChange");
                if( !strcmp($test['end'], 'visual') && $visualComplete !== null ) {
                    $test['end'] = $visualComplete;
                } elseif( !strcmp($test['end'], 'load') ) {
                    $test['end'] = $stepResult->getMetric('loadTime');
                } elseif( !strcmp($test['end'], 'doc') ) {
                    $test['end'] = $stepResult->getMetric('docTime');
                } elseif(!strncasecmp($test['end'], 'doc+', 4)) {
                    $test['end'] = $stepResult->getMetric('docTime') + (int)((double)substr($test['end'], 4) * 1000.0);
                } elseif( !strcmp($test['end'], 'full') ) {
                    $test['end'] = $stepResult->getMetric("fullyLoaded");;
                } elseif( !strcmp($test['end'], 'all') && $lastChange !== null ) {
                    $test['end'] = $lastChange;
                } elseif( !strcmp($test['end'], 'aft') ) {
                    $test['end'] = $test['aft'];
                    if( !$test['end'] )
                        $test['end'] = $lastChange;
                } else {
                    $test['end'] = (int)((double)$test['end'] * 1000.0);
                }
            } else {
                $test['end'] = 0;
            }
            if( !$test['end'] )
                $test['end'] = $stepResult->getMetric('fullyLoaded');

            // round the test end up to the closest 100ms interval
            if ($test['end'] > 0) {
                $test['end'] = intval(ceil(floatval($test['end']) / 100.0) * 100.0);
            }
            $localPaths = new TestPaths('./' . $test['path'], $test["run"], $test["cached"], $test["step"]);
            $test['videoPath'] = $localPaths->videoDir();

            if ($test['syncStartRender'] || $test['syncDocTime'] || $test['syncFullyLoaded'])
                $videoIdExtra .= ".{$test['syncStartRender']}.{$test['syncDocTime']}.{$test['syncFullyLoaded']}";

            if (!isset($label) || !strlen($label)) {
                if ($info && isset($info['label']))
                    $label = $info['label'];
                $new_label = getLabel($test['id'], $user);
                if (!empty($new_label))
                    $label = $new_label;
            }
            if( empty($label) ) {
              $label = $test['url'];
              $label = str_replace('http://', '', $label);
              $label = str_replace('https://', '', $label);
            }
            if (empty($label))
                $label = trim($stepResult->getUrl());
            $test['label'] = $label;

            if ($info && isset($info['locationText']))
                $test['location'] = $info['locationText'];

            if( is_dir($test['videoPath']) ) {
                $tests[] = $test;
            }
        }
    }

    return $tests;
}

function BuildRenderInfo(&$tests) {
    $renderInfo = null;
    if (isset($tests) && is_array($tests) && count($tests) && RestoreTestsForVideo($tests)) {
        $renderInfo = array(
            "width" => 900,
            "height" => 650,
            "padding" => 4,
            "textPadding" => 0,
            "minThumbnailSize" => 60,
            "biggestThumbnail" => 0,
            "backgroundColor" => null,
            "textColor" => null,
            "bgEvenText" => null,
            "bgOddText" => null,
            "image_bytes" => null,
            "timeFont" => __DIR__ . '/font/sourcesanspro-semibold.ttf',
            "labelFont" => __DIR__ . '/font/sourcesanspro-semibold.ttf',
            "labelHeight" => 30,
            "timeHeight" => 40,
            "timePadding" => 3,
            "rowPadding" => 10,
            "bottomMargin" => 30,
            "maxAspectRatio" => 0,
            "min_font_size" => 4,
            "videoExtendTime" => 3000,
            "encodeFormat" => 'jpg',  // can be jpg (faster) or png (much slower), used internally to transfer to ffmpeg
            "encoderSpeed" => 'superfast',
            "fps" => 30,
            "speed" => 1,
            "fractionTime" => 10, // tenths of a second - 100 or 1000 are also available
            "stopTime" => null,
            "combineTimeLabel" => false,
            "evenTextBackground" => null,
            "oddTextBackground" => null,
            "forceBackgroundColor" => null,
            "forceTextColor" => null,
            "timeSeconds" => false,
            "stopText" => '',
            "forceFontSize" => 0
        );

        // load any overrides
        $video_settings_file = __DIR__ . '/../settings/video.ini';
        if (is_file($video_settings_file)) {
            $videoSettings = parse_ini_file($video_settings_file);
            if (isset($videoSettings['width']))
                $renderInfo["width"] = (int)$videoSettings['width'];
            if (isset($videoSettings['height']))
                $renderInfo["height"] = (int)$videoSettings['height'];
            if (isset($videoSettings['padding']))
                $renderInfo["padding"] = (int)$videoSettings['padding'];
            if (isset($videoSettings['text-padding']))
                $renderInfo["textPadding"] = (int)$videoSettings['text-padding'];
            if (isset($videoSettings['label-height']))
                $renderInfo["labelHeight"] = (int)$videoSettings['label-height'];
            if (isset($videoSettings['time-height']))
                $renderInfo["timeHeight"] = (int)$videoSettings['time-height'];
            if (isset($videoSettings['font-size']))
                $renderInfo["forceFontSize"] = (float)$videoSettings['font-size'];
            if (isset($videoSettings['time-padding']))
                $renderInfo["timePadding"] = (int)$videoSettings['time-padding'];
            if (isset($videoSettings['row-padding']))
                $renderInfo["rowPadding"] = (int)$videoSettings['row-padding'];
            if (isset($videoSettings['bottom-margin']))
                $renderInfo["bottomMargin"] = (int)$videoSettings['bottom-margin'];
            if (isset($videoSettings['video-extend-time']))
                $renderInfo["videoExtendTime"] = (int)$videoSettings['video-extend-time'];
            if (isset($videoSettings['stop-time']))
                $renderInfo["stopTime"] = $videoSettings['stop-time'];
            if (isset($videoSettings['stop-text']))
                $renderInfo["stopText"] = $videoSettings['stop-text'];
            if (isset($videoSettings['combine-time-label']) && $videoSettings['combine-time-label'])
                $renderInfo["combineTimeLabel"] = true;
            if (isset($videoSettings['time-seconds']) && $videoSettings['time-seconds'])
                $renderInfo["timeSeconds"] = true;
            if (isset($videoSettings['background-color']))
                $renderInfo["forceBackgroundColor"] = $videoSettings['background-color'];
            if (isset($videoSettings['text-color']))
                $renderInfo["forceTextColor"] = $videoSettings['text-color'];
            if (isset($videoSettings['even-text-bg']))
                $renderInfo["evenTextBackground"] = $videoSettings['even-text-bg'];
            if (isset($videoSettings['odd-text-bg']))
                $renderInfo["oddTextBackground"] = $videoSettings['odd-text-bg'];
        }

        if ($renderInfo["combineTimeLabel"])
            $renderInfo["labelHeight"] = 0;

        // if FreeType isn't supported we can't draw text
        $gdinfo = gd_info();
        if(!isset($gdinfo['FreeType Support']) || !$gdinfo['FreeType Support']) {
            $renderInfo["labelHeight"] = 0;
            $renderInfo["timeHeight"] = 0;
        }

        // override any settings specified in the test data
        if (isset($tests[0]['labelHeight']))
            $renderInfo["labelHeight"] = intval($tests[0]['labelHeight']);
        if (isset($tests[0]['timeHeight']))
            $renderInfo["timeHeight"] = intval($tests[0]['timeHeight']);

        // adjust the label sizes if we have a LOT of tests
        $scale = 1;
        $count = count($tests);
        if ($count > 49)
            $scale = 0;
        elseif ($count > 36)
            $scale = 0.5;
        elseif ($count > 25)
            $scale = 0.6;
        elseif ($count > 16)
            $scale = 0.7;
        elseif ($count > 9)
            $scale = 0.8;

        // Figure out the end time of the video
        $renderInfo["videoEnd"] = 0;
        $all_http = true;
        foreach($tests as &$test) {
            if (isset($test['label']) && strlen($test['label']) && substr($test['label'], 0, 7) !== 'http://')
                $all_http = false;
            if (isset($test['speed']) && $test['speed'] > 0 && $test['speed'] < 10)
                $renderInfo["speed"] = $test['speed'];
            if (isset($test['bare']) && $test['bare'])
                $scale = 0;
            if (isset($test['end']) && is_numeric($test['end']) && $test['end'] > $renderInfo["videoEnd"])
                $renderInfo["videoEnd"] = $test['end'];
            if (isset($test['path']) &&
                    isset($test['run']) &&
                    isset($test['cached'])) {
                if (isset($test['step'])) {
                    $localPaths = new TestPaths('./' . $test['path'], $test["run"], $test["cached"], $test["step"]);
                    $progress = GetVisualProgressForStep($localPaths);
                } else {
                    $progress = GetVisualProgress("./{$test['path']}", $test['run'], $test['cached']);
                }
                if (isset($progress) && is_array($progress) && isset($progress['frames'])) {
                    $test['frames'] = $progress['frames'];
                    if (count($test['frames'])) {
                        $frame = current($test['frames']);
                        $dim = getimagesize("./{$frame['path']}");
                        $size = max($dim[0], $dim[1]);
                        if ($size > $renderInfo["biggestThumbnail"])
                            $renderInfo["biggestThumbnail"] = $size;
                        $test['aspect'] = $dim[0] / $dim[1];
                        if ($test['aspect'] > $renderInfo["maxAspectRatio"])
                            $renderInfo["maxAspectRatio"] = $test['aspect'];
                        if (stripos($frame['file'], 'ms_') !== false) {
                            $renderInfo["fps"] = 60;
                        }
                    }
                }
            }
        }

        if ($scale < 1) {
            $renderInfo["labelHeight"] = ceil($renderInfo["labelHeight"] * $scale);
            $renderInfo["timeHeight"] = ceil($renderInfo["timeHeight"] * $scale);
            $renderInfo["rowPadding"] = ceil($renderInfo["rowPadding"] * $scale);
        }

        // no need for 60fps video if we are running in slow motion
        if ($renderInfo["speed"] < 0.5 && $renderInfo["fps"] == 60)
            $renderInfo["fps"] = 30;

        // Keep the time extension constant
        $renderInfo["videoExtendTime"] = $renderInfo["videoExtendTime"] * $renderInfo["speed"];

        if ($all_http) {
            foreach($tests as &$test) {
                if (isset($test['label']) && strlen($test['label']) && substr($test['label'], 0, 7) === 'http://')
                    $test['label'] = substr($test['label'], 7);
            }
        }

        if ($renderInfo["videoEnd"] > 0) {
            $renderInfo["videoEnd"] += $renderInfo["videoExtendTime"];
            $renderInfo["frameCount"] = ceil(($renderInfo["videoEnd"] * $renderInfo["fps"] / 1000) / $renderInfo["speed"]);
            CalculateVideoDimensions($tests, $renderInfo);
        } else {
            unset($renderInfo);
        }
    }

    return $renderInfo;
}

function RestoreTestsForVideo($tests) {
    // Restore all of the tests
    foreach($tests as $test) {
        RestoreTest($test['id']);
    }
    // Validate all of the tests exist
    foreach($tests as $test) {
        if (!isset($test['id'])) {
            return false;
        }
        $testPath = __DIR__ . '/../' . GetTestPath($test['id']);
        if (!is_dir($testPath)) {
            return false;
        }
    }
    return true;
}

function RenderVideo($tests, $videoFile) {
    // Settings used throughout the video render
    $renderInfo = BuildRenderInfo($tests);
    if (isset($renderInfo)) {
        $im = PrepareImage($tests, $renderInfo);
        if ($im !== false) {
            RenderFrames($tests, $renderInfo, $videoFile, $im);
            imagedestroy($im);
        }
    }
}

/**
 * Create the base gd image that will be used for rendering each frame
* 
*/
function PrepareImage($tests, &$renderInfo) {
    $im = imagecreatetruecolor($renderInfo["width"], $renderInfo["height"]);

    // allocate the background and foreground colors
    $bgcolor = isset($tests[0]['bg']) ? html2rgb($tests[0]['bg']) : html2rgb('000000');
    $color = isset($tests[0]['text']) ? html2rgb($tests[0]['text']) : html2rgb('ffffff');
    if (isset($renderInfo["forceBackgroundColor"]))
        $bgcolor = html2rgb($renderInfo["forceBackgroundColor"]);
    if (isset($renderInfo["forceTextColor"]))
        $color = html2rgb($renderInfo["forceTextColor"]);
    $bgEvenTextColor = isset($renderInfo["evenTextBackground"]) ? html2rgb($renderInfo["evenTextBackground"]) : $bgcolor;
    $bgOddTextColor = isset($renderInfo["oddTextBackground"]) ? html2rgb($renderInfo["oddTextBackground"]) : $bgcolor;

    // prepare the image
    $renderInfo["backgroundColor"] = imagecolorallocate($im, $bgcolor[0], $bgcolor[1], $bgcolor[2]);
    $renderInfo["textColor"] = imagecolorallocate($im, $color[0], $color[1], $color[2]);
    $renderInfo["bgEvenText"] = imagecolorallocate($im, $bgEvenTextColor[0], $bgEvenTextColor[1], $bgEvenTextColor[2]);
    $renderInfo["bgOddText"] = imagecolorallocate($im, $bgOddTextColor[0], $bgOddTextColor[1], $bgOddTextColor[2]);
    imagefilledrectangle($im, 0, 0, $renderInfo["width"] - 1, $renderInfo["height"] - 1, $renderInfo["backgroundColor"]);

    if ($renderInfo["labelHeight"] > 0 || $renderInfo["combineTimeLabel"])
        DrawLabels($tests, $renderInfo, $im);

    return $im;
}
  
/**
 * Figure out the dimensions of the resulting video
* 
*/
function CalculateVideoDimensions(&$tests, &$renderInfo) {
    $count = count($tests);
    if ($renderInfo["maxAspectRatio"] < 1) {
        // all mobile (narrow)
        if ($count <= 12)
            $rows = ceil($count / 6);
        elseif ($count <= 21)
            $rows = ceil($count / 7);
        elseif ($count <= 40)
            $rows = ceil($count / 8);
        else
            $rows = max(floor(sqrt($count) / 1.5), 1);
    } else {
        // wide-aspect (desktop)
        if ($count <= 9)
            $rows = ceil($count / 3);
        elseif ($count <= 16)
            $rows = ceil($count / 4);
        elseif ($count <= 25)
            $rows = ceil($count / 5);
        else
            $rows = max(floor(sqrt($count)), 1);
    }
    $columns = max(ceil($count / $rows), 1);

    $cellWidth = min($renderInfo["biggestThumbnail"] + $renderInfo["padding"], max(floor($renderInfo["width"] / $columns), $renderInfo["minThumbnailSize"] + $renderInfo["padding"]));
    $cellHeight = min($renderInfo["biggestThumbnail"] + $renderInfo["padding"] + $renderInfo["labelHeight"] + $renderInfo["timeHeight"] + $renderInfo["rowPadding"], max(floor(($renderInfo["height"] - (($renderInfo["labelHeight"] + $renderInfo["timeHeight"] + $renderInfo["rowPadding"]) * $rows)) / $rows), $renderInfo["minThumbnailSize"] + $renderInfo["padding"]));

    $videoWidth = ($cellWidth * $columns) + $renderInfo["padding"];
    $renderInfo["width"] = floor(($videoWidth + 7) / 8) * 8;  // Multiple of 8

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
    $renderInfo["height"] = 0;
    foreach ($row_h as $row => $aspect) {
        if ($aspect > 0)
            $row_h[$row] = min($cellHeight, ceil($cellWidth / $aspect));
        else
            $row_h[$row] = $cellHeight;
            $renderInfo["height"] += $row_h[$row];
    }
    $videoHeight = $renderInfo["bottomMargin"] + $renderInfo["height"] + $renderInfo["padding"] + (($renderInfo["labelHeight"] + $renderInfo["timeHeight"]) * $rows) + ($renderInfo["rowPadding"] * ($rows - 1));
    $renderInfo["height"] = floor(($videoHeight + 7) / 8) * 8;  // Multiple of 8

    // figure out the left and right margins
    $left = floor(($renderInfo["width"] - $videoWidth) / 2);
    $top = floor(($renderInfo["height"] - $videoHeight) / 2);

    // Figure out the placement of each video  
    $y = $top + $renderInfo["labelHeight"];
    foreach ($tests as $position => &$test) {
        $row = floor($position / $columns);
        $column = $position % $columns;
        if ($column == 0 && $row > 0)
            $y += $row_h[$row - 1] + $renderInfo["timeHeight"] + $renderInfo["labelHeight"] + $renderInfo["rowPadding"];

        // if it is the last thumbnail, make sure it takes the bottom-right slot
        if ($position == $count - 1)
            $column = $columns - 1;

        // Thumbnail image
        $test['thumbRect'] = array();
        $test['thumbRect']['x'] = $left + ($column * $cellWidth) + $renderInfo["padding"];
        $test['thumbRect']['y'] = $y + $renderInfo["padding"];
        $test['thumbRect']['width'] = $cellWidth - $renderInfo["padding"];
        $test['thumbRect']['height'] = $row_h[$row] - $renderInfo["padding"];

        // Label
        if ($renderInfo["labelHeight"] > 0) {
            $test['labelRect'] = array();
            $test['labelRect']['x'] = $left + ($column * $cellWidth) + $renderInfo["padding"];
            $test['labelRect']['y'] = $y - $renderInfo["labelHeight"] + $renderInfo["padding"];
            $test['labelRect']['width'] = $cellWidth - $renderInfo["padding"];
            $test['labelRect']['height'] = $renderInfo["labelHeight"] - $renderInfo["padding"];
            $test['labelRect']['align'] = 'center';
        }

        // Time
        if ($renderInfo["timeHeight"] > 0) {
            $test['timeRect'] = array();
            $test['timeRect']['x'] = $left + ($column * $cellWidth) + $renderInfo["padding"];
            $test['timeRect']['y'] = $y + $renderInfo["timePadding"] + $row_h[$row];
            $test['timeRect']['width'] = $cellWidth - $renderInfo["padding"];
            $test['timeRect']['height'] = $renderInfo["timeHeight"] - $renderInfo["timePadding"];
            $test['timeRect']['align'] = 'center';
            $test['timeRect']['even'] = $position % 2;

            if ($renderInfo["combineTimeLabel"]) {
                $test['labelRect'] = array();
                $test['labelRect']['x'] = $left + ($column * $cellWidth) + $renderInfo["padding"];
                $test['labelRect']['y'] = $y + $renderInfo["timePadding"] + $row_h[$row];
                $test['labelRect']['width'] = floor(($cellWidth - $renderInfo["padding"]) / 2);
                $test['labelRect']['height'] = $renderInfo["timeHeight"] - $renderInfo["timePadding"];
                $test['labelRect']['align'] = 'left';

                $test['timeRect']['align'] = 'right';
                $test['timeRect']['width'] = floor(($cellWidth - $renderInfo["padding"]) / 2);
                $test['timeRect']['x'] += $test['labelRect']['width'];
            }
        }
    }
}
  
/**
 * Render the actual video frames
* 
* @param mixed $tests
* @param mixed $frameCount
* @param mixed $im
*/
function RenderFrames(&$tests, $renderInfo, $videoFile, $im) {
    // figure out what a good interval for keyframes would be based on the video length
    $keyInt = min(max(6, $renderInfo["frameCount"] / 30), 240);

    // set up ffmpeg
    $descriptors = array(0 => array("pipe", "r"));
    $codec = $renderInfo["encodeFormat"] == 'jpg' ? 'mjpeg' : $renderInfo["encodeFormat"];
    $command = "ffmpeg -f image2pipe -vcodec $codec -r {$renderInfo['fps']} -i - ".
    "-vcodec libx264 -r {$renderInfo['fps']} -crf 24 -g $keyInt ".
    "-preset {$renderInfo['encoderSpeed']} -movflags +faststart -y \"$videoFile\"";
    $ffmpeg = proc_open($command, $descriptors, $pipes);
    if (is_resource($ffmpeg)){
        // Keep sending the same image to ffmpeg for repeated frames
        $frame_bytes = null;
        for ($frame = 0; $frame < $renderInfo["frameCount"]; $frame++) {
            $image_bytes = RenderFrame($tests, $renderInfo, $frame, $im, $renderInfo["encodeFormat"]);
            if (isset($image_bytes))
                $frame_bytes = $image_bytes;
            if (isset($frame_bytes))
                fwrite($pipes[0], $frame_bytes);
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
function RenderFrame(&$tests, $renderInfo, $frame, $im, $encodeFormat) {
    $image_bytes = null;
    $updated = false;
    $frameTime = ceil(($frame * 1000 / $renderInfo["fps"]) * $renderInfo["speed"]);
    foreach ($tests as &$test) {
        if (DrawTest($test, $renderInfo, $frameTime, $im))
            $updated = true;
    }
    if ($updated) {
        if (isset($encodeFormat)) {
            ob_start();
            if ($encodeFormat == 'jpg')
                imagejpeg($im, NULL, 85);
            else
                imagepng($im);
            $image_bytes = ob_get_contents();
            ob_end_clean();
        } else {
            return true;
        }
    }
    return $image_bytes;
}
  
/**
 * Draw the labels for all of the tests
* 
*/
function DrawLabels($tests, $renderInfo, $im) {
    // First, go through and pick a font size that will fit all of the labels
    if ($renderInfo["forceFontSize"]) {
        $font_size = $renderInfo["forceFontSize"];
    } else {
        $maxLabelLen = 30;
        do {
            $font_size = GetLabelFontSize($tests, $renderInfo);
            if ($font_size < $renderInfo["min_font_size"]) {
                // go through and trim the length of all the labels
                foreach($tests as &$test) {
                    if (isset($test['labelRect']) && isset($test['label']) && strlen($test['label']) > $maxLabelLen) {
                        $test['label'] = substr($test['label'], 0, $maxLabelLen) . '...';
                    }
                }
                $maxLabelLen--;
            }
        } while($font_size < $renderInfo["min_font_size"] && $maxLabelLen > 1);
    }

    if ($font_size > $renderInfo["min_font_size"]) {
        foreach($tests as $index => &$test) {
            if (isset($test['labelRect']) && isset($test['label']) && strlen($test['label'])) {
                $rect = $test['labelRect'];
                $bgColor = ($index % 2) ? $renderInfo["bgEvenText"] : $renderInfo["bgOddText"];
                imagefilledrectangle($im, $rect['x'], $rect['y'], $rect['x'] + $rect['width'], $rect['y'] + $rect['height'], $bgColor);
                $pos = CenterText($renderInfo, $im, $rect['x'], $rect['y'], $rect['width'], $rect['height'], $font_size, $test['label'], $renderInfo["labelFont"], null, $test['labelRect']['align']);
                if (isset($pos))
                    imagettftext($im, $font_size, 0, $pos['x'],  $pos['y'], $renderInfo["textColor"], $renderInfo["labelFont"], $test['label']);
            }
        }
    }
}
  
function GetLabelFontSize($tests, $renderInfo) {
    $font_size = null;
    foreach($tests as $test) {
        if (isset($test['labelRect']) && isset($test['label']) && strlen($test['label'])) {
            $size = GetFontSize($renderInfo, $test['labelRect']['width'], $test['labelRect']['height'], $test['label'], $renderInfo["labelFont"]);
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
function DrawTest(&$test, $renderInfo, $frameTime, $im) {
    $updated = false;

    // find the closest video frame <= the target time
    $frame_ms = null;
    foreach ($test['frames'] as $ms => $frame) {
        if ($ms <= $frameTime && $ms <= $test['end'] &&
                (!isset($frame_ms) || $ms > $frame_ms) &&
                (!isset($test['initial']) || !isset($frame_ms) || $ms >= $test['initial']))
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
        if (strtolower(substr($path, -4)) == '.png')
            $thumb = imagecreatefrompng("./$path");
        else
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
            imagefilledrectangle($im, $x, $y, $x + $w, $y + $h, $renderInfo["backgroundColor"]);
            fastimagecopyresampled($im, $thumb, $x, $y, 0, 0, $w, $h, $thumb_w, $thumb_h, 4);
            imagedestroy($thumb);
            $updated = true;
        }
    }

    if (isset($test['timeRect']) && $frameTime <= $test['end'] && DrawFrameTime($test, $renderInfo, $frameTime, $im, $test['timeRect']))
        $updated = true;

    return $updated;
}
  
/**
 * Draw the time ticker below the video.  We need to draw the
* time, period and fraction separately so we can keep the period
* fixed in place and not have things move around.
* 
* @param mixed $test
* @param mixed $frameTime
* @param mixed $im
* @param mixed $rect
*/
function DrawFrameTime(&$test, $renderInfo, $frameTime, $im, $rect) {
    static $font_size = 0;
    static $ascent = 0;
    $updated = false;
    $suffix = $renderInfo["timeSeconds"] ? 's' : '';

    if (!$font_size)
        $font_size = GetFontSize($renderInfo, $rect['width'], $rect['height'], "000.00", $renderInfo["timeFont"]);
    if (!$ascent && $font_size) {
        $box = imagettfbbox($font_size, 0, $renderInfo["timeFont"], "12345678.90");
        $ascent = abs($box[7]);
    }
    if (!isset($test['periodRect'])) {
        $test['periodRect'] = array();
        $pos = CenterText($renderInfo, $im, $rect['x'], $rect['y'], $rect['width'], $rect['height'], $font_size, "000.00$suffix", $renderInfo["timeFont"], $ascent, $rect['align']);
        $test['periodRect']['y'] = $pos['y'];
        $posText = $rect['align'] == 'right' ? ".00$suffix" : '.';
        $pos = CenterText($renderInfo, $im, $rect['x'], $rect['y'], $rect['width'], $rect['height'], $font_size, $posText, $renderInfo["timeFont"], $ascent, $rect['align']);
        $test['periodRect']['x'] = $pos['x'];
        $box = imagettfbbox($font_size, 0, $renderInfo["timeFont"], '.');
        $test['periodRect']['width'] = abs($box[4] - $box[0]);
    }

    $seconds = floor($frameTime / 1000);
    $fraction = floor($frameTime / (1000 / $renderInfo["fractionTime"])) % $renderInfo["fractionTime"];
    if ($renderInfo["fractionTime"] == 100)
        $fraction = sprintf("%02d", $fraction);
    elseif ($renderInfo["fractionTime"] == 1000)
        $fraction = sprintf("%03d", $fraction);
    if (!isset($test['endText']) &&
            isset($renderInfo["stopTime"]) &&
            isset($test['pageData'][$renderInfo["stopTime"]]) &&
            $frameTime >= $test['pageData'][$renderInfo["stopTime"]]) {
        $prefix = isset($renderInfo["stopText"]) ? "{$renderInfo['stopText']} " : '';
        $test['endText'] = "$prefix$seconds.$fraction$suffix";
    }
    $time = isset($test['endText']) ? $test['endText'] : "$seconds.$fraction";
    if (!isset($test['last_time']) || $test['last_time'] !== $time) {
        $updated = true;
        $test['last_time'] = $time;

        // erase the last time
        $bgColor = $rect['even'] ? $renderInfo["bgEvenText"] : $renderInfo["bgOddText"];
        imagefilledrectangle($im, $rect['x'], $rect['y'], $rect['x'] + $rect['width'], $rect['y'] + $rect['height'], $bgColor);

        if (isset($test['endText'])) {
            $pos = CenterText($renderInfo, $im, $rect['x'], $rect['y'], $rect['width'], $rect['height'], $font_size, $test['endText'], $renderInfo["timeFont"], $ascent, $rect['align']);
            if (isset($pos))
                imagettftext($im, $font_size, 0, $pos['x'],  $pos['y'], $renderInfo["textColor"], $renderInfo["timeFont"], $test['endText']);
        } else {
            // draw the period
            imagettftext($im, $font_size, 0, $test['periodRect']['x'],  $test['periodRect']['y'], $renderInfo["textColor"], $renderInfo["timeFont"], '.');

            // draw the seconds
            $box = imagettfbbox($font_size, 0, $renderInfo["timeFont"], $seconds);
            $s_width = abs($box[4] - $box[0]);
            $box = imagettfbbox($font_size, 0, $renderInfo["timeFont"], "$seconds.");
            $pad = abs($box[4] - $box[0]) - $s_width;
            imagettftext($im, $font_size, 0, $test['periodRect']['x'] + $test['periodRect']['width'] - $s_width - $pad,  $test['periodRect']['y'], $renderInfo["textColor"], $renderInfo["timeFont"], $seconds);

            //draw the fraction
            $box = imagettfbbox($font_size, 0, $renderInfo["timeFont"], "$fraction$suffix");
            $t_width = abs($box[4] - $box[0]);
            $box = imagettfbbox($font_size, 0, $renderInfo["timeFont"], ".$fraction$suffix");
            $pad = abs($box[4] - $box[0]) - $t_width + 1;
            imagettftext($im, $font_size, 0, $test['periodRect']['x'] + $pad,  $test['periodRect']['y'], $renderInfo["textColor"], $renderInfo["timeFont"], "$fraction$suffix");
        }
    }

    return $updated;
}
  
function GetFontSize($renderInfo, $width, $height, $text, $font) {
    if ($renderInfo["forceFontSize"]) {
        $size = $renderInfo["forceFontSize"];
    } else {
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
    }

    return $size;
}
  
function CenterText($renderInfo, $im, $x, $y, $w, $h, $size, $text, $font, $ascent = null, $align) {
    $ret = null;
    if (!$size)
        $size = GetFontSize($renderInfo, $w, $h, $text);
    if ($size) {
        $box = imagettfbbox($size, 0, $font, $text);
        if (!isset($ascent))
            $ascent = abs($box[7]);
        $ret = array();
        $out_w = abs($box[4] - $box[0]);
        $out_h = abs($box[5] - $box[1]);
        if ($align == 'left')
            $ret['x'] = $x + $renderInfo["textPadding"];
        elseif ($align == 'right')
            $ret['x'] = floor($x + ($w - $out_w - $renderInfo["textPadding"]));
        else
            $ret['x'] = floor($x + (($w - $out_w) / 2));
        $ret['y'] = floor($y + (($h - $out_h) / 2)) + $ascent;
    }
    return $ret;
}