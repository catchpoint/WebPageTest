<?php
$category = "Quick";
$requests = $testStepResult->getRequests();
$blockingJSReqs = array();
foreach ($requests as $request) {
    if(  ($request['renderBlocking'] === "blocking" || $request['renderBlocking'] === "in_body_parser_blocking") && ($request['contentType'] === "application/javascript" || $request['contentType'] === "text/javascript") ){
        array_push($blockingJSReqs, $request['url'] );
    }
}



if( count($blockingJSReqs) > 0 ){
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  count($blockingJSReqs) . " externally-referenced JavaScript file". (count($blockingJSReqs) > 1 ? "s are" : " is") ." blocking page rendering.",
        "desc" =>  "By default, references to external JavaScript files will block the page from rendering while they are fetched and executed. Often, these files can be loaded in a different manner, freeing up the page to visually render sooner.",
        "examples" =>  $blockingJSReqs,
        "experiments" =>  array(
            (object) [
                'title' => 'Defer render-blocking scripts.',
                "desc" => '<p>This experiment will add a defer attribute to render-blocking scripts, causing the browser to fetch them in parallel while showing the page. Deferred scripts still execute in the order they are defined in source. <a href="#">More about resource hints on MDN</a></p>',
                "expvar" => 'deferjs',
                "expval" => $blockingJSReqs
            ],
            (object) [
                    'title' => 'Inline render-blocking scripts.',
                    "desc" => '<p>This experiment will embed the contents of external scripts directly into the HTML within a <code>script</code> element. This increases the size of the HTML, but can often allow page page to display sooner by avoiding server round trips.</p>',
                    "expvar" => 'inline',
                    "expval" => $blockingJSReqs
                ]
        ),
        "good" =>  false
    );
}
else {
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  'Zero render-blocking JavaScript files found.',
        "desc" =>  "TBD importance notes here",
        "examples" =>  array(),
        "experiments" =>  array(),
        "good" =>  true
    );
}

?>