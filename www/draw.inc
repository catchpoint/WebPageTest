<?php

/**
* Draw label next to a request like "10 ms (404)".
*/
function DrawRequestTimeLabelBackground($im, $request, $x1, $y1, $x2, $y2, $min_x, $max_x,
                              $font, $font_width, $font_color, $bg_color) {
    $label = $request['all_ms'] . ' ms';
    $code = $request['responseCode'];
    if ($code >= 300 || $code < 0) {
        $label .= " ({$request['responseCode']})";
    } elseif ($code == 0) {
        $label .= ' (request canceled)';
    }

    $label_width = strlen($label) * $font_width;
    $label_x = $x2 + 5;
    if ($label_x + $label_width > $max_x) {
        $label_x = $x1 - 5 - $label_width;
    }
    if ($label_x >= $min_x) {
        // Draw text background to erase any grid/event lines.
        imagefilledrectangle(
            $im, $label_x, $y1, $label_x + $label_width, $y2,
            $bg_color);
    }
}

function DrawRequestTimeLabel($im, $request, $x1, $y1, $x2, $y2, $min_x, $max_x,
                              $font, $font_width, $font_color, $bg_color) {
    $label = $request['all_ms'] . ' ms';
    $code = $request['responseCode'];
    if ($code >= 300 || $code < 0) {
        $label .= " ({$request['responseCode']})";
    } elseif ($code == 0) {
        $label .= ' (request canceled)';
    }

    $label_width = strlen($label) * $font_width;
    $label_x = $x2 + 5;
    if ($label_x + $label_width > $max_x) {
        $label_x = $x1 - 5 - $label_width;
    }
    if ($label_x >= $min_x) {
        // Draw the label.
        imagestring($im, $font, $label_x, $y1 + 1, $label, $font_color);
    }
}

/**
* Draw a horizontal 3D bar.
*
* @param mixed $im  Image
* @param mixed $x1
* @param mixed $y1
* @param mixed $x2
* @param mixed $y2
* @param array $color   RGB color
*/
function DrawBar(&$im, $x1, $y1, $x2, $y2, $color, $shaded) {
  if ($shaded) {
    $bar_colors = GetBarColors($color, $y2 - $y1 + 1);
    for ($i = 0; $i < count($bar_colors); $i++) {
      list($r, $g, $b) = $bar_colors[$i];
      imageline($im, $x1, $y1 + $i, $x2, $y1 + $i,
                GetColor($im, $r, $g, $b));
    }
  } else {
    list($r, $g, $b) = $color;
    imagefilledrectangle($im, $x1, $y1, $x2, $y2, GetColor($im, $r, $g, $b));
  }
}

/**
* Return array of $num colors based on $rgb to give 3D effect.
*
* Note that $rgb may not be in the returned colors. For example,
* GetBarColors(array(0, 255, 0), 3) returns
*     array(
*         array(76, 255, 76),
*         array(38, 229, 38),
*         array( 0, 204,  0)
*         );
*/
function GetBarColors($rgb, $num) {
    if ($num > 4) {
        $hi_rgb = ScaleRgb($rgb, 0.3);
        $lo_rgb = ScaleRgb($rgb, -0.2);
        $colors = InterpolateColors($hi_rgb, $lo_rgb, $num - 2);
        $mid_color = $colors[intval(($num - 2) / 2)];
        $colors = array_merge(array($mid_color, $hi_rgb), $colors);
    } else {
        $hi_rgb = ScaleRgb($rgb, 0.2);
        $lo_rgb = ScaleRgb($rgb, -0.3);
        $colors = InterpolateColors($hi_rgb, $lo_rgb, $num);
    }
    return $colors;
}

/**
* Return array of $num interpolated colors from $rgb1 to $rgb2, inclusive.
*/
function InterpolateColors($rgb1, $rgb2, $num) {
    $colors = array();
    if ($num >= 1) {
        $colors[] = $rgb1;
        $steps = array(
            (double)($rgb2[0] - $rgb1[0]) / (double)($num - 1),
            (double)($rgb2[1] - $rgb1[1]) / (double)($num - 1),
            (double)($rgb2[2] - $rgb1[2]) / (double)($num - 1)
            );
        for ($i = 1; $i < $num - 1; $i++) {
            $colors[] = array(
                intval(($steps[0] * (double)$i) + (double)$rgb1[0]),
                intval(($steps[1] * (double)$i) + (double)$rgb1[1]),
                intval(($steps[2] * (double)$i) + (double)$rgb1[2])
                );
        }
        if ($num >= 2) {
            $colors[] = $rgb2;
        }
    }
    return $colors;
}

/**
* Brighten or darken $rgb by $factor.
* @param array rgb color (e.g. array(255, 127, 0))
* @param float $factor -1, 0, 1 give black, no change, and white, respectively.
*/
function ScaleRgb($rgb, $factor) {
    $scale_rgb = array();
    $factor = (double)max(-1, min(1, $factor));

    if ($factor >= 0) {
        for ($i = 0; $i < 3; $i++) {
            $scale_rgb[] = (int)((double)(255 - $rgb[$i]) * $factor + $rgb[$i]);
        }
    } else {
        for ($i = 0; $i < 3; $i++) {
            $scale_rgb[] = (int)((double)$rgb[$i] * (1.0 + $factor));
        }
    }
    return $scale_rgb;
}

/**
* Get a color if it already exists or allocate it if it doesn't exist yet
*
* @param mixed $im
* @param mixed $r
* @param mixed $g
* @param mixed $b
*/
function GetColor(&$im, $r, $g, $b)
{
    $col = imagecolorexact($im, $r, $g, $b);
    if ($col === -1) {
        $col = imagecolorallocate($im, $r, $g, $b);
    }
    return $col;
}

/**
* Load the performance data (CPU, Memory and Bandwidth)
*/
function LoadPerfData($file_name, $use_cpu, $use_bw, $use_mem = false, $max_bw = 0) {
    $perfs = array(
        'cpu' => array('data' => array()),
        'bw' => array('data' => array()),
        'mem' => array('data' => array())
        );
    $data = gz_file($file_name, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($data && count($data) > 1) {
        foreach ($data as $row_num => $row) {
            if ($row_num > 0) {
                $fields = explode(',', $row);
                if (count($fields) >= 4) {
                    $time = $fields[0];
                    if ($use_bw) {
                        $perfs['bw']['data'][$time] = (int)$fields[1];
                    }
                    if ($use_cpu) {
                        $perfs['cpu']['data'][$time] = (float)$fields[2];
                    }
                    if ($use_mem) {
                        $perfs['mem']['data'][$time] = (int)$fields[3];
                    }
                }
            }
        }
    }
    // fix any spikiness in the bandwidth data
    if ($max_bw && $use_bw && count($perfs['bw']['data'])) {
        $max_bw *= 1000;
        // figure out the real max
        $measured_max = max($perfs['bw']['data']);
        if ($measured_max > $max_bw) {
            $extra = 0;
            $last_time = 0;
            $last_value = 0;
            krsort($perfs['bw']['data'], SORT_NUMERIC);
            foreach($perfs['bw']['data'] as $time => $value) {
                if ($last_time > $time) {
                    $elapsed = $last_time - $time;
                    if ($last_value > $max_bw) {
                        $perfs['bw']['data'][$last_time] = $max_bw;
                        $extra += ($last_value - $max_bw) * $elapsed;
                    } elseif ($extra) {
                        $available = ($max_bw - $last_value) * $elapsed;
                        if ($extra > $available) {
                            $extra -= $available;
                            $perfs['bw']['data'][$last_time] = $max_bw;
                        } else {
                            $extra = 0;
                            $bw = $extra / $elapsed;
                            $perfs['bw']['data'][$last_time] += $bw;
                        }
                    }
                }
                $last_time = $time;
                $last_value = $value;
            }
            ksort($perfs['bw']['data'], SORT_NUMERIC);
        }
    }
    if ($use_cpu) {
        $perfs['cpu']['max'] = 100.0;
        $perfs['cpu']['count'] = count($perfs['cpu']['data']);
    } else {
        unset($perfs['cpu']);
    }
    if ($use_bw) {
        $count = count($perfs['bw']['data']);
        if ($max_bw)
          $perfs['bw']['max'] = $max_bw;
        elseif ($count)
          $perfs['bw']['max'] = max($perfs['bw']['data']);
        else
          $perfs['bw']['max'] = 0;
        $perfs['bw']['count'] = $count;
    } else {
        unset($perfs['bw']);
    }
    if ($use_mem) {
        $count = count($perfs['mem']['data']);
        $perfs['mem']['max'] = $count ? max($perfs['mem']['data']) : 0;
        $perfs['mem']['count'] = $count;
    } else {
        unset($perfs['mem']);
    }
    return $perfs;
}


/**
* Draw a lock icon
*
* @param mixed $im
* @param mixed $x
* @param mixed $y
*/
function DrawLock($im, $x, $y, $width, $height)
{
    // give it some margins
    $width -= 4;
    $height -= 4;
    $top = $y + ($height * .4);
    $boxHeight = ($height - ($top - $y)) - ($height * .1);
    $lock = GetColor($im, 255, 216, 0);
    $black = GetColor($im, 0, 0, 0);
    imageellipse($im, $x + ($width / 2), $top, $width - 2, $width, $black);
    imageellipse($im, $x + ($width / 2), $top, $width - 3, $width - 1, $black);
    imageellipse($im, $x + ($width / 2), $top, $width - 4, $width - 2, $black);
    imagefilledrectangle($im, $x, $top, $x + $width, $top + $boxHeight, $lock);
    imagerectangle($im, $x, $top, $x + $width, $top + $boxHeight, $black);
}

/**
* Fake some lines to make it look like text in a thumbnail
*
*/
function ThumbnailText(&$im, $x1, $y1, $width, $height,
                       $label, $font_width, $color) {
    $x2 = $x1 + min($width, $font_width * strlen($label));
    $y2 = $y1 + $height;
    for ($y = $y1 + 1; $y < $y2; $y++) {
        for ($x = $x1; $x <= $x2; $x++) {
            if (rand(0, 2)) {
                imagesetpixel($im, $x, $y, $color);
            }
        }
    }
}

?>
