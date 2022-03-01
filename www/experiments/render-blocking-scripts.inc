<?php
$category = "Quick";
$blockingJSReqs = array();
foreach ($requests as $request) {
    if( $request['renderBlocking'] === "blocking" && $request['contentType'] === "application/javascript" ){
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
                'title' => 'Defer all render-blocking scripts.',
                "desc" => '<p>This experiment will add a defer attribute to render-blocking scripts, causing the browser to fetch them in parallel while showing the page. Deferred scripts still execute in the order they are defined in source. <a href="#">More about resource hints on MDN</a></p>',
                "expvar" => 'deferjs',
                "expval" => $blockingJSReqs
                ]
        ),
        "good" =>  false
    );
}
else {
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  'You had no render-blocking javascript files.',
        "desc" =>  "TBD importance notes here",
        "examples" =>  array(),
        "experiments" =>  array(),
        "good" =>  true
    );
}

?>