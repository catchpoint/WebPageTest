<?php

require_once __DIR__ . '/common.inc';

// this output buffer hack avoids a bit of circularity
// on one hand we want the contents of header.inc
// on the other we want to get access to TestRunResults prior to that
ob_start();
define('NOBANNER', true); // otherwise Twitch banner shows 2x
$tab = 'Test Result';
$subtab = 'Detected Technologies';
include_once INCLUDES_PATH . '/header.inc';
$results_header = ob_get_contents();
ob_end_clean();

// all prerequisite libs were already required in header.inc
$fileHandler = new FileHandler();
$testInfo = TestInfo::fromFiles($testPath);
$pageData = loadAllPageData($testPath);

$error_message = null;
$detected = @$pageData[$run][$cached]['detected_technologies'];

if (empty($detected)) {
    $error_message = 'No known technologies were detected';
}

// template
echo view('pages.technologies', [
    'test_results_view' => true,
    'body_class' => 'result',
    'results_header' => $results_header,
    'detected' => $detected,
    'count' => count($detected),
    'error_message' =>  $error_message,
]);
