<?php

require_once __DIR__ . '/TestStepResult.php';

class TestRunResults {

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
}