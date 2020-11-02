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
    gz_is_file($file) )
{
    header ("Content-type: application/octet-stream");
    gz_readfile_chunked($file);
}
else
    header("HTTP/1.0 404 Not Found");  
?>
