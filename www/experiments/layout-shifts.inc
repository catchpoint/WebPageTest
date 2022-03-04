<?php
    $category = "Usable";
    $cls = $testStepResult->getMetric('chromeUserTiming.CumulativeLayoutShift');


    
    if (isset($lcp) && isset($cls) && $cls > 0 ) {

        $cls = round($cls, 3);
        
        $isBG = false;
       
        if (isset($lcp['element']['tagName']) && $lcp['element']['tagName'] === "IMG" && !isset($lcp['element']['background-image']) ) {
            if (isset($lcp['element']['src']) ) {
                $lcpSource = isset($lcp['element']['currentSrc']) ? $lcp['element']['currentSrc'] : $lcp['element']['src'];
            }

            if (isset($lcp['element']['outerHTML'])) {
                $lcpHTML = '<code class="language-html">' . htmlentities($lcp['element']['outerHTML']) . '</code>';
            }

            $hasHeightAttr = strpos($lcp['element']['outerHTML'], 'height="');

           if( !$hasHeightAttr ){

                $assessment[$category]["opportunities"][] = array( 
                    "title" =>  "Layout shifts occur due to images missing aspect ratio.",
                    "desc" =>  "Your CLS score is $cls, and your LCP image has no aspect ratio specified, meaning the browser has no way of knowing how tall it is until it loads. This can cause the image to shift content down as it loads.",
                    "examples" =>  array(
                        "$lcpHTML <img src= \"" . $lcp['element']['src'] . "\">"
                    ),
                    "experiments" =>  array(
                        (object) [
                            'title' => 'Give the image an aspect ratio with width and height attributes',
                            "desc" => '<p>This experiment will add <code>width="'. $lcp['element']['width'] .'" height="'. $lcp['element']['width'] .'"</code> attributes to the LCP image</p>',
                            "expvar" => 'imageaspectratio',
                            "expval" => array($lcpSource . "|w". $lcp['element']['width'] ."|h" . $lcp['element']['height'])
                        ]
                    ),
                    "good" =>  false
                );
            }
        }
        else {
            $assessment[$category]["opportunities"][] = array(
                "title" =>  'Layout shifts are not caused by images lacking aspect ratio',
                "desc" =>  "TBD importance notes here",
                "examples" =>  array(),
                "experiments" =>   array(),
                "good" =>  true
            );
        }
    }
    else {
            $assessment[$category]["opportunities"][] = array( 
                "title" =>  'Zero major layout shifts detected.',
                "desc" =>  "TBD importance notes here",
                "examples" =>  array(),
                "experiments" =>  array(),
                "good" =>   true
            );
        }
?>