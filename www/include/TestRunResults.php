<?php

require_once __DIR__ . '/TestStepResult.php';

class TestRunResults {

  private $testInfo;
  private $runNumber;
  private $isCached;
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
   * @param int $stepNum The step number to get the result for
   * @return TestStepResult Step result data
   */
  public function getStepResult($stepNum) {
    if ($stepNum > $this->numSteps) {
      return null;
    }
    return $this->stepResults[$stepNum - 1];
  }

  /**
   * @return array The aggregated numeric raw results of the different steps
   */
  public function aggregateRawResults() {
    $aggregated = array();
    foreach ($this->stepResults as $step) {
      /* @var TestStepResult $step */
      $rawData = $step->getRawResults();
      foreach ($rawData as $metric => $value) {
        if (!isset($aggregated[$metric])) {
          $aggregated[$metric] = 0;
        }
        $aggregated[$metric] += $value;
      }
    }
    return $aggregated;
  }
}