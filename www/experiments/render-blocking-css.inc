<?php
    $category = "Quick";
    $requests = $testStepResult->getRequests();
    $blockingCSSReqs = array();
    foreach ($requests as $request) {
        if(  ($request['renderBlocking'] === "blocking" || $request['renderBlocking'] === "in_body_parser_blocking") && $request['contentType'] === "text/css" ){
            array_push($blockingCSSReqs, $request['url'] );
        }
    }

    if( count($blockingCSSReqs) > 0 ){
        $assessment[$category]["opportunities"][] = array(
            "title" =>  count($blockingCSSReqs) . " externally-referenced CSS file". (count($blockingCSSReqs) > 1 ? "s are" : " is") ." blocking page rendering.",
            "desc" =>  "By default, references to external CSS files will block the page from rendering while they are fetched and executed. Sometimes these files should block rendering, but can be inlined to avoid additional round-trips while the page is waiting to render.",
            "examples" =>  $blockingCSSReqs,
            "experiments" =>  array(
                (object) [
                    'title' => 'Inline external stylesheets.',
                    "desc" => '<p>This experiment will embed the contents of external stylesheets directly into the HTML within a <code>style</code> element. This increases the size of the HTML, but can often allow page page to display sooner by avoiding server round trips. <strong>Note:</strong> The inline experiment may break relative references to images and other assets in the CSS. These would need proper path changes in production.</p>',
                    "expvar" => 'inline',
                    "expval" => array_unique($blockingCSSReqs)
                ],
                (object) [
                    'title' => 'Load CSS files asynchronously.',
                    "desc" => '<p>This experiment will load these stylesheets in a way that allows the page to begin rendering while they are still loading. Note that this may cause a flash of unstyled content.</p>',
                    "expvar" => 'asynccss',
                    "expval" => array_unique($blockingCSSReqs)
                  ]
            ),
            "good" =>  false
        );
    } else {
        $assessment[$category]["opportunities"][] = array( 
            "title" =>  'Zero render-blocking CSS files found.',
            "desc" =>  "TBD importance notes here",
            "examples" =>  array(),
            "experiments" =>  array(),
            "good" =>  true
        );
}

?>