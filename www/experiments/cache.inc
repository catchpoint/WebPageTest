<?php

(function () {

    global $testStepResult;
    global $requests;

    $rawResults = $testStepResult->getRawResults();
    $needCache = array();
    if (isset($rawResults['score_cache'])) {
        foreach ($requests as $index => &$request) {
            if (isset($request['score_cache']) && $request['score_cache'] >= 0 && $request['score_cache'] < 100) {
                $key = $request['cache_time'] . ' ' . $request['host'] . ' ' . $index;

                if ($request['score_cache'] < 50) {
                    $value = 'FAILED ';
                } else {
                    $value = 'WARNING ';
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
                $value .= "($time): " . $proto . $request['host'] . $request['url'];
                $needCache[$key] = $value;
            }
        }
        $needCache = array_unique($needCache);
        ksort($needCache);
    }

    $cacheOppDesc = "Cache settings can instruct browsers and intermediaries to store recent versions of a site's static files  (JavaScript, CSS, Images, fonts...) for reuse, reducing page weight and latency.";
    if (count($needCache) > 0) {
        $opp = [
            "title" =>  count($needCache) . " static file" . (count($needCache) > 1 ? "s have" : " has") . " inadequate cache settings.",
            "desc" =>  $cacheOppDesc,
            "examples" =>  $needCache,
            "good" =>  false
        ];
    } else {
        $opp = [
            "title" =>  'This site\'s static files are configured for optimal caching.',
            "desc" =>  $cacheOppDesc,
            "examples" =>  array(),
            "good" =>  true
        ];
    }

    AssessmentRegistry::getInstance()->register(AssessmentRegistry::Quick, $opp);
})();
