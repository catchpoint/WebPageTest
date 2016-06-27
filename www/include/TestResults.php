<?php

require_once __DIR__ . '/FileHandler.php';
require_once __DIR__ . '/TestStepResult.php';
require_once __DIR__ . '/TestRunResults.php';

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

  private $numRuns;

  private $pageData;
  /**
   * @var array 2D-Array of TestRunResults. First dimensions is the run number starting from 0, second if cached (0/1)
   */
  private $runResults;


  private function __construct($testInfo, $pageData, $fileHandler = null) {
    $this->testInfo = $testInfo;
    $this->fileHandler = $fileHandler;
    $this->pageData = $pageData;

    // for now this is singlestep until changes for multistep are finished in this class
    $this->runResults = array();
    $run = 1;
    foreach ($pageData as $runs) {
      $fv = self::singlestepRunFromPageData($testInfo, $run, false, $runs);
      $rv = self::singlestepRunFromPageData($testInfo, $run, true, $runs);
      $this->runResults[] = array($fv, $rv);
      $run++;
    }
    $this->numRuns = count($this->runResults);
  }

  private static function singlestepRunFromPageData($testInfo, $runNumber, $cached, &$runs) {
    $cacheIdx = $cached ? 1 : 0;
    if (empty($runs[$cacheIdx])) {
      return null;
    }
    $step = TestStepResult::fromPageData($testInfo, $runs[$cacheIdx], $runNumber, $cached, 1);
    return TestRunResults::fromStepResults($testInfo, $runNumber, $cached, array($step));
  }

  public static function fromFiles($testInfo, $fileHandler = null) {
    $pageData = loadAllPageData($testInfo->getRootDirectory());
    return new self($testInfo, $pageData, $fileHandler);
  }

  public static function fromPageData($testInfo, $pageData) {
    return new self($testInfo, $pageData);
  }

  /**
   * @return int Number of runs in this test
   */
  public function countRuns() {
    return $this->numRuns;
  }

  /**
   * @param bool $cached False if successful first views should be counted (default), true for repeat view
   * @return int Number of successful (cached) runs in this test
   */
  public function countSuccessfulRuns($cached = false) {
    $successful = 0;
    for ($i = 0; $i <= $this->numRuns; $i++) {
      $runResult = $this->getRunResult($i + 1, $cached);
      if (!empty($runResult) && $runResult->isSuccessful()) {
        $successful += 1;
      }
    }
    return $successful;
  }

  /**
   * @return string Returns the URL from the first view of the first run
   */
  public function getUrlFromRun() {
    return empty($this->pageData[1][0]['URL']) ? "" : $this->pageData[1][0]['URL'];
  }

  /**
   * @param int $run The run number, starting from 1
   * @param bool $cached False for first view, true for repeat view
   * @return TestRunResults|null Result of the run, if exists. null otherwise
   */
  public function getRunResult($run, $cached) {
    $runIdx = $run - 1;
    $cacheIdx = $cached ? 1 : 0;
    if (empty($this->runResults[$runIdx][$cacheIdx] ) ) {
      return null;
    }
    return $this->runResults[$runIdx][$cacheIdx];
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