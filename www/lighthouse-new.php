<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

require_once __DIR__ . '/common.inc';

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

// these are figured out and passed to the template
$auditExperiments = [
    "offscreen-images" => "014",
    "font-display" => "018",
    "third-party-summary" => "050",
    "total-byte-weight" => "050",
    "layout-shift-elements" => "012",
    "render-blocking-resources" => "001",
    "viewport" => "009",
    "preload-lcp-image" => "010",
    "prioritize-lcp-image" => "010", // "preload-lcp-image" is renamed in LH v10
    "unsized-images" => "012",
    "lcp-lazy-loaded" => "013",
    "meta-viewport" => "009"

];

$audits = [];
$groupTitles = null;

if ($lhResults) {
    // Group titles:
    // a bag of group IDs => titles
    // some are hardcoded, some come from the report
    // The order matters as it's used for sorting too:
    // 1/ opportunities first, diagnostics second
    // 2/ anything found in the report
    // 3/ end with manual checks, passed audits and N/A
    $groupTitles = [
        'opportunities' => 'Opportunities',
        'diagnostics' => 'Diagnostics',
    ];
    foreach ($lhResults->categoryGroups as $cat_id => $cat) {
        $groupTitles[$cat_id] = $cat->title;
    }
    $groupTitles['manual'] = 'Additional Items to Check Manually';
    $groupTitles['passed'] = 'Passed Audits';
    $groupTitles['notApplicable'] = 'Not Applicable';

    // Treemap data
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

    // audit id => group id
    // e.g. aria-valid-attr => a11y-aria
    $auditToGroupLookup = [];

    // the big loop of categories to put everything in
    // the correct order in $audits
    foreach ($lhResults->categories as $catid => $category) {
        // these 2 are special:
        // perf has diagnostics and opportunities
        // pwa treats "passed" and n/a as "optimized"
        $isPerf = $catid === 'performance';
        $isPWA = $catid === 'pwa';

        // collection of all audits, meaning explicit + "relevant"
        $audit_ids = [];
        foreach ($category->auditRefs as $auditRef) {
            $filterAuditOut = false;
            if ($isPerf && $filterbymetric !== "ALL" && $filterbymetric !== $auditRef->acronym) {
                $filterAuditOut = true;
            }
            if (!$filterAuditOut) {
                // A category can have its own audits, but also
                // an audit can bring in additional "relevant" audits
                if ($auditRef->relevantAudits) {
                    foreach ($auditRef->relevantAudits as $ref) {
                        $audit_ids[] = $ref;
                    }
                } elseif (!in_array($auditRef->group, ['metrics', 'hidden', 'budgets'])) {
                    $audit_ids[] = $auditRef->id;
                }
            }
            $auditToGroupLookup[$auditRef->id] = $auditRef->group;
        }
        $audit_ids = array_values(array_unique($audit_ids));

        // Now that we know all the audit IDs we want to show
        // put them in relevant groups
        // where "group" is e.g. "Passed Audits" or "Contrast"
        $groupedAudits = [];

        foreach ($audit_ids as $auditid) {
            $groupaudit = $lhResults->audits->{$auditid};
            $score = $groupaudit->score;
            $scoreMode = $groupaudit->scoreDisplayMode;

            $passed = $scoreMode !== 'informative'; // unless info, pass by default
            $scoreDesc = "pass";
            if (($scoreMode === 'binary' && $score !== 1) || ($scoreMode === 'numeric' && $score < 0.9)) {
                $passed = false;
                $scoreDesc = "average";
                if ($scoreMode === 'numeric' && $score < 0.5) {
                    $scoreDesc = "fail";
                }
                if ($scoreMode === 'binary' && $score !== 1) {
                    $scoreDesc = "fail";
                }
                $groupaudit->relevantExperiment = $auditExperiments[$auditid];
            }
            $groupaudit->scoreDescription = $scoreDesc;

            // put each audit in the right group based on a generic lookup, but observing:
            //  - PWA and perf quirks
            //  - the concept of a Passed Audits group
            if (!$isPerf && $scoreMode === 'manual') {
                // nothing manual in perf!
                $groupedAudits[$scoreMode][] = $groupaudit;
            } elseif (!$isPerf && !$isPWA && $scoreMode === 'notApplicable') {
                // everyting is applicable
                $groupedAudits[$scoreMode][] = $groupaudit;
            } elseif ($passed && !$isPWA) {
                // in PWA passed means PWA-optimized
                $groupedAudits['passed'][] = $groupaudit;
            } else {
                if ($isPerf) {
                    $grpname = $groupaudit->details->type === 'opportunity' ? 'opportunities' : 'diagnostics';
                } else {
                    $grpname = $auditToGroupLookup[$auditid];
                }
                if (!$groupedAudits[$grpname]) {
                    $groupedAudits[$grpname] = [];
                }
                $groupedAudits[$grpname][$groupaudit->id] = $groupaudit;
            }

            // sort based on the keys found in $groupTitles
            $sortedAudits = [];
            foreach (array_keys($groupTitles) as $key) {
                if (array_key_exists($key, $groupedAudits)) {
                    $sortedAudits[$key] = $groupedAudits[$key];
                }
            }

            // all done, push to $audits
            $audits[$catid] = $sortedAudits;
        }
    }
}

// sort opps by ms
if (isset($audits['performance']['opportunities'])) {
    uasort(
        $audits['performance']['opportunities'],
        function ($a, $b) {
            if ($a->details->overallSavingsMs === $b->details->overallSavingsMs) {
                return 0;
            }
            return ($a->details->overallSavingsMs < $b->details->overallSavingsMs) ? 1 : -1;
        }
    );
}

// sort diagnostics to put the fails first
if (isset($audits['performance']['diagnostics'])) {
    uasort(
        $audits['performance']['diagnostics'],
        function ($a, $b) {
            if ($a->scoreDescription === $b->scoreDescription) {
                return 0;
            }
            if ($a->scoreDescription === 'fail') {
                return -1;
            }
            if ($b->scoreDescription === 'fail') {
                return 1;
            }
        }
    );
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
    if (isset($thisMetric->score)) {
        $grade = "good";
        if (floatval($thisMetric->score) < 0.9) {
            $grade = "ok";
        }
        if (floatval($thisMetric->score) < 0.5) {
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
    'groupTitles' => $groupTitles,
]);
