<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include('common.inc');
$file = "$testPath/{$_GET['file']}";

if( isset($_GET['file']) && 
    strlen($_GET['file']) && 
    strpos($_GET['file'], '/') === false && 
    strpos($_GET['file'], '\\') === false &&
    strpos($_GET['file'], '..') === false &&
    strpos($_GET['file'], 'testinfo') === false &&
    gz_is_file($file) )
{
    $file_name = $_GET['file'];
    if (substr($file_name, -10) === 'netlog.txt')
      $file_name = str_replace('netlog.txt', 'netlog.json', $file_name);
    if( strpos($file_name, '.json') !== false ) {
        header ("Content-type: application/json");
        header("Content-disposition: attachment; filename=$file_name");
    } elseif (strpos($file_name, '.log') !== false) {
        header ("Content-type: text/plain");
    } else {
        header ("Content-type: application/octet-stream");
        header("Content-disposition: attachment; filename=$file_name");
    }
    if (isset($_REQUEST['compressed'])) {
      readfile($file);
    } else {
      gz_readfile_chunked($file);
    }
}
else
    header("HTTP/1.0 404 Not Found");  
?>
