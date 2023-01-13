<?php

// OPPORTUNITY: Slow TTFB
// if TTFB is extra slow (all runs had a ttfb greater than thresold below), then perhaps a site/cdn is purposefully slowing responsse times for bots.
// Show a message that offers an option to re-run the tests with a default UA
(function () {

    global $testResults;

    $slowttfbThreshold = 1000;
    $firstByteTimes = $testResults->getMetricFromRuns("TTFB", false, false);

    if (count($firstByteTimes) > 0 && min($firstByteTimes) > $slowttfbThreshold) {
        $opp = [
            "title" =>  'This test had a slow first-byte time.',
            "desc" =>  "First byte timing relates to DNS, network latency, and the time it takes a server to connect and return a response.",
            "examples" =>  array(),
            "experiments" =>  array(
                (object) [
                    'title' => 'Check for accuracy! Preserve original User Agent string in re-run',
                    "desc" => '<p>Some networks and sites intentionally slow performance for bots like the WebPageTest agent. If you suspect this is happening, look for the the rerun test menu at the top of the page and try re-running this test with its UA preserved before running experiments.</p>'
                ],
                (object) [
                    'title' => 'Use server timing headers to identify slow server tasks',
                    "desc" => '<p>Server timing headers are designed to pass custom logging information to the client. <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing">More info on MDN</a></p>'
                ]
            ),
            "good" =>  false
        ];
    } else {
        $opp = [
            "title" =>  'This test had a reasonably quick first-byte time.',
            "desc" =>  "A fast time to first byte is essential for delivering assets quickly. ",
            "examples" =>  array(),
            "experiments" =>  array(),
            "good" =>  true
        ];
    }

    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Quick, $opp);
})();
