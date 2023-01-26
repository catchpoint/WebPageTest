<?php

// LCP info!
(function () {

    global $testStepResult;

    $events = $testStepResult->getMetric('largestPaints');
    $lcpType = $testStepResult->getMetric('LargestContentfulPaintType');
    $lcpNodeType = $testStepResult->getMetric('LargestContentfulPaintNodeType');
    $lcpImageURL = $testStepResult->getMetric('LargestContentfulPaintImageURL');

    $lcp = null;
    if (isset($events) && is_array($events)) {
        // Find the actual LCP event
        foreach ($events as $event) {
            if (isset($event['event']) && $event['event'] == 'LargestContentfulPaint' && isset($event['time']) && isset($event['size'])) {
                if (!isset($lcp) || $event['time'] > $lcp['time'] && $event['size'] > $lcp['size']) {
                    $lcp = $event;
                }
            }
        }
    }

    if (isset($lcp)) {
        if ($lcp['time'] > 2500) {
            $isBG = false;
            $isVideo = false;
            $hasHighFetchPriority = false;
            if (isset($lcp['element']['outerHTML'])) {
                $lcpHTML = '<code class="language-html">' . htmlentities($lcp['element']['outerHTML']) . '</code>';
                $hasHighFetchPriority = preg_match('/fetchpriority\="?high"?/i', $lcp['element']['outerHTML']) === 1;
            }

            if (isset($lcp['type']) && $lcp['type'] === "image") {
                if (isset($lcp['element']['nodeName']) && $lcp['element']['nodeName'] == 'VIDEO') {
                    $isVideo = true;
                    $lcpSource = isset($lcp['element']['poster']) ? $lcp['element']['poster'] : $lcp['element']['src'];
                    $lcpFullSource = $lcpSource;
                    // get actual source attribute if we can.
                    preg_match_all('/poster\=\"([^"]+)/i', $lcp['element']['outerHTML'], $srcmatches);
                    if ($srcmatches && $srcmatches[1][0] != '') {
                        $lcpSource = $srcmatches[1][0];
                    }
                } elseif (isset($lcp['element']['src']) || isset($lcp['element']['currentSrc'])) {
                    $lcpSource = isset($lcp['element']['src']) ? $lcp['element']['src'] : $lcp['element']['currentSrc'];
                    $lcpFullSource = isset($lcp['element']['currentSrc']) ? $lcp['element']['currentSrc'] : $lcp['element']['src'];
                    // get actual source attribute if we can.
                    preg_match_all('/src\=\"([^"]+)/i', $lcp['element']['outerHTML'], $srcmatches);
                    if ($srcmatches && $srcmatches[1][0] != '') {
                        $lcpSource = $srcmatches[1][0];
                    }
                }

                // old bg check, which may still capture bg images from old test data
                if (isset($lcp['element']['background-image'])) {
                    preg_match_all('/url\(([\s])?([\"|\'])?(.*?)([\"|\'])?([\s])?\)/i', $lcp['element']['background-image'], $matches, PREG_PATTERN_ORDER);
                    if ($matches) {
                        $lcpSource = $matches[3][0];
                        $lcpFullSource = $matches[3][0];
                        $isBG = true;
                    }
                }

                // new bg check - still doesn't find bg images set via inline style
                if (isset($lcpType) && $lcpType === "background-image" && isset($lcpImageURL)) {
                    $lcpSource = $lcpImageURL;
                    $lcpFullSource = $lcpImageURL;
                    $isBG = true;
                }

                $expsToAdd = array();
                $expsToAdd[] = (object) [
                    "id" => '010',
                    'title' => 'Preload LCP Image',
                    "desc" => '<p>This experiment adds a <code>&lt;link rel="preload" as="image" href="' . $lcpSource . '"&gt;</code> to the <code>head</code> of your HTML document, causing browsers to request the image earlier and at a higher priority than it otherwise might.</p>',
                    "expvar" => 'addpreload',
                    "expval" => array($lcpSource . "|as_image"),
                    "explabel" => array($lcpSource)
                ];

                // priority Hints only help for foreground images
                $suggest_priority_hints = !$isBG && !$isVideo && !$hasHighFetchPriority;
                if ($suggest_priority_hints) {
                    $expsToAdd[] = (object) [
                        "id" => '011',
                        'title' => 'Add Priority Hint',
                        "desc" => '<p><em>(Chromium-only)</em> This experiment adds an <code>fetchpriority="high"</code> attribute to your LCP image, causing it to request earlier at a higher priority.</p>',
                        "expvar" => 'addpriorityhint',
                        "expval" => array($lcpSource . "|i_high"),
                        "explabel" => array($lcpSource)
                    ];
                }


                AssessmentRegistry::getInstance()->register(AssessmentRegistry::Quick, [
                    "title" =>  "Largest Contentful Paint is high (over 2.5s).",
                    "desc" =>  "The element driving your LCP is a" . ($isBG ? " background" : "n")  . " image. Some optimizations can help that image fetch earlier.",
                    "examples" =>  array(
                        "LCP Image: $lcpFullSource"
                    ),
                    "experiments" => $expsToAdd,
                    "good" =>  false
                ]);
            } // LCP was high but wasn't due to an Image. TBD!
            else {
                AssessmentRegistry::getInstance()->register(AssessmentRegistry::Quick, [
                    "title" =>  'Largest Contentful Paint is high (over 2.5s).',
                    "desc" =>  "The HTML driving your LCP is " . ($lcpHTML ? $lcpHTML : "text-related."),
                    "examples" =>  array(),
                    "experiments" =>  array(
                        (object)[
                            'title' => 'Look for bottlenecks that are delaying text rendering',
                            "desc" => '<p>When LCP is not image-based, that often means something is preventing text from appearing sooner. Text visibility may be delayed by blocking scripts or stylesheets, JavaScript-generated content, non-progressive custom font loading, and CSS or JavaScript animations.</p>'
                        ]
                    ),
                    "good" =>  false
                ]);
            }
        } else {
            AssessmentRegistry::getInstance()->register(AssessmentRegistry::Quick, [
                "title" =>  'Largest Contentful Paint time was under 2.5 seconds',
                "desc" =>  "Great job. If LCP was higher, WebPageTest would look for ways to speed it up.",
                "examples" =>  array(),
                "experiments" =>  array(),
                "good" =>  true
            ]);
        }
    }
})();
