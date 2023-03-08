<?php

// OPPORTUNITY: Generated content size and percent

(function () {

    global $testStepResult;
    global $initialHost;
    global $id;
    global $genContentSize;
    global $genContentPercent;

    $registry = AssessmentRegistry::getInstance();

    $genContentSize = $testStepResult->getMetric('generated-content-size');
    $genContentPercent = $testStepResult->getMetric('generated-content-percent');

    $requests = $testStepResult->getRequests();
    $jsRequests = array();
    $jsHosts = array();
    foreach ($requests as $request) {
        if ($request['contentType'] === "application/javascript" || $request['contentType'] === "text/javascript" || $request['contentType'] === "application/x-javascript") {
            array_push($jsRequests, documentRelativePath($request['url'], $requests[0]['url']));
            if ($request['host'] !== $initialHost) {
                array_push($jsHosts, $request['host']);
            }
        }
    }

    if (isset($genContentSize) && isset($genContentPercent)) {
        $genContentSize = floatval($genContentSize);
        $genContentPercent = floatval($genContentPercent);

        if ($genContentSize > .5 || $genContentPercent > 1) {
            $amtNote = "(" . $genContentSize . "kb larger, or " . $genContentPercent . "% of total HTML)";

            $registry->register(AssessmentRegistry::Quick, array(
                "title" =>  'Final HTML (DOM) size is significantly larger than initially delivered HTML ' . $amtNote . '.',
                "desc" =>  'Typically this is due to over-reliance on JavaScript for generating content, but increases can also happen as a result of browsers normalizing HTML structure as well. When critical HTML content is generated with JavaScript in the browser, several performance bottlenecks can arise:',
                "examples" =>  array(
                    "Before content can be generated client-side, the browser must first parse, evaluate, and sometimes also request JavaScript over the network. These steps occur after the HTML is initially delivered, and can incur long delays depending on the device.",
                    "If the generated HTML contains references to external assets (images for example), the browser will not be able to discover and request them as early as desired."
                ),
                "experiments" =>  array(
                    (object) [
                        "id" => '053',
                        'title' => 'Mimic Pre-rendered HTML',
                        "desc" => '<p>This experiment mimics server-generated HTML by swapping the initial HTML with the fully rendered HTML from this test run. <strong>Note:</strong> this will very likely break site behavior, but is potentially useful for comparing early metrics and assessing whether moving logic to the server is worth the effort.</p>',
                        "expvar" => 'prerender',
                        "expval" => array($id)
                    ]
                ),
                "good" =>  false,
                "hideassets" => true
            ));

            $registry->register(AssessmentRegistry::Usable, array(
                "title" =>  'Final HTML (DOM) size is significantly larger than initially delivered HTML ' . $amtNote . '.',
                "desc" =>  'Typically this is due to over-reliance on JavaScript for generating content, but increases can also happen as a result of browsers normalizing HTML structure as well. When critical HTML content is generated with JavaScript in the browser, it can increase the time it takes for content to be made accessible to assistive technology such as screen readers.',
                "examples" =>  array(),
                "experiments" =>  array(
                    (object) [
                        'title' => 'Look for ways to deliver more HTML content from the start',
                        "desc" => '<p>Many modern frameworks offer patterns for generating useful HTML on the server. </p>',
                    ]
                ),
                "good" =>  false,
                "hideassets" => true
            ));

            $registry->register(AssessmentRegistry::Resilient, array(
                "title" =>  'Final HTML (DOM) size is significantly larger than initially delivered HTML ' . $amtNote . '.',
                "desc" =>  'Typically this is due to over-reliance on JavaScript for generating content, but increases can also happen as a result of browsers normalizing HTML structure as well. Common issues such as JavaScript errors and third-party network delays and outages can present potential single points of failure.',
                "examples" =>  array(),
                "experiments" =>  array(
                    (object) [
                        "id" => '015',
                        'title' => 'Disable Scripts',
                        "desc" => '<p>This experiment makes all scripts (inline and external) unrecognizable as javascript by the browser in order to demonstrate whether the site will still be usable if JavaScript fails to properly run.</p>',
                        "expvar" => 'disablescripts',
                        "expval" => array(''),
                        "hideassets" => true
                    ],
                    (object) [
                        "id" => '016',
                        'title' => 'Make Scripts Timeout',
                        "desc" => '<p>This experiment directs specified requests to WebPageTest\'s blackhole server, which will hang indefinitely until timing out. Use this experiment to test your site\'s ability to serve content if these services hang.</p>',
                        "expvar" => 'experiment-spof',
                        "expval" => array_unique($jsHosts)
                    ],
                    (object) [
                        "id" => '017',
                        'title' => 'Block Script Requests',
                        "desc" => '<p>This experiment causes specified requests to fail immediately. Use this experiment to test your site\'s ability to serve content if these services are unavailable.</p>',
                        "expvar" => 'experiment-block',
                        "expval" => array_unique($jsRequests)
                    ]
                ),
                "good" =>  false,
                "hideassets" => false
            ));
        } else {
            $registry->register(AssessmentRegistry::Quick, array(
                "title" =>  'Final HTML (DOM) size is not significantly larger than the initial HTML.',
                "desc" =>  "When critical HTML content is generated with JavaScript in the browser, several performance bottlenecks can arise.",
                "examples" =>  array(),
                "experiments" =>  array(),
                "good" =>  true
            ));

            $registry->register(AssessmentRegistry::Usable, array(
                "title" =>  'Final HTML (DOM) size is not significantly larger than the initial HTML.',
                "desc" =>  "When critical HTML content is generated with JavaScript in the browser, it can increase the time it takes for content to be made accessible to assistive technology such as screen readers.",
                "examples" =>  array(),
                "experiments" =>  array(),
                "good" =>  true
            ));

            $registry->register(AssessmentRegistry::Resilient, array(
                "title" =>  'Final HTML (DOM) size is not significantly larger than the initial HTML.',
                "desc" =>  "When final HTML (DOM) size is significantly larger than initial HTML, it can reflect an over-reliance on JavaScript for generating content. Common issues such as JavaScript errors and third-party network delays and outages can present potential single points of failure.",
                "examples" =>  array(),
                "experiments" =>  array(),
                "good" =>  true
            ));
        }
    }
})();
