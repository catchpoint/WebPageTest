<?php


$initialHost = $requests[0]["host"];
$blocking3pReqs = array();
$blocking3pHosts = array();

foreach ($requests as $request) {
    if( $request['renderBlocking'] === "blocking" && $request['host'] !== $initialHost && ($request['contentType'] === "application/javascript" || $request['contentType'] === "text/css") ){
        array_push($blocking3pReqs, $request['url'] );
        array_push($blocking3pHosts, $request['host'] );
    }
}



if( count($blocking3pReqs) > 0 ){
    echo observationHTML(
        "Potential <abbr title=\"Single Point of Failure\">SPOF</abbr>: ". count($blocking3pReqs) ." 3rd-party request". (count($blocking3pReqs) > 1 ? "s are" : " is") ." blocking page rendering.",
        "By default, references to external JavaScript and CSS files will block the page from rendering. Third-party blocking requests are particularly risky, as your page's access relies on their response time and availability.'",
        $blocking3pReqs,
        array(
            (object) [
                'title' => 'Test impact of hanging service request.',
                "desc" => '<p>This experiment will direct these requests to WebPageTest\'s blackhole server, which will hang indefinitely until timing out. Use this experiment to test your site\'s ability to serve content if these services hang.</p>',
                "expvar" => 'spof',
                "expval" => $blocking3pHosts
                ]
        ),
        false
    );
}
else {
    echo observationHTML(
        'You had no render-blocking javascript files.',
        "TBD importance notes here",
        array(),
        array(),
        true
    );
}

?>