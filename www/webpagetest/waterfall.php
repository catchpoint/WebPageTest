<?php
header ("Content-type: image/png");
include 'common.inc';
include 'object_detail.inc'; 
require_once('page_data.inc');
$pageData = loadPageRunData($testPath, $run, $cached);

$mime = false;
if( array_key_exists('mime', $_REQUEST) && $_REQUEST['mime'] )
    $mime = true;

$state = true;
//if( array_key_exists('state', $_REQUEST) && $_REQUEST['state'] )
//    $state = true;
    
// get all of the requests
$secure = false;
$haveLocations = false;
$requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);
$cpu = true;
if( isset($_REQUEST['cpu']) && $_REQUEST['cpu'] == 0 )
    $cpu = false;
$bw = true;
if( isset($_REQUEST['bw']) && $_REQUEST['bw'] == 0 )
    $bw = false;
$dots = true;
if( isset($_REQUEST['dots']) && $_REQUEST['dots'] == 0 )
    $dots = false;
$options = array( 'id' => $id, 'path' => $testPath, 'run' => $run, 'cached' => $cached, 'cpu' => $cpu, 'bw' => $bw, 'dots' => $dots, 'mime' => $mime, 'state' => $state );

// see if we are doing a regular waterfall or a connection view
if( $_REQUEST['type'] == 'connection' )
{
    require_once('contentColors.inc');
    require_once('connectionView.inc');

    $summary = array();
    $connections = getConnections($requests, $summary, $mime, $state);
    $im = drawImage($connections, $summary, $url, $mime, false, $pageData, $options);
}
else
{
    require_once('waterfall.inc');
    $im = drawWaterfall($url, $requests, $pageData, false, $options);
}

// spit the image out to the browser
imagepng($im);
imagedestroy($im);
?>
