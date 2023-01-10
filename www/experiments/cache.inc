<?php

$category = "Quick";
$pageData = $testStepResult->getRawResults();
$needCache = array();
if (isset($pageData['score_cache'])) {
    foreach ($requests as $index => &$request) {
        if (isset($request['score_cache']) && $request['score_cache'] >= 0 && $request['score_cache'] < 100) {
            $key = $request['cache_time'] . ' ' . $request['host'] . ' ' . $index;

            if ($request['score_cache'] < 50) {
                $value = 'FAILED - ';
            } else {
                $value = 'WARNING - ';
            }

            $time = 'No max-age or expires';
            if ($request['cache_time'] > 0) {
                if ($request['cache_time'] > 86400) {
                    $time = number_format($request['cache_time'] / 86400.0, 1) . ' days';
                } elseif ($request['cache_time'] > 3600) {
                    $time = number_format($request['cache_time'] / 3600.0, 1) . ' hours';
                } elseif ($request['cache_time'] > 60) {
                    $time = number_format($request['cache_time'] / 60.0, 1) . ' minutes';
                } else {
                    $time = $request['cache_time'] . ' seconds';
                }
            }

            $proto = 'http://';
            if ($request['is_secure']) {
                $proto = 'https://';
            }
            $value = "$time: " . $proto . $request['host'] . $request['url'];
            $needCache[$key] = $value;
        }
    }
    $needCache = array_unique($needCache);
    ksort($needCache);
}


if (count($needCache) > 0) {
    $assessment[$category]["opportunities"][] = array(
        "title" =>  count($needCache) . " file" . (count($needCache) > 1 ? "s have" : " has") . " inadequate cache settings.",
        "desc" =>  "Cache settings can instruct browsers and intermediaries to store recent versions of a site's files for reuse, reducing page weight and latency.",
        "examples" =>  $needCache,
        "good" =>  false
    );
} else {
    $assessment[$category]["opportunities"][] = array(
        "title" =>  'This site\'s files are configured for optimal caching.',
        "desc" =>  "Cache settings can instruct browsers and intermediaries to store recent versions of a site's files for reuse, reducing page weight and latency.",
        "examples" =>  array(),
        "good" =>  true
    );
}
