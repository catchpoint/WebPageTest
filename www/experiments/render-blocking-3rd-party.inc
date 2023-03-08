<?php

(function () {

    global $testStepResult;
    global $initialHost;
    global $startRender;
    global $blocking3pReqs;
    global $blocking3pHosts;

    $requests = $testStepResult->getRequests();
    $blocking3pReqs = array();
    $blocking3pHosts = array();
    $potentiallyBlocking3pReqs = array();
    $potentiallyBlocking3pHosts = array();
    $possibleRenderBlockers = $testStepResult->getMetric('possibly-render-blocking-reqs');
    $blockingIndicator = false;

    foreach ($requests as $request) {
        if (isset($request['renderBlocking'])) {
            $blockingIndicator = true;
        }
        if (initiatedByRoot($request) && $initialHost !== $request['host'] && ($request['renderBlocking'] === "blocking" || $request['renderBlocking'] === "in_body_parser_blocking")) {
            array_push($blocking3pReqs, $request['full_url']);
            array_push($blocking3pHosts, $request['host']);
        } elseif (
            initiatedByRoot($request) && $initialHost !== $request['host']
            && ($request['contentType'] === "text/css" || $request['requestType'] === "script" || $request['request_type'] === "Script")
            && $request['all_end'] < $startRender
        ) {
            if (!empty($possibleRenderBlockers) && in_array($request['full_url'], $possibleRenderBlockers)) {
                array_push($potentiallyBlocking3pReqs, $request['full_url']);
                array_push($potentiallyBlocking3pHosts, $request['host']);
            }
        }
    }

    if (!$blockingIndicator) {
        //browser doesn't support the render blocking indicator so we'll use our other array
        $blocking3pReqs = $potentiallyBlocking3pReqs;
        $blocking3pHosts = $potentiallyBlocking3pHosts;
    }

    if (count($blocking3pReqs) > 0) {
        $opp = [
            "title" =>  "Potential <abbr title=\"Single Point of Failure\">SPOF</abbr>: " . count($blocking3pReqs) . " 3rd-party request" . (count($blocking3pReqs) > 1 ? "s are" : " is") . " blocking page rendering.",
            "desc" =>  "By default, references to external JavaScript and CSS files will block the page from rendering. Third-party blocking requests are particularly risky, as your page's access relies on their response time and availability.'",
            "examples" =>  array_unique($blocking3pReqs),
            "experiments" =>  array(
                (object) [
                    "id" => '023',
                    'title' => 'Preconnect 3rd Party Hosts',
                    "desc" => '<p>This experiment will add a <code>link</code> with <code>rel="preconnect"</code> for specified hosts, which saves time for those steps when the resource is later requested.</p>',
                    "expvar" => 'addpreconnect',
                    "expval" => array_unique($blocking3pHosts)
                ],
                (object) [
                    "id" => '024',
                    'title' => 'Preload 3rd Party Files',
                    "desc" => '<p>This experiment will add a <code>link</code> with <code>rel="preload"</code> for specified files, causing the browser to fetch the file early and at a high priority.</p>',
                    "expvar" => 'addpreload',
                    "expval" => array_unique($blocking3pReqs)
                ],
                (object) [
                    "id" => '025',
                    'title' => 'Self Host 3rd Party Files',
                    "desc" => '<p>This experiment will fetch these files server-side and reference them on the same domain. Note: the overrides happen at the host level, so any requests from that host will now be self-hosted.</p>',
                    "expvar" => 'experiment-overrideHost',
                    "expval" => array_unique($blocking3pHosts)
                ],
                (object) [
                    "id" => '007',
                    'title' => 'Make Scripts Timeout',
                    "desc" => '<p>This experiment directs specified hosts to WebPageTest\'s blackhole server, which will hang indefinitely until timing out. Use this experiment to test your site\'s ability to serve content if these services hang.</p>',
                    "expvar" => 'experiment-spof',
                    "expval" => array_unique($blocking3pHosts)
                ],
                (object) [
                    "id" => '008',
                    'title' => 'Block Scripts',
                    "desc" => '<p>This experiment causes specified requests to fail immediately. Use this experiment to test your site\'s ability to serve content if these services are unavailable.</p>',
                    "expvar" => 'experiment-block',
                    "expval" => array_unique($blocking3pReqs)
                ]
            ),
            "good" =>  false
        ];
    } else {
        $opp = [
            "title" =>  'Zero render-blocking third-party requests found.',
            "desc" =>  'By default, references to external JavaScript and CSS files will block the page from rendering. Third-party blocking requests are particularly risky, as your page\'s access relies on their response time and availability.',
            "examples" =>  array(),
            "experiments" =>   array(),
            "good" =>  true
        ];
    }

    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Resilient, $opp);
})();
