<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

include __DIR__ . '/common.inc';


require_once INCLUDES_PATH . '/page_data.inc';
require_once INCLUDES_PATH . '/include/TestInfo.php';
require_once INCLUDES_PATH . '/include/TestResults.php';
require_once INCLUDES_PATH . '/include/TestRunResults.php';

$lhResults = null;
if (isset($testPath) && is_dir($testPath)) {
    $file = 'lighthouse.json.gz';
    $filePath = "$testPath/$file";
    if (is_file($filePath)) {
        $lhResults = json_decode(gz_file_get_contents($filePath));
    }
}

$testInfo = GetTestInfo($id);
$url = $testInfo['url'];
$useScreenshot = true;
$socialTitle = "Lighthouse Report for $url";
$socialDesc = "View this Lighthouse Report on WebPageTest.org";
$page_title = "WebPageTest: Lighthouse Report for $url";

$filterbymetric = @$_REQUEST['filterbymetric'] ?? 'ALL';
$metricFilters = [
    'ALL' => $filterbymetric === 'ALL',
    'FCP' => $filterbymetric === 'FCP',
    'LCP' => $filterbymetric === 'LCP',
    'TBT' => $filterbymetric === 'TBT',
    'CLS' => $filterbymetric === 'CLS',
];

$audits = [];
if ($lhResults) {
    foreach ($lhResults->categories as $category) {
        $opportunities = [];
        $diagnostics = [];
        $auditsPassed = [];
        $categoryaudits = [];
        
        foreach ($category->auditRefs as $auditRef) {
            $filterAuditOut = false;
            if($category->title === "Performance" && $filterbymetric !== "ALL" && $filterbymetric !== $auditRef->acronym ){
                $filterAuditOut = true;
            }

            if( !$filterAuditOut ){
                if ($auditRef->relevantAudits) {
                    foreach ($auditRef->relevantAudits as $ref) {
                        $categoryaudits[] = $lhResults->audits->{$ref};
                    }
                } else if(!in_array($auditRef->group, ['metrics', 'hidden', 'budgets'])){
                    $categoryaudits[] = $lhResults->audits->{$auditRef->id};
                }
            }

            foreach ($categoryaudits as $categoryaudit) {
                $auditHasDetails = isset($categoryaudit->details);
                $score = $categoryaudit->score;
                $scoreMode = $categoryaudit->scoreDisplayMode;
                $passed = $scoreMode !== 'informative';
                $scoreDesc = "pass";
                
                if ($score !== null && ($scoreMode === 'binary' && $score !== 1 ||  $scoreMode === 'numeric' && $score < 0.9)) {
                    $passed = false;
                    $scoreDesc = "average";
                    if( $scoreMode === 'numeric' && $score < 0.5 ){
                        $scoreDesc = "fail";
                    }
                }
                $categoryaudit->scoreDescription = $scoreDesc;
                if ($passed) {
                    array_push($auditsPassed, $categoryaudit);
                } else if ($auditHasDetails && $scoreMode !== 'error' ) {
                    if ($categoryaudit->details->type === 'opportunity') {
                        array_push($opportunities, $categoryaudit);
                    } else {
                        array_push($diagnostics, $categoryaudit);
                    }
                }
            }
        }
        $opportunities = array_unique($opportunities, SORT_REGULAR);
        $diagnostics = array_unique($diagnostics, SORT_REGULAR);
        $passed = array_unique($auditsPassed, SORT_REGULAR);

        $audits[$category->title] = [
            'opportunities' => $opportunities,
            'diagnostics' => $diagnostics,
            'passed' => $passed,
        ];
    }
}

$metricKeys = [
    'first-contentful-paint',
    'speed-index',
    'largest-contentful-paint',
    'interactive',
    'total-blocking-time',
    'cumulative-layout-shift'
];

$metrics = [];
foreach ($metricKeys as $metric) {
    $thisMetric = $lhResults->audits->{$metric};
    $metricSplit = preg_split("@[\s+　]@u", trim($thisMetric->displayValue));

    $grade = '';
    if ($thisMetric->score) {
        $grade = "good";
        if ($thisMetric->score < 0.9) {
            $grade = "ok";
        } else if ($thisMetric->score < 0.5) {
            $grade = "poor";
        }
    }


    array_push($metrics, (object) [
        'title' => $lhResults->audits->{$metric}->title,
        'grade' => $grade,
        'value' => $metricSplit[0],
        'units' => isset($metricSplit[1]) ? $metricSplit[1] : ''
    ]);
}

$lighthouse_screenshot = $lhResults->audits->{'final-screenshot'}
    ? $lhResults->audits->{'final-screenshot'}->details->data
    : null;

$thumbnails = [];
if ($lhResults->audits->{'screenshot-thumbnails'}) {
    foreach ($lhResults->audits->{'screenshot-thumbnails'}->details->items as $th) {
        $thumbnails[] = $th->data;
    }
}

//region HEADER
ob_start();
define('NOBANNER', true); // otherwise Twitch banner shows 2x
$tab = 'Test Result';
$subtab = 'Lighthouse Report';
include_once 'header.inc';
global $lhOnly;
$results_header = ob_get_contents();
ob_end_clean();
//endregion

if (!$lhOnly) {
    $experimentOptsUrlGenerator = UrlGenerator::create(FRIENDLY_URLS, "", $id, 0, 0);
    $experimentOptsHref = $experimentOptsUrlGenerator->resultPage("experiments");
}

echo view('pages.lighthouse', [
    'test_results_view' => true,
    'results_header' => $results_header,
    'body_class' => 'result',
    'test_url' => $url,
    'results' => $lhResults,
    'audits' => $audits,
    'metrics' => $metrics,
    'lh_only' => $lhOnly,
    'page_title' => $page_title,
    'opps_url' => $experimentOptsHref,
    'metric_filters' => $metricFilters,
    'filterbymetric' => $filterbymetric,
    'lighthouse_screenshot' => $lighthouse_screenshot,
    'thumbnails' => $thumbnails,
]);
