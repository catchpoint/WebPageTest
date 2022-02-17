<?php
    // LCP info!
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
            
           if( $lcp['time'] > 2500 ){

                echo observationHTML(
                    "Largest Contentful Paint is high (over 2500ms).",
                    "The element driving your LCP is a" . ($isBG ? " background" : "n")  . " image. Some optimizations can help that image fetch earlier.",
                    array(
                        "<strong>LCP Image:</strong> <img src=\"" . $lcpSource . "\" alt=\"\">",
                        "<strong>LCP HTML:</strong>" . $lcpHTML
                    ),
                    array(
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
                    false
                );
            }
        }
         else {
            echo observationHTML(
                'Largest Contentful Paint time was reasonably quick',
                "TBD importance notes here",
                array(),
                array(),
                true
            );
        }

    }
?>