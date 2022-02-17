<?php
    $blockingCSSReqs = array();
    foreach ($requests as $request) {
        if( $request['renderBlocking'] === "blocking"  && strpos($request['url'], "font") === false && $request['contentType'] === "text/css" ){
            array_push($blockingCSSReqs, $request['url'] );
        }
    }

    if( count($blockingCSSReqs) > 0 ){
        echo observationHTML(
            count($blockingCSSReqs) . " externally-referenced CSS file". (count($blockingCSSReqs) > 1 ? "s are" : " is") ." blocking page rendering.",
            "By default, references to external CSS files will block the page from rendering while they are fetched and executed. Sometimes these files should block rendering, but can be inlined to avoid additional round-trips while the page is waiting to render.",
            $blockingCSSReqs,
            array(
                (object) [
                    'title' => 'Inline external stylesheets.',
                    "desc" => '<p>This experiment will embed the contents of external stylesheets directly into the HTML within a <code>style</code> element. This increases the size of the HTML, but can often allow page page to display sooner by avoiding server round trips.</p>',
                    "expvar" => 'inline',
                    "expval" => $blockingCSSReqs
                ]
            ),
            false
        );
    } else {
    echo observationHTML(
        'You had no render-blocking external CSS files.',
        "TBD importance notes here",
        array(),
        array(),
        true
    );
}

?>