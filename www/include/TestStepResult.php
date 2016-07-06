<?php

require_once __DIR__ . '/FileHandler.php';
require_once __DIR__ . '/../devtools.inc.php';
require_once __DIR__ . '/../common_lib.inc';
require_once __DIR__ . '/../domains.inc';
require_once __DIR__ . '/../breakdown.inc';
require_once __DIR__ . '/../video/visualProgress.inc.php';

class TestStepResult {

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
  private $step;
  private $localPaths;

  private function __construct($testInfo, &$pageData, $run, $cached, $step, $fileHandler = null) {
    // This isn't likely to stay the standard constructor, so we name it explicitly as a static function below
    $this->testInfo = $testInfo;
    $this->rawData = &$pageData;
    $this->run = intval($run);
    $this->cached = $cached ? true : false;
    $this->step = $step;
    $this->fileHandler = $fileHandler ? $fileHandler : new FileHandler();
    $this->localPaths = new TestPaths($this->testInfo->getRootDirectory(), $this->run, $this->cached, $this->step);
  }

  /**
   * Creates a TestResult instance from a pageResults array with all data about a run
   * @param TestInfo $testInfo Related test information
   * @param array $pageData The pageData array with test results
   * @param int $run The run to return the data for
   * @param bool $cached False for first view, true for repeat view
   * @param int $step The step number
   * @return TestStepResult The created instance
   */
  public static function fromPageData($testInfo, &$pageData, $run, $cached, $step) {
    return new self($testInfo, $pageData, $run, $cached, $step);
  }

  /**
   * Creates a TestResult instance by loading the results from file system
   * @param TestInfo $testInfo Related test information
   * @param int $runNumber The run to return the data for, starting from 1
   * @param bool $isCached False for first view, true for repeat view
   * @param int $stepNumber The step number, starting from 1
   * @param FileHandler $fileHandler The FileHandler to use
   * @return TestStepResult|null The created instance on success, null otherwise
   */
  public static function fromFiles($testInfo, $runNumber, $isCached, $stepNumber, $fileHandler = null) {
    // no support to use FileHandler so far
    $localPaths = new TestPaths($testInfo->getRootDirectory(), $runNumber, $isCached, $stepNumber);
    $runCompleted = $testInfo->isRunComplete($runNumber);
    $pageData = loadPageStepData($localPaths, $runCompleted, null, $testInfo->getInfoArray());
    return new self($testInfo, $pageData, $runNumber, $isCached, $stepNumber);
  }

  public function getUrlGenerator($baseUrl, $friendly = true) {
    return UrlGenerator::create($friendly, $baseUrl, $this->testInfo->getRootDirectory(), $this->run, $this->cached);
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
   * @return int The step number
   */
  public function getStepNumber() {
    return $this->step;
  }

  /**
   * @return array Raw result data
   */
  public function getRawResults() {
    return $this->rawData;
  }

  /**
   * @return bool True if the step is successful, false otherwise
   */
  public function isSuccessful() {
    if (!isset($this->rawData["result"])) {
      return false;
    }
    return $this->rawData["result"] == 0 || $this->rawData["result"] == 99999;
  }

  /**
   * @return string The URL of this step
   */
  public function getUrl() {
    return isset($this->rawData["URL"]) ? $this->rawData["URL"] : null;
  }

  /**
   * @var string $metric The metric to return
   * @return mixed|null The metric value or null if not set
   */
  public function getMetric($metric) {
    if (!isset($this->rawData[$metric])) {
      return null;
    }
    return $this->rawData[$metric];
  }

  /**
   * @return string The event name if set, or an empty string
   */
  public function getEventName() {
    if (!isset($this->rawData["eventName"])) {
      return "";
    }
    return $this->rawData["eventName"];
  }

  public function hasCustomEventName() {
    return (!empty($this->rawData["eventName"]) && $this->rawData["eventName"] != $this->standardEventName());
  }

  /**
   * @return string The score
   */
  public function getPageSpeedScore() {
    // TODO: move implementation to this method
    if ($this->fileHandler->gzFileExists($this->localPaths->pageSpeedFile())) {
      return GetPageSpeedScore($this->localPaths->pageSpeedFile());
    }
  }

  public function getVisualProgress() {
    // TODO: move implementation to this method
    if (!$this->fileHandler->dirExists($this->localPaths->videoDir())) {
      return array();
    }
    return GetVisualProgressForStep($this->localPaths, $this->testInfo->isRunComplete($this->run), null, null,
      $this->getStartOffset());
  }

  public function getRequests() {
    // TODO: move implementation to this method
    return getRequestsForStep($this->localPaths, $this->getUrlGenerator(""), $secure, $haveLocations, false, true);
  }

  public function getDomainBreakdown() {
    // TODO: move implementation to this method
    return getDomainBreakdownForRequests($this->getRequests());
  }

  public function getMimeTypeBreakdown() {
    // TODO: move implementation to this method
    $requests = null;
    return getBreakdownForStep($this->localPaths, $this->getUrlGenerator(""), $requests);
  }

  public function getConsoleLog() {
    // TODO: move implementation to this method, or encapsulate in another object
    return DevToolsGetConsoleLogForStep($this->localPaths);
  }

  /**
   * Gets the status messages for this run
   * @return array An array with array("time" => <timestamp>, "message" => <the actual Message>) for each message, or null
   */
  public function getStatusMessages() {
    $statusFile = $this->localPaths->statusFile();
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

  private function standardEventName() {
    return "Step " . $this->step;
  }
}