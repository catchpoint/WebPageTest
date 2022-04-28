<?php
$category = "Quick";
$requests = $testStepResult->getRequests();
$blockingJSReqs = array();

foreach ($requests as $request) {
    if(  ($request['renderBlocking'] === "blocking" || $request['renderBlocking'] === "in_body_parser_blocking") && ($request['contentType'] === "application/javascript" || $request['contentType'] === "text/javascript" || $request['contentType'] === "application/x-javascript") ){
        array_push($blockingJSReqs, documentRelativePath($request['url'], $requests[0]['url']) );
    }
}



if( count($blockingJSReqs) > 0 ){
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  count($blockingJSReqs) . " externally-referenced JavaScript file". (count($blockingJSReqs) > 1 ? "s are" : " is") ." blocking page rendering.",
        "desc" =>  "By default, references to external JavaScript files will block the page from rendering while they are fetched and executed. Often, these files can be loaded in a different manner, freeing up the page to visually render sooner.",
        "examples" =>  $blockingJSReqs,
        "experiments" =>  array(
            (object) [
                "id" => '001',
                'title' => 'Defer Render-Blocking Scripts',
                "desc" => '<p>This experiment adds a <code>defer</code> attribute to render-blocking scripts, causing the browser to fetch them in parallel while showing the page. Deferred scripts still execute in the order they are defined in source. <a href="#">More about defer on MDN</a></p>',
                "expvar" => 'deferjs',
                "expval" => array_unique($blockingJSReqs)
            ],
            (object) [
                "id" => '041',
                'title' => 'Async Render-Blocking Scripts',
                "desc" => '<p>This experiment adds a <code>async</code> attribute to render-blocking scripts, causing the browser to fetch them in parallel while showing the page. Async scripts are not guaranteed to execute in the order they are defined in source. <a href="#">More about async on MDN</a></p>',
                "expvar" => 'asyncjs',
                "expval" => array_unique($blockingJSReqs)
            ],
            (object) [
                "id" => '002',
                    'title' => 'Inline Render-Blocking Scripts',
                    "desc" => '<p>This experiment embeds the contents of specified external scripts directly into the HTML within a <code>script</code> element. This increases the size of the HTML, but can often allow page page to display sooner by avoiding server round trips.</p>',
                    "expvar" => 'inline',
                    "expval" => array_unique($blockingJSReqs)
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