<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

require 'common.inc';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestStepResult.php';


global $testPath, $run, $cached, $step;  // set in common.inc. This is for IDE to know what exists

$requestedSnippet = $_REQUEST["snippet"];
$useLinks = !GetSetting('nolinks');
$testInfo = TestInfo::fromFiles($testPath);
$stepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);

if (!$stepResult->isValid()) {
  echo "No data for test step";
  exit(0);
}

switch ($requestedSnippet) {
  case "waterfall":
    require_once __DIR__ . '/include/WaterfallViewHtmlSnippet.php';

    $waterfallSnippet = new WaterfallViewHtmlSnippet($testInfo, $stepResult);
    echo $waterfallSnippet->create();
    break;

  case "connection":
    require_once __DIR__ . '/include/ConnectionViewHtmlSnippet.php';

    $waterfallSnippet = new ConnectionViewHtmlSnippet($testInfo, $stepResult);
    echo $waterfallSnippet->create();
    break;

  case "requestDetails":#
    require_once __DIR__ . '/include/RequestDetailsHtmlSnippet.php';

    $requestDetailsSnippet = new RequestDetailsHtmlSnippet($testInfo, $stepResult, $useLinks);
    echo $requestDetailsSnippet->create();
    break;

  case "requestHeaders":
    require_once __DIR__ . '/include/RequestHeadersHtmlSnippet.php';

    $requestHeadersSnippet = new RequestHeadersHtmlSnippet($stepResult, $useLinks);
    echo $requestHeadersSnippet->create();
    break;

  case "mimetypeBreakdown":
    require_once __DIR__ . '/include/MimetypeBreakdownHtmlSnippet.php';
    $snippetRv = new MimetypeBreakdownHtmlSnippet($testInfo, $stepResult);
    echo $snippetRv->create();
    break;

  case "domainBreakdown":
    require_once __DIR__ . '/include/DomainBreakdownHtmlSnippet.php';
    $snippetRv = new DomainBreakdownHtmlSnippet($testInfo, $stepResult);
    echo $snippetRv->create();
    break;

  case "performanceOptimization":
    require_once __DIR__ . '/include/PerformanceOptimizationHtmlSnippet.php';
    $snippet = new PerformanceOptimizationHtmlSnippet($testInfo, $stepResult);
    echo $snippet->create();
    break;

  default:
    header($_SERVER["SERVER_PROTOCOL"]." 404 Not Found", true, 404);
    exit(0);
}
