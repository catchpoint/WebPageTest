<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
chdir('..');
require_once('common.inc');
require_once('archive.inc');

$ret = array();
$ret['statusCode'] = 400;
$ret['statusText'] = 'Video not found';

if (array_key_exists('id', $_REQUEST)) {
    RestoreVideoArchive($_REQUEST['id']);
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
