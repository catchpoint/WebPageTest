<?php
    // LCP info!
    $category = "Quick";
    $events = $testStepResult->getMetric('largestPaints');
    $lcp = null;
    if (isset($events) && is_array($events)) {
        // Find the actual LCP event
        foreach($events as $event) {
            if(isset($event['event']) && $event['event'] == 'LargestContentfulPaint' && isset($event['time']) && isset($event['size'])) {
                if(!isset($lcp) || $event['time'] > $lcp['time'] && $event['size'] > $lcp['size']) {
                    $lcp = $event;
                }
            }
        }
    }
    
    if (isset($lcp)) {

        if( $lcp['time'] > 2500 ){
        
            $isBG = false;
        
            if (isset($lcp['element']['tagName']) && $lcp['element']['tagName'] === "IMG") {

                if (isset($lcp['element']['src']) || isset($lcp['element']['currentSrc'])) {
                    $lcpSource = $lcp['element']['src'];
                }
                if (isset($lcp['element']['background-image'])) {
                    preg_match_all('/url\(([\s])?([\"|\'])?(.*?)([\"|\'])?([\s])?\)/i', $lcp['element']['background-image'], $matches, PREG_PATTERN_ORDER);
                    if ($matches) {
                        $lcpSource = $matches[3][0];
                        $isBG = true;
                    }
                }
                if (isset($lcp['element']['outerHTML'])) {
                    $lcpHTML = '<code class="language-html">' . htmlentities($lcp['element']['outerHTML']) . '</code>';
                }
            

                $assessment[$category]["opportunities"][] = array( 
                    "title" =>  "Largest Contentful Paint is high (over 2.5s).",
                    "desc" =>  "The element driving your LCP is a" . ($isBG ? " background" : "n")  . " image. Some optimizations can help that image fetch earlier.",
                    "examples" =>  array(
                        "<strong>LCP Image:</strong> <img src=\"" . $lcpSource . "\" alt=\"\">",
                        "<strong>LCP HTML:</strong>" . $lcpHTML
                    ),
                    "experiments" =>  array(
                        (object) [
                            'title' => 'Preload the LCP image.',
                            "desc" => '<p>This experiment will add a <code>&lt;link rel="preload" type="image" href="'. $lcpSource .'"&gt;</code> to the <code>head</code> of your HTML document, causing browsers to request the image earlier and at a higher priority than it otherwise might.</p>',
                            "expvar" => 'preload',
                            "expval" => array($lcpSource . "|as_image")
                        ],
                        (object) [
                            'title' => 'Add a priority hint <em>(Chrome-only)</em>',
                            "desc" => '<p>This experiment will add an <code>importance="high"</code> attribute to your LCP image, causing it to request earlier at a higher priority.</p>',
                            "expvar" => 'addimportance',
                            "expval" => array($lcpSource . "|i_high")
                        ]
                    ),
                    "good" =>  false
                );
            } // LCP was high but wasn't due to an Image. TBD!
             else {
                $assessment[$category]["opportunities"][] = array(
                    "title" =>  'Largest Contentful Paint is high (over 2.5s).',
                    "desc" =>  "The HTML driving your LCP is $lcpHTML ",
                    "examples" =>  array(),
                    "experiments" =>  array(
                        (object)[
                            'title' => 'Look for bottlenecks that are delaying text rendering',
                            "desc" => '<p>When LCP is not image-based, that often means something is preventing text from appearing sooner. Text visibility may be delayed by blocking scripts or stylsheets, JavaScript-generated content, non-progressive custom font loading, and CSS or JavaScript animations.</p>'
                        ]
                    ),
                    "good" =>  false
                );
            }
        } else {
            $assessment[$category]["opportunities"][] = array(
                "title" =>  'Largest Contentful Paint time was under 2.5 seconds',
                "desc" =>  "If it was higher, WebPageTest would look for ways to speed it up.",
                "examples" =>  array(),
                "experiments" =>  array(),
                "good" =>  true
            );
        }

    }
    
?>