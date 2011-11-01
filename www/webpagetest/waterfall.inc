<?php
require_once('draw.inc');
require_once('contentColors.inc');

/**
* Draw the waterfall view image
* 
* @return resource
*/
function drawWaterfall($url, &$requests, &$pageData, $imageMap = false, $options = null)
{
    global $settings;
    
    $startRender = $pageData['render'];
    $domElement = $pageData['domTime'];
    $docComplete = $pageData['docTime'];
    $aft = $pageData['aft'];
    $mime = false;
    if( isset($options['mime']) )
        $mime = $options['mime'];
    $state = false;
    if( isset($options['state']) )
        $state = $options['state'];

    $thumbnail = false;
    if( isset($options['thumbnail']) )
        $thumbnail = $options['thumbnail'];
    if( $thumbnail )
    {
        $cpuHeight = 16;
        $bwHeight = 16;
    }
    else
    {
        $cpuHeight = 50;
        $bwHeight = 50;
    }
    $requestList = FilterRequests($requests);
    $rowCount = count($requestList);
    $requestsBefore = false;
    if( $rowCount && $requestList[0] > 0 )
    {
        if( !isset($options) || $options['dots'] == true )
        {
            $rowCount++;
            $requestsBefore = true;
        }
    }
    $requestsAfter = false;
    $last = $requestList[$rowCount - 1];
    $rCount = count($requests) - 1;
    if( count($requestList) && $requestList[count($requestList) - 1] < count($requests) - 1 )
    {
        if( !isset($options) || $options['dots'] == true )
        {
            $rowCount++;
            $requestsAfter = true;
        }
    }

    $width=$_REQUEST['width'];
    if( isset($options['width']) && (int)$options['width'])
        $width = (int)$options['width'];
    if( !$width || (!$thumbnail && $width < 300) || $width > 2000 )
        $width = 930;
    $font = 2;
    $rowHeight = imagefontheight($font) + 4;
    if( $thumbnail )
        $fontWidth = 1;
    else
        $fontWidth = imagefontwidth($font);
    if( $thumbnail )
        $rowHeight = 4;
    $height = 2 + (3 * $rowHeight) + ($rowHeight * $rowCount);
    $dataHeight = $height;
    $perf  = loadPerf($options);
    $bwMax = 0;
    if( $perf && $options['cpu'] )
        $height += $cpuHeight;
    if( $perf && $options['bw'] )
    {
        // figure out the top-end of the bandwidth scale
        foreach( $perf['bw'] as $bw )
            if( $bw > $bwMax )
                $bwMax = $bw;
        if( $bwMax )
            $height += $bwHeight;
        else
            $options['bw'] = false;
    }
        
    $totalHeight = $height;
    
    if( $thumbnail )
        $left = (int)($width * 0.25);
    else
        $left = 250;
    $w = $width - 2 - $left;
    $maxChars = (int)(($left - 4) / $fontWidth);
    
    // figure out the scale
    $range = 0;
    $max = $_REQUEST['max'];
    if( $max > 0 )
        $range = (int)($max * 1000.0);
    else
    {
        foreach( $requestList as $index )
            if( $requests[$index]['endOffset'] > $range)
                $range = (double)$requests[$index]['endOffset'];
        
        // check our various page milestones to make sure they are included in the range
        if( $startRender > $range )
            $range = $startRender;
        if( $domElement > $range )
            $range = $domElement;
        if( $docComplete > $range )
            $range = $docComplete;
        if( $aft > $range )
            $range = $aft;
    }

    // Get CSI info
    if( 1 == $settings['enable_google_csi'] )
    {
        require_once('./google/google_lib.inc');
        $filter = array();
        if( 1 == $settings['enable_google_csi_filter'] )
            $filter = array( 'prt' => 1, 'ol' => 1, 'aft' => 1 );
        $csiParams = ParseCsiInfo($options['id'], $options['path'], $options['run'], $options['cached'], false);
        $csiInfo = TailorRtParamsForVisualization($csiParams, $filter);
    }

    // draw a bunch of stuff that is only needed if we're ACTUALLY drawing the chart        
    if( $imageMap )
    {
        $map = array();
        $entry = array();
        $entry['url'] = $url;
        $entry['left'] = 0;
        $entry['right'] = $left;
        $entry['top'] = $rowHeight;;
        $entry['bottom'] = (2 * $rowHeight) - 1;
        
        $map[] = $entry;
    }
    else
    {
        $im = imagecreate($width, $totalHeight);
    
        // allocate the colors we will need
        ColorRequests($requests, $thumbnail, $mime, $state);
        $white = GetColor($im, 255, 255, 255);
        $black = GetColor($im, 0, 0, 0);
        $grey = GetColor($im, 240, 240, 240);
        $midGrey = GetColor($im, 208, 208, 208);
        $dkGrey = GetColor($im, 192, 192, 192);
        $error = GetColor($im, 255, 96, 96);
        $warning = GetColor($im, 255, 255, 96);
        if( $thumbnail )
        {
            $time_scale_color = $midGrey;
            $border_color = $dkGrey;
            $cpuLine = GetColor($im, 255, 183, 112);
            $bwLine = GetColor($im, 137, 200, 137);
        }
        else
        {
            $time_scale_color = $dkGrey;
            $border_color = $black;
            $cpuLine = GetColor($im, 255, 127, 0);
            $bwLine = GetColor($im, 0, 127, 0);
        }
        
        // give it a white background and black border
        imagefilledrectangle($im, 0, 0, $width, $totalHeight, $white);
        imagerectangle($im, 0, 0, $width - 1, $height - 1, $border_color);
        
        // do the alternating row coloring (after a 2 row header)
        $y = 1 + ($rowHeight * 2);
        $i = 0;
        if( $requestsBefore )
        {
            $color = $white;
            if( $i % 2 == 0 )
                $color = $grey;
            imagefilledrectangle($im, 1, $y, $width - 2, $y + $rowHeight - 1, $color);
            $y += $rowHeight;
            $i++;
        }
        
        // color in the performance chart area
        $h = $height - $dataHeight - 3;
        if( $h && $perf )
        {
            $oldy = $y;
            
            if( $options['cpu'] )
            {
                $y = $dataHeight + ($cpuHeight / 2) - ($rowHeight / 2);
                if( !$thumbnail )
                {
                    imagestring($im, $font, 50, $y, 'CPU Utilization', $black);
                    $y += ($rowHeight / 2) - 1;
                    imageline($im, 10, $y, 45, $y, $cpuLine);
                }
                $y = $dataHeight + 1;
                imagefilledrectangle($im, $left + 1, $y, $width - 2, $y + ($cpuHeight / 4), $grey);
                $y = $dataHeight + 1 + ($cpuHeight / 2);
                imagefilledrectangle($im, $left + 1, $y, $width - 2, $y + ($cpuHeight / 4), $grey);
            }
            
            if( $options['bw'] )
            {
                $y = $height - ($bwHeight / 2) - ($rowHeight / 2);
                $maxbps = number_format($bwMax / 1024);
                if( !$thumbnail )
                {
                    imagestring($im, $font, 50, $y, "Bandwidth In (0 - {$maxbps} Kbps)", $black);
                    $y += ($rowHeight / 2) - 1;
                    imageline($im, 10, $y, 45, $y, $bwLine);
                }
                $y = $height - $bwHeight + 1;
                imagefilledrectangle($im, $left + 1, $y, $width - 2, $y + ($bwHeight / 4), $grey);
                $y = $height - ($bwHeight / 2) + 1;
                imagefilledrectangle($im, $left + 1, $y, $width - 2, $y + ($bwHeight / 4), $grey);
            }

            $y = $oldy;
        }
        
        foreach( $requestList as $index )
        {
            $request = &$requests[$index];
            $color = $white;
            if( $i % 2 == 0 )
                $color = $grey;
            $highlight = null;
            if( $request['responseCode'] >= 400 )
                $color = $error;
            elseif( $request['responseCode'] >= 300 )
                $color = $warning;
            elseif( $request['responseCode'] < 0 && !$docComplete )
                $color = $error;
            imagefilledrectangle($im, 1, $y, $width - 2, $y + $rowHeight - 1, $color);
            $y += $rowHeight;
            $i++;
        }
        if( $requestsAfter )
        {
            $color = $white;
            if( $i % 2 == 0 )
                $color = $grey;
            imagefilledrectangle($im, 1, $y, $width - 2, $y + $rowHeight - 1, $color);
        }
        
        // draw the separator
        imageline($im, $left, 0, $left, $height - 1, $border_color);
        if( $dataHeight != $height )
        {
            imageline($im, 0, $dataHeight, $width, $dataHeight, $border_color);
            if( $options['cpu'] && $options['bw'] )
                imageline($im, 0, $height - $bwHeight, $width, $height - $bwHeight, $border_color);
        }
        
        // draw the time scale
        $scale = array(1,2,5);
        if( $range > 0 )
        {
            // figure out how many markers makes sense for the space we have
            if( $thumbnail )
                $target = ($width - $left) / 20;
            else
                $target = ($width - $left) / 40;
            
            // calculate the appropriate intervals
            $maxIndex = count($scale) - 1;
            $index = $maxIndex;
            $mult = 1000.0;
            $inc = $mult * $scale[$index];
            while( $range / $inc < $target )
            {
                $index--;
                if( $index < 0 )
                {
                    $index = $maxIndex;
                    $mult /= 10.0;
                }
                $inc = $mult * $scale[$index];
            }
            while( $range / $inc > $target )
            {
                $index++;
                if( $index > $maxIndex )
                {
                    $index = 0;
                    $mult *= 10.0;
                }
                $inc = $mult * $scale[$index];
            }
            
            // draw the markers
            $pos = $inc;
            $tmInc = $mult * $scale[$index];
            $tm = $tmInc;
            while( $pos < $range )
            {
                $x = $left + (int)(($pos / $range) * $w);
                imageline($im, $x, 1 + $rowHeight, $x, $dataHeight - $rowHeight, $time_scale_color);
                if( $dataHeight != $height )
                    imageline($im, $x, $dataHeight + 1, $x, $height - 2, $time_scale_color);

                // draw the text label
                if( !$thumbnail )
                {
                    $places = 2;
                    if( $tmInc >= 1000 )
                        $places = 0;
                    else if( $tmInc >= 100 )
                        $places = 1;
                    $val = number_format($tm / 1000.0, $places);
                    $x -= (int)((double)$fontWidth * ((double)strlen($val) / 2.0));
                    imagestring($im, $font, $x, 3, $val, $black);
                    imagestring($im, $font, $x, $dataHeight - $rowHeight + 1, $val, $black);
                }

                $tm += $tmInc;
                $pos += $inc;
            }
            
            // draw the performance data
            $h = $height - $dataHeight - 3;
            if( $h && $perf )
            {
                if( $options['cpu'] )
                {
                    $x1 = null;
                    $y1 = null;
                    foreach( $perf['cpu'] as $time => $value )
                    {
                        $x = $left + (int)((double)$w * ((double)$time / $range));
                        $y = $dataHeight + $cpuHeight - 1 - (int)((double)($cpuHeight - 2) * ((double)$value / 100.0));
                        if( $x <= $left )
                            $x = $left + 1;
                        if( $x >= $width - 1 )
                            $x = $width - 2;
                        if( isset($x1) && isset($y1) )
                            imageline($im, $x1, $y1, $x, $y, $cpuLine);
                        $x1 = $x;
                        $y1 = $y;
                    }
                }
                if( $options['bw'] )
                {
                    $x1 = null;
                    $y1 = null;
                    foreach( $perf['bw'] as $time => $value )
                    {
                        $x = $left + (int)((double)$w * ((double)$time / $range));
                        $y = $height - 2 - (int)((double)($bwHeight - 2) * ((double)$value / (double)$bwMax));
                        if( $x <= $left )
                            $x = $left + 1;
                        if( $x >= $width - 1 )
                            $x = $width - 2;
                        if( isset($x1) && isset($y1) )
                            imageline($im, $x1, $y1, $x, $y, $bwLine);
                        $x1 = $x;
                        $y1 = $y;
                    }
                }
            }
        }
        
        // draw the start render and doc complete lines
        $section = 'first ' . $run;
        if($cached == 1) 
            $section = 'repeat ' . $run;
        $colStartRender = GetColor($im, 40, 188, 0);
        $colDomElement  = GetColor($im, 242, 131, 0);
        $colDocComplete = GetColor($im, 0, 0, 255);
        $colAFT = GetColor($im, 255, 0, 0);
        $colCsi = GetColor($im, 105, 0, 158);

        if( $startRender > 0 && $startRender <= $range )
        {
            $x = $left + (int)((double)$w * ((double)$startRender / $range));
            imageline($im, $x, 1, $x, $height - 1, $colStartRender);
            if( !$thumbnail )
                imageline($im, $x + 1, 1, $x + 1, $height - 2, $colStartRender);
        }

        if( $aft > 0 && $aft <= $range )
        {
            $x = $left + (int)((double)$w * ((double)$aft / $range));
            imageline($im, $x, 1, $x, $height - 1, $colAFT);
            if( !$thumbnail )
                imageline($im, $x + 1, 1, $x + 1, $height - 2, $colAFT);
        }

        if( $domElement > 0 && $domElement <= $range )
        {
            $x = $left + (int)((double)$w * ((double)$domElement / $range));
            imageline($im, $x, 1, $x, $height - 1, $colDomElement);
            if( !$thumbnail )
                imageline($im, $x + 1, 1, $x + 1, $height - 2, $colDomElement);
        }
        
        if( $docComplete > 0 && $docComplete <= $range )
        {
            if( $docComplete >= $range )
                $docComplete = $range - 1;
            $x = $left + (int)((double)$w * ((double)$docComplete / $range));
            imageline($im, $x, 1, $x, $height - 1, $colDocComplete);
            if( !$thumbnail )
                imageline($im, $x + 1, 1, $x + 1, $height - 2, $colDocComplete);
        }

        // draw the csi metrics
        if( null != $csiInfo )
        {
            foreach( $csiInfo as $name => $value )
            {
		        if ($name == 'srt')
		            continue;
                $triangleCoord = array(-3, 0,
                                       0, 8,
                                       3, 0
                                      );
                                
                if( $value > 0 && $value <= $range )
                {
                    $x = $left + (int)((double)$w * ((double)$value / $range));
                    for( $i = 0; $i < 3; $i++) {
                        $triangleCoord[$i*2] += $x;
                        $triangleCoord[$i*2+1] += $rowHeight + 1;
                    }
                    if( !$thumbnail )
                        imagefilledpolygon($im, $triangleCoord, 3, $colCsi);
                    imageline($im, $x, $rowHeight + 1, $x, $height - 1, $colCsi);
                }
            }
        }       

        // put the url label in
        if( $thumbnail )
            ThumbnailText($im, 1, $rowHeight, $left - 2, $rowHeight, $url, $fontWidth, $border_color);
        else
        {
            $x = 4;
            $y = 2 + $rowHeight;
            $label = $url;
            if( $x + (strlen($label) * $fontWidth) > $left )
            {
                $chars = ($left - $x) / $fontWidth;
                $label = substr($label, 0, $chars - 4) . '...';
            }
            imagestring($im, $font, $x, $y,  $label, $black);
            
            if( $requestsBefore )
            {
                $y += $rowHeight;
                imagestring($im, $font, $x, $y,  '...', $black);
            }
        }
    }

    // draw the request information
    $i = 0;
    $y = 2 + ($rowHeight * 2);
    if( $requestsBefore )
    {
        $y += $rowHeight;
        $i++;
    }
    foreach($requestList as $index)
    {
        $request = &$requests[$index];
        
        // draw the label
        $i++;
        
        if( $imageMap )
        {
            $entry = array();
            $scheme = 'http://';
            if( $request['secure'] )
                $scheme = 'https://';
            $entry['request'] = $request['index'];
            $entry['url'] = $scheme . $request['host'] . $request['url'];
            $entry['type'] = $request['mime'];
            $entry['left'] = 0;
            $entry['right'] = $width;
            $entry['top'] = $y;
            $entry['bottom'] = $y + $rowHeight - 1;
            
            $map[] = $entry;
        }
        else
        {
            $chars = $maxChars;
            $l = $x;
            
            if( $request['secure'] && !$thumbnail )
            {
                $lockWidth = 12;
                DrawLock($im, $x, $y, $lockWidth, $rowHeight);
                $l += $lockWidth;
                $chars -= $lockWidth / $fontWidth;
            }
            
            $path = parse_url('http://' . $request['host'] . $request['url'], PHP_URL_PATH);
            $object = basename($path);
            // if the last character is a /, add it on
            if( substr($path, -1) == '/' )
                $object .= '/';
            $indexLabel = $request['index'] + 1;
            $label = $indexLabel . ': ' . $request['host'] . ' - ' . $object;
            if( $thumbnail )
                ThumbnailText(&$im, 1, $y, $left - 2, $rowHeight, $label, $fontWidth, $border_color);
            else
                imagestring($im, $font, $l, $y,  FitText($label, $chars), $black);

            // draw the request
            $start = $request['offset'];
            $end = $request['endOffset'];
           
            $xStart = $left + (int)((double)$w * ((double)$start / $range));
            $xEnd = $left + (int)((double)$w * ((double)$end / $range));
            $xFullEnd = $xEnd;
            $xLeftmost = $xStart;
            if( $request['connect_end'] > 0 && $request['connect_start'] < $start )
                $xLeftmost = $left + (int)((double)$w * ((double)$request['connect_start'] / $range));
            if( $request['dns_end'] > 0 && $request['dns_start'] < $start )
                $xLeftmost = $left + (int)((double)$w * ((double)$request['dns_start'] / $range));
            
            // put the text label next to the line
            if( !$thumbnail )
            {
                $label = $request['totalTime'] . ' ms';
                if($request['responseCode'] >= 300 || $request['responseCode'] < 0)
                    $label .= " ({$request['responseCode']})";
                elseif($request['responseCode'] == 0)
                    $label .= ' (Request Canceled)';

                $labelWidth = strlen($label) * $fontWidth;
                $leftPixels = $xLeftmost - $left;
                $rightPixels = $width - $xEnd;
                $textPos = $xEnd + 5;
                if( $leftPixels > $rightPixels )
                    $textPos = $xLeftmost - 5 - $labelWidth;
                
                // erase the background behind the text
                $color = $white;
                if( ($i - 1) % 2 == 0 )
                    $color = $grey;
                if( $request['responseCode'] >= 400 )
                    $color = $error;
                elseif( $request['responseCode'] >= 300 )
                    $color = $warning;
                elseif( $request['responseCode'] < 0 && !$docComplete )
                    $color = $error;
                imagefilledrectangle($im, $textPos, $y, $textPos + $labelWidth, $y + $rowHeight - 2, $color);
                
                // draw the actual label
                imagestring($im, $font, $textPos, $y,  $label, $black);
            }

            if( $thumbnail )
            {
                $barTop = $y - 1;
                $barBottom = $y + $rowHeight - 2;
            }
            else
            {
                $barTop = $y;
                $barBottom = $y + $rowHeight - 3;
            }

            // background fill the content download time
            $requestStart = $start;
            if ($request['dnsTime'] > 0)
                $requestStart += $request['dnsTime'];
            if( $request['socketTime'] > 0 )
                $requestStart += $request['socketTime'];
            if( $request['secure'] && $request['sslTime'] > 0 )
                $requestStart += $request['sslTime'];
            $xStart = $left + (int)((double)$w * ((double)$requestStart / $range));
            drawBar($im, $xStart, $barTop, $xEnd, $barBottom, $request['colContent']);
            
            $end = $start;
            $barHeight = $barBottom - $barTop;
            if( isset($request['stateHeight']) )
                $mHeight = min($barHeight, max(2, (int)($barHeight * $request['stateHeight'])));
            else
                $mHeight = $barHeight;
            $mTop = max($barTop, $barTop + (int)(($barHeight - $mHeight) / 2));
            $mBottom = min($barBottom, $mTop + $mHeight);
            // DNS
            if( $request['dnsTime'] > 0 )
            {
                $end += $request['dnsTime'];
                $xStart = $left + (int)((double)$w * ((double)$start / $range));
                $xEnd = $left + (int)((double)$w * ((double)$end / $range));
                if( array_key_exists('colDNS', $request) )
                    drawBar($im, $xStart, $mTop, $xEnd, $mBottom, $request['colDNS']);
                $start = $end;
            }
            
            // socket connect
            if( $request['socketTime'] > 0 )
            {
                $end += $request['socketTime'];
                $xStart = $left + (int)((double)$w * ((double)$start / $range));
                $xEnd = $left + (int)((double)$w * ((double)$end / $range));
                if( array_key_exists('colConnect', $request) )
                    drawBar($im, $xStart, $mTop, $xEnd, $mBottom, $request['colConnect']);
                $start = $end;
            }

            // SSL
            if( $request['secure'] && $request['sslTime'] > 0 )
            {
                $end += $request['sslTime'];
                $xStart = $left + (int)((double)$w * ((double)$start / $range));
                $xEnd = $left + (int)((double)$w * ((double)$end / $range));
                if( array_key_exists('colSSL', $request) )
                    drawBar($im, $xStart, $mTop, $xEnd, $mBottom, $request['colSSL']);
                $start = $end;
            }

            // TTFB
            if( $request['ttfb'] > 0 )
            {
                $end += $request['ttfb'];
                $xStart = $left + (int)((double)$w * ((double)$start / $range));
                $xEnd = $left + (int)((double)$w * ((double)$end / $range));
                if( $xEnd >= $xFullEnd )
                    $xEnd = $xFullEnd - 1;  // allow for a sliver of content download in between stacked requests
                drawBar($im, $xStart, $barTop, $xEnd, $barBottom, $request['colRequest']);
                $start = $end;
            }
            
            // new-style DNS reporting
            if( $request['dns_end'] > 0 && array_key_exists('colDNS', $request) )
            {
                $xStart = $left + (int)((double)$w * ((double)$request['dns_start'] / $range));
                $xEnd = $left + (int)((double)$w * ((double)$request['dns_end'] / $range));
                drawBar($im, $xStart, $mTop, $xEnd, $mBottom, $request['colDNS']);
            }

            // new-style SSL reporting (draw before connection reporting to avoid obscuring that)
            if( $request['ssl_end'] > 0 && array_key_exists('colSSL', $request) )
            {
                $xStart = $left + (int)((double)$w * ((double)$request['ssl_start'] / $range));
                $xEnd = $left + (int)((double)$w * ((double)$request['ssl_end'] / $range));
                drawBar($im, $xStart, $mTop, $xEnd, $mBottom, $request['colSSL']);
            }

            // new-style connection reporting
            if( $request['connect_end'] > 0 && array_key_exists('colConnect', $request) )
            {
                $xStart = $left + (int)((double)$w * ((double)$request['connect_start'] / $range));
                $xEnd = $left + (int)((double)$w * ((double)$request['connect_end'] / $range));
                drawBar($im, $xStart, $mTop, $xEnd, $mBottom, $request['colConnect']);
            }
        }
        
        $y += $rowHeight;
    }

    // Save CSI entries
    if( $imageMap )
    {
        if( 1 == $settings['enable_google_csi'] )
        {
            foreach ( $csiInfo as $name => $value )
            {
		if ($name == 'srt')
		    continue;
                $entry = array();
                $entry['csi'] = "srt + $name: $value";
                $x = $left + (int)((double)$w * ((double)$value / $range));
                $triangleCoord = array(-3, 0,
                                       0, 8,
                                       3, 0
                                      );
                for( $i = 0; $i < 3; $i++) {
                    $triangleCoord[$i*2] += $x;
                    $triangleCoord[$i*2+1] += $rowHeight + 1;
                }
                $entry['coords'] = implode(",", $triangleCoord);
                $map[] = $entry;
            }
        }
    }

    if( !$imageMap && $requestsAfter && !$thumbnail )
        imagestring($im, $font, $x, $y,  '...', $black);

    if( $imageMap )
        return $map;
    else
        return $im;
}

/**
* Filter the requests we choose to display
* 
* @param mixed $requests
*/
function FilterRequests(&$requests)
{
    $requestList = array();
    
    if( isset($_REQUEST['requests']) )
    {
        $rlist = explode(',', urldecode($_REQUEST['requests']));
        foreach( $rlist as $r )
        {
            $r = str_replace(' ', '', trim($r));
            if( strlen($r) )
            {
                // see if it is a range
                if( strpos($r, '-') !== false )
                {
                    $range = explode('-', $r);
                    if( count($range) == 2 )
                    {
                        $start = $range[0];
                        $end = $range[1];
                        if( $end > $start )
                            for( $i = $start; $i <= $end; $i++ )
                                $requestList[] = (int)$i - 1;
                    }
                }
                else
                    $requestList[] = (int)$r - 1;
            }
        }
    }
    
    // default to all of the requests if we don't have an explicit list
    if( !count($requestList) )
        foreach($requests as $index => &$request)
            $requestList[] = $index;
            
    return $requestList;
}
?>
