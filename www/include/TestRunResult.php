<?php

require_once __DIR__ . '/FileHandler.php';
require_once __DIR__ . '/../devtools.inc.php';
require_once __DIR__ . '/../common_lib.inc';

class TestRunResult {

  /**
   * @var TestInfo
   */
  private $testInfo;
  /**
   * @var FileHandler
   */
  private $fileHandler;
  private $rawData;
  private $run;
  private $cached;

  private function __construct($testInfo, &$pageData, $run, $cached, $fileHandler = null) {
    // This isn't likely to stay the standard constructor, so we name it explicitly as a static function below
    $this->testInfo = $testInfo;
    $this->rawData = &$pageData;
    $this->run = intval($run);
    $this->cached = $cached ? true : false;
    $this->fileHandler = $fileHandler ? $fileHandler : new FileHandler();
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
    return $this->rawData;
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

  public function getMimeTypeBreakdown() {
    // TODO: move implementation to this method
    $requests = null;
    return getBreakdown($this->testInfo->getId(), $this->testInfo->getRootDirectory(), $this->run,
                        $this->cached ? 1 : 0, $requests);
  }

  public function getConsoleLog() {
    // TODO: move implementation to this method, or encapsulate in another object
    return DevToolsGetConsoleLog($this->testInfo->getRootDirectory(), $this->run, $this->cached ? 1 : 0);
  }

  /**
   * Gets the status messages for this run
   * @return array An array with array("time" => <timestamp>, "message" => <the actual Message>) for each message, or null
   */
  public function getStatusMessages() {
    $localPaths = new TestPaths($this->testInfo->getRootDirectory(), $this->run, $this->cached);
    $statusFile = $localPaths->statusFile();
    if (!$this->fileHandler->gzFileExists($statusFile)) {
      return null;
    }

    $statusMessages = array();
    foreach($this->fileHandler->gzReadFile($statusFile) as $line) {
      $line = trim($line);
      if (!strlen($line)) {
        continue;
      }
      $parts = explode("\t", $line);
      $statusMessages[] = array("time" => $parts[0], "message" => $parts[1]);
    }
    return $statusMessages;
  }


  private function getStartOffset() {
    if (!array_key_exists('testStartOffset', $this->rawData)) {
      return 0;
    }
    return intval(round($this->rawData['testStartOffset']));
  }
}