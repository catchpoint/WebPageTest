<?php
// OPPORTUNITY: Slow TTFB
// if TTFB is extra slow (all runs had a ttfb greater than thresold below), then perhaps a site/cdn is purposefully slowing responsse times for bots.
// Show a message that offers an option to re-run the tests with a default UA
$category = "Quick";
$slowttfbThreshold = 1000;
$firstByteTimes = $testResults->getMetricFromRuns("TTFB", false, false );
if ( count( $firstByteTimes ) > 0 && min( $firstByteTimes ) > $slowttfbThreshold ) { 
    
    $assessment[$category]["opportunities"][] = array(
        "title" =>  'This test had an unusually-high first-byte time.',
        "desc" =>  "First byte timing relates to server work. This may not be a problem with your site, but instead with how your site recognizes bots like WebPageTest. This is because some networks and sites intentionally slow performance for bots like the WebPageTest agent. If you suspect this is happening, you can try re-running your test with the browser's original User Agent string to see if it helps.",
        "examples" =>  array(),
        "experiments" =>  array(
            (object) [
                'title' => ' Check for accuracy! Preserve original User Agent string in re-run',
                "desc" => '<p>This experiment will remove the WPT-modified User Agent string and use the default string that the browser would otherwise send.</p>',
                "expvar" => array('keepua')
            ]
        ),
        "good" =>  false
    );
}
else {
    $assessment[$category]["opportunities"][] = array( 
        "title" =>  'This test had a reasonably quick first-byte time.',
        "desc" =>  "First byte timing importance notes here",
        "examples" =>  array(),
        "experiments" =>  array(),
        "good" =>  true
    );
}
?>