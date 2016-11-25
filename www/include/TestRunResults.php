<?php

require_once __DIR__ . '/TestStepResult.php';

class TestRunResults {

  /**
   * @var TestInfo
   */
  private $testInfo;
  private $runNumber;
  private $isCached;
  /**
   * @var TestStepResult[] Step results in this run
   */
  private $stepResults;
  private $numSteps;

  private function __construct($testInfo, $runNumber, $isCached, $stepResults) {
    $this->testInfo = $testInfo;
    $this->stepResults = array_values($stepResults);
    $this->runNumber = intval($runNumber);
    $this->isCached = $isCached ? true : false;
    $this->numSteps = count($stepResults);
  }

  /**
   * Constructs a new TestRunResults object from multiple TestStepResults
   * @param TestInfo $testInfo Associated test info
   * @param int $runNumber The run number
   * @param bool $isCached False for first view, true for repeat view (cached)
   * @param array $stepResults An array with the steps in this run (should be in order, but gets reindexed)
   * @return TestRunResults The initialized object
   */
  public static function fromStepResults($testInfo, $runNumber, $isCached, $stepResults) {
    return new self($testInfo, $runNumber, $isCached, $stepResults);
  }

  /**
   * Constructs a new TestRunResults object by loading the results from the file system
   * @param TestInfo $testInfo Associated test info
   * @param int $runNumber The run number
   * @param bool $isCached False for first view, true for repeat view (cached)
   * @param FileHandler $fileHandler The FileHandler to use
   * @param array $options Options for loading the TestStepData
   * @return TestRunResults|null The initialized object or null if it failed
   */
  public static function fromFiles($testInfo, $runNumber, $isCached, $fileHandler = null, $options = null) {
    $stepResults = array();
    $isValid = false;
    for ($stepNumber = 1; $stepNumber <= $testInfo->stepsInRun($runNumber); $stepNumber++) {
      $stepResult = TestStepResult::fromFiles($testInfo, $runNumber, $isCached, $stepNumber, $fileHandler, $options);
      $stepResults[] = $stepResult;
      $isValid = $isValid || ($stepResult !== null);
    }
    return $isValid ? new self($testInfo, $runNumber, $isCached, $stepResults) : null;
  }

  /**
   * @return int The run number
   */
  public function getRunNumber() {
    return $this->runNumber;
  }

  /**
   * @return bool False for first view, true for repeat view (cached)
   */
  public function isCachedRun() {
    return $this->isCached;
  }

  /**
   * @return int Number of steps in this run
   */
  public function countSteps() {
    return $this->numSteps;
  }

  /**
   * @return bool True if there is at least one valid step, false otherwise
   */
  public function isValid() {
    foreach ($this->getStepResults() as $stepResult) {
      if ($stepResult->isValid()) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param int $stepNum The step number to get the result for, starting from 1
   * @return TestStepResult Step result data
   */
  public function getStepResult($stepNum) {
    if ($stepNum > $this->numSteps) {
      return null;
    }
    return $this->stepResults[$stepNum - 1];
  }

  /**
   * @return TestStepResult[] Step result data for all steps in order. Keys are *not* step number
   */
  public function getStepResults() {
    return $this->stepResults;
  }

  /**
   * @return bool True if all steps are successful, false otherwise
   */
  public function isSuccessful() {
    foreach ($this->stepResults as $stepResult) {
      if (!$stepResult->isSuccessful()) {
        return false;
      }
    }
    return true;
  }

  /**
   * @return bool True if the run contains more than one step, false otherwise.
   */
  public function isMultistep() {
    return $this->countSteps() > 1;
  }

  /**
   * @return array The aggregated numeric raw results of the different steps
   */
  public function aggregateRawResults() {
    $aggregated = array();
    foreach ($this->stepResults as $step) {
      if (!$step->isSuccessful()) {
        continue;
      }

      $rawData = $step->getRawResults();
      foreach ($rawData as $metric => $value) {
        if (!is_numeric($value)) {
          continue;
        }
        if (!isset($aggregated[$metric])) {
          $aggregated[$metric] = 0;
        }
        $aggregated[$metric] += $value;
      }
    }
    return $aggregated;
  }

  /**
   * @param string $metric The numeric metric to aggregate
   * @param bool $successfulOnly True if only successful steps should be considered (default), false otherwise
   * @return double|null The aggregated metric from all (succesful) steps of this run
   */
  public function aggregateMetric($metric, $successfulOnly = true) {
    $foundMetric = false;
    $aggregated = (double) 0;
    foreach ($this->stepResults as $step) {
      if ($successfulOnly && !$step->isSuccessful()) {
        continue;
      }
      $value = $step->getMetric($metric);
      if ($value === null || !is_numeric($value)) {
        continue;
      }
      $aggregated += $value;
      $foundMetric = true;
    }
    return $foundMetric ? $aggregated : null;
  }

  /**
   * @return float|null The average page speed score of all steps (if set)
   */
  public function averagePageSpeedScore() {
    $numScores = 0;
    $scoreSum = 0.0;
    foreach ($this->stepResults as $step) {
      $score = $step->getPageSpeedScore();
      if ($score) {
        $numScores += 1;
        $scoreSum += intval($score);
      }
    }
    if ($numScores == 0) {
      return null;
    }
    return ceil($scoreSum / $numScores);
  }

  /**
   * @return null|string The first valid pageSpeedVersion of a step, or null
   */
  public function getPageSpeedVersion() {
    foreach ($this->stepResults as $step) {
      $version = $step->getMetric("pageSpeedVersion");
      if ($version) {
        return $version;
      }
    }
    return null;
  }

  /**
   * @param string[] $keywords Keywords to use for the check
   * @return bool True if the checked site is an adult site, false otherwise
   */
  public function isAdultSite($keywords) {
    if ($this->testInfo->isAdultSite($keywords)) {
      return true;
    }
    foreach ($this->stepResults as $step) {
      if ($step->isAdultSite($keywords)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param string $metric The metric to compute the average of all steps
   * @return float|null The average metric for all steps having it set or null if not set in any step
   */
  public function averageMetric($metric) {
    $sum = 0.0;
    $numValues = 0;
    foreach ($this->stepResults as $stepResult) {
      $value = $stepResult->getMetric($metric);
      if (isset($value)) {
        $numValues++;
        $sum += floatval($value);
      }
    }
    if ($numValues == 0) {
      return null;
    }
    return $sum / $numValues;
  }

  /**
   * @param string $metric The metric to check for
   * @return bool True if the metric is present in any step, false otherwise
   */
  public function hasValidMetric($metric) {
    foreach ($this->stepResults as $stepResult) {
      $value = $stepResult->getMetric($metric);
      if (!empty($value)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param string $metric The metric to check for
   * @return bool True if the metric is present and > 0 in any step, false otherwise
   */
  public function hasValidNonZeroMetric($metric) {
    foreach ($this->stepResults as $stepResult) {
      $value = $stepResult->getMetric($metric);
      if (!empty($value) && $value > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * @return bool True if any step si optimization checked, false otherwise
   */
  public function isOptimizationChecked() {
    foreach ($this->stepResults as $stepResult) {
      if ($stepResult->getMetric("optimization_checked")) {
        return true;
      }
    }
    return false;
  }

  public function hasBreakdownTimeline() {
    foreach ($this->stepResults as $stepResult) {
      if ($stepResult->hasBreakdownTimeline()) {
        return true;
      }
    }
    return false;
  }
}