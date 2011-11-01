<?php

/**
* Determine the colors to use for each request
*/
function ColorRequests(&$requests, $thumbnail, $mime, $state = false)
{
    global $settings;
    $colors = MimeColors();
    if ($settings['new_colors']) {
        // new color scheme (proposed by Steve Souders)
        $colors = array_merge($colors, array(
            'error' => array(204,0,0),
            'warning' => array(255,56,166),
            'request' => array(208,137,14),
            'content' => array(118,71,130),
            'connect' => array(177,73,62),
            'dns' => array(55, 123, 53),
            'ssl' => array(69, 110, 175)
            ));
    } else {
        // classic colors
        if ($thumbnail) {
            $colors = array_merge($colors, array(
                'request' => array(64, 255, 64),
                'content' => array(52,150,255),
                'connect' => array(255, 157, 66),
                'dns' => array(48,150,158),
                'ssl' => array(213,102, 223)
                ));
        } else {
            $colors = array_merge($colors, array(
                'request' => array(0, 255, 0),
                'content' => array(0,123,255),
                'connect' => array(255, 123, 0),
                'dns' => array(0,123,132),
                'ssl' => array(207, 37, 223)
                ));
        }
    }

    foreach($requests as &$request)
    {
        $request['colConnect'] = $colors['connect'];
        $request['colDNS'] = $colors['dns'];
        $request['colSSL'] = $colors['ssl'];

        if( $mime )
        {
            $type = ContentType($request['contentType']);
            if( array_key_exists($type, $colors) )
                $baseColor = $colors[$type];
            else
                $baseColor = $colors['other'];

            $requestColor = $baseColor;
            foreach( $requestColor as &$col )
                $col = min(255, (int)($col + ((255 - $col) * 0.4)));

            $request['colRequest'] = $requestColor;
            $request['colContent'] = $baseColor;


            if ($state)
            {
                $request['stateHeight'] = 0.5;
            }
            else
            {
                $request['colConnect'] = $requestColor;
                $request['colDNS'] = $requestColor;
                $request['colSSL'] = $requestColor;
            }
        }
        else
        {
            $sslColor = array(207, 37, 223);
            foreach( $sslColor as &$col )
                $col = min(255, (int)($col + ((255 - $col) * 0.4)));
                
            $request['colRequest'] = $colors['request'];
            $request['colContent'] = $colors['content'];
        }
    }
}

/**
* Return an array of the defined colors for various mime types
* 
*/
function MimeColors()
{
    $colors = array(
        'html'  => array(130,181,252),
        'css'   => array(178,234,148),
        'js'    => array(254,197,132),
        'image' => array(196,154,232),
        'flash' => array(45,183,193),
        'text'  => array(254,241,132),
        'other' => array(196,196,196),
        );
    return $colors;
}

/**
* Bucket the content types into our known categories
*/
function ContentType($mime)
{
    $contentType = 'other';
    
    // collapse the various javascript content types together
    if( stripos($mime, 'javascript') !== false || 
        stripos($mime, 'ecmascript') !== false || 
        !strcasecmp($mime, 'text/js') )
    {
        $contentType = 'js';
    }
    elseif( !strcasecmp($mime, 'text/css') )
        $contentType = 'css';
    elseif( !strcasecmp($mime, 'text/html') )
        $contentType = 'html';
    elseif( !strncasecmp($mime, 'text/', 5) )
        $contentType = 'text';
    elseif( !strncasecmp($mime, 'image/', 6) )
        $contentType = 'image';
    elseif( !strcasecmp($mime, 'application/x-shockwave-flash') )
        $contentType = 'flash';
    
    return $contentType;
}
?>