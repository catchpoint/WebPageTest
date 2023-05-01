<?php

require_once __DIR__ . '/common.inc';
require_once __DIR__ . '/include/MimetypeBreakdownHtmlSnippet.php';

$useScreenshot = true;

$socialTitle = "Carbon Control Report for $url";
$socialDesc = "View this Report on WebPageTest.org";
$page_title = "Catchpoint WebPageTest: Carbon Control Report for $url";

// this output buffer hack avoids a bit of circularity
// on one hand we want the contents of header.inc
// on the other we want to get access to TestRunResults prior to that
ob_start();
define('NOBANNER', true); // otherwise Twitch banner shows 2x
$tab = 'Test Result';
$subtab = 'Carbon Control';
include_once INCLUDES_PATH . '/header.inc';
$results_header = ob_get_contents();
ob_end_clean();

// all prerequisite libs were already required in header.inc
$fileHandler = new FileHandler();
$testInfo = TestInfo::fromFiles($testPath);
$testRunResults = TestRunResults::fromFiles($testInfo, $run, $cached, $fileHandler);
$pageData = $testRunResults->getStepResult(1)->getRawResults();
$testStepResult = TestStepResult::fromFiles($testInfo, 1, 0, 1);
$requests = $testStepResult->getRequests();



// bytes metric
$pageweight_total = $testStepResult->getMetric('bytesIn');
$pageweight_total_bytes = $pageweight_total;
$pageweight_units = "B";
if ($pageweight_total > 1000) {
    $pageweight_total = round($pageweight_total / 1024, 1);
    $pageweight_units = "KB";
}
if ($pageweight_total > 1000) {
    $pageweight_total = round($pageweight_total / 1000, 2);
    $pageweight_units = "MB";
}
$resource_impact = [];
$resource_config = [];
$resource_config['js'] = ['JavaScript', "#E7AD45"];
$resource_config['video'] = ['Video', "#CD6363"];
$resource_config['image'] = ['Images', "#63ADCD"];
$resource_config['font'] = ['Fonts', "#9263CD"];
$resource_config['css'] = ['CSS', "#63CD9A"];
$resource_config['html'] = ['HTML', "#A6934F"];
$resource_config['other'] = ['Other', "#959595"];
$resource_config['flash'] = ['Flash', "#222"];

$mime_breakdown = $testStepResult->getMimeTypeBreakdown();

foreach ($mime_breakdown as $type => $values) {
    $val = $values["bytes"] / $pageweight_total_bytes * 100;
    $resource_impact[] = [$resource_config[$type][0], $val, $resource_config[$type][1], round($val)];
}


// green hosting info metric
$carbon_footprint = $testStepResult->getMetric('carbon-footprint');



$green_hosting = $carbon_footprint['green-hosting'];

if (!isset($green_hosting[0]['hosted_by'])) {
    $green_hosting[0]['hosted_by'] = 'Unknown';
}

// for the quick check impact audits
$practices = [];

// good avg bad
function convertToTextScore($score)
{
    if ($score > 90) {
        $score = "good";
    } elseif ($score > 50) {
        $score = "avg";
    } else {
        $score = "bad";
    }
    return $score;
}

// text compression
if (isset($pageData['score_gzip'])) {
    $practices['gzip_score_num'] = $pageData['score_gzip'];
    $practices['gzip_score'] = convertToTextScore($pageData['score_gzip']);
    $practices['gzip_total'] = round($pageData['gzip_total'] / 1024.0, 1);
    $scorepercent = $pageData['score_gzip'] / 100;
    $practices['gzip_savings'] = round($pageData['gzip_total'] * $scorepercent / 1024.0, 1);
    $practices['gzip_target'] = round(($practices['gzip_total'] - $practices['gzip_savings']), 1);
}

// text minify
//print_r($pageData);

if (isset($pageData['score_minify'])) {
    $practices['minify_score_num'] = $pageData['score_minify'];
    $practices['minify_score'] = convertToTextScore($pageData['score_minify']);
    $practices['minify_total'] = round($pageData['minify_total'] / 1024.0, 1);
    $practices['minify_savings'] = round($pageData['minify_savings'] / 1024.0, 1);
    $practices['minify_target'] = round(($pageData['minify_total'] - $pageData['minify_savings']) / 1024.0, 1);
}

// cdn score
if (isset($pageData['score_cdn'])) {
    $practices['cdn_score_num'] = $pageData['score_cdn'];
    $practices['cdn_score'] = convertToTextScore($pageData['score_cdn']);
}

// lazy loadable images
$imgsOutsideViewport = $testStepResult->getMetric('imgs-out-viewport');
$imgsInsideViewport = $testStepResult->getMetric('imgs-in-viewport');
$imgsInsideViewportSrcs = [];
foreach ($imgsInsideViewport as $img) {
    array_push($imgsInsideViewportSrcs, $img['src']);
}
$practices['images_need_lazy_total'] = 0;
if (isset($imgsOutsideViewport)) {
    foreach ($imgsOutsideViewport as $img) {
        if ($img["loading"] !== "lazy" && !in_array($img["src"], $imgsInsideViewportSrcs) && strpos($img["src"], 'data:') !== 0) {
            $practices['images_need_lazy_total'] += 1;
        }
    }
}

$practices['images_need_lazy_score'] = "good";
if ($practices['images_need_lazy_total'] > 2) {
    $practices['images_need_lazy_score'] = "avg";
}
if ($practices['images_need_lazy_total'] > 5) {
    $practices['images_need_lazy_score'] = "bad";
}



// image compresson
if (isset($pageData['score_compress'])) {
    $practices['images_score_num'] = $pageData['score_compress'];
    $practices['images_score'] = convertToTextScore($pageData['score_compress']);
    $practices['images_total'] = round($pageData['image_total'] / 1024.0, 1);
    $practices['images_savings'] = round($pageData['image_savings'] / 1024.0, 1);
    $practices['images_target'] = round(($pageData['image_total'] - $pageData['image_savings']) / 1024.0, 1);
}

// cache
if (isset($pageData['score_cache']) && $pageData['score_cache'] >= 0) {
    $practices['cache_score'] = convertToTextScore($pageData['score_cache']);
    $practices['cache_score_num'] = $pageData['score_cache'];
}

// preloads
$practices['unused_preloads_total'] = 0;

foreach ($requests as $request) {
    if (isset($request['preloadUnused']) &&  $request['preloadUnused'] == "true") {
        $practices['unused_preloads_total'] += 1;
    }
}
$practices['unused_preloads_score'] = "good";
if ($practices['unused_preloads_total'] > 2) {
    $practices['unused_preloads_score'] = "avg";
}
if ($practices['unused_preloads_total'] > 5) {
    $practices['unused_preloads_score'] = "bad";
}

$experimentOptsUrlGenerator = UrlGenerator::create(FRIENDLY_URLS, "", $id, 0, 0);
$experimentOptsHref = $experimentOptsUrlGenerator->resultPage("experiments");



// template
echo view('pages.carboncontrol', [
    'test_results_view' => true,
    'page_title' => $page_title,
    'test_url' => $url,
    'resource_impact' => $resource_impact,
    'has_ei_results' => isset($carbon_footprint),
    'green_hosting' => $green_hosting,
    'carbon_footprint' => $carbon_footprint,
    'pageweight_total' => $pageweight_total,
    'pageweight_units' => $pageweight_units,
    'opps_url' => $experimentOptsHref,
    'practices' => $practices,
    'body_class' => 'result result-impact',
    'results_header' => $results_header
]);
