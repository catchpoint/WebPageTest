<?php

require_once __DIR__ . '/FileHandler.php';

// TODO: get rid of this as soon as we don't use loadAllPageData, etc anymore
require_once __DIR__ . '/../common_lib.inc';
require_once __DIR__ . '/../page_data.inc';

class TestResults {

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

  private $pageData;



  private function __construct($testInfo, $fileHandler = null) {
    $this->testInfo = $testInfo;
    $this->fileHandler = $fileHandler;
    $this->pageData = loadAllPageData($this->testInfo->getRootDirectory());
  }

  public static function fromFiles($testInfo, $fileHandler = null) {
    return new self($testInfo, $fileHandler);
  }

  /**
   * @return int Number of runs in this test
   */
  public function countRuns() {
    return max(array_keys($this->pageData));
  }

  /**
   * @param bool $cached False if successful first views should be counted (default), true for repeat view
   * @return int Number of successful (cached) runs in this test
   */
  public function countSuccessfulRuns($cached = false) {
    return CountSuccessfulTests($this->pageData, $cached ? 1 : 0);
  }

  /**
   * @return string Returns the URL from the first view of the first run
   */
  public function getUrlFromRun() {
    return empty($this->pageData[1][0]['URL']) ? "" : $this->pageData[1][0]['URL'];
  }

  /**
   * @param int $run The run number
   * @param bool $cached False for first view, true for repeat view
   * @return TestStepResult|null Result of the run, if exists. null otherwise
   */
  public function getRunResult($run, $cached) {
    if (empty($this->pageData[$run][$cached ? 1 : 0] ) ) {
      return null;
    }
    return TestStepResult::fromPageData($this->testInfo, $this->pageData[$run][$cached ? 1 : 0], $run, $cached);
  }

  /**
   * @return array The average values of all first views
   */
  public function getFirstViewAverage() {
    if (empty($this->firstViewAverage)) {
      $this->calculateAverages();
    }
    return $this->firstViewAverage;
  }

  /**
   * @return array The average values of all repeat views
   */
  public function getRepeatViewAverage() {
    if (empty($this->repeatViewAverage)) {
      $this->calculateAverages();
    }
    return $this->repeatViewAverage;
  }

  /**
   * @param string $metric Name of the metric to compute the standard deviation for
   * @param bool $cached False if first views should be considered, true for repeat views
   * @return float The standard deviation of the metric in all (cached) runs
   */
  public function getStandardDeviation($metric, $cached) {
    return PageDataStandardDeviation($this->pageData, $metric, $cached ? 1 : 0);
  }

  /**
   * @param string $metric Name of the metric to consider for selecting the median
   * @param bool $cached False if first views should be considered for selecting, true for repeat views
   * @return float The run number of the median run
   */
  public function getMedianRunNumber($metric, $cached) {
    return GetMedianRun($this->pageData, $cached ? 1 : 0, $metric);
  }

  private function calculateAverages() {
    calculatePageStats($this->pageData, $fv, $rv);
    $this->firstViewAverage = $fv;
    $this->repeatViewAverage = $rv;
  }

}