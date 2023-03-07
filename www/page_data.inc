<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once(INCLUDES_PATH . '/devtools.inc.php');
require_once(INCLUDES_PATH . '/include/TestPaths.php');
require_once(INCLUDES_PATH . '/video/visualProgress.inc.php');
require_once(INCLUDES_PATH . '/draw.inc');

/**
* Load the page results directly from the results files
*
* @param mixed $id
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function loadAllPageData($testPath)
{
    $ret = array();

  // go in order for the number of runs there are supposed to be
    if (is_file("$testPath/testinfo.ini")) {
        $ini = parse_ini_file("$testPath/testinfo.ini", true);
        $runs = $ini['test']['runs'];
        $fvonly = $ini['test']['fvonly'];
        $testInfo = GetTestInfo($testPath);
        $completed = true;
        if ($testInfo && (!array_key_exists('completed', $testInfo) || !$testInfo['completed'])) {
            $completed = false;
        }
        if (file_exists("$testPath/test.complete")) {
            $completed = true;
        }

        if ($completed) {
            for ($run = 1; $run <= $runs; $run++) {
                $data = loadPageRunData($testPath, $run, 0, $testInfo);
                if (isset($data)) {
                    $ret[$run][0] = $data;
                }

                if (!$fvonly) {
                    unset($data);
                    $data = loadPageRunData($testPath, $run, 1, $testInfo);
                    if (isset($data)) {
                        $ret[$run][1] = $data;
                    }
                }
            }
        }
    }

    return $ret;
}

/**
 * Load the page data for the given run
 *
 * @param string $testPath Path to test results
 * @param int $run Run number to get the results for
 * @param int $cached 0 for first view, 1 for repeated view
 * @param array|null $testInfo Optional testInfo to expose a test-level error
 * @return array|null Associative array with data for the given run or null on failure
 */
function loadPageRunData($testPath, $run, $cached, $testInfo = null)
{
    $localPaths = new TestPaths($testPath, $run, $cached);
    return loadPageStepData($localPaths, $testInfo);
}

/**
 * @param TestPaths $localPaths Paths for the step or run to load the page data for
 * @param array|null $testInfo Optional testInfo to expose a test-level error
 * @return array|null Associative array with data for the given run or null on failure
 */
function loadPageStepData($localPaths, $testInfo = null)
{
    $cacheVer = 10;
    $cacheFile = $localPaths->pageDataCacheFile($cacheVer);
    $ret = null;
    if (!isset($_REQUEST['recalculate']) && gz_is_file($cacheFile)) {
        $ret = json_decode(gz_file_get_contents($cacheFile), true);
        if (!isset($ret['result'])) {
            $ret = null;
        }
    }

    if (isset($ret) && is_array($ret) && isset($ret['edge-processed']) && $ret['edge-processed']) {
      // Add the CrUX data which is collected only on the first Run
        $crux_file = $localPaths->cruxJsonFile();
        if (gz_is_file($crux_file)) {
            $crux_data = json_decode(gz_file_get_contents($crux_file), true);
            if (isset($crux_data) && is_array($crux_data)) {
                if (isset($crux_data['record'])) {
                    $ret['CrUX'] = $crux_data['record'];
                } else {
                    $ret['CrUX'] = $crux_data;
                }
            }
        }
      // Add the Lighthouse data which is collected only on the first Run
        $lighthouse_audits_file = $localPaths->lighthouseAuditsFile();
        if (gz_is_file($lighthouse_audits_file)) {
            $audits = json_decode(gz_file_get_contents($lighthouse_audits_file), true);
            foreach ($audits as $name => $value) {
                $ret["lighthouse.$name"] = $value;
            }
        }
        return $ret;
    }

    if (!isset($ret) || !is_array($ret)) {
        $ret = loadPageData($localPaths->pageDataFile());
        if (!isset($ret) || !is_array($ret) || !count($ret)) {
            GetDevToolsRequestsForStep($localPaths, $requests, $ret);
        }
        if (!isset($ret) || !is_array($ret)) {
            $ret = array();
        }

        $basic_results = false;
        if (array_key_exists('basic', $_REQUEST) && $_REQUEST['basic']) {
            $basic_results = true;
        }

      // Load any raw result data from the test
        if (gz_is_file($localPaths->pageDataJsonFile())) {
            $pd = json_decode(gz_file_get_contents($localPaths->pageDataJsonFile()), true);
            if ($pd && is_array($pd) && count($pd)) {
                foreach ($pd as $key => $value) {
                    $ret[$key] = $value;
                }
            }
        }
      //set top level FCP
        TopLevelFCP($ret);
        if (!empty($ret) && !$basic_results) {
            $startOffset = array_key_exists('testStartOffset', $ret) ? intval(round($ret['testStartOffset'])) : 0;
            loadUserTimingData($ret, $localPaths->userTimedEventsFile());

          // see if we have custom metrics to load
            if (gz_is_file($localPaths->customMetricsFile())) {
                $custom_metrics = json_decode(gz_file_get_contents($localPaths->customMetricsFile()), true);
                if ($custom_metrics && is_array($custom_metrics) && count($custom_metrics)) {
                    $ret["custom"] = array();
                    foreach ($custom_metrics as $metric => $value) {
                        if (!is_array($value) && preg_match('/^[0-9]+$/', $value)) {
                            $ret[$metric] = intval($value);
                        } elseif (!is_array($value) && preg_match('/^[0-9]*\.[0-9]+$/', $value)) {
                            $ret[$metric] = floatval($value);
                        } else {
                            $ret[$metric] = $value;
                        }
                        $ret["custom"][] = $metric;
                    }
                }
            }

          // Load main-thread interactive windows if available
            if (gz_is_file($localPaths->interactiveFile())) {
                $interactive = json_decode(gz_file_get_contents($localPaths->interactiveFile()), true);
                if (isset($interactive) && is_array($interactive)) {
                    $ret['interactivePeriods'] = $interactive;
                }
            }

          // Load the long tasks list
            if (gz_is_file($localPaths->longTasksFile())) {
                $long_tasks = json_decode(gz_file_get_contents($localPaths->longTasksFile()), true);
                if (isset($long_tasks) && is_array($long_tasks)) {
                    $ret['longTasks'] = $long_tasks;
                }
            }

          // Load CPU and BW
            $perfs = LoadPerfData($localPaths->utilizationFile(), true, true);
            if ($perfs) {
                $ret['utilization'] = $perfs;
            }

          // Load the diagnostic test timing information if available
            if (gz_is_file($localPaths->testTimingFile())) {
                $entries = array();
                $lines = gz_file($localPaths->testTimingFile());
                if (isset($lines) && is_array($lines) && count($lines)) {
                    foreach ($lines as $line) {
                        $parts = explode('=', trim($line));
                        if (count($parts) >= 2 && strlen($parts[0])) {
                            $entries[str_replace(' ', '', $parts[0])] = intval($parts[1]);
                        }
                    }
                }
                if (count($entries)) {
                    $ret['testTiming'] = $entries;
                }
            }

            if (
                array_key_exists('loadTime', $ret) &&
                !$ret['loadTime'] &&
                array_key_exists('fullyLoaded', $ret) &&
                $ret['fullyLoaded'] > 0
            ) {
                $ret['loadTime'] = $ret['fullyLoaded'];
            }
            if (is_dir($localPaths->videoDir())) {
                $frames = null;
                loadVideo($localPaths->videoDir(), $frames);
                if (isset($frames) && is_array($frames) && count($frames)) {
                    if (!array_key_exists('lastVisualChange', $ret) || !$ret['lastVisualChange']) {
                        end($frames);
                        $last = max(key($frames) - $startOffset, 0);
                        reset($frames);
                        if ($last) {
                            $ret['lastVisualChange'] = $last;
                            if (!array_key_exists('visualComplete', $ret)) {
                                  $ret['visualComplete'] = $ret['lastVisualChange'];
                            }
                        }
                    }
                    if ((!array_key_exists('render', $ret) || !$ret['render']) && count($frames) > 1) {
                        next($frames);
                        $first = max(key($frames) - $startOffset, 0);
                        reset($frames);
                        if ($first) {
                            $ret['render'] = $first;
                        }
                    }
                }
            }
            if (
                !isset($ret['SpeedIndex']) ||
                !array_key_exists('render', $ret) || !$ret['render'] ||
                !array_key_exists('lastVisualChange', $ret) || !$ret['lastVisualChange'] ||
                !array_key_exists('visualComplete85', $ret) || !$ret['visualComplete85'] ||
                !array_key_exists('visualComplete', $ret) || !$ret['visualComplete']
            ) {
                $progress = GetVisualProgressForStep($localPaths, $startOffset);
                if (isset($progress) && is_array($progress)) {
                    if (array_key_exists('SpeedIndex', $progress)) {
                        $ret['SpeedIndex'] = $progress['SpeedIndex'];
                    }
                    if (array_key_exists('visualComplete85', $progress)) {
                        $ret['visualComplete85'] = $progress['visualComplete85'];
                    }
                    if (isset($progress['visualComplete90'])) {
                        $ret['visualComplete90'] = $progress['visualComplete90'];
                    }
                    if (isset($progress['visualComplete95'])) {
                        $ret['visualComplete95'] = $progress['visualComplete95'];
                    }
                    if (isset($progress['visualComplete99'])) {
                        $ret['visualComplete99'] = $progress['visualComplete99'];
                    }
                    if (array_key_exists('visualComplete', $progress)) {
                        $ret['visualComplete'] = $progress['visualComplete'];
                    }
                    if (array_key_exists('startRender', $progress) && (!array_key_exists('render', $ret) || !$ret['render'])) {
                        $ret['render'] = $progress['startRender'];
                    }
                    if (
                        (!array_key_exists('lastVisualChange', $ret) ||
                        !$ret['lastVisualChange']) &&
                        array_key_exists('visualComplete', $ret)
                    ) {
                        $ret['lastVisualChange'] = $ret['visualComplete'];
                    }
                }
            }
        // Calculate the timeline-based CPU times
            if (
                isset($ret) && is_array($ret) &&
                !isset($ret['cpuTimes']) &&
                isset($ret['fullyLoaded']) && $ret['fullyLoaded']
            ) {
                $processing = GetDevToolsCPUTimeForStep($localPaths, $ret['fullyLoaded']);
                if (isset($processing) && is_array($processing) && count($processing)) {
                    $ret['cpuTimes'] = $processing;
                // Create top-level metrics for each as well
                    foreach ($processing as $key => $value) {
                        $ret["cpu.$key"] = $value;
                    }
                    if (isset($ret['docTime']) && $ret['docTime']) {
                          $processing = GetDevToolsCPUTimeForStep($localPaths, $ret['docTime']);
                        if (isset($processing) && is_array($processing) && count($processing)) {
                            $ret['cpuTimesDoc'] = $processing;
                        }
                    }
                }
            }

        // See if there is Chrome trace user timing data to load.
        // Do this after the CPU slice calculations so the trace processing has already run.
            if (gz_is_file($localPaths->chromeUserTimingFile())) {
                $browser_version = null;
                if (isset($ret['browser_version']) && strlen($ret['browser_version'])) {
                    $browser_version = floatval($ret['browser_version']);
                }
                $layout_shifts = array();
                $user_timing = ParseUserTiming($localPaths->chromeUserTimingFile(), $browser_version, $layout_shifts, $ret);
                if (isset($user_timing) && is_array($user_timing)) {
                    $ret["chromeUserTiming"] = $user_timing;
                    foreach ($user_timing as $value) {
                        $key = "chromeUserTiming.{$value['name']}";
                        if (isset($value['time'])) {
                            // Prefer the earliest for "first" events and the latest for others
                            if (stripos($value['name'], 'first') === 0) {
                                if (!isset($ret[$key]) || $value['time'] < $ret[$key]) {
                                    $ret[$key] = $value['time'];
                                }
                            } else {
                                if (!isset($ret[$key]) || $value['time'] > $ret[$key]) {
                                    $ret[$key] = $value['time'];
                                }
                            }
                        } elseif (isset($value['value'])) {
                            $ret[$key] = $value['value'];
                        }
                    }
                }
                if (count($layout_shifts)) {
                    $ret['LayoutShifts'] = $layout_shifts;
                    $count = 0;
                    $cls = 0;
                    $fraction = 0;

                    // Count the number of LayoutShifts before first paint
                    if (isset($ret['chromeUserTiming.TotalLayoutShift']) && isset($ret['chromeUserTiming.firstPaint'])) {
                        foreach ($ret['LayoutShifts'] as $shift) {
                            if (isset($shift['time']) && $shift['time'] <= $ret['chromeUserTiming.firstPaint']) {
                                $count++;
                                $cls = $shift['cumulative_score'];
                            }
                        }
                        if ($ret['chromeUserTiming.TotalLayoutShift'] > 0) {
                            $fraction = (float)$cls / (float)$ret['chromeUserTiming.TotalLayoutShift'];
                        }
                    }

                    $ret['LayoutShiftsBeforePaint'] = array('count' => $count, 'cumulative_score' => $cls, 'fraction_of_total' => $fraction);
                }
            }

        // See if there is Blink feature usage data
            if (gz_is_file($localPaths->featureUsageFile())) {
                $feature_usage = json_decode(gz_file_get_contents($localPaths->featureUsageFile()), true);
                if (isset($feature_usage) && is_array($feature_usage)) {
                    $ret["blinkFeatureFirstUsed"] = $feature_usage;
                }
            }

        // See if there is HTTP/2 Priority-only stream data
            if (gz_is_file($localPaths->priorityStreamsFile())) {
                $priority_streams = json_decode(gz_file_get_contents($localPaths->priorityStreamsFile()), true);
                if (isset($priority_streams) && is_array($priority_streams) && count($priority_streams)) {
                    $ret["priorityStreams"] = $priority_streams;
                }
            }

        // Calculate Time to Interactive if we have First Contentful Paint and interactive Windows
            if (isset($ret['interactivePeriods']) && is_array($ret['interactivePeriods']) && count($ret['interactivePeriods'])) {
                $seek_start = 0;
                $TTI = null;
                $last_interactive = 0;
                $measurement_end = 0;
                $max_fid = null;
                if (isset($ret['render']) && $ret['render'] > 0) {
                    $seek_start = $ret['render'];
                } elseif (isset($ret['firstContentfulPaint']) && $ret['firstContentfulPaint'] > 0) {
                    $seek_start = $ret['firstContentfulPaint'];
                } elseif (isset($ret['firstPaint']) && $ret['firstPaint'] > 0) {
                    $seek_start = $ret['firstPaint'];
                }
                $DCL = null;
                if (isset($ret['domContentLoadedEventEnd'])) {
                    $DCL = $ret['domContentLoadedEventEnd'];
                }
                $long_tasks = null;
                if (isset($ret['longTasks'])) {
                    $long_tasks = $ret['longTasks'];
                }
                if ($seek_start > 0) {
                    $TTI = CalculateTimeToInteractive($localPaths, $seek_start, $ret['interactivePeriods'], $long_tasks, $measurement_end, $first_interactive, $last_interactive, $total_blocking_time, $max_fid, $DCL);
                }
                if (isset($first_interactive) && $first_interactive > 0) {
                    $ret['FirstInteractive'] = $first_interactive;
                }
                if (isset($TTI) && $TTI > 0) {
                    $ret['TimeToInteractive'] = $TTI;
                }
                if (isset($max_fid)) {
                    $ret['maxFID'] = $max_fid;
                }
                if ($measurement_end > 0) {
                    $ret['TTIMeasurementEnd'] = $measurement_end;
                }
                if ($last_interactive > 0) {
                    $ret['LastInteractive'] = $last_interactive;
                }
                if (
                    !isset($ret['TimeToInteractive']) &&
                    $measurement_end > 0 &&
                    $last_interactive > 0 &&
                    $measurement_end - $last_interactive >= 5000
                ) {
                    $ret['TimeToInteractive'] = $last_interactive;
                    if (!isset($ret['FirstInteractive'])) {
                        $ret['FirstInteractive'] = $last_interactive;
                    }
                }
                if (isset($ret['FirstInteractive'])) {
                    $ret['FirstCPUIdle'] = $ret['FirstInteractive'];
                }
                if (isset($total_blocking_time)) {
                    $ret['TotalBlockingTime'] = $total_blocking_time;
                }
            }
        }

      // For visual tests (black-box browser testing) use the visual metrics as the base timings
        if (
            !empty($ret) &&
            isset($ret['visualTest']) &&
            $ret['visualTest'] &&
            isset($ret['visualComplete'])
        ) {
            $ret['loadTime'] = $ret['visualComplete'];
            $ret['docTime'] = $ret['visualComplete'];
            $ret['fullyLoaded'] = $ret['lastVisualChange'];
        }

      // See if we have pcap-based versions of the various metrics
        if (!empty($ret)) {
            if ((!isset($ret['bytesIn']) || !$ret['bytesIn']) && isset($ret['pcapBytesIn']) && $ret['pcapBytesIn']) {
                $ret['bytesIn'] = $ret['pcapBytesIn'];
            }
            if ((!isset($ret['bytesInDoc']) || !$ret['bytesInDoc']) && isset($ret['pcapBytesIn']) && $ret['pcapBytesIn']) {
                $ret['bytesInDoc'] = $ret['pcapBytesIn'];
            }
            if ((!isset($ret['bytesOut']) || !$ret['bytesOut']) && isset($ret['pcapBytesOut']) && $ret['pcapBytesOut']) {
                $ret['bytesOut'] = $ret['pcapBytesOut'];
            }
            if ((!isset($ret['bytesOutDoc']) || !$ret['bytesOutDoc']) && isset($ret['pcapBytesOut']) && $ret['pcapBytesOut']) {
                $ret['bytesOutDoc'] = $ret['pcapBytesOut'];
            }
        }

        $run = $localPaths->getRunNumber();
        $cached = $localPaths->isCachedResult();
        if (!empty($ret)) {
            $ret['run'] = $localPaths->getRunNumber();
            $ret['cached'] = $localPaths->isCachedResult() ? 1 : 0;
            $ret['step'] = $localPaths->getStepNumber();

          // calculate the effective bps
            if (
                array_key_exists('fullyLoaded', $ret) &&
                array_key_exists('TTFB', $ret) &&
                array_key_exists('bytesIn', $ret) &&
                $ret['fullyLoaded'] > 0 &&
                $ret['TTFB'] > 0 &&
                $ret['bytesIn'] > 0 &&
                $ret['fullyLoaded'] > $ret['TTFB']
            ) {
                $ret['effectiveBps'] = intval($ret['bytesIn'] / (($ret['fullyLoaded'] - $ret['TTFB']) / 1000.0));
            }
            if (
                array_key_exists('docTime', $ret) &&
                array_key_exists('TTFB', $ret) &&
                array_key_exists('bytesInDoc', $ret) &&
                $ret['docTime'] > 0 &&
                $ret['TTFB'] > 0 &&
                $ret['bytesInDoc'] > 0 &&
                $ret['docTime'] > $ret['TTFB']
            ) {
                $ret['effectiveBpsDoc'] = intval($ret['bytesInDoc'] / (($ret['docTime'] - $ret['TTFB']) / 1000.0));
            }
          // clean up any insane values (from negative numbers as unsigned most likely)
            if (
                array_key_exists('firstPaint', $ret) &&
                array_key_exists('fullyLoaded', $ret) &&
                $ret['firstPaint'] > $ret['fullyLoaded']
            ) {
                $ret['firstPaint'] = 0;
            }
            $times = array('loadTime',
            'TTFB',
            'render',
            'fullyLoaded',
            'docTime',
            'domTime',
            'aft',
            'titleTime',
            'loadEventStart',
            'loadEventEnd',
            'domContentLoadedEventStart',
            'domContentLoadedEventEnd',
            'domLoading',
            'domInteractive',
            'lastVisualChange',
            'visualComplete',
            'server_rtt',
            'firstPaint');
            foreach ($times as $key) {
                if (
                    !array_key_exists($key, $ret) ||
                    $ret[$key] > 3600000 ||
                    $ret[$key] < 0
                ) {
                    $ret[$key] = 0;
                }
            }

          // See if there is a test-level error that needs to be exposed
            if (isset($testInfo) && isset($testInfo['errors'][$run][$cached])) {
                if (!isset($ret['result']) || $ret['result'] == 0 || $ret['result'] == 99999) {
                    $ret['result'] = 99995;
                }
                $ret['error'] = $testInfo['errors'][$run][$cached];
            }

            if (is_array($ret) && isset($ret['result']) && !$basic_results) {
                gz_file_put_contents($cacheFile, json_encode($ret));
            }
        }
    }

    if (
        !empty($ret) && isset($ret['testTiming']) &&
        isset($testInfo['started']) &&
        $testInfo['completed'] &&
        $testInfo['completed'] > $testInfo['started']
    ) {
        $ret['testTiming']['AllRunsDuration'] = ($testInfo['completed'] - $testInfo['started']) * 1000;
    }

    if (!empty($ret)) {
        if (!isset($ret['requestsFull']) && isset($ret['requests'])) {
            $ret['requestsFull'] = $ret['requests'];
        }

      // see if there is request analysis that needs to be added
        if (gz_is_file($localPaths->requestsAnalysisFile())) {
            $analysis = json_decode(gz_file_get_contents($localPaths->requestsAnalysisFile()), true);
            foreach ($analysis as $key => $value) {
                if (!isset($ret[$key])) {
                    $ret[$key] = $value;
                }
            }
        }

      // Add the crux data
        $crux_file = $localPaths->cruxJsonFile();
        if (gz_is_file($crux_file)) {
            $crux_data = json_decode(gz_file_get_contents($crux_file), true);
            if (isset($crux_data) && is_array($crux_data)) {
                if (isset($crux_data['record'])) {
                    $ret['CrUX'] = $crux_data['record'];
                } else {
                    $ret['CrUX'] = $crux_data;
                }
            }
        }

      // See if there is metadata that needs to be added
        if (isset($testInfo) && isset($testInfo['metadata'])) {
            $ret['metadata'] = $testInfo['metadata'];
        }

      // see if there is test-level lighthouse data to attach
      // Don't cache the lighthouse bit because the file may come in after other results are cached
        $lighthouse_audits_file = $localPaths->lighthouseAuditsFile();
        $lighthouse_file = $localPaths->lighthouseJsonFile();
        if (gz_is_file($lighthouse_audits_file)) {
            $audits = json_decode(gz_file_get_contents($lighthouse_audits_file), true);
            foreach ($audits as $name => $value) {
                $ret["lighthouse.$name"] = $value;
            }
        } elseif (gz_is_file($lighthouse_file)) {
            $lighthouse = json_decode(gz_file_get_contents($lighthouse_file), true);
            if (isset($lighthouse) && is_array($lighthouse)) {
                if (isset($lighthouse['aggregations'])) {
                    foreach ($lighthouse['aggregations'] as $lh) {
                        if (isset($lh['name']) && isset($lh['total']) && isset($lh['scored']) && $lh['scored']) {
                              $name = 'lighthouse.' . str_replace(' ', '', $lh['name']);
                              $ret[$name] = $lh['total'];
                        }
                    }
                } elseif (isset($lighthouse['reportCategories'])) {
                    foreach ($lighthouse['reportCategories'] as $lh) {
                        if (isset($lh['name']) && isset($lh['score'])) {
                            $name = 'lighthouse.' . str_replace(' ', '', $lh['name']);
                            $score = floatval($lh['score']) / 100.0;
                            $ret[$name] = $score;
                            if ($lh['name'] == 'Performance' && isset($lh['audits'])) {
                                foreach ($lh['audits'] as $audit) {
                                    if (
                                        isset($audit['id']) &&
                                        isset($audit['group']) &&
                                        $audit['group'] == 'perf-metric' &&
                                        isset($audit['result']['rawValue'])
                                    ) {
                                            $name = 'lighthouse.' . str_replace(' ', '', $lh['name']) . '.' . str_replace(' ', '', $audit['id']);
                                            $ret[$name] = $audit['result']['rawValue'];
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

  // set top level FCP in case page data was already cached
    if (!isset($ret['firstContentfulPaint'])) {
        TopLevelFCP($ret);
    }

    if (isset($ret['fullyLoaded'])) {
        $ret['fullyLoaded'] = intval(round($ret['fullyLoaded']));
    }

    if (empty($ret)) {
        $ret = null;
    }

    if (isset($ret) && is_array($ret) && isset($testInfo) && is_array($testInfo) && isset($testInfo['id'])) {
        $ret['testID'] = $testInfo['id'];
    }
    return $ret;
}

/**
* Load the page data from the specified file
*
* @param mixed $file
*/
function loadPageData($file)
{
    $ret = null;
    $lines = gz_file($file);
    if ($lines) {
        // loop through each line in the file until we get a data record
        foreach ($lines as $line) {
            $parseLine = str_replace("\t", "\t ", $line);
            $fields = explode("\t", $parseLine);
            if (count($fields) > 34 && trim($fields[0]) != 'Date') {
                $ret = array();
                $ret = array(   'URL' => @htmlspecialchars(trim($fields[3])),
                                // 'loadTime' => (int)$fields[4],
                                'loadTime' => @(int)$fields[32],
                                'TTFB' => @(int)$fields[5],
                                'bytesOut' => @(int)$fields[7],
                                'bytesOutDoc' => @(int)$fields[45],
                                'bytesIn' => @(int)$fields[8],
                                'bytesInDoc' => @(int)$fields[46],
                                'connections' => @(int)$fields[10],
                                'requests' => @(int)$fields[11],
                                'requestsFull' => @(int)$fields[11],
                                'requestsDoc' => @(int)$fields[49],
                                'responses_200' => @(int)$fields[12],
                                'responses_404' => @(int)$fields[15],
                                'responses_other' => @(int)$fields[16],
                                'result' => @(int)$fields[17],
                                'render' => @(int)$fields[18],
                                'fullyLoaded' => @(int)$fields[22],
                                'cached' => @(int)$fields[27],
                                'docTime' => @(int)$fields[32],
                                'domTime' => @(int)$fields[34],
                                'score_cache' => @(int)$fields[36],
                                'score_cdn' => @(int)$fields[37],
                                'score_gzip' => @(int)$fields[39],
                                'score_cookies' => @(int)$fields[40],
                                'score_keep-alive' => @(int)$fields[41],
                                'score_minify' => @(int)$fields[43],
                                'score_combine' => @(int)$fields[44],
                                'score_compress' => @(int)$fields[55],
                                'score_etags' => @(int)$fields[58],
                                'gzip_total' => @(int)$fields[64],
                                'gzip_savings' => @(int)$fields[65],
                                'minify_total' => @(int)$fields[66],
                                'minify_savings' => @(int)$fields[67],
                                'image_total' => @(int)$fields[68],
                                'image_savings' => @(int)$fields[69],
                                'base_page_redirects' => @(int)$fields[70],
                                'optimization_checked' => @(int)$fields[71],
                                'aft' => @(int)$fields[72],
                                'domElements' => @(int)$fields[73],
                                'title' => @htmlspecialchars(trim($fields[75]), ENT_NOQUOTES, 'UTF-8'),
                                'titleTime' => @(int)$fields[76],
                                'loadEventStart' => @(int)$fields[77],
                                'loadEventEnd' => @(int)$fields[78],
                                'domContentLoadedEventStart' => @(int)$fields[79],
                                'domContentLoadedEventEnd' => @(int)$fields[80],
                                'lastVisualChange' => @(int)$fields[81],
                                'browser_name' => @trim($fields[82]),
                                'browser_version' => @trim($fields[83]),
                                'server_count' => @(int)trim($fields[84]),
                                'server_rtt' => @(int)trim($fields[85]),
                                'base_page_cdn' => @trim($fields[86]),
                                'adult_site' => @(int)trim($fields[87]),
                                'eventName' => @trim($fields[2])
                            );

                $ret['fixed_viewport'] = (array_key_exists(88, $fields) && strlen(trim($fields[88]))) ? (int)trim($fields[88]) : -1;
                $ret['score_progressive_jpeg'] = (array_key_exists(89, $fields) && strlen(trim($fields[89]))) ? (int)trim($fields[89]) : -1;
                $ret['firstPaint'] = (array_key_exists(90, $fields) && strlen(trim($fields[90]))) ? (int)trim($fields[90]) : 0;
                //$ret['peakMem'] = (array_key_exists(91, $fields) && strlen(trim($fields[91]))) ? (int)trim($fields[91]) : 0;
                //$ret['processCount'] = (array_key_exists(92, $fields) && strlen(trim($fields[92]))) ? (int)trim($fields[92]) : 0;
                $ret['docCPUms'] = (array_key_exists(93, $fields) && strlen(trim($fields[93]))) ? floatval(trim($fields[93])) : 0.0;
                $ret['fullyLoadedCPUms'] = (array_key_exists(94, $fields) && strlen(trim($fields[94]))) ? floatval(trim($fields[94])) : 0.0;
                $ret['docCPUpct'] = (array_key_exists(95, $fields) && strlen(trim($fields[95]))) ? floatval(trim($fields[95])) : 0;
                $ret['fullyLoadedCPUpct'] = (array_key_exists(96, $fields) && strlen(trim($fields[96]))) ? floatval(trim($fields[96])) : 0;
                $ret['isResponsive'] = (array_key_exists(97, $fields) && strlen(trim($fields[97]))) ? intval(trim($fields[97])) : -1;
                if ((isset($fields[98]) && strlen(trim($fields[98])))) {
                    $ret['browser_process_count'] = intval(trim($fields[98]));
                }
                if ((isset($fields[99]) && strlen(trim($fields[99])))) {
                    $ret['browser_main_memory_kb'] = intval(trim($fields[99]));
                }
                if ((isset($fields[100]) && strlen(trim($fields[100])))) {
                    $ret['browser_other_private_memory_kb'] = intval(trim($fields[100]));
                }
                if (isset($ret['browser_main_memory_kb']) && isset($ret['browser_other_private_memory_kb'])) {
                    $ret['browser_working_set_kb'] = $ret['browser_main_memory_kb'] + $ret['browser_other_private_memory_kb'];
                }
                if ((isset($fields[101]) && strlen(trim($fields[101])))) {
                    $ret['domInteractive'] = intval(trim($fields[101]));
                }
                if ((isset($fields[102]) && strlen(trim($fields[102])))) {
                    $ret['domLoading'] = intval(trim($fields[102]));
                }
                if ((isset($fields[103]) && strlen(trim($fields[103])))) {
                    $ret['base_page_ttfb'] = intval(trim($fields[103]));
                }
                if ((isset($fields[104]) && strlen(trim($fields[104])))) {
                    $ret['visualComplete'] = intval(trim($fields[104]));
                }
                if ((isset($fields[105]) && strlen(trim($fields[105])))) {
                    $ret['SpeedIndex'] = intval(trim($fields[105]));
                }
                if ((isset($fields[106]) && strlen(trim($fields[106])))) {
                    $ret['certificate_bytes'] = intval(trim($fields[106]));
                }

                $ret['date'] = strtotime(trim($fields[0]) . ' ' . trim($fields[1]));
                break;
            }
        }
    }

    return $ret;
}

/**
* Find the median run and use it for the results
*
* @param mixed $pageData
*/
function calculatePageStats(&$pageData, &$fv, &$rv)
{
    $fvCount = 0;
    $rvCount = 0;

    // calculate the averages
    if (count($pageData)) {
        foreach ($pageData as $run => $data) {
            if (isset($data[0]) && $data[0]['cached'] === 0) {
                if (!isset($metrics)) {
                    $metrics = array();
                    foreach ($data[0] as $metric => $value) {
                        if (is_numeric($value)) {
                            $metrics[] = $metric;
                        }
                    }
                }
                // only look at non-error runs
                if (successfulRun($data[0])) {
                    if (!isset($fv)) {
                        $fv = array();
                    }
                    foreach ($metrics as $metric) {
                        if (is_numeric($data[0][$metric])) {
                            if (array_key_exists($metric, $fv)) {
                                $fv[$metric] += $data[0][$metric];
                            } else {
                                $fv[$metric] = $data[0][$metric];
                            }
                        }
                    }
                    $fvCount++;
                }
            }

            if (isset($data[1]) && $data[1]['cached']) {
                if (!isset($metrics)) {
                    $metrics = array();
                    foreach ($data[0] as $metric => $value) {
                        if (is_numeric($value)) {
                            $metrics[] = $metric;
                        }
                    }
                }
                // only look at non-error runs
                if (successfulRun($data[1])) {
                    if (!isset($rv)) {
                        $rv = array();
                    }
                    foreach ($metrics as $metric) {
                        if (is_numeric($data[1][$metric])) {
                            if (array_key_exists($metric, $rv)) {
                                $rv[$metric] += $data[1][$metric];
                            } else {
                                $rv[$metric] = $data[1][$metric];
                            }
                        }
                    }
                    $rvCount++;
                }
            }
        }
    }

    // calculate the first view stats
    if (isset($fv) && isset($metrics) && $fvCount > 0) {
        foreach ($metrics as $metric) {
            if (is_numeric($fv[$metric])) {
                $fv[$metric] /= (double)$fvCount;
            }
        }

        // go through and find the run closest to the average
        $closest = -1;
        $distance = 10000000000;

        foreach ($pageData as $run => $data) {
            if (isset($data[0]) && successfulRun($data[0])) {
                $curDist = abs($data[0]['loadTime'] - $fv['loadTime']);
                if ($curDist < $distance) {
                    $closest = $run;
                    $distance = $curDist;
                }
            }
        }

        if ($closest != -1) {
            $fv['avgRun'] = $closest;
        }
    }

    // calculate the repeat view stats
    if (isset($rv) && isset($metrics) && $rvCount > 0) {
        foreach ($metrics as $metric) {
            if (is_numeric($rv[$metric])) {
                $rv[$metric] /= (double)$rvCount;
            }
        }

        // go through and find the run closest to the average
        $closest = -1;
        $distance = 10000000000;

        foreach ($pageData as $run => $data) {
            if (isset($data[1]) && successfulRun($data[1])) {
                $curDist = abs($data[1]['loadTime'] - $rv['loadTime']);
                if ($curDist < $distance) {
                    $closest = $run;
                    $distance = $curDist;
                }
            }
        }

        if ($closest != -1) {
            $rv['avgRun'] = $closest;
        }
    }
}

/**
 * Find the index of the test run in $pageData with cache status $cached
 * corresponding to the median (or lower of two middle values) of $metric,
 * unless the "medianRun" parameter is set to "fastest",
 * in which case it returns the index of the fastest run.
*
* @param mixed $pageData
* @param mixed $cached
*/
function GetMedianRun(&$pageData, $cached, $metric = null)
{
    if (!isset($metric)) {
        $metric = GetSetting('medianMetric', 'loadTime');
    }
    $run = 0;
    $cached = $cached ? 1 : 0;
    $times = values($pageData, $cached, $metric, true);

    if (!count($times)) {
        $times = values($pageData, $cached, $metric, false);
    }

    $count = count($times);
    if ($count > 1) {
        asort($times);
        if (
            array_key_exists('medianRun', $_REQUEST) &&
            $_REQUEST['medianRun'] == 'fastest'
        ) {
            $medianIndex = 1;
        } else {
            $medianIndex = (int)floor(((float)$count + 1.0) / 2.0);
        }
        $current = 0;
        foreach ($times as $index => $time) {
            $current++;
            if ($current == $medianIndex) {
                $run = $index;
                break;
            }
        }
    } elseif ($count == 1) {
        foreach ($times as $index => $time) {
            $run = $index;
            break;
        }
    }

    // fall back to loadTime if we failed to get a run with the specified metric
    if (!$run && $metric != 'loadTime') {
        $run = GetMedianRun($pageData, $cached, 'loadTime');
    }

    return $run;
}

/**
* Count the number of tests with successful results
*
* @param mixed $pageData
* @param mixed $cached
*/
function CountSuccessfulTests(&$pageData, $cached)
{
    $count = 0;
    foreach ($pageData as &$run) {
        if (successfulRun($run[$cached])) {
            $count++;
        }
    }

    return $count;
}

/**
* Calculate some stats for the given metric from the page data
*
* @param mixed $pageData
* @param mixed $cached
* @param mixed $metric
* @param mixed $median
* @param mixed $avg
* @param mixed $stdDev
*/
function CalculateAggregateStats(&$pageData, $cached, $metric, &$median, &$avg, &$stdDev, &$min, &$max)
{
    $median = null;
    $avg = null;
    $stdDev = null;
    $count = 0;
    $min = null;
    $max = null;

    // first pass, calculate the average and array of values for grabbing the median
    $values = values($pageData, $cached, $metric, true);
    $sum = array_sum($values);
    $count = count($values);

    if ($count) {
        $avg = $sum / $count;
        sort($values, SORT_NUMERIC);
        $medianIndex = (int)($count / 2);
        $median = $values[$medianIndex];
        $max = end($values);
        $min = reset($values);

        // pass 2, calculate the standard deviation
        $sum = 0;
        foreach ($values as $value) {
            $sum += pow($value - $avg, 2);
        }
        $stdDev = sqrt($sum / $count);
    }

    return $count;
}

/**
* Calculate the standard deviation for the provided metric
*
*/
function PageDataStandardDeviation($pageData, $metric, $cached)
{
    $ret = null;
    $values = array();
    if (count($pageData)) {
        foreach ($pageData as $data) {
            if (
                array_key_exists($cached, $data) &&
                array_key_exists($metric, $data[$cached]) &&
                array_key_exists('result', $data[$cached]) &&
                successfulRun($data[$cached])
            ) {
                $values[] = $data[$cached][$metric];
            }
        }
    }
    $count = count($values);
    if ($count) {
        $sum = 0;
        foreach ($values as $value) {
            $sum += $value;
        }
        $avg = $sum / $count;
        $sum = 0;
        foreach ($values as $value) {
            $sum += pow($value - $avg, 2);
        }
        $ret = (int)sqrt($sum / $count);
    }
    return $ret;
}

/**
 * Load the reported user timings data for the given run
 *
 * @param array $pageData A reference to the pageData array to load the user timing data into
 * @param mixed $userTimingFile
 */
function loadUserTimingData(&$pageData, $userTimingFile)
{
    if (gz_is_file($userTimingFile)) {
        $events = json_decode(gz_file_get_contents($userTimingFile), true);
        if (isset($events) && is_array($events) && count($events)) {
            $lastEvent = 0;
            foreach ($events as $event) {
                if (
                    is_array($event) &&
                    isset($event['name']) &&
                    isset($event['startTime']) &&
                    isset($event['entryType'])
                ) {
                    $name = preg_replace('/[^a-zA-Z0-9\.\-_\(\) ]/', '_', $event['name']);
                    if ($event['entryType'] == 'mark') {
                        $time = intval($event['startTime'] + 0.5);
                        if ($time > 0 && $time < 3600000) {
                            if ($event['startTime'] > $lastEvent) {
                                $lastEvent = $event['startTime'];
                            }
                              $pageData["userTime.$name"] = $time;
                            if (!isset($pageData['userTimes'])) {
                                $pageData['userTimes'] = array();
                            }
                            $pageData['userTimes'][$name] = $time;
                        }
                    } elseif (
                        $event['entryType'] == 'measure' &&
                        isset($event['duration'])
                    ) {
                        $duration = intval($event['duration'] + 0.5);
                        $pageData["userTimingMeasure.$name"] = $duration;
                        if (!isset($pageData['userTimingMeasures'])) {
                            $pageData['userTimingMeasures'] = array();
                        }
                        $pageData['userTimingMeasures'][] =
                        array('name' => $event['name'],
                        'startTime' => $event['startTime'],
                        'duration' => $event['duration']);
                    }
                }
            }
            $pageData["userTime"] = intval($lastEvent + 0.5);
        }
    }
}

/**
 * Return whether a particular run (cached or uncached) was successful.
 *
 * @param mixed data
 *
 * @return bool
 */
function successfulRun($data)
{
    $successful = false;
    if (isset($data['result'])) {
        $successful = ($data['result'] === 0 || $data['result']  === 99999);
    }
    return $successful;
}

/**
 * Return all values from a pageData for a given cached state and metric
 *
 * @param mixed pageData
 * @param int cached
 * @param string metric
 * @param bool successfulOnly Whether to only include successful runs
 *
 * @return (int|float)[]
 */
function values(&$pageData, $cached, $metric, $successfulOnly)
{
    $values = array();
    foreach ($pageData as $index => &$pageRun) {
        if (
            array_key_exists($cached, $pageRun) &&
            (!$successfulOnly || successfulRun($pageRun[$cached])) &&
            array_key_exists($metric, $pageRun[$cached])
        ) {
            $values[$index] = $pageRun[$cached][$metric];
        }
    }
    return $values;
}

function CompareTimestamps($a, $b)
{
    if (!isset($a['ts']) || !isset($b['ts']) || $a['ts'] == $b['ts']) {
        return 0;
    }
    return ($a['ts'] < $b['ts']) ? -1 : 1;
}

function ParseUserTiming($file, $browser_version, &$layout_shifts, &$page_data)
{
    $user_timing = null;
    $events = json_decode(gz_file_get_contents($file), true);
    if (isset($events) && is_array($events)) {
        usort($events, 'CompareTimestamps');
        $start_time = null;
      // Make a first pass looking to see if the start time is explicitly set
        foreach ($events as $event) {
            if (is_array($event) && isset($event['startTime'])) {
                $start_time = $event['startTime'];
            }
        }

      // Make a pass looking for explicitly tagged main frames
        $main_frames = array();
        foreach ($events as $event) {
            if (
                is_array($event) &&
                isset($event['name']) &&
                isset($event['args']['frame']) &&
                !in_array($event['args']['frame'], $main_frames)
            ) {
                $is_main_frame = false;
                if (
                    isset($event['args']['data']['isLoadingMainFrame']) &&
                    $event['args']['data']['isLoadingMainFrame'] &&
                    isset($event['args']['data']['documentLoaderURL']) &&
                    strlen($event['args']['data']['documentLoaderURL'])
                ) {
                    $is_main_frame = true;
                } elseif (isset($event['args']['data']['isMainFrame']) && $event['args']['data']['isMainFrame']) {
                    $is_main_frame = true;
                } elseif ($event['name'] == 'markAsMainFrame') {
                    $is_main_frame = true;
                }
                if ($is_main_frame) {
                    $main_frames[] = $event['args']['frame'];
                }
            }
        }
      // Find the first navigation to determine which is the main frame
        foreach ($events as $event) {
            if (is_array($event) && isset($event['name']) && isset($event['ts'])) {
                if (!isset($start_time)) {
                    $start_time = $event['ts'];
                }
                if (
                    !count($main_frames) &&
                    ($event['name'] == 'navigationStart' ||
                    $event['name'] == 'unloadEventStart' ||
                    $event['name'] == 'redirectStart' ||
                    $event['name'] == 'domLoading')
                ) {
                    if (isset($event['args']['frame'])) {
                        $main_frames[] = $event['args']['frame'];
                        break;
                    }
                }
            }
        }
        if (count($main_frames) && isset($start_time)) {
          // Pre-process the "LargestXXX" events, just recording the biggest one
            $largest = [];
            foreach ($events as $event) {
                if (
                    is_array($event) &&
                    isset($event['name']) &&
                    isset($event['ts']) &&
                    isset($event['args']['frame']) && in_array($event['args']['frame'], $main_frames) &&
                    ($event['ts'] >= $start_time || isset($event['args']['value'])) &&
                    stripos($event['name'], 'Largest') === 0 &&
                    isset($event['args']['data']['size'])
                ) {
                    $name = $event['name'];
                    if (!isset($largest[$name]) || $event['args']['data']['size'] > $largest[$name]['args']['data']['size']) {
                        $time = null;
                        if (isset($event['args']['value'])) {
                            $time = $event['args']['value'];
                        } else {
                            $elapsed_usec = $event['ts'] - $start_time;
                            $elapsed_ms = intval($elapsed_usec / 1000.0);
                            $time = $elapsed_ms;
                        }
                        if (isset($event['args']['data']['durationInMilliseconds'])) {
                            $time = $event['args']['data']['durationInMilliseconds'];
                        }
                        if (isset($time)) {
                            $event['time'] = $time;
                            $largest[$name] = $event;
                            if (!isset($page_data['largestPaints'])) {
                                $page_data['largestPaints'] = [];
                            }
                            $paint_event = array('event' => $name, 'time' => $time, 'size' => $event['args']['data']['size']);
                            if (isset($event['args']['data']['DOMNodeId'])) {
                                $paint_event['DOMNodeId'] = $event['args']['data']['DOMNodeId'];
                            }
                            if (isset($event['args']['data']['node'])) {
                                    $paint_event['nodeInfo'] = $event['args']['data']['node'];
                            }
                            if (isset($event['args']['data']['element'])) {
                                  $paint_event['element'] = $event['args']['data']['element'];
                            }
                            if (isset($event['args']['data']['type'])) {
                                $paint_event['type'] = $event['args']['data']['type'];
                            }
                            $page_data['largestPaints'][] = $paint_event;
                        }
                    }
                }
              //let's grab the element timing stuff while we're here to avoid a separate loop
                if (
                    is_array($event) &&
                    isset($event['name']) &&
                    isset($event['ts']) &&
                    isset($event['args']['frame']) && in_array($event['args']['frame'], $main_frames) &&
                    $event['name'] === 'PerformanceElementTiming'
                ) {
                    if (!isset($page_data['elementTiming'])) {
                        $page_data['elementTiming'] = array();
                    }
                    $elementTimingArr = array();
                    $elementTimingArr['identifier'] = $event['args']['data']['identifier'];
                    $elementTimingArr['time'] = $event['args']['data']['renderTime'];
                    $elementTimingArr['elementType'] = $event['args']['data']['elementType'];
                    $elementTimingArr['url'] = $event['args']['data']['url'];

                    $page_data['elementTiming'][] = $elementTimingArr;
                    $page_data['elementTiming.' . $event['args']['data']['identifier']] = $event['args']['data']['renderTime'];
                }
            }

            $total_layout_shift = null;

            $max_layout_window = 0;
            $firstShift = 0;
            $prevShift = 0;
            $curr = 0;
            $shiftWindowCount = 0;

            if (isset($browser_version) && $browser_version >= 81) {
                $total_layout_shift = 0.0;
                foreach ($events as $event) {
                    if (
                        is_array($event) &&
                        isset($event['name']) &&
                        isset($event['ts']) &&
                        isset($event['args']['frame']) && in_array($event['args']['frame'], $main_frames) &&
                        ($event['ts'] >= $start_time || isset($event['args']['value']))
                    ) {
                        if (!isset($user_timing)) {
                            $user_timing = array();
                        }
                        $name = $event['name'];
                        $time = null;
                        if (isset($event['args']['value'])) {
                            $time = $event['args']['value'];
                        } else {
                            $elapsed_usec = $event['ts'] - $start_time;
                            $elapsed_ms = intval($elapsed_usec / 1000.0);
                            $time = $elapsed_ms;
                        }
                        if (isset($event['args']['data']['durationInMilliseconds'])) {
                            $time = $event['args']['data']['durationInMilliseconds'];
                        }
                        if (
                            $name == "LayoutShift" &&
                            isset($event['args']['data']['is_main_frame']) &&
                            $event['args']['data']['is_main_frame'] &&
                            isset($event['args']['data']['score'])
                        ) {
                            if (isset($time)) {
                                if (!isset($total_layout_shift)) {
                                    $total_layout_shift = 0;
                                }
                                $total_layout_shift += $event['args']['data']['score'];

                                if (($time - $firstShift > 5000) || ($time - $prevShift > 1000)) {
                          //new shift window
                                    $firstShift = $time;
                                    $curr = 0;
                                    $shiftWindowCount++;
                                }
                                $prevShift = $time;
                                $curr += $event['args']['data']['score'];
                                $max_layout_window = max($curr, $max_layout_window);

                                $shift = array(
                                'time' => $time,
                                'score' => $event['args']['data']['score'],
                                'cumulative_score' => $total_layout_shift,
                                'window_score' => $curr,
                                'shift_window_num' => $shiftWindowCount
                                );

                                if (isset($event['args']['data']['region_rects'])) {
                                    $shift['rects'] = $event['args']['data']['region_rects'];
                                }
                                if (isset($event['args']['data']['sources'])) {
                                    $shift['sources'] = $event['args']['data']['sources'];
                                }
                                $layout_shifts[] = $shift;
                            }
                        }
                        if (isset($name) && isset($time) && !isset($largest[$name])) {
                            $user_timing[] = array('name' => $name, 'time' => $time);
                        }
                    }
                }
            }

            foreach ($largest as $name => $event) {
                $user_timing[] = array('name' => $event['name'], 'time' => $event['time']);
            }
            if (isset($largest['LargestContentfulPaint'])) {
                $event = $largest['LargestContentfulPaint'];
                if (isset($event['args']['data']['type'])) {
                    $page_data['LargestContentfulPaintType'] = $event['args']['data']['type'];
                  // For images, extract the URL if there is one
                    if ($event['args']['data']['type'] == 'image' && isset($page_data['largestPaints'])) {
                        foreach ($page_data['largestPaints'] as $paint_event) {
                            if ($paint_event['event'] == 'LargestImagePaint' && $paint_event['time'] == $event['time']) {
                                if (isset($paint_event['nodeInfo']['nodeType'])) {
                                    $page_data['LargestContentfulPaintNodeType'] = $paint_event['nodeInfo']['nodeType'];
                                }
                                if (isset($paint_event['nodeInfo']['sourceURL'])) {
                                    $page_data['LargestContentfulPaintImageURL'] = $paint_event['nodeInfo']['sourceURL'];
                                } elseif (isset($paint_event['nodeInfo']['styles']['background-image'])) {
                                    if (preg_match('/url\("?\'?([^"\'\)]+)/', $paint_event['nodeInfo']['styles']['background-image'], $matches)) {
                                                $page_data['LargestContentfulPaintType'] = 'background-image';
                                                $page_data['LargestContentfulPaintImageURL'] = $matches[1];
                                    }
                                }
                            }
                        }
                    } else {
                        foreach ($page_data['largestPaints'] as $paint_event) {
                            if ($paint_event['event'] == 'LargestTextPaint' && $paint_event['time'] == $event['time']) {
                                if (isset($paint_event['nodeInfo']['nodeType'])) {
                                    $page_data['LargestContentfulPaintNodeType'] = $paint_event['nodeInfo']['nodeType'];
                                }
                            }
                        }
                    }
                }
            }
            if (isset($total_layout_shift)) {
                $user_timing[] = array('name' => 'TotalLayoutShift', 'value' => $total_layout_shift);
            }
            if (isset($max_layout_window)) {
                $user_timing[] = array('name' => 'CumulativeLayoutShift', 'value' => $max_layout_window);
            }
        }
    }
    return $user_timing;
}

/**
* Time To Interactive: https://github.com/WPO-Foundation/webpagetest/blob/master/docs/Metrics/TimeToInteractive.md
*
* @param mixed $localPaths
* @param mixed $startTime
* @param mixed $interactiveWindows
*/
function CalculateTimeToInteractive($localPaths, $startTime, $interactiveWindows, $long_tasks, &$measurement_end, &$first_interactive, &$last_interactive, &$total_blocking_time, &$max_fid, $DCL)
{
    $TTI = null;
    $first_interactive = null;
    $total_blocking_time = null;
    $measurement_end = 0;

  // See when the absolute last interaction measurement was
    $last_interactive = 0;
    foreach ($interactiveWindows as $window) {
        if ($window[1] > $measurement_end) {
            $measurement_end = max($window[1], $startTime);
            $last_interactive = max($window[0], $startTime);
        }
    }

  // Start by filtering the interactive windows to only include 5 second windows that don't
  // end before the start time.
    $end = 0;
    $iw = array();
    foreach ($interactiveWindows as $window) {
        $end = $window[1];
        $duration = $window[1] - $window[0];
        if ($end >= $startTime && $duration >= 5000) {
            $iw[] = $window;
            if (!isset($first_interactive) || $window[0] < $first_interactive) {
                $first_interactive = max($window[0], $startTime);
            }
        }
    }

    $rw = array();
    if (count($iw)) {
      // Find all of the request windows with 5 seconds of no more than 2 concurrent document requests
        require_once(INCLUDES_PATH . '/object_detail.inc');
        $requests = getRequestsForStep($localPaths, null, $has_secure_requests);
        if (isset($requests) && is_array($requests) && count($requests)) {
          // Build a list of start/end events for document requests
            $re = array();
            foreach ($requests as $request) {
                if (
                    isset($request['contentType']) &&
                    isset($request['load_start']) &&
                    $request['load_start'] >= 0 &&
                    isset($request['load_end']) &&
                    $request['load_end'] >= $startTime
                ) {
                    if (!isset($request['method']) || $request['method'] == 'GET') {
                        $re[] = array('type' => 'start', 'time' => $request['load_start']);
                        $re[] = array('type' => 'end', 'time' => $request['load_end']);
                    }
                }
            }

          // Sort the events by time
            if (count($re)) {
                usort($re, function ($a, $b) {
                    return ($a['time'] > $b['time']) ? +1 : -1;
                });
              // walk the list of events tracking the number of in-flight requests and log any windows > 5 seconds
                $window_start = 0;
                $in_flight = 0;
                foreach ($re as $e) {
                    if ($e['type'] == 'start') {
                        $in_flight++;
                        if (isset($window_start) && $in_flight > 2) {
                              $window_end = $e['time'];
                            if ($window_end - $window_start >= 5000) {
                                $rw[] = array($window_start, $window_end);
                            }
                              $window_start = null;
                        }
                    } else {
                        $in_flight--;
                        if (!isset($window_start) && $in_flight <= 2) {
                            $window_start = $e['time'];
                        }
                    }
                }
                if (isset($window_start) && $end - $window_start >= 5000) {
                    $rw[] = array($window_start, $end);
                }
            }
        }
    }

  // Find the first interactive window that also has at least a 5 second intersection with one of the request windows
    if (count($rw)) {
        $window = null;
        foreach ($iw as $i) {
            foreach ($rw as $r) {
                $intersect = array(max($i[0], $r[0]), min($i[1], $r[1]));
                if ($intersect[1] - $intersect[0] >= 5000) {
                    $window = $i;
                    break 2;
                }
            }
        }
        if (isset($window)) {
            $TTI = max($startTime, $window[0]);
        }
    }

  // Calculate the total blocking time - https://web.dev/tbt/
  // and the max possible FID (longest task)
    $endTime = isset($TTI) ? $TTI : $last_interactive;
    if (isset($long_tasks)) {
        $total_blocking_time = 0;
        $max_fid = 0;
        if ($endTime > $startTime) {
            foreach ($long_tasks as $task) {
                $start = max($task[0], $startTime) + 50; // "blocking" time excludes the first 50ms
                $end = min($task[1], $endTime);
                $busyTime = $end - $start;
                if ($busyTime > 0) {
                    $total_blocking_time += $busyTime;
                    if ($busyTime > $max_fid) {
                        $max_fid = $busyTime;
                    }
                }
            }
        }
    }

    if (isset($DCL)) {
        if (isset($TTI) && $TTI > 0 && $DCL > $TTI) {
            $TTI = $DCL;
        }
        if (isset($first_interactive) && $first_interactive > 0 && $DCL > $first_interactive) {
            $first_interactive = $DCL;
        }
    }

    return $TTI;
}

/**
* Set a top-level FCP metric
*
* @param mixed pageData
*/
function TopLevelFCP(&$pageData)
{
  // set a top level firstContentfulPaint metric
    if (
        isset($pageData) && is_array($pageData) &&
        !isset($pageData['firstContentfulPaint'])
    ) {
        if (isset($pageData['chromeUserTiming.firstContentfulPaint'])) {
            $pageData['firstContentfulPaint'] = $pageData['chromeUserTiming.firstContentfulPaint'];
        } elseif (isset($pageData['PerformancePaintTiming.first-contentful-paint'])) {
            $pageData['firstContentfulPaint'] = $pageData['PerformancePaintTiming.first-contentful-paint'];
        }
    }
}
