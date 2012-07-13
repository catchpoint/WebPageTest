<?php

/**
* Determine the colors to use for each request
*/
function GetRequestColors($content_type, $thumbnail, $is_mime,
                          $is_state = false) {
    global $settings;
    if (@$settings['new_colors']) {
        // new color scheme (proposed by Steve Souders)
        $colors = array(
            'error'    => array(204,0,0),
            'warning'  => array(255,56,166),
            'dns'      => array(55, 123, 53),
            'connect'  => array(177,73,62),
            'ssl'      => array(69, 110, 175),
            'ttfb'     => array(208,137,14),
            'download' => array(118,71,130)
            );
    } else {
        // classic colors
        if ($thumbnail) {
            $colors = array(
                'dns'      => array(48,150,158),
                'connect'  => array(255, 157, 66),
                'ssl'      => array(213,102, 223),
                'ttfb'     => array(64, 255, 64),
                'download' => array(52,150,255)
                );
        } else {
            $colors = array(
                'dns'      => array(0,123,132),
                'connect'  => array(255, 123, 0),
                'ssl'      => array(207, 37, 223),
                'ttfb'     => array(0, 255, 0),
                'download' => array(0,123,255),
                );
        }
    }
    if ($is_mime) {
        $base_color = GetMimeColor($content_type);
        $ttfb_color = ScaleRgb($base_color, 0.4);
        $colors['ttfb'] = $ttfb_color;
        $colors['download'] = $base_color;

        if (!$is_state) {
            $colors['dns'] = $ttfb_color;
            $colors['connect'] = $ttfb_color;
            $colors['ssl'] = $ttfb_color;
        }
    }
    return $colors;
}

/**
* Return an array of the defined colors for various mime types
*/
function GetMimeColor($mime) {
    $mime_colors = MimeColors();
    $type = ContentType($mime);
    if (!array_key_exists($type, $mime_colors)) {
        $type = 'other';
    }
    return $mime_colors[$type];
}

/**
* Return an array of the defined colors for various mime types
*/
function MimeColors() {
    $colors = array(
        'html'  => array(130,181,252),
        'js'    => array(254,197,132),
        'css'   => array(178,234,148),
        'text'  => array(254,241,132),
        'image' => array(196,154,232),
        'flash' => array(45,183,193),
        'other' => array(196,196,196)
        );
    return $colors;
}

/**
* Bucket the content types into our known categories
*/
function ContentType($mime) {
    $content_type = 'other';
    if (stripos($mime, 'javascript') !== false ||
        stripos($mime, 'ecmascript') !== false ||
        !strcasecmp($mime, 'text/js')) {
        // Collapse the various javascript content types together.
        $content_type = 'js';
    } elseif (!strcasecmp($mime, 'text/css')) {
        $content_type = 'css';
    } elseif (!strcasecmp($mime, 'text/html')) {
        $content_type = 'html';
    } elseif (!strncasecmp($mime, 'text/', 5)) {
        $content_type = 'text';
    } elseif (!strncasecmp($mime, 'image/', 6)) {
        $content_type = 'image';
    } elseif (!strcasecmp($mime, 'application/x-shockwave-flash')) {
        $content_type = 'flash';
    }
    return $content_type;
}
?>