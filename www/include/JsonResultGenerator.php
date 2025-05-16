<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

class JsonResultGenerator
{
    const BASIC_INFO_ONLY = 1;
    const WITHOUT_AVERAGE = 2;
    const WITHOUT_STDDEV = 3;
    const WITHOUT_MEDIAN = 4;
    const WITHOUT_RUNS = 5;
    const WITHOUT_REQUESTS = 6;
    const WITHOUT_CONSOLE = 7;
    const WITHOUT_LIGHTHOUSE = 8;
    const WITHOUT_REPEAT_VIEW = 9;

    /* @var TestInfo */
    private $testInfo;
    private $urlStart;
    /* @var FileHandler */
    private $fileHandler;
    private $infoFlags;
    private $friendlyUrls;
    private $forceMultistep;

    /**
     * JsonResultGenerator constructor.
     * @param TestInfo $testInfo Information about the test
     * @param string $urlStart Start for test-related URLS
     * @param FileHandler $fileHandler FileHandler to be used. Optional
     * @param array $infoFlags Array of WITHOUT_* and BASIC_* constants to define if some info should be left out. Optional
     * @param bool $friendlyUrls True if friendly urls should be used (mod_rewrite), false otherwise
     */
    public function __construct($testInfo, $urlStart, $fileHandler = null, $infoFlags = array(), $friendlyUrls = true)
    {
        $this->testInfo = $testInfo;
        $this->urlStart = $urlStart;
        $this->fileHandler = $fileHandler ? $fileHandler : new FileHandler();
        $this->infoFlags = $infoFlags ? $infoFlags : array();
        $this->friendlyUrls = $friendlyUrls;
    }

    /**
     * @param bool $force True if multistep format should be used even with singlestep results, false otherwise (compatible format)
     */
    public function forceMultistepFormat($force)
    {
        $this->forceMultistep = $force ? true : false;
    }

    /**
     * @param TestResults $testResults The test results to use for constructing the data array
     * @param string $medianMetric Metric to consider when selecting the median run
     * @return array An array containing all data about the test, in a form that can be encoded with JSON
     */
    public function resultDataArray($testResults, $medianMetric)
    {
        $testInfo = $this->testInfo->getInfoArray();
        $fvOnly = $this->testInfo->isFirstViewOnly();
        $cacheLabels = array('firstView', 'repeatView');

        // summary information
        $ret = array();
        $ret['id'] = $this->testInfo->getId();

        $url = $this->testInfo->getUrl();
        if (!$url) {
            $url = $testResults->getUrlFromRun();
        }
        $ret['url'] = $url;

        $urlGenerator = UrlGenerator::create(false, $this->urlStart, $this->testInfo->getId(), 0, 0);
        $ret['summary'] = $urlGenerator->resultSummary();

        $runs = $testResults->countRuns();
        if (isset($testInfo)) {
            if (array_key_exists('url', $testInfo) && strlen($testInfo['url'])) {
                $ret['testUrl'] = $testInfo['url'];
            }
            if (array_key_exists('location', $testInfo) && strlen($testInfo['location'])) {
                $locstring = $testInfo['location'];
                if (array_key_exists('browser', $testInfo) && strlen($testInfo['browser'])) {
                    $locstring .= ':' . $testInfo['browser'];
                }
                $ret['location'] = $locstring;
            }
            $testLocation = $this->testInfo->getTestLocation();
            if ($testLocation) {
                $ret['from'] = $testLocation;
            }
            if (array_key_exists('connectivity', $testInfo) && strlen($testInfo['connectivity'])) {
                $ret['connectivity'] = $testInfo['connectivity'];
            }
            if (array_key_exists('bwIn', $testInfo)) {
                $ret['bwDown'] = $testInfo['bwIn'];
            }
            if (array_key_exists('bwOut', $testInfo)) {
                $ret['bwUp'] = $testInfo['bwOut'];
            }
            if (array_key_exists('latency', $testInfo)) {
                $ret['latency'] = $testInfo['latency'];
            }
            if (array_key_exists('plr', $testInfo)) {
                $ret['plr'] = $testInfo['plr'];
            }
            if (array_key_exists('shaperLimit', $testInfo)) {
                $ret['shaperLimit'] = $testInfo['shaperLimit'];
            }
            if (array_key_exists('mobile', $testInfo)) {
                $ret['mobile'] = $testInfo['mobile'];
            }
            if (array_key_exists('label', $testInfo) && strlen($testInfo['label'])) {
                $ret['label'] = $testInfo['label'];
            }
            if (array_key_exists('completed', $testInfo)) {
                $ret['completed'] = $testInfo['completed'];
            }
            if (array_key_exists('tester', $testInfo) && strlen($testInfo['tester'])) {
                $ret['tester'] = $testInfo['tester'];
            }
            if (array_key_exists('testerDNS', $testInfo) && strlen($testInfo['testerDNS'])) {
                $ret['testerDNS'] = $testInfo['testerDNS'];
            }
            if (array_key_exists('runs', $testInfo) && $testInfo['runs']) {
                $runs = $testInfo['runs'];
            }
            if (array_key_exists('fvonly', $testInfo)) {
                $fvOnly = $testInfo['fvonly'] ? true : false;
            }
        }
        $cachedMax = 0;
        if (!$fvOnly && !$this->hasInfoFlag(self::WITHOUT_REPEAT_VIEW)) {
            $cachedMax = 1;
        }
        $ret['testRuns'] = $runs;
        $ret['fvonly'] = $fvOnly;
        $ret['successfulFVRuns'] = $testResults->countSuccessfulRuns(false);
        if (!$fvOnly) {
            $ret['successfulRVRuns'] = $testResults->countSuccessfulRuns(true);
        }

        // lighthouse
        if (!$this->hasInfoFlag(self::BASIC_INFO_ONLY) && !$this->hasInfoFlag(self::WITHOUT_LIGHTHOUSE)) {
            $lighthouse = $testResults->getLighthouseResult();
            if (isset($lighthouse)) {
                $ret['lighthouse'] = $lighthouse;
            }
            $log = $testResults->getLighthouseLog();
            if (isset($log)) {
                if (!isset($ret['lighthouse'])) {
                    $ret['lighthouse'] = array();
                }
                $ret['lighthouse']['test_log'] = $log;
            }
        }

        // average
        $stats = array($testResults->getFirstViewAverage(), $testResults->getRepeatViewAverage());
        if (!$this->hasInfoFlag(self::WITHOUT_AVERAGE)) {
            $ret['average'] = array();
            for ($cached = 0; $cached <= $cachedMax; $cached++) {
                $label = $cacheLabels[$cached];
                $ret['average'][$label] = $stats[$cached];
            }
        }

        // standard deviation
        if (!$this->hasInfoFlag(self::WITHOUT_STDDEV)) {
            $ret['standardDeviation'] = array();
            for ($cached = 0; $cached <= $cachedMax; $cached++) {
                $label = $cacheLabels[$cached];
                $ret['standardDeviation'][$label] = array();
                foreach ($stats[$cached] as $key => $val) {
                    $ret['standardDeviation'][$label][$key] = $testResults->getStandardDeviation($key, $cached);
                }
            }
        }

        // median
        if (!$this->hasInfoFlag(self::WITHOUT_MEDIAN)) {
            $ret['median'] = array();
            for ($cached = 0; $cached <= $cachedMax; $cached++) {
                $label = $cacheLabels[$cached];
                $medianRun = $testResults->getMedianRunNumber($medianMetric, $cached == 1 ? true : false);
                if ($medianRun) {
                    $ret['median'][$label] = $this->medianRunDataArray($testResults->getRunResult($medianRun, $cached));
                }
            }
        }

        // runs
        if (!$this->hasInfoFlag(self::WITHOUT_RUNS)) {
            $ret['runs'] = array();
            for ($run = 1; $run <= $runs; $run++) {
                $ret['runs'][$run] = array();
                for ($cached = 0; $cached <= $cachedMax; $cached++) {
                    $label = $cacheLabels[$cached];
                    $ret['runs'][$run][$label] = $this->runDataArray($testResults->getRunResult($run, $cached));
                }
            }
        }
        return $ret;
    }

    /**
     * @param TestRunResults $testRunResults Results of the median run
     * @return array Array with data about the median run that can be serialized as JSON
     */
    public function medianRunDataArray($testRunResults)
    {
        $runInfo = $this->basicRunInfoArray($testRunResults);
        if ($this->forceMultistep || $testRunResults->countSteps() > 1) {
            $medianInfo = $testRunResults->aggregateRawResults();
        } else {
            // in singlestep we simply give back the results of the first step
            $medianInfo = $this->stepDataArray($testRunResults->getStepResult(1));
        }
        return array_merge($runInfo, $medianInfo);
    }

    /**
     * @param TestRunResults $testRunResults Results of the run
     * @return array Array with data about the run that can be serialized as JSON
     */
    public function runDataArray($testRunResults)
    {
        if (!$testRunResults) {
            return [];
        }

        $runInfo = $this->basicRunInfoArray($testRunResults);
        $numSteps = $testRunResults->countSteps();

        if ($this->forceMultistep || $numSteps > 1) {
            $stepResults = array("steps" => array());
            for ($step = 1; $step <= $numSteps; $step++) {
                $testStepResult = $testRunResults->getStepResult($step);
                $eventName = empty($testStepResult) ? "" : $testStepResult->getEventName();
                $stepArray = $this->stepDataArray($testStepResult);
                $stepArray["id"] = $step;
                $stepArray["eventName"] = $eventName;
                $stepResults["steps"][] = $stepArray;
            }
        } else {
            // in singlestep we simply give back the results of the first step
            $stepResults = $this->stepDataArray($testRunResults->getStepResult(1));
        }
        return array_merge($runInfo, $stepResults);
    }

    /**
     * @param TestRunResults $testRunResults
     * @return array With numSteps, run, and tester info
     */
    private function basicRunInfoArray($testRunResults)
    {
        $ret = array();
        $run = $testRunResults->getRunNumber();
        $ret["numSteps"] = $testRunResults->countSteps();
        $ret['run'] = $run;
        $ret['tester'] = $this->testInfo->getTester($run);
        return $ret;
    }

    /**
     * Gather all of the data that we collect for a single run
     *
     * @param TestStepResult $testStepResult
     * @return array Array with run information which can be serialized as JSON
     */
    private function stepDataArray($testStepResult)
    {
        if (!$testStepResult) {
            return null;
        }
        $ret = $testStepResult->getRawResults();
        $ret['testID'] = $this->testInfo->getId();

        $run = $testStepResult->getRunNumber();
        $cached = $testStepResult->isCachedRun();
        $step = $testStepResult->getStepNumber();

        $url_friendly_dir = str_replace('./results/', '/result/', $this->testInfo->getRootDirectory());

        $localPaths = new TestPaths($this->testInfo->getRootDirectory(), $run, $cached, $step);
        $remotePaths = new TestPaths($this->urlStart . $url_friendly_dir, $run, $cached, $step);
        $nameOnlyPaths = new TestPaths("", $run, $cached, $step);
        $urlGenerator = UrlGenerator::create($this->friendlyUrls, $this->urlStart, $this->testInfo->getId(), $run, $cached, $step);
        $friendlyUrlGenerator = UrlGenerator::create(true, $this->urlStart, $this->testInfo->getId(), $run, $cached, $step);

        $basic_results = $this->hasInfoFlag(self::BASIC_INFO_ONLY);

        $ret['pages'] = array();
        $ret['pages']['details'] = $urlGenerator->resultPage("details");
        $ret['pages']['checklist'] = $urlGenerator->resultPage("performance_optimization");
        $ret['pages']['breakdown'] = $urlGenerator->resultPage("breakdown");
        $ret['pages']['domains'] = $urlGenerator->resultPage("domains");
        $ret['pages']['screenShot'] = $urlGenerator->resultPage("screen_shot");
        $ret['pages']['opportunities'] = $urlGenerator->resultPage("experiments");

        $ret['thumbnails'] = array();
        $ret['thumbnails']['waterfall'] = $friendlyUrlGenerator->thumbnail("waterfall.png");
        $ret['thumbnails']['checklist'] = $friendlyUrlGenerator->thumbnail("optimization.png");
        $ret['thumbnails']['screenShot'] = $friendlyUrlGenerator->thumbnail("screen.png");

        $ret['images'] = array();
        $ret['images']['waterfall'] = $friendlyUrlGenerator->generatedImage("waterfall");
        $ret['images']['connectionView'] = $friendlyUrlGenerator->generatedImage("connection");
        $ret['images']['checklist'] = $friendlyUrlGenerator->optimizationChecklistImage();
        if ($this->fileHandler->fileExists($localPaths->screenShotFile())) {
            $ret['images']['screenShot'] = $urlGenerator->getFile($nameOnlyPaths->screenShotFile());
        }
        if ($this->fileHandler->fileExists($localPaths->screenShotPngFile())) {
            $ret['images']['screenShotPng'] = $urlGenerator->getFile($nameOnlyPaths->screenShotPngFile());
            if (!isset($ret['images']['screenShot'])) {
                $ret['images']['screenShot'] = $ret['images']['screenShotPng'];
            }
        }
        if ($this->fileHandler->fileExists($localPaths->renderedVideoFile())) {
            $ret['video'] = $urlGenerator->getFile($nameOnlyPaths->renderedVideoFile());
        }

        $ret['rawData'] = array();
        if ($this->fileHandler->gzFileExists($localPaths->devtoolsScriptTimingFile())) {
            $ret['rawData']['scriptTiming'] = $urlGenerator->getGZip($nameOnlyPaths->devtoolsScriptTimingFile());
        }
        $ret['rawData']['headers'] = $remotePaths->headersFile();
        $ret['rawData']['pageData'] = $remotePaths->pageDataFile();
        $ret['rawData']['requestsData'] = $remotePaths->requestDataFile();
        $ret['rawData']['utilization'] = $remotePaths->utilizationFile();
        if ($this->fileHandler->fileExists($localPaths->bodiesFile())) {
            $ret['rawData']['bodies'] = $remotePaths->bodiesFile();
        }
        if ($this->fileHandler->gzFileExists($localPaths->devtoolsTraceFile())) {
            $ret['rawData']['trace'] = $urlGenerator->getGZip($nameOnlyPaths->devtoolsTraceFile() . ".gz");
        }

        if (!$basic_results) {
            $ret = array_merge($ret, $this->getAdditionalInfoArray($testStepResult, $urlGenerator, $nameOnlyPaths));
        }
        return $ret;
    }

    private function hasInfoFlag($flag)
    {
        return in_array($flag, $this->infoFlags);
    }

    /**
     * @param Array $times An array of potential long task times
     * @param Timestamp $start The starting time stamp
     * @param Timestamp $end The ending time stamp
     * @return array A new array of merged long task times
     *
     */
    private function MergeBlockingTime($times, $start, $end)
    {
        $merged = false;
        // See if it overlaps with an existing window
        for ($i = 0; $i < count($times) && !$merged; $i++) {
            $s = $times[0];
            $e = $times[1];
            if (
                ($start >= $s && $start <= $e) ||
                ($end >= $s && $end <= $e) ||
                ($s >= $start && $s <= $end) ||
                ($e >= $start && $e <= $end)
            ) {
                $times[0] = min($start, $s);
                $times[1] = max($end, $e);
                $merged = true;
            }
        }

        if (!$merged) {
            $times[] = array($start, $end);
        }

        return $times;
    }

    /**
     * @param TestStepResult $testStepResult The test results of this step
     * @return array Array with the long task information for each request in the step
     */
    private function getLongTaskData($testStepResult)
    {
        $run = $testStepResult->getRunNumber();
        $cached = $testStepResult->isCachedRun();
        $step = $testStepResult->getStepNumber();

        $localPaths = new TestPaths($this->testInfo->getRootDirectory(), $run, $cached, $step);
        $timingsFile = $localPaths->devtoolsScriptTimingFile();

        $long_tasks = null;
        if (isset($timingsFile) && strlen($timingsFile) && gz_is_file($timingsFile)) {
            $timings = json_decode(gz_file_get_contents($timingsFile), true);
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
                                if ($end - $start > 50) {
                                    if (!isset($long_tasks[$url])) {
                                        $long_tasks[$url] = array();
                                    }
                                    $long_tasks[$url] = $this->MergeBlockingTime($long_tasks[$url], $start, $end);
                                }
                            }
                        }
                    }
                }
            }
        }
        // now that we have a neat merged list of long tasks, we need to get a total of the blocking time
        foreach ($long_tasks as $url => $tasks) {
            //grab duration
            $duration = 0;
            foreach ($tasks as $task) {
                $duration += $task[1] - $task[0];
            }
            $long_tasks[$url]['blockingTime'] = $duration;
        }
        return $long_tasks;
    }

    /**
     * @param TestStepResult $testStepResult The test results of this step
     * @param UrlGenerator $urlGenerator For video frame URL generation for this tep
     * @param TestPaths $nameOnlyPaths To get the name of the video dir for this step
     * @return array Array with the additional information about this step
     */
    private function getAdditionalInfoArray($testStepResult, $urlGenerator, $nameOnlyPaths)
    {
        $ret = array();
        $progress = $testStepResult->getVisualProgress();
        if (array_key_exists('frames', $progress) && is_array($progress['frames']) && count($progress['frames'])) {
            $ret['videoFrames'] = array();
            foreach ($progress['frames'] as $ms => $frame) {
                $videoFrame = array('time' => $ms);
                $videoFrame['image'] = $urlGenerator->getFile($frame['file'], $nameOnlyPaths->videoDir());
                $videoFrame['VisuallyComplete'] = $frame['progress'];
                $ret['videoFrames'][] = $videoFrame;
            }
        }

        $requests = $testStepResult->getRequests();

        $ret['domains'] = $testStepResult->getDomainBreakdown();
        $ret['breakdown'] = $testStepResult->getMimeTypeBreakdown();

        // add requests
        if (!$this->hasInfoFlag(self::WITHOUT_REQUESTS)) {
            $longTasks = $this->getLongTaskData($testStepResult);

            //now we have our long tasks, by URL, so let's merge into

            // Only allocate the long tasks to the first occurence of a given URL
            $used = array();
            foreach ($requests as &$request) {
                if (isset($request['full_url']) && isset($longTasks[$request['full_url']]) && !isset($used[$request['full_url']])) {
                    $used[$request['full_url']] = true;
                    $request['blockingTime'] = $longTasks[$request['full_url']]['blockingTime'];
                }
            }

            $ret['requests'] = $requests;
        }

        // Check to see if we're adding the console log
        if (!$this->hasInfoFlag(self::WITHOUT_CONSOLE)) {
            $console_log = $testStepResult->getConsoleLog();
            if (isset($console_log)) {
                $ret['consoleLog'] = $console_log;
            }
        }

        $statusMessages = $testStepResult->getStatusMessages();
        if ($statusMessages) {
            $ret['status'] = $statusMessages;
            return $ret;
        }
        return $ret;
    }
}
