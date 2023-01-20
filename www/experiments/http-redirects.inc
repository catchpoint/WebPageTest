<?php

(function () {

    global $testStepResult;

    $requests = $testStepResult->getRequests();
    $redirectedRequests = array();

    foreach ($requests as $request) {
        if (isset($request['responseCode']) &&  is300s($request)) {
            $loc = "";
            foreach ($request["headers"]["response"] as $header) {
                if (strpos($header, "Location:") !== null) {
                    $loc = substr($header, strlen("Location:"));
                }
            }
            array_push($redirectedRequests, array($request['full_url'], $loc));
        }
    }

    function joinValues($arr)
    {
        $oneLevel = array();
        foreach ($arr as $item) {
            array_push($oneLevel, 'FROM: ' . implode(" TO: ", $item));
        }
        return $oneLevel;
    }

    if (count($redirectedRequests) > 0) {
        $expsToAdd = null;
        if (isset($requests[0]['responseCode']) && is300s($requests[0])) {
            $to = $requests[1]['full_url'];
            $expsToAdd = array();
            $expsToAdd[] = (object) [
                "id" => '047',
                'title' => 'Remove Redirect on First Request',
                "desc" => '<p>This experiment will replace the initial url with its redirected location, demonstrating time saved when no redirect is in play.</p>',
                "expvar" => 'experiment-setinitialurl',
                "expval" => array($to),
                "expval" => array($to),
                "hideassets" => true
            ];
        }

        $opp = [
            "title" =>  count($redirectedRequests) . " request" . (count($redirectedRequests) > 1 ? "s are" : " is") . " resulting in an HTTP redirect.",
            "desc" =>  "HTTP redirects can result in additional DNS resolution, TCP connection and HTTPS negotiation times, making them very costly for performance, particularly on high latency networks.",
            "examples" =>  joinValues($redirectedRequests),
            "good" =>  false,
            "experiments" => $expsToAdd,
        ];
    } else {
        $opp = [
            "title" =>  'Zero requests were found that resulted in an HTTP redirect.',
            "desc" =>  "HTTP redirects can result in additional DNS resolution, TCP connection and HTTPS negotiation times, making them very costly for performance, particularly on high latency networks.",
            "examples" =>  array(),
            "good" =>  true
        ];
    }

    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Quick, $opp);
})();
