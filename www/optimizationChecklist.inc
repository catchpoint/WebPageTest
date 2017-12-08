<?php
require_once('draw.inc');

/**
* Draw the waterfall view image
*
* @return resource
*/
function drawChecklist($url, &$requests, &$pageData, $imageMap = false)
{
    $width = 930;
    $font = 2;
    $rowHeight = imagefontheight($font) + 4;
    $fontWidth = imagefontwidth($font);
    $height = 2 + (3 * $rowHeight) + ($rowHeight * count($requests));
    $totalHeight = $height;

    $left = 250;
    $w = $width - 2 - $left;
    $maxChars = (int)(($left - 4) / $fontWidth);

    // draw a bunch of stuff that is only needed if we're ACTUALLY drawing the chart
    if( $imageMap )
    {
    }
    else
    {
        $im = imagecreatetruecolor($width, $totalHeight);

        // allocate the colors we will need
        $white = GetColor($im, 255, 255, 255);
        $black = GetColor($im, 0, 0, 0);
        $grey = GetColor($im, 240, 240, 240);
        $dkGrey = GetColor($im, 192, 192, 192);
        $error = GetColor($im, 255, 0, 0);
        $warning = GetColor($im, 255, 255, 0);

        // give it a white background and black border
        imagefilledrectangle($im, 0, 0, $width, $totalHeight, $white);
        imagerectangle($im, 0, 0, $width - 1, $height - 1, $black);

        // do the alternating row coloring (after a 2 row header)
        $y = 1 + ($rowHeight * 2);
        $i = 0;
        foreach( $requests as $request )
        {
            $color = $white;
            if( $i % 2 == 0 )
                $color = $grey;
            if( $request['responseCode'] != 401 && ($request['responseCode'] >= 400 || $request['responseCode'] < 0) )
                $color = $error;
            elseif( $request['responseCode'] >= 300 )
                $color = $warning;
            imagefilledrectangle($im, 1, $y, $width - 2, $y + $rowHeight - 1, $color);
            $y += $rowHeight;
            $i++;
        }

        // draw the optimization checks separators
        $standards = array( 'score_keep-alive' => 'Keep-Alive',
                            'score_gzip' => 'GZip',
                            'score_compress' => 'Compress Img',
                            'score_progressive_jpeg' => 'Progressive',
                            'score_cache' => 'Cache Static',
                            'score_cdn' => 'CDN Detected');
        $stdCount = count($standards);

        $x = $left;
        $inc = $w / $stdCount;
        foreach( $standards as $index => $standard )
        {
            // put in the label
            $len = $fontWidth * strlen($standard);
            $pos = $x + (($inc - $len) / 2);
            imagestring($im, $font, $pos, 2,  $standard, $black);
            imagestring($im, $font, $pos, $height - $rowHeight + 1,  $standard, $black);

            // put in the score
            $score = $pageData[$index];
            $txt = 'N/A';
            if( isset($score) && $score >=0 && $score <= 100 )
                $txt = "$score%";
            $len = $fontWidth * strlen($txt);
            $pos = $x + (($inc - $len) / 2);
            imagestring($im, $font, $pos, 2 + $rowHeight,  $txt, $black);

            // draw the separator
            imageline($im, $x, 0, $x, $height - 1, $black);
            $x += $inc;
        }

        // put the url label in
        $x = 4;
        $y = 2 + $rowHeight;
        $label = $url;
        if( $x + (strlen($label) * $fontWidth) > $left )
        {
            $chars = ($left - $x) / $fontWidth;
            $label = substr($label, 0, $chars - 4) . '...';
        }
        imagestring($im, $font, $x, $y,  $label, $black);
    }

    // load the image icons (and size them)
    $checkIcon = imagecreatefrompng('images/check.png');
    $warningIcon = imagecreatefrompng('images/warning.png');
    $errorIcon = imagecreatefrompng('images/error.png');

    // draw the request information
    $i = 0;
    $y = 2 + ($rowHeight * 2);
    foreach($requests as $request)
    {
        $i++;
        $x = 4;

        if( !$imageMap )
        {
            // draw the label
            $path = parse_url('http://' . $request['host'] . $request['url'], PHP_URL_PATH);
            $object = basename($path);
            // if the last character is a /, add it on
            if( substr($path, -1) == '/' )
                $object .= '/';
            $label = $i . ': ' . $request['host'] . ' - ' . $object;
            imagestring($im, $font, $x, $y,  FitText($label, $maxChars), $black);

            // put in the optimization icons
            $x = $left;
            foreach( $standards as $index => $standard )
            {
                $val = $request[$index];
                if( isset($val) )
                {
                    $icon;
                    if( $val == 0 )
                        $icon = &$errorIcon;
                    elseif( $val > 0 && $val < 100 )
                        $icon = &$warningIcon;
                    elseif( $val == 100 )
                        $icon = &$checkIcon;

                    if( isset($icon) )
                    {
                        $iw = imagesx($icon);
                        $ih = imagesy($icon);
                        $pos = $x + (($inc - $iw) / 2);
                        $posY = $y + (($rowHeight - $ih) / 2);
                        imagecopy($im, $icon, $pos, $posY, 0, 0, $iw, $ih);
                        unset($icon);
                    }
                }

                $x += $inc;
            }
        }


        $y += $rowHeight;
    }

    if( $imageMap )
        return $map;
    else
        return $im;
}

?>
