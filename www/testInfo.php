<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';

// only allow download of relay tests
$ok = false;
if (isset($_REQUEST['test']) && isset($_REQUEST['s']) && GetServerSecret() == $_REQUEST['s']) {
    $testInfo = GetTestInfo($_REQUEST['test']);
    if (isset($testInfo) && is_array($testInfo)) {
        $ok = true;
        header("Content-type: application/json; charset=utf-8");
        echo json_encode($testInfo);
    }
}

if( !$ok )
    header("HTTP/1.0 404 Not Found");
?>
