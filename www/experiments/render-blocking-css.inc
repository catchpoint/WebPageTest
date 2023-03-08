<?php

(function () {

    global $testStepResult;
    global $requests;
    global $blockingCSSReqs;

    $requests = $testStepResult->getRequests();
    $blockingCSSReqs = array();
    $potentiallyBlockingCSSReqs = array();
    $startRender = $testStepResult->getMetric("render");
    $possibleRenderBlockers = $testStepResult->getMetric('possibly-render-blocking-reqs');
    $blockingIndicator = false;

    foreach ($requests as $request) {
        if (isset($request['renderBlocking'])) {
            $blockingIndicator = true;
            if (
                ($request['renderBlocking'] === "blocking" || $request['renderBlocking'] === "in_body_parser_blocking")
                && $request['contentType'] === "text/css"
            ) {
                if (initiatedByRoot($request)) {
                    array_push($blockingCSSReqs, documentRelativePath($request['url'], $requests[0]['url']));
                }
            }
        } elseif (!isset($request['renderBlocking']) && $request['contentType'] === "text/css" && $request['all_end'] < $startRender) {
            $docRelUrl = documentRelativePath($request['url'], $requests[0]['url']);
            foreach ($possibleRenderBlockers as $cssUrl) {
                if (strpos($cssUrl, $docRelUrl)) {
                    array_push($potentiallyBlockingCSSReqs, $docRelUrl);
                }
            }
        }
    }
    if (!$blockingIndicator) {
        //browser doesn't support the render blocking indicator so we'll use our other array
        $blockingCSSReqs = $potentiallyBlockingCSSReqs;
    }
    if (count($blockingCSSReqs) > 0) {
        $opp = [
            "title" =>  count($blockingCSSReqs) . " externally-referenced CSS file" . (count($blockingCSSReqs) > 1 ? "s are" : " is") . " blocking page rendering.",
            "desc" =>  "By default, references to external CSS files will block the page from rendering while they are fetched and executed. Sometimes these files _should_ block rendering, but can be inlined to avoid additional round-trips while the page is waiting to render. Sometimes, such as with stylesheets that are only used for loading custom fonts, inline or async CSS can greatly improve perceived performance. ",
            "examples" =>  $blockingCSSReqs,
            "experiments" =>  array(
                (object) [
                    "id" => '005',
                    'title' => 'Inline external CSS',
                    "desc" => '<p>This experiment embeds the contents of specified external stylesheets directly into the HTML within a <code>style</code> element. This increases the size of the HTML, but can often allow page page to display sooner by avoiding server round trips. <strong>Note:</strong> The inline experiment may break relative references to images and other assets in the CSS. These would need proper path changes in production.</p>',
                    "expvar" => 'inline',
                    "expval" => array_unique($blockingCSSReqs)
                ],
                (object) [
                    "id" => '006',
                    'title' => 'Load CSS Asynchronously',
                    "desc" => '<p>This experiment loads specified stylesheets in a way that allows the page to begin rendering while they are still loading. Note that this may cause a flash of unstyled content.</p>',
                    "expvar" => 'asynccss',
                    "expval" => array_unique($blockingCSSReqs)
                ]
            ),
            "good" =>  false
        ];
    } else {
        $opp = [
            "title" =>  'Zero render-blocking CSS files found.',
            "desc" =>  "Great job. Fewer render-blocking requests mean the browser can visibly render content sooner.",
            "examples" =>  array(),
            "experiments" =>  array(),
            "good" =>  true
        ];
    }

    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Quick, $opp);
})();
