<?php
header ("Content-type: image/png");
include 'common.inc';
require_once('object_detail.inc'); 
require_once('optimizationChecklist.inc');
require_once('page_data.inc');
$pageData = loadPageRunData($testPath, $run, $cached);

// get all of the requests
$secure = false;
$haveLocations = false;
$requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);

$im = drawChecklist($url, $requests, $pageData);

// spit the image out to the browser
imagepng($im);
imagedestroy($im);
?>
