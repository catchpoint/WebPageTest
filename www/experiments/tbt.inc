<?php

(function () {

    global $testStepResult;

    if ($testStepResult) {
        $tbtMetric = $testStepResult->getMetric('TotalBlockingTime');
    }

    if (isset($tbtMetric)) {
        if ($tbtMetric > 200) {
            // Load and filter the JS executions to only the blocking time blocks
            $task_times = null;
            $timingsFile = $testStepResult->createTestPaths()->devtoolsScriptTimingFile();
            if (isset($timingsFile) && strlen($timingsFile) && gz_is_file($timingsFile)) {
                $timings = json_decode(gz_file_get_contents($timingsFile), true);
                $task_times = array();
                if (
                    isset($timings) &&
                    is_array($timings) &&
                    isset($timings['main_thread']) &&
                    isset($timings[$timings['main_thread']]) &&
                    is_array($timings[$timings['main_thread']])
                ) {
                    foreach ($timings[$timings['main_thread']] as $url => $events) {
                        foreach ($events as $timings) {
                            foreach ($timings as $task) {
                                if (isset($task) && is_array($task) && count($task) >= 2) {
                                    $start = $task[0];
                                    $end = $task[1];

                                    if (!isset($task_times[$url])) {
                                        $task_times[$url] = 0;
                                    }
                                    $task_times[$url] = round($task_times[$url] + $end - $start);
                                }
                            }
                        }
                    }
                }
            }

            function joinTimeUrlValues($arr)
            {
                $oneLevel = array();
                foreach ($arr as $url => $time) {
                    array_push($oneLevel, "$time ms: $url");
                }
                return $oneLevel;
            }

            $highBlockingTimeUrls = array();
            foreach ($task_times as $url => $time) {
                if ($time > 50) {
                    $highBlockingTimeUrls[$url] = $time;
                }
            }

            $opp = [
                "title" =>  "The main thread was blocked for $tbtMetric ms",
                "desc" =>  "When files block the main thread, users are unable to interact with the page content. Typically, parsing and executing large JavaScript files, as well as running long JavaScript tasks can block the main thread and should be avoided. These files had high thread blocking times:",
                "examples" =>  joinTimeUrlValues($highBlockingTimeUrls),
                "experiments" =>  array(
                    (object) [
                        'id' => '052',
                        'title' => 'Block Specific Requests',
                        "desc" => '<p>This experiment causes specified requests to fail immediately, allowing you to test the usability impact of particular problematic scripts.</p>',
                        "expvar" => 'experiment-block',
                        "expval" => array_keys($highBlockingTimeUrls)
                    ]
                ),
                "good" =>  false
            ];
        } else {
            $opp = [
                "title" =>  'The main thread was not blocked for any significant time.',
                "desc" =>  "When files block the main thread, users are unable to interact with the page content. Typically, parsing and executing large JavaScript files, as well as running long JavaScript tasks can block the main thread and should be avoided. ",
                "examples" =>  array(),
                "experiments" =>   array(),
                "good" =>  true
            ];
        }
        AssessmentRegistry::getInstance()->register(AssessmentRegistry::Usable, $opp);
    }
})();
