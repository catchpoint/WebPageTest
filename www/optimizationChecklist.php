<?php
header ("Content-type: image/png");
include 'common.inc';
include 'object_detail.inc'; 
include 'optimizationChecklist.inc';
require_once('page_data.inc');
$eventName = $_GET["eventName"];
$pageData = loadPageRunData($testPath, $run, $cached);

// get all of the requests
$secure = false;
$haveLocations = false;
$requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false, false, true);

$im = drawChecklist($url, $requests[$eventName], $pageData);

// spit the image out to the browser
imagepng($im);
imagedestroy($im);
?>
