<?php
/**
* Walk through all of the requests determining the color for each
* 
* @param mixed $requests
*/
function requestColors( &$requests )
{
    $types = array();
    foreach($requests as &$request)
    {
        $contentType = $request['contentType'];
        
        // collapse the various javascript content types together
        if( !strcasecmp($contentType, "application/x-javascript") || 
            !strcasecmp($contentType, "text/javascript") || 
            !strcasecmp($contentType, "text/ecmascript") || 
            !strcasecmp($contentType, "text/js") || 
            !strcasecmp($contentType, "application/ecmascript") || 
            !strcasecmp($contentType, "application/javascript") )
        {
            $contentType = "javascript";
        }
        
        $request['mime'] = $contentType;
        $object = strtolower($request['url']);
        if( strlen($contentType) && (strstr($object, 'favicon.ico') === FALSE) )
        {
            if( $types["$contentType"] === null )
            {
                $current = array();
                $types["$contentType"] = $current;
            }
        }
    }
    
    ksort($types);
    
    // now walk through and assign the actual colors
    $lastType = "";
    $count = 0;
    $colors = array();
    foreach($types as $type => $data)
    {
        // see if we are on a new category
        $category = strtok($type, '/');
        if( strcasecmp($category, $lastType) )
        {
            if( strlen($lastType) )
                addColors($colors, $lastType, $count);
                
            // reset the counter
            $count = 0;
            $lastType = $category;
        }
        
        $count++;
    }
    if( strlen($lastType) )
        addColors($colors, $lastType, $count);
    
    // now match up the colors to types
    $index = 0;
    foreach($types as &$type)
    {
        $type = $colors[$index];
        $index++;
    }
    
    // and finally, assign the colors to the requests
    foreach($requests as &$request)
    {
        if($types[$request['mime']])
            $request['color'] = $types[$request['mime']];
    }
    
    return $types;
}

/**
* Add the colors needed to the colors array for the given content type
* 
* @param mixed $colors
* @param mixed $contentType
* @param mixed $count
*/
function addColors( &$colors, $contentType, $count)
{
    // table of colors (in Hues and Lightnesss (HSL) - Saturation is always 255 and the L range is up to 200
    $colorTable = array();
    $colorTable['text'] = array(85,50);           // green
    $colorTable['image'] = array(170,100);         // blue
    $colorTable['javascript'] = array(0,100);      // red
    $colorTable['application'] = array(210,100);   // purple
    $colorTable['video'] = array(25,120);         // orange
    $colorTable['audio'] = array(42,125);         // yellow
    $colorTable['other'] = array(127,105);        // teal
    
    $colorBase = $colorTable[$contentType];
    if( !count($colorBase) )
        $colorBase = $colorTable['other'];
        
    $h = $colorBase[0];
    $s = 150;
    $l = $colorBase[1];
    $step = 0;
    if( $count > 1 )
        $step = (200 - $l) / ($count - 1);
    for($i =0; $i < $count; $i++)
    {
        $colors[] = hsl2rgb($h, $s, $l);
        $l += $step;
    }
}

/**
* Get a chunk of colors in sequence
* 
* @param mixed $colors
* @param mixed $count
* @param mixed $index
*/
function getColors( &$colors, $count, &$index )
{
    // table of colors (in Hues and Lightnesss (HSL) - Saturation is always 150 and the L range is up to 200
    $colorTable = array(
                         array(85,50),     // green
                         array(0,100),     // red
                         array(170,100),   // blue
                         array(210,100),   // purple
                         array(25,120),    // orange
                         array(127,105),   // teal
                         array(42,125)     // yellow
                         );
    
    $index = $index % count($colorTable);
    $colorBase = $colorTable[$index];
    $index++;
    
    $h = $colorBase[0];
    $s = 150;
    $l = $colorBase[1];
    $step = 0;
    if( $count > 1 )
        $step = (200 - $l) / ($count - 1);
    for($i =0; $i < $count; $i++)
    {
        $colors[] = hsl2rgb($h, $s, $l);
        $l += $step;
    }
}

/**
* Convert a color from HSL into RGB (returns an array)
* 
* @param mixed $h
* @param mixed $s
* @param mixed $l
*/
function hsl2rgb( $h, $s, $l )
{
    $rgb = array(0,0,0);
    $l /= 255;
    if ($s == 0)
    {
        $l = round(255*$l);
        $rgb[0] = $l;
        $rgb[1] = $l;
        $rgb[2] = $l;
        return $rgb;
    }
    else
    {
        $s /= 255;
        $h /= 255;

        $m2 = ($l<=0.5) ? $m2 = $l*($s+1) : $l+$s-($l*$s);

        $m1 = $l*2 - $m2;
        $r = hue($m1, $m2, ($h+1/3));
        $g = hue($m1, $m2, $h);
        $b = hue($m1, $m2, ($h-1/3));

        $rgb[0] = round(255*$r);
        $rgb[1] = round(255*$g);
        $rgb[2] = round(255*$b);
    }
    
    return $rgb;
}

/**
* Used in hsl2rgb
* 
* @param mixed $m1
* @param mixed $m2
* @param mixed $h
*/
function hue($m1, $m2, $h) 
{
    if($h<0) ++$h;
    if($h>1) --$h;

    if($h < 1/6) return $m1+($m2-$m1)*6*$h;
    if($h < 1/2) return $m2;
    if($h < 2/3) return $m1+($m2-$m1)*6*(2/3-$h);
    return $m1;
}
?>