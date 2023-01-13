<?php

// OPPORTUNITY: Meta viewport element set
// this is necessary for responsive layout
(function () {

    global $testStepResult;

    $expectedWidth = "width=device-width";
    $expectedScale = "initial-scale=1";
    $metaMetric = $testStepResult->getMetric('meta-viewport');
    // null if metric was not included in run,
    // "Not found" if it ran and no meta tag was present
    if ($metaMetric) {
        if ($metaMetric === "Not found" || strpos($metaMetric, $expectedScale) === false || strpos($metaMetric, $expectedWidth) === false) {
            $opp = [
                "title" =>  'Meta Viewport not configured properly for mobile-friendly layout.',
                "desc" =>  'A meta viewport tag will help a mobile-friendly site scale and display properly on small screen devices.',
                "examples" =>  array(
                    ($metaMetric === "Not found" ? "It looks like no meta viewport tag is present." : "The current meta viewport tag has a content property value of " . htmlentities($metaMetric) . ".")
                ),
                "experiments" =>  array(
                    (object) [
                        "id" => '009',
                        'title' => 'Add a Meta Viewport Tag',
                        "desc" => 'This experiment inserts a ' . htmlentities('<meta name="viewport" content="width=device-width, initial-scale=1">') . ' in the <code>head</code> of this site.',
                        "expvar" => 'swap',
                        "expval" => array(encodeURIComponent("</head>") . "|" . encodeURIComponent('<meta name="viewport" content="width=device-width, initial-scale=1"></head>'))
                    ]
                ),
                "good" =>  false,
                "hideassets" => true
            ];
        } else {
            $opp = [
                "title" =>  'Meta Viewport tag is configured properly.',
                "desc" =>  "A meta viewport tag will help a mobile-friendly site scale and display properly on small screen devices.",
                "examples" =>  array(),
                "experiments" =>  array(),
                "good" =>  true
            ];
        }
        AssessmentRegistry::getInstance()->register(AssessmentRegistry::Usable, $opp);
    }
})();
