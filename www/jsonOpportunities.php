<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

declare(strict_types=1);

require_once __DIR__ . '/common.inc';

use WebPageTest\Util;

require_once INCLUDES_PATH . '/optimization_detail.inc.php';
require_once INCLUDES_PATH . '/breakdown.inc';
require_once INCLUDES_PATH . '/testStatus.inc';
require_once INCLUDES_PATH . '/include/TestInfo.php';
require_once INCLUDES_PATH . '/include/TestResults.php';

// if this is an experiment itself, we don't want to offer opps on it, so we redirect to the source test's opps page.
// TODO this should redirect to the json url
if ($experiment && isset($experimentOriginalExperimentsHref)) {
    header('Location: ' . $experimentOriginalExperimentsHref);
}

$breakdown = array();
$status = GetTestStatus($id, false);
$testComplete = ($status['statusCode'] >= 200);

$testInfo = TestInfo::fromFiles($testPath);
$testResults = TestResults::fromFiles($testInfo);
if ($testComplete) {
    $testStepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);
    $requests = $testStepResult->getRequests();
    include INCLUDES_PATH . '/experiments/common.inc';
    json_response($assessment);
}
