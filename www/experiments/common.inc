<?php

declare(strict_types=1);

use WebPageTest\OE\AssessmentRegistry;
use WebPageTest\OE\Assessment\Types as AssessmentType;
use WebPageTest\OE\OpportunityTest as OT;
use WebPageTest\RequestContext;

(function (RequestContext $request_context) {
    global $requests;
    global $testStepResult;
    global $tests;
    global $test;
    global $testResults;
    global $id;

    // initial host is used by a few opps, so we'll calculate it here
    $initialHost = null;
    $rootURL = null;
    /**
    * used in /experiments.php
    *
    * @var null|string $initialOrigin
    */
    $initialOrigin = null;
    foreach ($requests as $request) {
        if ($request['is_base_page'] == "true") {
            $initialHost = $request['host'];
            $rootURL = trim($request['full_url']);
            $initialOrigin = "http" . (strpos($rootURL, "https") === 0 ? "s" : "" ) . "://" . $initialHost;
            break;
        }
    }

    // define for future experiments
    if (!$testStepResult && isset($tests)) {
        $testStepResult = $tests[0]['stepResult'];
    }
    $browser = $test['testinfo']['browser'];
    $genContentSize = $testStepResult->getMetric('generated-content-size');
    $genContentPercent = $testStepResult->getMetric('generated-content-percent');
    // for custom metrics
    $rawResultData = $testStepResult->getRawResults();
    $customMetrics = null;
    if (isset($rawResultData['custom']) && count($rawResultData['custom'])) {
        $customMetrics = $rawResultData['custom'];
    }

    $test_step_requests = $testStepResult->getRequests();

    // accessibility!
    $axe = $testStepResult->getMetric('axe');

    /**
     *@var array { TestResult } $quick_tests
     */
    $quick_tests = [
        OT\SlowTTFB::run([$testResults, $testStepResult]),
        OT\RenderBlockingScripts::run([$testStepResult, $rootURL]),
        OT\RenderBlockingCSS::run([$testStepResult, $requests, $rootURL]),
        OT\LCP::run([$testStepResult]),
        OT\ImgsLazyLoaded::run([$testStepResult]),
        OT\ImgsLazyLoadable::run([$testStepResult]),
        OT\FontRendering::run([$testStepResult]),
        OT\Fonts3rdParty::run([$testStepResult, $initialHost]),
        OT\CDN::run([$testStepResult, $requests]),
        OT\Cache::run([$testStepResult, $requests]),
        OT\HTTPRedirects::run([$testStepResult])
    ];

    //Today this opp only works in Chrome or Edge so to avoid showing it as
    //ok when it might not be, we'll just not do it in other browsers
    if ($browser == 'Chrome' || $browser == 'Edge') {
        $quick_tests[] = OT\UnusedPreloads::run([$testStepResult, $rootURL]);
    }

    if (isset($genContentSize) && isset($genContentPercent)) {
        $quick_tests[] = OT\GeneratedContentQuick::run([$genContentSize, $genContentPercent, $id]);
    }

    AssessmentRegistry::getInstance()->registerMultiple(AssessmentType::QUICK, $quick_tests);

    /*
     * @var array { TestResult } $usable_tests
     */
    $usable_tests = [];

    $cls = $testStepResult->getMetric('chromeUserTiming.CumulativeLayoutShift');
    if (isset($cls)) {
        $usable_tests[] = OT\LayoutShift::run([$testStepResult, $cls]);
    }
    $tbtMetric = $testStepResult->getMetric('TotalBlockingTime');
    if (isset($tbtMetric)) {
        $usable_tests[] = OT\TBT::run([$testStepResult, $tbtMetric]);
    }

    $metaMetric = $testStepResult->getMetric('meta-viewport');
    if (isset($metaMetric)) {
        $usable_tests[] = OT\MetaViewport::run([$metaMetric]);
    }
    if (isset($axe)) {
        $usable_tests[] = OT\AxeWarnings::run([$axe]);
    }
    if (isset($genContentSize) && isset($genContentPercent)) {
        $usable_tests[] = OT\GeneratedContentUsable::run([$genContentSize, $genContentPercent]);
    }

    AssessmentRegistry::getInstance()->registerMultiple(AssessmentType::USABLE, $usable_tests);

    $resilient_tests = [
      OT\RenderBlocking3rdParty::run([$testStepResult, $initialHost, $rootURL]),
      OT\SecurityJSLibs::run([$testStepResult]),
      OT\InsecureRequests::run([$testStepResult])
    ];
    if (isset($genContentSize) && isset($genContentPercent)) {
        $resilient_tests[] = OT\GeneratedContentResilient::run([$test_step_requests, $genContentSize, $genContentPercent, $initialHost]);
    }

    AssessmentRegistry::getInstance()->registerMultiple(AssessmentType::RESILIENT, $resilient_tests);

    $custom_tests = [
      OT\Custom\AddHtmlToDoc::run([]),
      OT\Custom\FindAndReplace::run([]),
      OT\Custom\DeliveryOptimizations::run([])
    ];

    $body_url = $test_step_requests[0]['body_url'] ?? "";
    if (!empty($body_url)) {
        $location = 'https://' . $request_context->getHost() . $body_url;
        $custom_tests[] = OT\Custom\EditResponseHtml::run([$location]);
    }

    AssessmentRegistry::getInstance()->registerMultiple(AssessmentType::CUSTOM, $custom_tests);

    $assessment = AssessmentRegistry::getInstance()->getAll();




    $GLOBALS['assessment'] = $assessment;
    $GLOBALS['initialOrigin'] = $initialOrigin;
    $GLOBALS['customMetrics'] = $customMetrics;
})($request_context);
