<?php

require_once __DIR__ . '/FileHandler.php';
require_once __DIR__ . '/../devtools.inc.php';
require_once __DIR__ . '/../common_lib.inc';
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
   * @param FileHandler $fileHandler The FileHandler to use
   * @return TestStepResult The created instance
   */
  public static function fromPageData($testInfo, $pageData, $run, $cached, $step, $fileHandler = null) {
    return new self($testInfo, $pageData, $run, $cached, $step, $fileHandler);
  }

  /**
   * Creates a TestResult instance by loading the results from file system
   * @param TestInfo $testInfo Related test information
   * @param int $runNumber The run to return the data for, starting from 1
   * @param bool $isCached False for first view, true for repeat view
   * @param int $stepNumber The step number, starting from 1
   * @param FileHandler $fileHandler The FileHandler to use
   * @param array $options Options for the loadPageStepData
   * @return TestStepResult|null The created instance on success, null otherwise
   */
  public static function fromFiles($testInfo, $runNumber, $isCached, $stepNumber, $fileHandler = null, $options = null) {
    // no support to use FileHandler so far
    $localPaths = new TestPaths($testInfo->getRootDirectory(), $runNumber, $isCached, $stepNumber);
    $runCompleted = $testInfo->isRunComplete($runNumber);
    $pageData = loadPageStepData($localPaths, $runCompleted, $options, $testInfo->getInfoArray());
    return new self($testInfo, $pageData, $runNumber, $isCached, $stepNumber, $fileHandler);
  }

  /**
   * @return bool True if there is valid test step result data, false otherwise.
   */
  public function isValid() {
    return !empty($this->rawData) && is_array($this->rawData) &&
           ($this->getMetric("loadTime") || $this->getMetric("fullyLoaded"));
  }

  /**
   * @param string $baseUrl The base URL to use for the UrlGenerator
   * @param bool $friendly Optional. True for friendly URLS (default), false for standard URLs
   * @return UrlGenerator The created URL generator for this step
   */
  public function createUrlGenerator($baseUrl, $friendly = true) {
    return UrlGenerator::create($friendly, $baseUrl, $this->testInfo->getId(), $this->run, $this->cached, $this->step);
  }

  /**
   * @param string $testRoot Optional. A different test root path. If null, it's set to the default test root for local paths.
   * @return TestPaths The created TestPaths object for this step
   */
  public function createTestPaths($testRoot = null) {
    $testRoot = ($testRoot === null) ? $this->testInfo->getRootDirectory() : $testRoot;
    return new TestPaths($testRoot, $this->run, $this->cached, $this->step);
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

  /**
   * @return bool True if a custom event name was set for this step, false otherwise
   */
  public function hasCustomEventName() {
    return (!empty($this->rawData["eventName"]) && $this->rawData["eventName"] != $this->standardEventName());
  }

  /**
   * @param string $default Optional. A default value if no custom event name or URL is set
   * @return string A readable identifier for this step (Either custom event name, URL, $default, or "Step x")
   */
  public function readableIdentifier($default = "") {
    $identifier = $this->hasCustomEventName() ? $this->getEventName() : $this->getUrl();
    $identifier = empty($identifier) ? $default : $identifier;
    return empty($identifier) ? ("Step " . $this->step) : $identifier;
  }

  /**
   * @return string The score
   */
  public function getPageSpeedScore() {
    // TODO: move implementation to this method
    if ($this->fileHandler->gzFileExists($this->localPaths->pageSpeedFile())) {
      return GetPageSpeedScore($this->localPaths->pageSpeedFile());
    }
    return null;
  }

  public function getVisualProgress($end = null) {
    // TODO: move implementation to this method
    if (!$this->fileHandler->dirExists($this->localPaths->videoDir())) {
      return array();
    }
    return GetVisualProgressForStep($this->localPaths, $this->testInfo->isRunComplete($this->run), null, $end,
      $this->getStartOffset());
  }

  public function getRequestsWithInfo($addLocationData, $addRawHeaders) {
    $requests = getRequestsForStep($this->localPaths, $this->createUrlGenerator(""), $secure, $addRawHeaders);
    return new RequestsWithInfo($requests, $secure);
  }

  public function getRequests() {
    // TODO: move implementation to this method
    return getRequestsForStep($this->localPaths, $this->createUrlGenerator(""), $secure, true);
  }

  public function getDomainBreakdown() {
    $requests = $this->getRequests();
    $breakdown = array();
    $connections = array();
    foreach($requests as $request)
    {
      $domain = strtok($request['host'],':');
      $object = strtolower($request['url']);
      if( strlen($domain) && (strstr($object, 'favicon.ico') === FALSE) )
      {
        if( !array_key_exists($domain, $breakdown))
          $breakdown["$domain"] = array('bytes' => 0, 'requests' => 0);
        if( !array_key_exists($domain, $connections))
          $connections["$domain"] = array();
        $connections["$domain"][$request['socket']] = 1;

        if (array_key_exists('bytesIn', $request))
          $breakdown["$domain"]['bytes'] += $request['bytesIn'];
        $breakdown["$domain"]['requests']++;

        if (isset($request['cdn_provider']) && strlen($request['cdn_provider']))
          $breakdown[$domain]['cdn_provider'] = $request['cdn_provider'];
      }
    }
    foreach ($breakdown as $domain => &$data) {
      $data['connections'] = 0;
      if( array_key_exists($domain, $connections)) {
        $data['connections'] = count($connections[$domain]);
      }
    }

    // sort the array by reversed domain so the resources from a given domain are grouped
    uksort($breakdown, function($a, $b) {return strcmp(strrev($a), strrev($b));});
    return $breakdown;
  }

  public function getJSFriendlyDomainBreakdown($sorted=false) {
    $breakdown = $this->getDomainBreakdown();
    if ($sorted) {
      ksort($breakdown);
    }
    $jsFriendly = array();
    foreach ($breakdown as $domain => $data) {
      $entry = array();
      $entry['domain'] = $domain;
      $entry['bytes'] = $data['bytes'];
      $entry['requests'] = $data['requests'];
      $entry['connections'] = $data['connections'];
      if (isset($data['cdn_provider']))
        $entry['cdn_provider'] = $data['cdn_provider'];
      $jsFriendly[] = $entry;
    }
    return $jsFriendly;
  }

  public function getMimeTypeBreakdown() {
    // TODO: move implementation to this method
    $requests = null;
    return getBreakdownForStep($this->localPaths, $this->createUrlGenerator(""), $requests);
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

  /**
   * @param string[] $keywords Keywords to use for the check
   * @return bool True if the checked site is an adult site, false otherwise
   */
  public function isAdultSite($keywords) {
    if ($this->testInfo->isAdultSite($keywords)) {
      return true;
    }
    foreach ($keywords as $keyword) {
      if (!empty($this->rawData["adult_site"])) {
        return true;
      }
      if (!empty($this->rawData["URL"]) && stripos($this->rawData["URL"], $keyword) !== false) {
        return true;
      }
      if (!empty($this->rawData["title"]) && stripos($this->rawData["title"], $keyword) !== false) {
        return true;
      }
    }
    return false;
  }

  /**
   * @return bool True if the step has a breakdown timeline, false otherwise
   */
  public function hasBreakdownTimeline() {
    $info = $this->testInfo->getInfoArray();
    if (!isset($info) || empty($info["timeline"])) {
      return false;
    }
    return $this->fileHandler->gzFileExists($this->localPaths->devtoolsFile()) ||
           $this->fileHandler->gzFileExists($this->localPaths->devtoolsTraceFile());
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

class RequestsWithInfo {
  private $requests;
  private $locationData;
  private $secureRequests;

  public function __construct($requests, $hasSecureRequests) {
    $this->requests = $requests;
    $this->secureRequests = $hasSecureRequests;
  }

  public function getRequests() {
    return $this->requests;
  }

  public function hasSecureRequests() {
    return $this->secureRequests;
  }
}