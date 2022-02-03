<?php
$blockingFontCSSReqs = array();
foreach ($requests as $request) {
    if( $request['renderBlocking'] === "blocking" && strpos($request['url'], "font") !== false && $request['contentType'] === "text/css" ){
        array_push($blockingFontCSSReqs, $request['url'] );
    }
}

if( count($blockingFontCSSReqs) > 0 ){
  echo observationHTML(
      count($blockingFontCSSReqs) . " external font CSS file". (count($blockingFontCSSReqs) > 1 ? "s are" : " is") ." blocking page rendering.",
      "By default, references to external CSS files will block the page from rendering while they are fetched and executed. CSS files that are purely for loading fonts can often be loaded asynchronously to allow the page content to render sooner.",
      $blockingFontCSSReqs,
      array(
        // (object) [
        //     'title' => 'Inline font stylesheets.',
        //     "desc" => 'This experiment will embed the contents of external stylesheets directly into the HTML within a <code>style</code> element. This can allow the fonts to be loaded in fewer network steps.',
        //     "expvar" => 'inline',
        //     "expval" => implode(",", $blockingFontCSSReqs)
        //   ]
        // ,
          (object) [
              'title' => 'Load Font CSS files asynchronously.',
              "desc" => 'This experiment will load these stylesheets in a way that allows the page to begin rendering while they are still loading. Fonts will appear when they arrive.',
              "expvar" => 'asynccss',
              "expval" => implode(",", $blockingFontCSSReqs)
            ]
      )
  );
}
?>