<?php

require_once __DIR__ . '/common.inc';
$testInfo = GetTestInfo($id);


// this output buffer hack avoids a bit of circularity
// on one hand we want the contents of header.inc
// on the other we want to get access to TestRunResults prior to that
ob_start();
define('NOBANNER', true); // otherwise Twitch banner shows 2x
$tab = 'Test Result';
$subtab = 'HTML Diff';
$socialTitle = "HTML Diff for " . $testInfo['url'];
$socialDesc = "View this HTML Diff (delivered vs rendered HTML) on WebPageTest.org";
$page_title = "WebPageTest: HTML Diff for " . $testInfo['url'];
include_once INCLUDES_PATH . '/header.inc';
$results_header = ob_get_contents();
ob_end_clean();

// all prerequisite libs were already required in header.inc
$fileHandler = new FileHandler();
$testInfo = TestInfo::fromFiles($testPath);
$testRunResults = TestRunResults::fromFiles($testInfo, $run, $cached, $fileHandler);
$pageData = loadAllPageData($testPath);

$error_message = null;
$delivered_html = null;
$rendered_html = @$pageData[$run][$cached]['generated-html'];

if (!$rendered_html) {
    $error_message = 'Rendered HTML not available, please run the test again';
}

$body_id = @$pageData[$run][$cached]['final_base_page_request_id'];
if (!$body_id) {
    $error_message = 'Could not figure out the request ID of the final base page, please run the test again';
} else {
    // TODO: move this to a utility and share with response_body.php
    $cachedStr = $cached ? '_Cached' : '';
    $bodies_file = $testPath . '/' . $run . $cachedStr . '_bodies.zip';
    if (is_file($bodies_file)) {
        $zip = new ZipArchive();
        if ($zip->open($bodies_file) === true) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                $parts = explode('-', $name);
                $id = trim($parts[1]);
                if (!strcmp($id, $body_id)) {
                    $delivered_html = $zip->getFromIndex($i);
                    break;
                }
            }
        }
    }
}

if (!$delivered_html) {
    $error_message = 'Response body is not available, please turn on the "Save Response Bodies" option in the advanced settings to capture text resources.';
}

// template
echo view('pages.htmldiff', [
    'test_results_view' => true,
    'body_class' => 'result',
    'results_header' => $results_header,
    'rendered_html' => $rendered_html,
    'delivered_html' => $delivered_html,
    'error_message' =>  $error_message,
    'page_title' => $page_title,
]);
