<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include('common.inc');
$ok = false;

if( isset($_GET['file']) && strlen($_GET['file']) ) {
    $file = $_GET['file'];
    if (strpos($file, '/') === false && 
        strpos($file, '\\') === false &&
        strpos($file, '..') === false) {
        $data = gz_file_get_contents("$testPath/{$_GET['file']}");
        if( $data !== false ) {
            $ok = true;
            echo $data;
        }
    }
}

if( !$ok )
    header("HTTP/1.0 404 Not Found");  
?>
