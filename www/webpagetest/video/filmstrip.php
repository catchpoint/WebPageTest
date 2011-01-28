<?php
header('Content-disposition: attachment; filename=filmstrip.png');
header ("Content-type: image/png");

chdir('..');
include 'common.inc';
require_once('page_data.inc');
require_once('draw.inc');
include 'video/filmstrip.inc.php';  // include the commpn php shared across the filmstrip code

$colMargin = 5;
$rowMargin = 5;
$font = 4;
$fontWidth = imagefontwidth($font);
$fontHeight = imagefontheight($font);
$thumbTop = $fontHeight + $rowMargin;

// figure out the label width
$labelWidth = 0;
foreach( $tests as &$test )
{
    $test['label'] = $test['name'];
    $len = strlen($test['label']);
    if( $len > 30 )
    {
        $test['label'] = substr($test['label'], 0, 27) . '...';
        $len = strlen($test['label']);
    }
    if( $len > $labelWidth )
        $labelWidth = $len;
}
$labelWidth = $labelWidth * $fontWidth;
$thumbLeft = $labelWidth + $colMargin;

// figure out how many columns there are
$end = 0;
foreach( $tests as &$test )
    if( $test['video']['end'] > $end )
        $end = $test['video']['end'];

// figure out the size of the resulting image
$width = $thumbLeft + $colMargin;
$count = 0;
$skipped = $interval;
$last = $end + $interval - 1;
for( $frame = 0; $frame <= $last; $frame++ )
{
    $skipped++;
    if( $skipped >= $interval )
    {
        $skipped = 0;
        $count++;
    }
}
$width += ($thumbSize + ($colMargin * 2)) * $count;

// figure out the height of each row
$height = $fontHeight + ($rowMargin * 2);
foreach( $tests as &$test )
{
    $rowheight = (int)($thumbSize * (4.0 / 3.0));
    if( $test['video']['width'] && $test['video']['height'] )
        $rowheight = (int)(((float)$thumbSize / (float)$test['video']['width']) * (float)$test['video']['height']);
    $test['thumbHeight'] = $rowheight;
    $height += $rowheight + ($rowMargin * 2);
}

// create the blank image
$im = imagecreatetruecolor($width, $height);

// define some colors
$black = GetColor($im, 0, 0, 0);
$white = GetColor($im, 255, 255, 255);
$textColor = GetColor($im, 255, 255, 255);
$colChanged = GetColor($im, 254,179,1);

imagefilledrectangle($im, 0, 0, $width, $height, $black);

// put the time markers across the top
$left = $thumbLeft;
$top = $thumbTop - $fontHeight;
$skipped = $interval;
$last = $end + $interval - 1;
for( $frame = 0; $frame <= $last; $frame++ )
{
    $skipped++;
    if( $skipped >= $interval )
    {
        $left += $colMargin;
        $skipped = 0;
        $val = number_format((float)$frame / 10.0, 1) . 's';
        $x = $left + (int)($thumbSize / 2.0) - (int)((double)$fontWidth * ((double)strlen($val) / 2.0));
        imagestring($im, $font, $x, $top, $val, $textColor);
        $left += $thumbSize + $colMargin;
    }
}

// draw the text labels
$top = $thumbTop;
$left = $colMargin;
foreach( $tests as &$test )
{
    $top += $rowMargin;
    $x = $left + $labelWidth - (int)(strlen($test['label']) * $fontWidth);
    $y = $top + (int)(($test['thumbHeight'] / 2.0) - ($fontHeight / 2.0));
    imagestring($im, $font, $x, $y, $test['label'], $textColor);
    $top += $test['thumbHeight'] + $rowMargin;
}

// fill in the actual thumbnails
$top = $thumbTop;
$thumb = null;
foreach( $tests as &$test )
{
    $left = $thumbLeft;
    $top += $rowMargin;
    
    $lastThumb = null;
    if( $thumb )
    {
        imagedestroy($thumb);
        unset($thumb);
    }
    $skipped = $interval;
    $last = $end + $interval - 1;
    for( $frame = 0; $frame <= $last; $frame++ )
    {
        $path = $test['video']['frames'][$frame];
        if( isset($path) )
            $test['currentframe'] = $frame;
        else
        {
            if( isset($test['currentframe']) )
                $path = $test['video']['frames'][$test['currentframe']];
            else
                $path = $test['video']['frames'][0];
        }

        if( !$lastThumb )
            $lastThumb = $path;
        
        $skipped++;
        if( $skipped >= $interval )
        {
            $skipped = 0;

            if( $frame - $interval + 1 <= $test['video']['end'] )
            {
                unset($border);
                $cached = '';
                if( $test['cached'] )
                    $cached = '_cached';
                $imgPath = GetTestPath($test['id']) . "/video_{$test['run']}$cached/$path";
                if( $lastThumb != $path || !$thumb )
                {
                    if( $lastThumb != $path )
                        $border = $colChanged;
                    
                    // load the new thumbnail
                    if( $thumb )
                    {
                        imagedestroy($thumb);
                        unset($thuumb);
                    }
                    $tmp = imagecreatefromjpeg("./$imgPath");
                    if( $tmp )
                    {
                        $thumb = imagecreatetruecolor($thumbSize, $test['thumbHeight']);
                        imagecopyresampled($thumb, $tmp, 0, 0, 0, 0, $thumbSize, $test['thumbHeight'], imagesx($tmp), imagesy($tmp));
                        imagedestroy($tmp);
                    }
                }
                
                // draw the thumbnail
                $left += $colMargin;
                if( isset($border) )
                    imagefilledrectangle($im, $left - 2, $top - 2, $left + imagesx($thumb) + 2, $top + imagesy($thumb) + 2, $border);
                imagecopy($im, $thumb, $left, $top, 0, 0, imagesx($thumb), imagesy($thumb));
                $left += $thumbSize + $colMargin;
                
                $lastThumb = $path;
            }
        }
    }
    
    $top += $test['thumbHeight'] + $rowMargin;
}

// spit the image out to the browser
imagepng($im);
imagedestroy($im);
?>
