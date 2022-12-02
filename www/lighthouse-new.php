<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

include 'common.inc';


//region HEADER 
ob_start();
define('NOBANNER', true); // otherwise Twitch banner shows 2x
$tab = 'Test Result';
$subtab = 'Lighthouse Report';
include_once 'header.inc';
$results_header = ob_get_contents();
ob_end_clean();
//endregion


//region template
require_once __DIR__ . '/resources/view.php';
echo view('pages.lighthouse', [
    'test_results_view' => true,
    'body_class' => 'result',
    'testPath' => $testPath,
    'results_header' => $results_header
]);
//endregion
?>
