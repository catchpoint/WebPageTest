<?php

(function () {

    global $testStepResult;
    global $browser;

    $requests = $testStepResult->getRequests();
    $unusedPreloads = array();

    foreach ($requests as $request) {
        if (initiatedByRoot($request) && isset($request['preloadUnused']) &&  $request['preloadUnused'] == "true") {
            array_push($unusedPreloads, documentRelativePath($request['url'], $requests[0]['url']));
        }
    }

    //Today this opp only works in Chrome or Edge so to avoid showing it as
    //ok when it might not be, we'll just not do it in other browsers
    if ($browser == 'Chrome' || $browser == 'Edge') {
        if (count($unusedPreloads) > 0) {
            $opp = [
                "title" =>  count($unusedPreloads) . " resource" . (count($unusedPreloads) > 1 ? "s are" : " is") . " being preloaded, but " . (count($unusedPreloads) > 1 ? "are" : "is") . " not used during page load.",
                "desc" =>  "Preloaded resources are fetched at a high priority, delaying the arrival of other resources in the page. In the case where a preloaded resource is never actually used by the page, that means potentially critical requests will be delayed, slowing down the initial loading of your site.",
                "examples" =>  array_unique($unusedPreloads),
                "experiments" =>  array(
                    (object) [
                        'id' => '022',
                        'title' => 'Remove Unused Preloads',
                        "desc" => '<p>This experiment removes specified unused preloads from the page, allowing other critical resources to be requested earlier.</p>',
                        "expvar" => 'removepreload',
                        "expval" => array_unique($unusedPreloads)
                    ]
                ),
                "good" =>  false
            ];
        } else {
            $opp = [
                "title" =>  'Zero unused preloads were found.',
                "desc" =>  'Preloaded resources are fetched at a high priority, delaying the arrival of other resources in the page. In the case where a preloaded resource is never actually used by the page, that means potentially critical requests will be delayed, slowing down the initial loading of your site.',
                "examples" =>  array(),
                "experiments" =>   array(),
                "good" =>  true
            ];
        }
    }

    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Quick, $opp);
})();
