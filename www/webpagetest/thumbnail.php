<?php
include 'common.inc';
include 'object_detail.inc'; 
require_once('page_data.inc');
$file = $_GET['file'];

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
    $mime = 'png';
    
    // see if it is a waterfall image
    if( strstr($parts['basename'], 'waterfall') !== false )
    {
        require_once('waterfall.inc');
        $secure = false;
        $haveLocations = false;
        $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);
        $pageData = loadPageRunData($testPath, $run, $cached);
        $options = array( 'id' => $id, 'path' => $testPath, 'run' => $run, 'cached' => $cached, 'cpu' => true );
        $img = drawWaterfall($url, $requests, $pageData, false, $options);
        if( !$requests || !$pageData )
            $failed = true;
    }
    elseif( strstr($parts['basename'], 'optimization') !== false )
    {
        require_once('optimizationChecklist.inc');
        $secure = false;
        $haveLocations = false;
        $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);
        $pageData = loadPageRunData($testPath, $run, $cached);
        $img = drawChecklist($url, $requests, $pageData);
        if( !$requests || !$pageData )
            $failed = true;
    }
    elseif( !strcasecmp( $type, 'jpg') )
        $img = imagecreatefromjpeg("$testPath/$file");
    elseif( !strcasecmp( $type, 'gif') )
        $img = imagecreatefromgif("$testPath/$file");
    else
        $img = imagecreatefrompng("$testPath/$file");

    if( $img )
    {
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
            imagecopyresampled($tmp, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($img);
            $img = $tmp;    
        }

        // output the image
        if( !strcasecmp( $type, 'jpg') )
        {
            header ("Content-type: image/jpeg");
            imagejpeg($img);
        }
        else
        {
            header ("Content-type: image/png");
            imagepng($img);
        }
    }
    else
    {
        header("HTTP/1.0 404 Not Found");
    }
}
?>
