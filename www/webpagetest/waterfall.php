<?php
header ("Content-type: image/png");
include 'common.inc';
include 'object_detail.inc';
require_once('page_data.inc');
require_once('waterfall.inc');

$page_data = loadPageRunData($testPath, $run, $cached);

$is_mime = (bool)@$_REQUEST['mime'];
$is_state = (bool)@$_REQUEST['state'];
$use_dots = (!isset($_REQUEST['dots']) || $_REQUEST['dots'] != 0);
$show_labels = (!isset($_REQUEST['labels']) || $_REQUEST['labels'] != 0);

// Get all of the requests;
$is_secure = false;
$has_locations = false;
$use_location_check = false;
$requests = getRequests($id, $testPath, $run, $cached,
                        $is_secure, $has_locations, $use_location_check);
if (@$_REQUEST['type'] == 'connection') {
    $is_state = true;
    $rows = GetConnectionRows($requests, $show_labels);
} else {
    $rows = GetRequestRows($requests, $use_dots, $show_labels);
}
$page_events = GetPageEvents($page_data);
$options = array(
    'id' => $id,
    'path' => $testPath,
    'run_id' => $run,
    'is_cached' => $cached,
    'use_cpu' =>     (!isset($_REQUEST['cpu'])    || $_REQUEST['cpu'] != 0),
    'use_bw' =>      (!isset($_REQUEST['bw'])     || $_REQUEST['bw'] != 0),
    'show_labels' => $show_labels,
    'is_mime' => $is_mime,
    'is_state' => $is_state
    );
$im = GetWaterfallImage($rows, $url, $page_events, $options);

// Spit the image out to the browser.
imagepng($im);
imagedestroy($im);
?>
