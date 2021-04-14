<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';

// only allow download of relay tests
$ok = false;
if( strpos($testPath, 'relay') !== false
    && strpos($testPath, 'results') !== false
    && strpos($testPath, '..') === false
    && is_dir($testPath) ) {
    // delete the test directory
    delTree($testPath);
    
    // delete empty directories above this one
    while (strpos($testPath, 'relay')) {
        $testPath = rtrim($testPath, "/\\");
        $testPath = dirname($testPath);
        rmdir($testPath);
    }
    
    $ok = true;
}

if( !$ok )
    header("HTTP/1.0 404 Not Found");
?>
