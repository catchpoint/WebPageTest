<?php
header ("Content-type: image/png");
include 'common.inc';
include 'object_detail.inc'; 
include 'contentColors.inc';
include 'connectionView.inc';
require_once('page_data.inc');
$pageData = loadPageRunData($testPath, $run, $cached);

$mime = $_GET['mime'];

// get all of the requests
$secure = false;
$haveLocations = false;
$requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);
$mimeColors = requestColors($requests);

$summary = array();
$connections = getConnections($requests, $summary);
$options = array( 'id' => $id, 'path' => $testPath, 'run' => $run, 'cached' => $cached, 'cpu' => true, 'bw' => true );
$im = drawImage($connections, $summary, $url, $mime, $mimeColors, false, $pageData, $options);

// spit the image out to the browser
imagepng($im);
imagedestroy($im);

?>
