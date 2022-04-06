<?php
$category = "Quick";
$requests = $testStepResult->getRequests();
$blockingFontCSSReqs = array();
foreach ($requests as $request) {
    if(  ($request['renderBlocking'] === "blocking" || $request['renderBlocking'] === "in_body_parser_blocking") && (strpos($request['host'], "font") !== false || strpos($request['url'], "font") !== false) && $request['contentType'] === "text/css" ){
        array_push($blockingFontCSSReqs, documentRelativePath($request['url'], $requests[0]['url']) );
    }
}

if( count($blockingFontCSSReqs) > 0 ){
  $assessment[$category]["opportunities"][] = array( 
      "title" =>  count(array_unique($blockingFontCSSReqs)) . " external font CSS file". (count(array_unique($blockingFontCSSReqs)) > 1 ? "s are" : " is") ." blocking page rendering.",
      "desc" =>  "By default, references to external CSS files will block the page from rendering while they are fetched and executed. CSS files that are purely for loading fonts can often be loaded asynchronously to allow the page content to render sooner.",
      "examples" =>  array_unique($blockingFontCSSReqs),
      "experiments" =>  array(
        (object) [
            'title' => 'Inline font stylesheets.',
            "desc" => '<p>This experiment will embed the contents of external stylesheets directly into the HTML within a <code>style</code> element. This can allow the fonts to be loaded in fewer network steps. <strong>Note:</strong> The inline experiment may break relative references to images and other assets in the CSS. These would need proper path changes in production.</p>',
            "expvar" => 'inline',
            "expval" => array_unique($blockingFontCSSReqs)
          ]
        ,
          (object) [
              'title' => 'Load Font CSS files asynchronously.',
              "desc" => '<p>This experiment will load these stylesheets in a way that allows the page to begin rendering while they are still loading. Fonts will appear when they arrive.</p>',
              "expvar" => 'asynccss',
              "expval" => array_unique($blockingFontCSSReqs)
            ]
      ),
      "good" =>  false
  );
} else {
    $assessment[$category]["opportunities"][] = array(
        "title" =>  'Zero render-blocking font CSS files found.',
        "desc" =>  "TBD importance notes here",
        "examples" =>  array(),
        "experiments" =>  array(),
        "good" =>  true
    );
}
?>