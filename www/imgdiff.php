<?php
// Generate a PNG image that is the difference of two existing images
include('common.inc');
require_once('draw.inc');

// figure out the paths to the actual images
$parts = explode('/', $_REQUEST['ref']);
if( count($parts) == 2 )
    $ref = './' . GetTestPath($parts[0]) . '/' . $parts[1];

$parts = explode('/', $_REQUEST['cmp']);
if( count($parts) == 2 )
    $cmp = './' . GetTestPath($parts[0]) . '/' . $parts[1];

$ok = false;
if( isset($ref) && isset($cmp) && is_file($ref) && is_file($cmp) )
{
    $refImg = imagecreatefrompng($ref);
    $cmpImg = imagecreatefrompng($cmp);
    if( $refImg !== FALSE && $cmpImg !== FALSE )
    {
        $refWidth = imagesx($refImg);
        $refHeight = imagesy($refImg);
        $cmpWidth = imagesx($cmpImg);
        $cmpHeight = imagesy($cmpImg);
        if( $refWidth && $refHeight && $cmpWidth && $cmpHeight )
        {
            $width = max($refWidth, $cmpWidth);
            $height = max($refHeight, $cmpHeight);
            $im = imagecreate($width, $height);
            if( $im !== FALSE )
            {
                $black = GetColor($im, 0, 0, 0);
                $white = GetColor($im, 255, 255, 255);
                imagefilledrectangle($im, 0, 0, $width, $height, $black);
                
                // loop through every pixel in the images and compare them
                for( $x = 0; $x < $width; $x++ )
                {
                    for( $y = 0; $y < $height; $y++ )
                    {
                        $different = false;
                        if( $x > $refWidth || $x > $cmpWidth || $y > $refHeight || $y > $cmpHeight )
                            $different = true;
                        else
                        {
                            $refColor = imagecolorat( $refImg, $x, $y);
                            $r = ($refColor >> 16) & 0xFF;
                            $g = ($refColor >> 8) & 0xFF;
                            $b = $refColor & 0xFF;
                            $cmpColor = imagecolorat( $cmpImg, $x, $y);
                            $r2 = ($cmpColor >> 16) & 0xFF;
                            $g2 = ($cmpColor >> 8) & 0xFF;
                            $b2 = $cmpColor & 0xFF;
                            if( $r !=$r2 || $g != $g2 || $b != $b2 )
                                $different = true;
                        }
                        if ($different)
                            imagesetpixel($im, $x, $y, $white);
                    }
                }
                
                $ok = true;
                imagedestroy($refImg);
                imagedestroy($cmpImg);
                header ("Content-type: image/png");
                imagepng($im);
            }
        }
    }
}

if( !$ok )
    header("HTTP/1.0 404 Not Found");
?>
