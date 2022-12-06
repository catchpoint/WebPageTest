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

$audits = [];
if ($lhResults) {
    foreach ($lhResults->categories as $category) {
        $opportunities = [];
        $diagnostics = [];
        $auditsPassed = [];
        foreach ($category->auditRefs as $auditRef) {
            $relevantAudit = $lhResults->audits->{$auditRef->id};
            $auditHasDetails = isset($relevantAudit->details);
            $passed = false;
            $score = $relevantAudit->score;
            $scoreMode = $relevantAudit->scoreDisplayMode;

            if ($score !== null && ($scoreMode === 'binary' && $score === 1 ||  $scoreMode === 'numeric' && $score > 0.9)) {
                $passed = true;
            }

            if ($passed) {
                array_push($auditsPassed, $relevantAudit);
            } else if ($auditHasDetails && $scoreMode !== 'error' && $scoreMode !== 'notApplicable') {
                if ($relevantAudit->details->type === 'opportunity') {
                    array_push($opportunities, $relevantAudit);
                } else {
                    array_push($diagnostics, $relevantAudit);
                }
            }
        }
        $opportunities = array_unique($opportunities, SORT_REGULAR);
        $diagnostics = array_unique($diagnostics, SORT_REGULAR);
        $passed = array_unique($auditsPassed, SORT_REGULAR);

        $audits[$category->title] = [
            'opprtunities' => $opportunities,
            'diagnostics' => $diagnostics,
            'passed' => $passed,
        ];
    }
}

$metricKeys = array(
    'first-contentful-paint',
    'speed-index',
    'largest-contentful-paint',
    'interactive',
    'total-blocking-time',
    'cumulative-layout-shift'
);

$metrics = array();
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

$screenshot = $lhResults->audits->{'final-screenshot'}
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
$results_header = ob_get_contents();
ob_end_clean();
//endregion

echo view('pages.lighthouse', [
    'test_results_view' => true,
    'results_header' => $results_header,
    'body_class' => 'result',
    'results' => $lhResults,
    'audits' => $audits,
    'metrics' => $metrics,
    'screenshot' => $screenshot,
    'thumbnails' => $thumbnails,
]);
