<?php
/**
* Draw a 3D bar
* 
* @param mixed $im  Image
* @param mixed $x1
* @param mixed $y1
* @param mixed $x2
* @param mixed $y2
* @param array $color   RGB color
*/
function drawBar(&$im, $x1, $y1, $x2, $y2, &$color)
{
    $mid = (int)(((double)($y2 - $y1) * 0.25) + $y1);
    
    // build the highlight color
    $highlight = array();
    for( $i = 0; $i < 3; $i++ )
        $highlight[$i] = (int)((double)(255 - $color[$i]) * 0.3 + $color[$i]);

    // build the shadow color
    $shadow = array();
    for( $i = 0; $i < 3; $i++ )
        $shadow[$i] = (int)((double)$color[$i] * 0.8);
    
    drawGradient($im, $x1, $y1, $x2, $mid, $shadow, $highlight);
    drawGradient($im, $x1, $mid, $x2, $y2, $highlight, $shadow);
}

/**
* Draw a Gradient bar (1/2 of a 3D bar)
* 
* @param mixed $im
* @param mixed $x1
* @param mixed $y1
* @param mixed $x2
* @param mixed $y2
* @param mixed $color1
* @param mixed $color2
*/
function drawGradient(&$im, $x1, $y1, $x2, $y2, &$color1, &$color2)
{
    // draw the top and bottom lines
    $col = GetColor($im, $color1[0], $color1[1], $color1[2]);
    imageline($im, $x1, $y1, $x2, $y1, $col);
    $col = GetColor($im, $color2[0], $color2[1], $color2[2]);
    imageline($im, $x1, $y2, $x2, $y2, $col);
    
    // fill in any intermediate lines
    $colSteps = array();
    $steps = $y2 - $y1 - 1;
    for( $i = 0; $i < 3; $i++ )
        $colSteps[$i] = (double)($color2[$i] - $color1[$i]) / (double)$steps;
        
    for( $i = 1; $i <= $steps; $i++ )
    {
        $r = (int)((double)$color1[0] + $colSteps[0] * (double)$i);
        $g = (int)((double)$color1[1] + $colSteps[1] * (double)$i);
        $b = (int)((double)$color1[2] + $colSteps[2] * (double)$i);
        $col = GetColor($im, $r, $g, $b);
        $y = $y1 + $i;
        imageline($im, $x1, $y, $x2, $y, $col);
    }
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
    if( $col === -1 )
        $col = imagecolorallocate($im, $r, $g, $b);
        
    return $col;
}

/**
* Load the performance data (CPU, Memory and Bandwidth)
* 
* @param mixed $options
*/
function loadPerf(&$options)
{
    $perf = null;
    
    if( $options['path'] )
    {
        $cached = '';
        if( $options['cached'] )
            $cached .= '_Cached';
        $file = "{$options['path']}/{$options['run']}{$cached}_progress.csv";
        $data = gz_file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if( $data && count($data) > 1 )
        {
            $perf = array();
            $perf['cpu'] = array();
            $perf['mem'] = array();
            $perf['bw'] = array();
            foreach( $data as $rowNum => &$row )
            {
                if( $rowNum > 0 )
                {
                    $fields = explode(',', $row);
                    if( count($fields) >= 4 )
                    {
                        $time = $fields[0];
                        $perf['bw'][$time] = (int)$fields[1];
                        $perf['cpu'][$time] = (float)$fields[2];
                        $perf['mem'][$time] = (int)$fields[3];
                    }
                }
            }
        }
    }
    
    return $perf;
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
function ThumbnailText(&$im, $x1, $y1, $width, $height, $string, $fontWidth, &$color)
{
    $count = strlen($string);
    $x2 = min($width, $x1 + ($fontWidth * $count));
    for( $y = $y1 + 1; $y < $y1 + $height; $y++ )
    {
        for( $x = $x1; $x <= $x2; $x++ )
        {
            if( rand(0, 2) )
                imagesetpixel($im, $x, $y, $color);
        }
    }
}

?>
