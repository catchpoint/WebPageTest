<?php
// OPPORTUNITY: Slow TTFB
// if TTFB is extra slow (all runs had a ttfb greater than thresold below), then perhaps a site/cdn is purposefully slowing responsse times for bots.
// Show a message that offers an option to re-run the tests with a default UA
$slowttfbThreshold = 1000;
$firstByteTimes = $testResults->getMetricFromRuns("TTFB", false, false );
if ( count( $firstByteTimes ) > 0 && min( $firstByteTimes ) > $slowttfbThreshold ) { 
    
    echo observationHTML(
        'This test had an unusually-high first-byte time.',
        "First byte timing relates to server work. This may not be a problem with your site, but instead with how your site recognizes bots like WebPageTest. This is because some networks and sites intentionally slow performance for bots like the WebPageTest agent. If you suspect this is happening, you can try re-running your test with the browser's original User Agent string to see if it helps.",
        array(),
        array(
            (object) [
                'title' => ' Check for accuracy! Preserve original User Agent string in re-run',
                "desc" => 'This experiment will remove the WPT-modified User Agent string and use the default string that the browser would otherwise send.',
                "expvar" => array('keepua')
            ]//,
            
            # (object) [
            #         'title' => 'Use a CDN',
            #         "desc" => 'All WPT experiments run over a CDN, but we preserve your original TTFB by default to demonstrate non-CDN improvements. This experiment will override that and show how your TTFB will change when hosted on a worldwide CDN.',
            #         "expvar" => 'ShowCDNTiming'
            #         ]
        ),
        false
    );
}
else {
    echo observationHTML(
        'This test had a reasonably quick first-byte time.',
        "First byte timing importance notes here",
        array(),
        array(),
        true
    );
}
?>