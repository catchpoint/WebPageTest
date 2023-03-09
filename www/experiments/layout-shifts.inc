<?php

(function () {

    global $testStepResult;
    global $cls;

    $cls = $testStepResult->getMetric('chromeUserTiming.CumulativeLayoutShift');
    $imgsInViewport = $testStepResult->getMetric('imgs-in-viewport');
    $imgsNoAspect = array();
    if (isset($imgsInViewport)) {
        foreach ($imgsInViewport as $img) {
            if (!strpos($img['html'], 'height="') && !strpos($img['html'], 'width="')) {
                array_push($imgsNoAspect, $img);
            }
        }
    }

    if (isset($cls)) {
        // if cls is present, note whether images need width/height attrs
        if ($cls > 0) {
            $cls = round($cls, 3);

            if (count($imgsNoAspect) > 0) {

                function applyValueFormatting($n)
                {
                    return $n['src'] . "|w" . $n['naturalWidth'] . "|h" . $n['naturalHeight'];
                }

                function listSrcs($n)
                {
                    return $n['src'];
                }

                $imgSrcList = array_map('listSrcs', $imgsNoAspect);
                $numImages = count($imgSrcList);
                $expValue = array_map('applyValueFormatting', $imgsNoAspect);

                $opp = [
                    "title" =>  "Layout shifts exist and may be caused by images missing aspect ratio.",
                    "desc" =>  "The CLS score is $cls. " . $numImages . " layout-critical image" . ($numImages > 1 ? "s are" : "is") . " lacking an aspect ratio, meaning the browser has no way of knowing how tall or wide an image is until it loads. This can cause content to shift as the image loads.",
                    "examples" =>  $imgSrcList,
                    "experiments" =>  array(
                        (object) [
                            "id" => '012',
                            'title' => 'Add Aspect Ratio to Images',
                            "desc" => '<p>This experiment adds <code>width="..."</code> and <code>height="..."</code> attributes to specified images, matching their natural width and height, to provide an aspect ratio.</p>',
                            "expvar" => 'imageaspectratio',
                            "expval" => $expValue,
                            "explabel" => $imgSrcList
                        ]
                    ),
                    "good" =>  false
                ];
            } else {
                $opp = [
                    "title" =>  'Layout shifts are not caused by images lacking aspect ratio',
                    "desc" =>  "This is great. Images with width and height attributes allow the browser to better predict the space an image will occupy in a layout before it loads, reducing layout shifts and improving your CLS metric score.",
                    "examples" =>  array(),
                    "experiments" =>   array(),
                    "good" =>  true
                ];
            }
        } else {
            $opp = [
                "title" =>  'Zero major layout shifts detected.',
                "desc" =>  "This is great. Layout shifts hinder usability and reducing layout shifts will improve your CLS metric score.",
                "examples" =>  array(),
                "experiments" =>  array(),
                "good" => true
            ];
        }
        AssessmentRegistry::getInstance()->register(AssessmentRegistry::Usable, $opp);
    }
})();
