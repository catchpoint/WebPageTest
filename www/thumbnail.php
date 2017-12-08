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
    include __DIR__ . '/common.inc';
    require_once __DIR__ . '/include/TestInfo.php';
    require_once __DIR__ . '/include/TestStepResult.php';

    global $testPath, $run, $cached, $step; // from common.inc

    $file = $_GET['file'];

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

        $testStepResult = TestStepResult::fromFiles(TestInfo::fromFiles($testPath), $run, $cached, $step);

        // see if it is a waterfall image
        if( strstr($parts['basename'], 'waterfall') !== false )
        {
            tbnDrawWaterfall($testStepResult, $img);
        }
        elseif( strstr($parts['basename'], 'optimization') !== false )
        {
            tbnDrawChecklist($testStepResult, $img);
        }
        else {
            if( !is_file("$testPath/$file") ) {
                $file = str_ireplace('.jpg', '.png', $file);
                $parts = pathinfo($file);
                $type = $parts['extension'];
            }
            if( is_file("$testPath/$file") ) {
                if( !strcasecmp( $type, 'jpg') )
                    $img = @imagecreatefromjpeg("$testPath/$file");
                elseif( !strcasecmp( $type, 'gif') )
                    $img = @imagecreatefromgif("$testPath/$file");
                else
                    $img = @imagecreatefrompng("$testPath/$file");
            }
        }

        if( $img )
        {
            header('Last-Modified: ' . gmdate('r'));
            header('Expires: '.gmdate('r', time() + 31536000));
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
* @param TestStepResult $testStepResult Step results to draw the waterfall for
* @param resource $img
*/
function tbnDrawWaterfall($testStepResult, &$img)
{
    global $id;
    global $testPath;
    global $run;
    global $cached;
    global $url;
    global $newWidth;
    global $test;
    global $step;

    require_once __DIR__ . '/waterfall.inc';
    $requests = $testStepResult->getRequests();
    $localPaths = $testStepResult->createTestPaths();
    AddRequestScriptTimings($requests, $localPaths->devtoolsScriptTimingFile());
    $use_dots = (!isset($_REQUEST['dots']) || $_REQUEST['dots'] != 0);
    $rows = GetRequestRows($requests, $use_dots);
    $page_events = GetPageEvents($testStepResult->getRawResults());
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
        'step_id' => $step,
        'use_cpu' => true,
        'use_bw' => true,
        'max_bw' => $bwIn,
        'show_user_timing' => GetSetting('waterfall_show_user_timing'),
        'is_thumbnail' => true,
        'include_js' => true,
        'is_mime' => (bool)GetSetting('mime_waterfalls'),
        'width' => $newWidth
        );
    $url = $testStepResult->readableIdentifier($url);
    $pageData = $testStepResult->getRawResults();
    $img = GetWaterfallImage($rows, $url, $page_events, $options, $pageData);
}

/**
* Draw the checklist image
*
* @param TestStepResult $testStepResult Step results to draw the waterfall for
* @param resource $img
*/
function tbnDrawChecklist($testStepResult, &$img)
{
    global $url;

    require_once __DIR__ . '/optimizationChecklist.inc';

    $requests = $testStepResult->getRequests();
    $img = drawChecklist($testStepResult->readableIdentifier($url), $requests, $testStepResult->getRawResults());
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
*/
function SendImage(&$img, $type)
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
        imagepng($img);
    }
}
?>
