<?php
include 'utils.inc';
include 'common.inc';
require_once('object_detail.inc');
require_once('page_data.inc');
require_once('waterfall.inc');


$id = urldecode($_REQUEST['id']);
$testPath = urldecode($_REQUEST['testPath']);
$eventName = urldecode($_REQUEST['eventName']);
$run = $_REQUEST['run'];
$cached = $_REQUEST['cached'];
$test_info = json_decode(urldecode($_REQUEST['testInfo']),true);
$secure = $_REQUEST['secure'];
$haveLocations = $_REQUEST['haveLocations'];

$type = "waterfall";
$file = generateViewImagePath($testPath, $eventName, $run, $cached, $type);
$dataArray = loadPageRunData($testPath, $run, $cached, array('SpeedIndex' => true, 'allEvents' => true));
$requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, true, true, true);
if($test_info['imageCaching']){
    if(!file_exists($file)){
        createImageAndSave($id, $testPath, $test_info, $eventName, $run, $cached, $dataArray[$eventName][$run][$cached], $type);
    }
    InsertWaterfall($url, $requests, $id, $run, $cached, '', $eventName, $file);
} else {
    InsertWaterfall($url, $requests, $id, $run, $cached, '', $eventName);
}
?>
