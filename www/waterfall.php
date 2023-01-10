<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
header("Content-type: image/png");
include 'common.inc';
require_once INCLUDES_PATH . '/object_detail.inc';
require_once INCLUDES_PATH . '/page_data.inc';
require_once INCLUDES_PATH . '/waterfall.inc';
require_once INCLUDES_PATH . '/include/TestInfo.php';
require_once INCLUDES_PATH . '/include/TestStepResult.php';

// not functional, but to declare what to expect from common.inc
global $testPath, $run, $cached, $step, $id, $url, $test;

$testInfo = TestInfo::fromFiles($testPath);
$testStepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);

$is_mime = isset($_REQUEST['mime']) ? (bool)@$_REQUEST['mime'] : (bool)GetSetting('mime_waterfalls', 1);
$is_state = (bool)@$_REQUEST['state'];
$include_js = isset($_REQUEST['js']) ? (bool)@$_REQUEST['js'] : true;
$include_wait = isset($_REQUEST['wait']) ? (bool)@$_REQUEST['wait'] : true;
$use_dots = (!isset($_REQUEST['dots']) || $_REQUEST['dots'] != 0);
$show_labels = (!isset($_REQUEST['labels']) || $_REQUEST['labels'] != 0);
$show_chunks = (!isset($_REQUEST['chunks']) || $_REQUEST['chunks'] != 0);
$rowcount = array_key_exists('rowcount', $_REQUEST) ? $_REQUEST['rowcount'] : 0;

// Get all of the requests;
$requests = $testStepResult->getRequests();

if ($include_js) {
    $localPaths = new TestPaths($testInfo->getRootDirectory(), $run, $cached, $step);
    AddRequestScriptTimings($requests, $localPaths->devtoolsScriptTimingFile());
}

if (@$_REQUEST['type'] == 'connection') {
    $is_state = true;
    $include_js = false;
    $include_wait = false;
    $rows = GetConnectionRows($requests, $show_labels);
} else {
    $rows = GetRequestRows($requests, $use_dots, $show_labels);
}
$page_events = GetPageEvents($testStepResult->getRawResults());
$bwIn = 0;
if (isset($test) && is_array($test) && isset($test['testinfo']['bwIn'])) {
    $bwIn = $test['testinfo']['bwIn'];
} elseif (isset($test) && is_array($test) && isset($test['test']['bwIn'])) {
    $bwIn = $test['test']['bwIn'];
}

$options = array(
    'id' => $id,
    'path' => $testPath,
    'run_id' => $run,
    'is_cached' => $cached,
    'step_id' => $step,
    'use_cpu' => (!isset($_REQUEST['cpu']) || $_REQUEST['cpu'] != 0),
    'use_bw' => (!isset($_REQUEST['bw']) || $_REQUEST['bw'] != 0),
    'use_lt' => (!isset($_REQUEST['lt']) || $_REQUEST['lt'] != 0),
    'show_labels' => $show_labels,
    'show_chunks' => $show_chunks,
    'max_bw' => $bwIn,
    'is_mime' => $is_mime,
    'is_state' => $is_state,
    'include_js' => $include_js,
    'include_wait' => $include_wait,
    'show_user_timing' => (isset($_REQUEST['ut']) ? $_REQUEST['ut'] : GetSetting('waterfall_show_user_timing')),
    'rowcount' => $rowcount
);

$url = $testStepResult->readableIdentifier($url);

$pageData = $testStepResult->getRawResults();
$im = GetWaterfallImage($rows, $url, $page_events, $options, $pageData);

// Spit the image out to the browser.
header('Last-Modified: ' . gmdate('r'));
header('Expires: ' . gmdate('r', time() + 31536000));
header('Cache-Control: public, max-age=31536000', true);
imagepng($im);
imagedestroy($im);
