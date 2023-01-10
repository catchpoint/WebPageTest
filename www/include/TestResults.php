<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

require_once INCLUDES_PATH . '/include/FileHandler.php';
require_once INCLUDES_PATH . '/include/TestStepResult.php';
require_once INCLUDES_PATH . '/include/TestRunResults.php';
require_once INCLUDES_PATH . '/include/Browser.php';


class TestResults
{
  /**
   * @var TestInfo Information about the test
   */
    private $testInfo;

  /**
   * @var FileHandler The file handler to use
   */
    private $fileHandler;

    private $firstViewAverage;
    private $repeatViewAverage;

    private $numRuns;

  /**
   * @var TestRunResults[][] First dimensions is the run number starting from 0, second if cached (0/1)
   */
    private $runResults;


    private function __construct($testInfo, $runResults, $fileHandler = null)
    {
        $this->testInfo = $testInfo;
        $this->fileHandler = $fileHandler;

        $this->runResults = $runResults;
        $this->numRuns = count($this->runResults);
    }

  /**
   * Constructs a TestResults object by loading the information from result files
   * @param TestInfo $testInfo Test information used to load the data
   * @param FileHandler $fileHandler FileHandler to use
   * @param array $options Options to load the TestRunResults
   * @return TestResults The new instance
   */
    public static function fromFiles($testInfo, $fileHandler = null)
    {
        $runResults = array();
        $numRuns = $testInfo->getRuns();
        $firstViewOnly = $testInfo->isFirstViewOnly();
        $testComplete = $testInfo->isComplete();
        for ($runNumber = 1; $runNumber <= $numRuns; $runNumber++) {
            if (!$testComplete) {
                continue;
            }
            $firstView = TestRunResults::fromFiles($testInfo, $runNumber, false, $fileHandler);
            $repeatView = $firstViewOnly ? null : TestRunResults::fromFiles($testInfo, $runNumber, true, $fileHandler);
            $runResults[] = array($firstView, $repeatView);
        }

        return new self($testInfo, $runResults, $fileHandler);
    }

  /**
   * Constructs a TestResults object with the given pageData (singlestep support only)
   * @param TestInfo $testInfo Test information used to load the data
   * @param array $pageData Array with the pageData of all runs
   * @return TestResults The new instance
   */
    public static function fromPageData($testInfo, $pageData)
    {
        $runResults = array();
        $run = 1;
        foreach ($pageData as $runs) {
            $fv = self::singlestepRunFromPageData($testInfo, $run, false, $runs);
            $rv = self::singlestepRunFromPageData($testInfo, $run, true, $runs);
            $runResults[] = array($fv, $rv);
            $run++;
        }
        return new self($testInfo, $runResults);
    }

  /**
   * @return int Number of runs in this test
   */
    public function countRuns()
    {
        return $this->numRuns;
    }

  /**
   * @param bool $cached False if successful first views should be counted (default), true for repeat view
   * @return int Number of successful (cached) runs in this test
   */
    public function countSuccessfulRuns($cached = false)
    {
        return count($this->filterRunResults($cached, true));
    }

  /**
   * @return string Returns the URL from the first step of the first view of the first run
   */
    public function getUrlFromRun()
    {
        $runResult = $this->getRunResult(1, false);
        if (isset($runResult)) {
            $stepResult = $runResult->getStepResult(1);
            if (isset($stepResult)) {
                return $stepResult->getUrl();
            }
        }
        return null;
    }

  /**
   * @param int $run The run number, starting from 1
   * @param bool $cached False for first view, true for repeat view
   * @return TestRunResults|null Result of the run, if exists. null otherwise
   */
    public function getRunResult($run, $cached)
    {
        $runIdx = $run - 1;
        $cacheIdx = $cached ? 1 : 0;
        if (empty($this->runResults[$runIdx][$cacheIdx])) {
            return null;
        }
        return $this->runResults[$runIdx][$cacheIdx];
    }

  /**
   * @return array The average values of all first views
   */
    public function getFirstViewAverage()
    {
        if (empty($this->firstViewAverage)) {
            $this->firstViewAverage = $this->calculateAverages(false);
        }
        return $this->firstViewAverage;
    }

  /**
   * @return array The average values of all repeat views
   */
    public function getRepeatViewAverage()
    {
        if (empty($this->repeatViewAverage)) {
            $this->repeatViewAverage = $this->calculateAverages(true);
        }
        return $this->repeatViewAverage;
    }

  /**
   * @param string $metric Name of the metric to compute the standard deviation for
   * @param bool $cached False if first views should be considered, true for repeat views
   * @return float The standard deviation of the metric in all (cached) runs
   */
    public function getStandardDeviation($metric, $cached)
    {
        $values = array();
        $sum = 0.0;
        foreach ($this->filterRunResults($cached, true) as $runResult) {
            $value = $runResult->aggregateMetric($metric);
            if ($value !== null) {
                $values[] = $value;
                $sum += $value;
            }
        }
        $numValues = count($values);
        if ($numValues < 1) {
            return null;
        }

        $average = $sum / $numValues;
        $stdDev = 0.0;
        foreach ($values as $value) {
            $stdDev += pow($value - $average, 2);
        }
        return (int) sqrt($stdDev / $numValues);
    }

  /**
   * @param string $metric Name of the metric to consider for selecting the median
   * @param bool $cached False if first views should be considered for selecting, true for repeat views
   * @param string $medianMode Can be set to "fastest" to consider the fastest run and not the median. Defaults to "median".
   * @return float The run number of the median run
   */
    public function getMedianRunNumber($metric, $cached, $medianMode = "median")
    {
        $values = $this->getMetricFromRuns($metric, $cached, true);
        if (count($values) == 0) {
            $values = $this->getMetricFromRuns($metric, $cached, false);
        }
        $numValues = count($values);
        if ($numValues == 0) {
          // fall back to loadTime if possible
            if ($metric != "loadTime") {
                return $this->getMedianRunNumber("loadTime", $cached, $medianMode);
            }
            return null;
        }
      // we are interested in the keys (run numbers), but sort by value
        asort($values);
        $runNumbers = array_keys($values);
        if ($numValues == 1 || $medianMode == "fastest") {
            return $runNumbers[0];
        }
        $medianIndex = (int)floor((float)($numValues - 1.0) / 2.0);
        return $runNumbers[$medianIndex];
    }

  /** Return the lighthouse results (from JSON) */
    public function getLighthouseResult()
    {
        $lighthouse = null;
        $localPaths = new TestPaths($this->testInfo->getRootDirectory(), 1, 0, 1);
        $lighthouse_file = $localPaths->lighthouseJsonFile();
        if (gz_is_file($lighthouse_file)) {
            $result = json_decode(gz_file_get_contents($lighthouse_file), true);
            if (isset($result) && is_array($result)) {
                $lighthouse = $result;
            }
        }
        return $lighthouse;
    }

  /** Return the lighthouse log contents */
    public function getLighthouseLog()
    {
        $log = null;
        $localPaths = new TestPaths($this->testInfo->getRootDirectory(), 1, 0, 1);
        $log_file = $localPaths->lighthouseLogFile();
        if (gz_is_file($log_file)) {
            $log = gz_file_get_contents($log_file);
            if (isset($log) && !strlen($log)) {
                $log = null;
            }
        }
        return $log;
    }

    public function getBrowser()
    {
        $rawResultsFirstRunFirstStep = $this->getRunResult(1, false)->getStepResult(1)->getRawResults();
        if (
            isset($rawResultsFirstRunFirstStep) &&
            isset($rawResultsFirstRunFirstStep['browser_name']) &&
            isset($rawResultsFirstRunFirstStep['browser_version'])
        ) {
            return new Browser(
                $rawResultsFirstRunFirstStep['browser_name'],
                $rawResultsFirstRunFirstStep['browser_version']
            );
        } else {
            return null;
        }
    }

    private function calculateAverages($cached)
    {
        $avgResults = array();
        $loadTimes = array();
        $countRuns = 0;

        foreach ($this->filterRunResults($cached, true) as $run) {
            if (!$run || !$run->isSuccessful()) {
                continue;
            }
            $countRuns++;

            foreach ($run->aggregateRawResults() as $metric => $value) {
                if (!isset($avgResults[$metric])) {
                    $avgResults[$metric] = 0;
                }
                $avgResults[$metric] += $value;
                if ($metric == "loadTime") {
                    $loadTimes[$run->getRunNumber()] = $value;
                }
            }
        }

        foreach ($avgResults as $metric => $value) {
            $avgResults[$metric] /= (double) $countRuns;
        }

        $minDist = 10000000000;
        foreach ($loadTimes as $runNumber => $loadTime) {
            $dist = abs($loadTime - $avgResults["loadTime"]);
            if ($dist < $minDist) {
                $avgResults["avgRun"] = $runNumber;
                $minDist = $dist;
            }
        }

        return $avgResults;
    }

  /**
   * @param bool $cached False for first views, true for repeat views (cached)
   * @param bool $successfulOnly True if only successful runs should be returned
   * @return TestRunResults[] An array of TestRunResults objects, the indices don't match the run number
   */
    private function filterRunResults($cached, $successfulOnly = true)
    {
        $runResults = array();
        $cachedIdx = $cached ? 1 : 0;
        for ($i = 0; $i < $this->numRuns; $i++) {
            if (empty($this->runResults[$i][$cachedIdx])) {
                continue;
            }

            $runResult = $this->runResults[$i][$cachedIdx];
            if ($successfulOnly && !$runResult->isSuccessful()) {
                continue;
            }

            $runResults[] = $runResult;
        }
        return $runResults;
    }

  /**
   * @param string $metric Name of the metric to consider
   * @param bool $cached False if first views should be considered for selecting, true for repeat views
   * @param bool $successfulOnly True if only successful runs should be returned
   */
    public function getMetricFromRuns($metric, $cached, $successfulOnly)
    {
        $values = array();
        foreach ($this->filterRunResults($cached, $successfulOnly) as $run) {
            $value = $run->aggregateMetric($metric, $successfulOnly);
            if ($value !== null) {
                $values[$run->getRunNumber()] = $value;
            }
        }
        return $values;
    }

    private static function singlestepRunFromPageData($testInfo, $runNumber, $cached, &$runs)
    {
        $cacheIdx = $cached ? 1 : 0;
        if (empty($runs[$cacheIdx])) {
            return null;
        }
        $step = TestStepResult::fromPageData($testInfo, $runs[$cacheIdx], $runNumber, $cached, 1);
        return TestRunResults::fromStepResults($testInfo, $runNumber, $cached, array($step));
    }
}
