<?php
if(extension_loaded('newrelic')) { 
    newrelic_add_custom_tracer('tbnDrawWaterfall');
    newrelic_add_custom_tracer('tbnDrawChecklist');
    newrelic_add_custom_tracer('GenerateThumbnail');
    newrelic_add_custom_tracer('SendImage');
    newrelic_add_custom_tracer('getRequests');
    newrelic_add_custom_tracer('loadPageRunData');
}

if(array_key_exists("HTTP_IF_MODIFIED_SINCE",$_SERVER) && strlen(trim($_SERVER['HTTP_IF_MODIFIED_SINCE'])))
{
    header("HTTP/1.0 304 Not Modified");
}
else
{
    include 'common.inc';
    include 'object_detail.inc'; 
    require_once('page_data.inc');
    $file = $_REQUEST['file'];
    if(isset($_REQUEST['eventName'])){
    	$eventName = urldecode($_REQUEST['eventName']);
    } else {
    	$eventName = null;
    }    

    // make sure nobody is trying to use us to pull down external images from somewhere else
    if( strpos($file, ':') === FALSE &&
        strpos($file, '//') === FALSE &&
        strpos($file, '\\') === FALSE )
    {
        $fileParts = explode('.', $file);
        $parts = pathinfo($file);
        $type = $parts['extension'];

        $fit = max(min(@$_REQUEST['fit'], 1000), 0);
        $newWidth = 250;
        $w = @$_REQUEST['width'];
        if( $w && $w > 20 && $w < 1000 )
            $newWidth = $w;
        $img = null;
        
        // see if it is a waterfall image
        if( strstr($parts['basename'], 'waterfall') !== false )
        {
            tbnDrawWaterfall($img, $eventName);
        }
        elseif( strstr($parts['basename'], 'optimization') !== false )
        {
            tbnDrawChecklist($img, $eventName);
        }
        else {
            if( !is_file("$testPath/$file") ) {
                $file = str_ireplace('.jpg', '.png', $file);
                $parts = pathinfo($file);
                $type = $parts['extension'];
            }
            if( is_file("$testPath/$file") ) {
                if( !strcasecmp( $type, 'jpg') )
                    $img = imagecreatefromjpeg("$testPath/$file");
                elseif( !strcasecmp( $type, 'gif') )
                    $img = imagecreatefromgif("$testPath/$file");
                else
                    $img = imagecreatefrompng("$testPath/$file");
            }
        }

        if( $img )
        {
        	$path = $testPath . "/" . urlencode($file);
            header('Last-Modified: ' . gmdate('r'));
            header('Expires: '.gmdate('r', time() + 31536000));
            GenerateThumbnail($img, $type);
            SendImage($img, $type, $path);
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
function tbnDrawWaterfall(&$img, $eventName = null)
{
    global $id;
    global $testPath;
    global $run;
    global $cached;
    global $url;
    global $newWidth;
    global $test;

    include('waterfall.inc');
    $is_secure = false;
    $has_locations = false;
    if($eventName != null){
    	$requestsArray = getRequests($id, $testPath, $run, $cached, $is_secure,
    			$has_locations, false, false, true);
    	$requests = $requestsArray[$eventName];
    } else {
    	$requests = getRequests($id, $testPath, $run, $cached, $is_secure,
        	                    $has_locations, false, false);
    }
    $use_dots = (!isset($_REQUEST['dots']) || $_REQUEST['dots'] != 0);
    $rows = GetRequestRows($requests, $use_dots);
    $page_data = loadPageRunData($testPath, $run, $cached);
    $page_events = GetPageEvents($page_data);
    $bwIn=0;
    if (isset($test) && array_key_exists('testinfo', $test) && array_key_exists('bwIn', $test['testinfo'])) {
        $bwIn = $test['testinfo']['bwIn'];
    } else if(isset($test) && array_key_exists('test', $test) && array_key_exists('bwIn', $test['test'])) {
        $bwIn = $test['test']['bwIn'];
    }
    $options = array(
        'id' => $id,
        'path' => $testPath,
        'run_id' => $run,
        'is_cached' => $cached,
        'use_cpu' => true,
        'use_bw' => true,
        'max_bw' => $bwIn,
        'is_thumbnail' => true,
        'width' => $newWidth
        );
    $img = GetWaterfallImage($rows, $url, $page_events, $options, $page_data);
    if (!$requests || !$page_data) {
        $failed = true;
    }
}

/**
* Draw the checklist image
* 
* @param resource $img
*/
function tbnDrawChecklist(&$img, $eventName = null)
{
    global $id;
    global $testPath;
    global $run;
    global $cached;
    global $url;

    include('optimizationChecklist.inc');
    $is_secure = false;
    $has_locations = false;
    if($eventName != null){
    	$requestsArray = getRequests($id, $testPath, $run, $cached, $is_secure, $has_locations, false, false, true);
   		$requests = $requestsArray[$eventName];
    } else {
    $requests = getRequests($id, $testPath, $run, $cached, $is_secure, $has_locations, false);
    }
    $page_data = loadPageRunData($testPath, $run, $cached);
    $img = drawChecklist($url, $requests, $page_data);
    if (!$requests || !$page_data) {
        $failed = true;
    }
}

/**
* Resize the image down to thumbnail size
* 
* @param mixed $img
*/
function GenerateThumbnail(&$img, $type)
{
    global $newWidth;
    global $fit;

    // figure out what the height needs to be
    $width = imagesx($img);
    $height = imagesy($img);
    
    if ($fit > 0) {
        if ($width > $height) {
            $scale = $fit / $width;
        } else {
            $scale = $fit / $height;
        }
    } else {
        $scale = $newWidth / $width;
    }
    
    if( $scale < 1 )
    {
        $newWidth = (int)($width * $scale);
        $newHeight = (int)($height * $scale);
        
        # Create a new temporary image
        $tmp = imagecreatetruecolor($newWidth, $newHeight);

        # Copy and resize old image into new image
        $quality = 4;
        if( !strcasecmp( $type, 'jpg') )
            $quality = 3;
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
* @param mixed $path
* 		path to save image to
*/
function SendImage(&$img, $type, $path = null)
{
    // output the image
    if( !strcasecmp( $type, 'jpg') )
    {
        header ("Content-type: image/jpeg");
        imageinterlace($img, 1);
        imagejpeg($img, NULL, 75);
    }
    else
    {
        header ("Content-type: image/png");
        if($path != null){
        	imagepng($img, $path);
        }
        imagepng($img);
    }
}
?>
