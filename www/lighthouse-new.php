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

    $treemap = [
        'lhr' => [
            'requestedUrl' => $url,
            'audits' => [
                'script-treemap-data' => [
                    'details' => $lhResults->audits->{'script-treemap-data'}->details
                ],
            ],
            'configSettings' => [
                'locale' => "en-US"
            ]
        ]
    ];

    foreach ($lhResults->categories as $catid => $category) {
        $isPerf = $catid === 'performance';
        $categoryGroups = [];
        $categoryGroups['passed'] = [];
        $categoryGroups['notApplicable'] = [];

        $categoryaudits = [];

        foreach ($category->auditRefs as $auditRef) {
            $filterAuditOut = false;
            if ($isPerf && $filterbymetric !== "ALL" && $filterbymetric !== $auditRef->acronym) {
                $filterAuditOut = true;
            }

            if (!$filterAuditOut) {
                if ($auditRef->relevantAudits) {
                    foreach ($auditRef->relevantAudits as $ref) {
                        $categoryaudits[] = $lhResults->audits->{$ref};
                    }
                } else if (!in_array($auditRef->group, ['metrics', 'hidden', 'budgets'])) {
                    $categoryaudits[] = $lhResults->audits->{$auditRef->id};
                }
            }

            foreach ($categoryaudits as $categoryaudit) {
                $score = $categoryaudit->score;
                $scoreMode = $categoryaudit->scoreDisplayMode;

                $passed = $scoreMode !== 'informative'; // unless info, pass by default
                $scoreDesc = "pass";
                if ($score !== null && ($scoreMode === 'binary' && $score !== 1 ||  $scoreMode === 'numeric' && $score < 0.9)) {
                    $passed = false;
                    $scoreDesc = "average";
                    if ($scoreMode === 'numeric' && $score < 0.5) {
                        $scoreDesc = "fail";
                    }
                }
                $categoryaudit->scoreDescription = $scoreDesc;

                if ($passed) {
                    $categoryGroups['passed'][] = $categoryaudit;
                } else if ($scoreMode === "notApplicable") {
                    $categoryGroups['notApplicable'][] = $categoryaudit;
                } else if ($scoreMode !== 'error') {

                    if ($isPerf) {
                        $catname = $categoryaudit->details->type === 'opportunity' ? 'opportunities' : 'diagnostics';
                    } else {
                        $catname = $auditRef->group;
                    }

                    if (!$categoryGroups[$catname]) {
                        $categoryGroups[$catname] = [];
                    }
                    $categoryGroups[$catname][$categoryaudit->id] = $categoryaudit;
                }
            }
        }
        foreach ($categoryGroups as $catgroupkey => $categoryGroup) {
            $categoryGroups[$catgroupkey] = array_unique($categoryGroup, SORT_REGULAR);
        }

        // move passed and notApp to the end
        foreach(['passed','notApplicable'] as $sortCat){
            if( $categoryGroups[$sortCat] ){
                $tempPassed = $categoryGroups[$sortCat];
                unset($categoryGroups[$sortCat]);
                $categoryGroups[$sortCat] = $tempPassed;
            }
        }
        

        $audits[$category->id] = $categoryGroups;
    }

    // a dictionary of category IDs => titles
    // soma hardcoded, some from the report
    $categoryTitles = [
        'opportunities' => 'Opportunities',
        'diagnostics' => 'Diagnostics',
        'passed' => 'Passed Audits',
        'notApplicable' => 'Not Applicable',
        '' => 'Other',
    ];
    foreach ($lhResults->categoryGroups as $cat_id => $cat) {
        $categoryTitles[$cat_id] = $cat->title;
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
    'treemap' => base64_encode(gzencode(json_encode($treemap))),
    'categoryTitles' => $categoryTitles,
]);
