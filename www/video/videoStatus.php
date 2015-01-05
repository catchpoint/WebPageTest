<?php
chdir('..');
require_once('common.inc');

$ret = array();
$ret['statusCode'] = 400;
$ret['statusText'] = 'Video not found';

if (array_key_exists('id', $_REQUEST)) {
    $videoPath = './' . GetVideoPath($_REQUEST['id']);
    if (is_dir($videoPath)) {
        if (is_file("$videoPath/video.mp4")) {
            $ret['statusCode'] = 200;
            $ret['statusText'] = 'Video ready';
        } else {
            $ret['statusCode'] = 100;
            $ret['statusText'] = 'Video processing';
        }
    }
}

json_response($ret);
?>
