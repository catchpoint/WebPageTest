<?php

$category = "Resilient";
$requests = $testStepResult->getRequests();
$initialHost = $requests[0]["host"];
$blocking3pReqs = array();
$blocking3pHosts = array();

foreach ($requests as $request) {
    if( ($request['renderBlocking'] === "blocking" || $request['renderBlocking'] === "in_body_parser_blocking") && $request['host'] !== $initialHost && ($request['contentType'] === "application/javascript" || $request['contentType'] === "text/css") ){
        array_push($blocking3pReqs, $request['url'] );
        array_push($blocking3pHosts, $request['host'] );
    }
}



if( count($blocking3pReqs) > 0 ){
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  "Potential <abbr title=\"Single Point of Failure\">SPOF</abbr>: ". count($blocking3pReqs) ." 3rd-party request". (count($blocking3pReqs) > 1 ? "s are" : " is") ." blocking page rendering.",
        "desc" =>  "By default, references to external JavaScript and CSS files will block the page from rendering. Third-party blocking requests are particularly risky, as your page's access relies on their response time and availability.'",
        "examples" =>  $blocking3pReqs,
        "experiments" =>  array(
            (object) [
                'title' => 'Test impact of hanging service request.',
                "desc" => '<p>This experiment will direct these requests to WebPageTest\'s blackhole server, which will hang indefinitely until timing out. Use this experiment to test your site\'s ability to serve content if these services hang.</p>',
                // "expvar" => 'spof',
                // "expval" => $blocking3pHosts
                ]
        ),
        "good" =>  false
    );
}
else {
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  'Zero render-blocking third-party requests found.',
        "desc" =>  "TBD importance notes here",
        "examples" =>  array(),
        "experiments" =>   array(),
        "good" =>  true
    );
}

?>