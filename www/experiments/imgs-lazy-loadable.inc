<?php

(function () {

    global $testStepResult;

    $imgsOutViewport = $testStepResult->getMetric('imgs-out-viewport');
    $imgsInViewport = $testStepResult->getMetric('imgs-in-viewport');
    $imgsInViewportSrcs = array();
    foreach ($imgsInViewport as $img) {
        array_push($imgsInViewportSrcs, $img["src"]);
    }

    $imgsThatShouldBeLazy = array();
    if (isset($imgsOutViewport)) {
        foreach ($imgsOutViewport as $img) {
            if ($img["loading"] !== "lazy" && !in_array($img["src"], $imgsInViewportSrcs) && strpos($img["src"], 'data:') !== 0) {
                array_push($imgsThatShouldBeLazy, $img);
            }
        }
    }

    if (count($imgsThatShouldBeLazy)) {
        $shouldBeLazySrcs = array();
        foreach ($imgsThatShouldBeLazy as $img) {
            array_push($shouldBeLazySrcs, $img["src"]);
        }

        $opp = [
            "title" => "Images outside the critical viewport can be lazy-loaded.",
            "desc" => "When images are lazy-loaded using loading=\"lazy\", when they scroll into the viewport, freeing up early load for other tasks.",
            "examples" => array_unique($shouldBeLazySrcs),
            "experiments" => array(
                (object) [
                    "id" => '014',
                    'title' => 'Add loading="lazy" to images',
                    "desc" => '<p>This experiment adds <code>loading="lazy"</code> attributes to images that are outside the viewport at load.</p>',
                    "expvar" => 'addloadinglazy',
                    "expval" => array_unique($shouldBeLazySrcs)
                ]
            ),
            "good" => false
        ];
    } else {
        $opp = [
            "title" => "Zero images outside the critical viewport need to be lazy-loaded.",
            "desc" => "When images are lazy-loaded using loading=\"lazy\", they will be requested after the layout is established, which is too late for images in the critical window.",
            "examples" => array(),
            "experiments" => array(),
            "good" => true
        ];
    }

    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Quick, $opp);
})();
