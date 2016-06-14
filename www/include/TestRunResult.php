<?php

class TestRunResult {

  /**
   * @var TestInfo
   */
  private $testInfo;
  private $pageData;
  private $run;
  private $cached;

  private function __construct($testInfo, &$pageData, $run, $cached) {
    // This isn't likely to stay the standard constructor, so we name it explicitly as a static function below
    $this->testInfo = $testInfo;
    $this->pageData = &$pageData;
    $this->run = intval($run);
    $this->cached = $cached ? true : false;
  }

  /**
   * Creates a TestResult instance from a pageResults array with all data about a run
   * @param TestInfo $testInfo Related test information
   * @param array $pageData The pageData array with test results
   * @param int $run The run to return the data for
   * @param bool $cached False for first view, true for repeat view
   * @return TestRunResult The created instance
   */
  public static function fromPageData($testInfo, &$pageData, $run, $cached) {
    return new self($testInfo, $pageData, $run, $cached);
  }

  /**
   * @return int The run number
   */
  public function getRunNumber() {
    return $this->run;
  }

  /**
   * @return boolean False if first view, true if repeat view
   */
  public function isCachedRun() {
    return $this->cached;
  }

  /**
   * @return array Raw result data
   */
  public function getRawResults() {
    return $this->pageData[$this->run][$this->cached ? 1 : 0];
  }

  /**
   * @return string The score
   */
  public function getPageSpeedScore() {
    // TODO: move implementation to this method
    $testPaths = new TestPaths($this->testInfo->getRootDirectory(), $this->run, $this->cached);
    return GetPageSpeedScore($testPaths->pageSpeedFile());
  }

  public function getVisualProgress() {
    // TODO: move implementation to this method
    return GetVisualProgress($this->testInfo->getRootDirectory(), $this->run, $this->cached ? 1 : 0,
                             null, null, $this->getStartOffset());
  }

  public function getRequests() {
    // TODO: move implementation to this method
    $secure = false;
    $haveLocations = false;
    return getRequests($this->testInfo->getId(), $this->testInfo->getRootDirectory(), $this->run,
                       $this->cached ? 1 : 0, $secure, $haveLocations, false, true);
  }

  public function getDomainBreakdown() {
    // TODO: move implementation to this method
    $requests = null;
    return getDomainBreakdown($this->testInfo->getId(), $this->testInfo->getRootDirectory(), $this->run,
                              $this->cached ? 1 : 0, $requests);
  }


  private function getStartOffset() {
    if (!array_key_exists('testStartOffset', $this->pageData[$this->run][$this->cached ? 1 : 0])) {
      return 0;
    }
    return intval(round($this->pageData[$this->run][$this->cached ? 1 : 0]['testStartOffset']));
  }
}