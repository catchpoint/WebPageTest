<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

include 'common.inc';

// TODO: use these in the template
$page_keywords = array('Timeline Breakdown','WebPageTest','Website Speed Test','Page Speed');
$page_description = "Chrome main-thread processing breakdown$testLabel";

//region HEADER 
ob_start();
define('NOBANNER', true); // otherwise Twitch banner shows 2x
$tab = 'Test Result';
$subtab = 'Processing';
include_once 'header.inc';
$results_header = ob_get_contents();
ob_end_clean();
//endregion

//region SETUP
$processing = GetDevToolsCPUTime($testPath, $run, $cached);
//endregion

//region template
require_once __DIR__ . '/resources/view.php';
echo view('pages.breakdownTimeline', [
    'test_results_view' => true,
    'body_class' => 'result',
    'results_header' => $results_header,
    'processing' => $processing,
    'timeline_url' => "/timeline/" . VER_TIMELINE . "timeline.php?test=$id&run=$run&cached=$cached" // Slight testing problem with this on my docker image
]);
//endregion
?>