<?php

$category = "Quick";
$rawResults = $testStepResult->getRawResults();
$needCDN = array();
if (isset($rawResults['score_cdn']) ) {
    foreach ($requests as $index => &$request) {
        if (isset($request['score_cdn']) && $request['score_cdn'] >= 0 && $request['score_cdn'] < 100) {
            $key = $request['host'] . ' ' . $index;
            $proto = 'http://';
            if ($request['is_secure']) {
                $proto = 'https://';
            }
            $value = $proto . $request['host'] . $request['url'];
            $needCDN[$key] = $value;
        }
    }
    ksort($needCDN);
}


if (count($needCDN) > 0) {
    $assessment[$category]["opportunities"][] = array(
        "title" =>  count($needCDN) . " file" . (count($needCDN) > 1 ? "s were" : " is") . " hosted without using a CDN.",
        "desc" =>  "A Content Delivery Network (CDN) distributes a website's files throughout the world, reducing request latency. These files do not use a CDN:",
        "examples" =>  $needCDN,
        "good" =>  false
    );
} else {
    $assessment[$category]["opportunities"][] = array(
        "title" =>  'This site uses a CDN for delivering its files.',
        "desc" =>  "A Content Delivery Network (CDN) distributes a website's files throughout the world, reducing request latency.",
        "examples" =>  array(),
        "good" =>  true
    );
}
