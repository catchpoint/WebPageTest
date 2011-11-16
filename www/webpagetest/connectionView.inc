<?php
require_once('draw.inc');
require_once('contentColors.inc');

/**
* Translate the object data into a series of requests per connection
* 
* @param mixed $requests
*/
function getConnections(&$requests, &$summary, $mime, $state)
{
    ColorRequests($requests, false, $mime, $state);

    // initialize some defaults
    $connections = array();
    $summary['end'] = 0;

    foreach($requests as $request)
    {
        $socket = $request['socket'];
        if( $socket !== NULL )
        {
            // see if there is already an entry for this socket
            $index = -1;
            for( $i = 0; $i < count($connections); $i++ )
            {
                if( $connections[$i]['socket'] == (int)$socket )
                {
                    $index = $i;
                    break;
                }
            }
            
            if( $index == -1 )
            {
                // see if there are any matching host entries
                $insertAfter = -1;
                for( $i = count($connections) - 1; $i >= 0; $i-- )
                {
                    if( !strcmp($request['host'], $connections[$i]['host'] ) )
                    {
                        $insertAfter = $i;
                        break;
                    }
                }
                
                $index = count($connections);
                if( $insertAfter >= 0 && $insertAfter < count($connections) - 1 )
                {
                    $index = $insertAfter + 1;
                    for( $i = count($connections); $i > $index; $i-- )
                        $connections[$i] = $connections[$i - 1];
                }

                $connections[$index] = array();
                $connections[$index]['socket'] = (int)$socket;
                $connections[$index]['host'] = $request['host'];
                $connections[$index]['ip'] = $request['ip'];
                $connections[$index]['secure'] = $request['secure'];
                $connections[$index]['requests'] = array();
            }
                
            $connections[$index]['requests'][] = $request;
            
            if( $request['endOffset'] > $summary['end'] && strstr($request['url'], 'favicon.ico') === FALSE )
                $summary['end'] = $request['endOffset'];
        }
    }
    
    return $connections;
}

/**
* Draw the connection view image
* 
* @param mixed $connections
* @return resource
*/
function drawImage(&$connections, &$summary, $url, $mime, $imageMap, &$pageData, $options = null)
{
    $times = array('render' => $pageData['render'], 'dom_element' => $pageData['domTime'], 
                    'load' => $pageData['docTime'], ' aft' =>  $pageData['aft'],
                    'load_start' => $pageData['loadEventStart'], 'load_end' => $pageData['loadEventEnd'], 
                    'dom_start' => $pageData['domContentLoadedEventStart'], 'dom_end' => $pageData['domContentLoadedEventEnd']);
    $startRender = $pageData['render'];
    $domElement = $pageData['domTime'];
    $docComplete = $pageData['docTime'];
    $aft = $pageData['aft'];
    $mimeColors = MimeColors();

    $cpuHeight = 50;
    $bwHeight = 50;
    $width=$_REQUEST['width'];
    if( isset($options['width']) && (int)$options['width'])
        $width = (int)$options['width'];
    if( !$width || $width < 300 || $width > 2000 )
        $width = 930;
    $font = 2;
    $rowHeight = imagefontheight($font) + 4;
    $fontWidth = imagefontwidth($font);
    $height = 2 + (3 * $rowHeight) + ($rowHeight * count($connections));
    $dataHeight = $height;
    $bwMax = 0;
    $perf  = loadPerf($options);
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
    if( $mime )
        $totalHeight += (2 * $rowHeight) + 2;

    $left = 250;
    $w = $width - 2 - $left;

    // figure out the scale
    $range = (double)$summary['end'];
    $max = $_REQUEST['max'];
    if( $max > 0 )
        $range = (int)($max * 1000.0);
    else
    {
        foreach( $connections as &$connection )
            foreach( $connection['requests'] as &$request )
                if($request['endOffset'] > $range)
                    $range = (double)$request['endOffset'];

        // check our various page milestones to make sure they are included in the range
        foreach( $times as $time ) {
            if ($time > $range)
                $range = $time;
        }
    }

    // draw a bunch of stuff that is only needed if we're ACTUALLY drawing the chart        
    if( $imageMap )
    {
        $map = array();
        $entry = array();
        $entry['url'] = $url;
        $entry['left'] = 4;
        $entry['right'] = $left;
        $entry['top'] = $rowHeight;;
        $entry['bottom'] = (2 * $rowHeight) - 1;
        
        $map[] = $entry;
    }
    else
    {
        $im = imagecreate($width, $totalHeight);
    
        // allocate the colors we will need
        $white = GetColor($im, 255, 255, 255);
        $black = GetColor($im, 0, 0, 0);
        $grey = GetColor($im, 240, 240, 240);
        $dkGrey = GetColor($im, 192, 192, 192);
        $cpuLine = GetColor($im, 255, 127, 0);
        $bwLine = GetColor($im, 0, 127, 0);
        
        // give it a white background and black border
        imagefilledrectangle($im, 0, 0, $width, $totalHeight, $white);
        imagerectangle($im, 0, 0, $width - 1, $height - 1, $black);
        
        // do the alternating row coloring (after a 2 row header)
        $y = 1 + ($rowHeight * 2);
        while( $y < $dataHeight - $rowHeight - 1 )
        {
            imagefilledrectangle($im, 1, $y, $width - 2, $y + $rowHeight - 1, $grey);
            $y += $rowHeight * 2;
        }
        // color in the performance chart area
        $h = $height - $dataHeight - 3;
        if( $h && $perf )
        {
            $oldy = $y;
            
            if( $options['cpu'] )
            {
                $y = $dataHeight + ($cpuHeight / 2) - ($rowHeight / 2);
                imagestring($im, $font, 50, $y, 'CPU Utilization', $black);
                $y += ($rowHeight / 2) - 1;
                imageline($im, 10, $y, 45, $y, $cpuLine);
                $y = $dataHeight + 1;
                imagefilledrectangle($im, $left + 1, $y, $width - 2, $y + ($cpuHeight / 4), $grey);
                $y = $dataHeight + 1 + ($cpuHeight / 2);
                imagefilledrectangle($im, $left + 1, $y, $width - 2, $y + ($cpuHeight / 4), $grey);
            }
            
            if( $options['bw'] )
            {
                $y = $height - ($bwHeight / 2) - ($rowHeight / 2);
                $maxbps = number_format($bwMax / 1024);
                imagestring($im, $font, 50, $y, "Bandwidth In (0 - {$maxbps} Kbps)", $black);
                $y += ($rowHeight / 2) - 1;
                imageline($im, 10, $y, 45, $y, $bwLine);
                $y = $height - $bwHeight + 1;
                imagefilledrectangle($im, $left + 1, $y, $width - 2, $y + ($bwHeight / 4), $grey);
                $y = $height - ($bwHeight / 2) + 1;
                imagefilledrectangle($im, $left + 1, $y, $width - 2, $y + ($bwHeight / 4), $grey);
            }

            $y = $oldy;
        }
        
        // draw the separator
        imageline($im, $left, 0, $left, $height - 1, $black);
        if( $dataHeight != $height )
        {
            imageline($im, 0, $dataHeight, $width, $dataHeight, $black);
            if( $options['cpu'] && $options['bw'] )
                imageline($im, 0, $height - $bwHeight, $width, $height - $bwHeight, $black);
        }
        
        // draw the time scale
        $scale = array(1,2,5);
        if( $range > 0 )
        {
            // calculate the appropriate intervals
            $maxIndex = count($scale) - 1;
            $index = $maxIndex;
            $mult = 1000.0;
            $inc = $mult * $scale[$index];
            while( $range / $inc < 20 )
            {
                $index--;
                if( $index < 0 )
                {
                    $index = $maxIndex;
                    $mult /= 10.0;
                }
                $inc = $mult * $scale[$index];
            }
            while( $range / $inc > 20 )
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
                imageline($im, $x, 1 + $rowHeight, $x, $dataHeight - $rowHeight, $dkGrey);
                if( $dataHeight != $height )
                    imageline($im, $x, $dataHeight + 1, $x, $height - 2, $dkGrey);

                // draw the text label
                $places = 2;
                if( $tmInc >= 1000 )
                    $places = 0;
                else if( $tmInc >= 100 )
                    $places = 1;
                $val = number_format($tm / 1000.0, $places);
                $x -= (int)((double)$fontWidth * ((double)strlen($val) / 2.0));
                imagestring($im, $font, $x, 3, $val, $black);
                imagestring($im, $font, $x, $dataHeight - $rowHeight + 1, $val, $black);

                $tm += $tmInc;
                $pos += $inc;
            }

            // draw the start render and doc complete lines
            $section = 'first ' . $run;
            if($cached == 1) 
                $section = 'repeat ' . $run;
            $colStartRender = GetColor($im, 40, 188, 0);
            $colDomElement  = GetColor($im, 242, 131, 0);
            $colDocComplete = GetColor($im, 0, 0, 255);
            $colNavLoad = GetColor($im, 192, 192, 255);
            $colNavDom = GetColor($im, 216, 136, 223);
            $colAFT = GetColor($im, 255, 0, 0);
            
            if( $startRender > 0 && $startRender <= $range )
            {
                $x = $left + (int)((double)$w * ((double)$startRender / $range));
                imageline($im, $x, 1, $x, $height - 1, $colStartRender);
                imageline($im, $x + 1, 1, $x + 1, $height - 2, $colStartRender);
            }

            if( $aft > 0 && $aft <= $range )
            {
                $x = $left + (int)((double)$w * ((double)$aft / $range));
                imageline($im, $x, 1, $x, $height - 1, $colAFT);
                imageline($im, $x + 1, 1, $x + 1, $height - 2, $colAFT);
            }

            if( $domElement > 0 && $domElement <= $range )
            {
                $x = $left + (int)((double)$w * ((double)$domElement / $range));
                imageline($im, $x, 1, $x, $height - 1, $colDomElement);
                imageline($im, $x + 1, 1, $x + 1, $height - 2, $colDomElement);
            }
            
            if ($times['dom_start'] > 0 && $times['dom_end'] > 0 && $times['dom_start'] <= $range) {
                $xRange = $left + $w;
                $xStart = $left + (int)((double)$w * ((double)$times['dom_start'] / $range));
                $xEnd = $left + (int)((double)$w * ((double)$times['dom_end'] / $range));
                $xEnd = min($xRange, max($xStart + 1, $xEnd));
                if ($xEnd >= $xStart) {
                    for( $x = $xStart; $x <= $xEnd; $x++)
                        imageline($im, $x, 1 + $rowHeight, $x, $height - 1, $colNavDom);
                }
            }

            if ($times['load_start'] > 0 && $times['load_end'] > 0 && $times['load_start'] <= $range) {
                $xRange = $left + $w;
                $xStart = $left + (int)((double)$w * ((double)$times['load_start'] / $range));
                $xEnd = $left + (int)((double)$w * ((double)$times['load_end'] / $range));
                $xEnd = min($xRange, max($xStart + 1, $xEnd));
                if ($xEnd >= $xStart) {
                    for( $x = $xStart; $x <= $xEnd; $x++)
                        imageline($im, $x, 1 + $rowHeight + (int)($rowHeight / 2), $x, $height - 1, $colNavLoad);
                }
            }
            
            if( $docComplete > 0 && $docComplete <= $range )
            {
                if( $docComplete >= $range )
                    $docComplete = $range - 1;
                $x = $left + (int)((double)$w * ((double)$docComplete / $range));
                imageline($im, $x, 1, $x, $height - 1, $colDocComplete);
                imageline($im, $x + 1, 1, $x + 1, $height - 2, $colDocComplete);
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

    // draw the connection information
    $i = 0;
    $y = 2 + ($rowHeight * 2);
    foreach($connections as &$connection)
    {
        // draw the label
        $i++;
        
        if( !$imageMap )
        {
            $l = $x;
            if( $connection['secure'] )
            {
                $lockWidth = 12;
                DrawLock($im, $x, $y, $lockWidth, $rowHeight);
                $l += $lockWidth;
                $chars -= $lockWidth / $fontWidth;
            }

            $label = $i . ': ' . $connection['host'];
            
            // make sure the label fits
            if( $x + (strlen($label) * $fontWidth) > $left )
            {
                $chars = ($left - $l) / $fontWidth;
                $label = substr($label, 0, $chars - 4) . '...';
            }
            imagestring($im, $font, $l, $y,  $label, $black);
        }
        
        // draw each request
        $lastEnd = 0;
        foreach( $connection['requests'] as &$request )
        {
            $start = $request['offset'];
            $end = $request['endOffset'];
           
            $xStart = $left + (int)((double)$w * ((double)$start / $range));
            if( $xStart <= $lastEnd )
                $xStart = $lastEnd + 1;
            $xEnd = $left + (int)((double)$w * ((double)$end / $range));
            $xFullEnd = $xEnd;

            if( $imageMap )
            {
                $entry = array();
                $scheme = 'http://';
                if( $request['secure'] )
                    $scheme = 'https://';
                $entry['request'] = $request['index'];
                $entry['url'] = $scheme . $request['host'] . $request['url'];
                $entry['type'] = $request['mime'];
                $entry['left'] = $xStart;
                $entry['right'] = $xEnd;
                $entry['top'] = $y;
                $entry['bottom'] = $y + $rowHeight - 1;
                
                $map[] = $entry;
            }
            else
            {
                $barTop = $y;
                $barBottom = $y + $rowHeight - 3;
                $barHeight = $barBottom - $barTop;
                if( isset($request['stateHeight']) )
                    $mHeight = min($barHeight, max(2, (int)($barHeight * $request['stateHeight'])));
                else
                    $mHeight = $barHeight;
                $mTop = max($barTop, $barTop + (int)(($barHeight - $mHeight) / 2));
                $mBottom = min($barBottom, $mTop + $mHeight);

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
                // DNS
                if( $request['dnsTime'] > 0 )
                {
                    $end += $request['dnsTime'];
                    $xStart = $left + (int)((double)$w * ((double)$start / $range));
                    if( $xStart <= $lastEnd )
                        $xStart = $lastEnd + 1;
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
                    if( $xStart <= $lastEnd )
                        $xStart = $lastEnd + 1;
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
                    if( $xStart <= $lastEnd )
                        $xStart = $lastEnd + 1;
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
                    if( $xStart <= $lastEnd )
                        $xStart = $lastEnd + 1;
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

                $lastEnd = $xFullEnd;
            }
        }
        
        $y += $rowHeight;
    }
    
    // draw the legend
    if( $mime && !$imageMap )
    {
        $mime_count = count($mimeColors);
        $barWidth = $width / $mime_count;
        $left = 0;
        $y_text = $height + 2;
        $y_bar = $y_text + $rowHeight;
        foreach( $mimeColors as $mimeType => $color )
        {
            $textLeft = $left + (($barWidth - ($fontWidth * strlen($mimeType))) / 2);
            drawBar($im, $left + 2, $y_bar + 1, $left + $barWidth - 4, $y_bar + $rowHeight - 2, $color);
            foreach( $color as &$col )
                $col = min(255, (int)($col + ((255 - $col) * 0.4)));
            drawBar($im, $left + 2, $y_bar + 1, $left + (int)($barWidth / 2), $y_bar + $rowHeight - 2, $color);
            imagestring($im, $font, $textLeft, $y_text + 1, $mimeType, $black );

            $left += $barWidth;
        }
    }
    
    if( $imageMap )
        return $map;
    else
        return $im;
}
?>
