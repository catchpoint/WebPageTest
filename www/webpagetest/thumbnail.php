<?php
if(array_key_exists("HTTP_IF_MODIFIED_SINCE",$_SERVER))
{
    header("HTTP/1.0 304 Not Modified");
}
else
{
    include 'common.inc';
    include 'object_detail.inc'; 
    require_once('page_data.inc');
    $file = $_GET['file'];

    if(extension_loaded('newrelic')) { 
        newrelic_add_custom_tracer('tbnDrawWaterfall');
        newrelic_add_custom_tracer('tbnDrawChecklist');
        newrelic_add_custom_tracer('GenerateThumbnail');
        newrelic_add_custom_tracer('SendImage');
        newrelic_add_custom_tracer('getRequests');
        newrelic_add_custom_tracer('loadPageRunData');
    }

    // make sure nobody is trying to use us to pull down external images from somewhere else
    if( strpos($file, ':') === FALSE &&
        strpos($file, '//') === FALSE &&
        strpos($file, '\\') === FALSE )
    {
        $fileParts = explode('.', $file);
        $parts = pathinfo($file);
        $type = $parts['extension'];

        $newWidth = 250;
        $w = $_REQUEST['width'];
        if( $w && $w > 20 && $w < 1000 )
            $newWidth = $w;
        $img = null;
        
        // see if it is a waterfall image
        if( strstr($parts['basename'], 'waterfall') !== false )
        {
            tbnDrawWaterfall($img);
        }
        elseif( strstr($parts['basename'], 'optimization') !== false )
        {
            tbnDrawChecklist($img);
        }
        elseif( !strcasecmp( $type, 'jpg') )
            $img = imagecreatefromjpeg("$testPath/$file");
        elseif( !strcasecmp( $type, 'gif') )
            $img = imagecreatefromgif("$testPath/$file");
        else
            $img = imagecreatefrompng("$testPath/$file");

        if( $img )
        {
            header('Last-Modified: ' . date("r"));
            GenerateThumbnail($img, $type);
            SendImage($img, $type);
        }
        else
        {
            header("HTTP/1.0 404 Not Found");
        }
    }
}

/**
* Draw the waterfall image
* 
* @param resource $img
*/
function tbnDrawWaterfall(&$img)
{
    global $id;
    global $testPath;
    global $run;
    global $cached;
    global $url;
    global $newWidth;
    
    include('waterfall.inc');
    $secure = false;
    $haveLocations = false;
    $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);
    $pageData = loadPageRunData($testPath, $run, $cached);
    $options = array( 'id' => $id, 'path' => $testPath, 'run' => $run, 'cached' => $cached, 'cpu' => true, 'bw' => true, 'thumbnail' => true, 'width' => $newWidth );
    $img = drawWaterfall($url, $requests, $pageData, false, $options);
    if( !$requests || !$pageData )
        $failed = true;
}

/**
* Draw the checklist image
* 
* @param resource $img
*/
function tbnDrawChecklist(&$img)
{
    global $id;
    global $testPath;
    global $run;
    global $cached;
    global $url;

    include('optimizationChecklist.inc');
    $secure = false;
    $haveLocations = false;
    $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);
    $pageData = loadPageRunData($testPath, $run, $cached);
    $img = drawChecklist($url, $requests, $pageData);
    if( !$requests || !$pageData )
        $failed = true;
}

/**
* Resize the image down to thumbnail size
* 
* @param mixed $img
*/
function GenerateThumbnail(&$img, $type)
{
    global $newWidth;

    // figure out what the height needs to be
    $width = imagesx($img);
    $height = imagesy($img);
    
    if( $width > $newWidth )
    {
        $scale = $newWidth / $width;
        $newHeight = (int)($height * $scale);
        
        # Create a new temporary image
        $tmp = imagecreatetruecolor($newWidth, $newHeight);

        # Copy and resize old image into new image
        $quality = 4;
        if( !strcasecmp( $type, 'jpg') )
            $quality = 2;
        fastimagecopyresampled($tmp, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height, $quality);
        imagedestroy($img);
        $img = $tmp;    
        unset($tmp);
    }
}

/**
* Send the actual thumbnail back to the user
* 
* @param mixed $img
* @param mixed $type
*/
function SendImage(&$img, $type)
{
    // output the image
    if( !strcasecmp( $type, 'jpg') )
    {
        header ("Content-type: image/jpeg");
        imageinterlace($img, 1);
        imagejpeg($img, NULL, 50);
    }
    else
    {
        header ("Content-type: image/png");
        imagepng($img);
    }
}
?>
