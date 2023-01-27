<?php

(function () {

    global $testStepResult;
    $requests = $testStepResult->getRequests();
    $insecureRequests = array();

    foreach ($requests as $request) {
        if (isset($request['is_secure']) &&  $request['is_secure'] == 0) {
            array_push($insecureRequests, $request['full_url']);
        }
    }
    $insecureRequests = array_unique($insecureRequests);

    if (count($insecureRequests) > 0) {
        $opp = [
            "title" =>  count($insecureRequests) . " resource" . (count($insecureRequests) > 1 ? "s are" : " is") . " not being loaded over a secure connection.",
            "desc" =>  "Loading requests over HTTPS necessary for ensuring data integrity, protecting users personal information, providing core critical security, and providing access to many new browser features.",
            "examples" =>  $insecureRequests,
            "good" =>  false
        ];
    } else {
        $opp = [
            "title" =>  'Zero resources were found that were loaded over an insecure connection.',
            "desc" =>  "Loading requests over HTTPS necessary for ensuring data integrity, protecting users personal information, providing core critical security, and providing access to many new browser features.",
            "examples" =>  array(),
            "good" =>  true
        ];
    }

    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Resilient, $opp);
})();
