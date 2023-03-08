<?php

(function () {

    global $testStepResult;
    global $blockingJSReqs;

    $requests = $testStepResult->getRequests();
    $blockingJSReqs = array();
    $potentiallyBlockingJSReqs = array();
    $startRender = $testStepResult->getMetric("render");
    $possibleRenderBlockers = $testStepResult->getMetric('possibly-render-blocking-reqs');
    $blockingIndicator = false;

    foreach ($requests as $request) {
        if (isset($request['renderBlocking'])) {
            $docRelUrl = documentRelativePath($request['url'], $requests[0]['url']);

            $blockingIndicator = true;
            if (
                ($request['renderBlocking'] === "blocking" || $request['renderBlocking'] === "in_body_parser_blocking")
                && (isset($request['requestType']) && $request['requestType'] === "script" || $request['request_type'] === "Script")
            ) {
                if (initiatedByRoot($request)) {
                    array_push($blockingJSReqs, $docRelUrl);
                }
            }
        } elseif (!isset($request['renderBlocking']) && (isset($request['requestType']) && $request['requestType'] === "script" || $request['request_type'] === "Script") && $request['all_end'] < $startRender) {
            $docRelUrl = documentRelativePath($request['url'], $requests[0]['url']);
            foreach ($possibleRenderBlockers as $scriptUrl) {
                if (strpos($scriptUrl, $docRelUrl)) {
                    array_push($potentiallyBlockingJSReqs, $docRelUrl);
                }
            }
        }
    }

    if (!$blockingIndicator) {
        //browser doesn't support the render blocking indicator so we'll use our other array
        $blockingJSReqs = $potentiallyBlockingJSReqs;
    }
    if (count($blockingJSReqs) > 0) {
        $opp = [
            "title" =>  count($blockingJSReqs) . " JavaScript file" . (count($blockingJSReqs) > 1 ? "s are" : " is") . " blocking page rendering.",
            "desc" =>  "By default, references to external JavaScript files will block the page from rendering while they are fetched and executed. Often, these files can be loaded in a different manner, freeing up the page to visually render sooner.",
            "examples" =>  $blockingJSReqs,
            "experiments" =>  array(
                (object) [
                    "id" => '001',
                    'title' => 'Defer Render-Blocking Scripts',
                    "desc" => '<p>This experiment adds a <code>defer</code> attribute to render-blocking scripts, causing the browser to fetch them in parallel while showing the page. Deferred scripts still execute in the order they are defined in source. Example implementation: <code>&lt;script src="' . $blockingJSReqs[0] . '" defer&gt;&lt;/script&gt;</code></p>',
                    "expvar" => 'deferjs',
                    "expval" => array_unique($blockingJSReqs)
                ],
                (object) [
                    "id" => '041',
                    'title' => 'Async Render-Blocking Scripts',
                    "desc" => '<p>This experiment adds an <code>async</code> attribute to render-blocking scripts, causing the browser to fetch them in parallel while showing the page. Async scripts are not guaranteed to execute in the order they are defined in source. Example implementation: <code>&lt;script src="' . $blockingJSReqs[0] . '" async&gt;&lt;/script&gt;</code></p>',
                    "expvar" => 'asyncjs',
                    "expval" => array_unique($blockingJSReqs)
                ],
                (object) [
                    "id" => '002',
                    'title' => 'Inline Render-Blocking Scripts',
                    "desc" => '<p>This experiment embeds the contents of specified external scripts directly into the HTML within a <code>script</code> element. This increases the size of the HTML, but can often allow page page to display sooner by avoiding server round trips.Example implementation: <code>&lt;script&gt;/* contents from ' . $blockingJSReqs[0] . ' here...*/&lt;/script&gt;</code></p>',
                    "expvar" => 'inline',
                    "expval" => array_unique($blockingJSReqs)
                ]
            ),
            "good" =>  false
        ];
    } else {
        $opp = [
            "title" =>  'Zero render-blocking JavaScript files found.',
            "desc" =>  "Great job. Fewer render-blocking requests mean the browser can visibly render content sooner.",
            "examples" =>  array(),
            "experiments" =>  array(),
            "good" =>  true
        ];
    }

    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Quick, $opp);
})();
