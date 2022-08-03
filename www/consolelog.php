<?php

// this output buffer hack avoids a bit of circularity
// on one hand we want the contents of header.inc
// on the other we want to get access to TestRunResults prior to that
ob_start();
define('NOBANNER', true); // otherwise Twitch banner shows 2x
$tab = 'Test Result';
$subtab = 'Console Log';
include_once 'header.inc';
$results_header = ob_get_contents();
ob_end_clean();

// all prerequisite libs were already required in header.inc
$fileHandler = new FileHandler();
$testInfo = TestInfo::fromFiles($testPath);
$testRunResults = TestRunResults::fromFiles($testInfo, $run, $cached, $fileHandler);

// template
require_once __DIR__ . '/resources/view.php';
echo view('pages.consolelog', [
    'test_results_view' => true,
    'body_class' => 'result',
    'results_header' => $results_header,
    'log' => $testRunResults->getStepResult(1)->getConsoleLog(),
]);
