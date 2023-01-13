<?php

(function () {

    global $testStepResult;
    global $initialHost;

    $requests = $testStepResult->getRequests();
    $Font3pReqs = array();
    $Font3pHosts = array();

    foreach ($requests as $request) {
        if ($initialHost !== $request['host'] && preg_match("/woff|ttf|eot/", $request['contentType'])) {
            array_push($Font3pReqs, $request['full_url']);
            array_push($Font3pHosts, $request['host']);
        }
    }

    if (count($Font3pReqs) > 0) {
        $opp = [
            "title" =>  count($Font3pReqs) . " font" . (count($Font3pReqs) === 1 ? " is " : "s are") . " hosted on 3rd-party hosts",
            "desc" =>  "Fonts on 3rd party domains may take longer to load due to DNS and connection steps that are not necessary when fonts are hosted on the same domain.",
            "examples" =>  array_unique($Font3pReqs),
            "experiments" =>  array(
                (object) [
                    "id" => '045',
                    'title' => 'Self-Host 3rd Party Files',
                    "desc" => '<p>This experiment will fetch specified files server-side and reference them on the same domain.  Note: the overrides happen at the host level, so any requests from that host will now be self-hosted.</p>',
                    "expvar" => 'experiment-overrideHost',
                    "expval" => array_unique($Font3pHosts)
                ],
                (object) [
                    "id" => '043',
                    'title' => 'Preconnect 3rd Party Hosts',
                    "desc" => '<p>This experiment will add a <code>link</code> with <code>rel="preconnect"</code> for specified hosts, which saves time for those steps when the resource is later requested.</p>',
                    "expvar" => 'addpreconnect',
                    "expval" => array_unique($Font3pHosts)
                ],
                (object) [
                    "id" => '044',
                    'title' => 'Preload 3rd Party Files',
                    "desc" => '<p>This experiment will add a <code>link</code> with <code>rel="preload"</code> for specified hosts, causing the browser to fetch the file early and at a high priority.</p>',
                    "expvar" => 'addpreload',
                    "expval" => array_unique($Font3pReqs)
                ],
                (object) [
                    "id" => '046',
                    'title' => 'Make Fonts Timeout',
                    "desc" => '<p>This experiment directs specified hosts to WebPageTest\'s blackhole server, which will hang indefinitely until timing out. Use this experiment to test your site\'s ability to display fallback text if fonts do not load quickly.</p>',
                    "expvar" => 'experiment-spof',
                    "expval" => array_unique($Font3pHosts)
                ],
            ),
            "good" =>  false
        ];
    } else {
        $opp = [
            "title" =>  'Zero third-party fonts found.',
            "desc" =>  "Fonts on 3rd party domains may take longer to load due to DNS and connection steps that are not necessary when fonts are hosted on the same domain.",
            "examples" =>  array(),
            "experiments" =>   array(),
            "good" =>  true
        ];
    }

    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Quick, $opp);
})();
