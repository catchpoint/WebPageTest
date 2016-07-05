<?php

class JsonResultGenerator {

  const BASIC_INFO_ONLY = 1;
  const WITHOUT_AVERAGE = 2;
  const WITHOUT_STDDEV = 3;
  const WITHOUT_MEDIAN = 4;
  const WITHOUT_RUNS = 5;
  const WITHOUT_REQUESTS = 6;
  const WITHOUT_CONSOLE = 7;

  /* @var TestInfo */
  private $testInfo;
  private $urlStart;
  /* @var FileHandler */
  private $fileHandler;
  private $infoFlags;
  private $friendlyUrls;

  /**
   * JsonResultGenerator constructor.
   * @param TestInfo $testInfo Information about the test
   * @param string $urlStart Start for test related URLS
   * @param FileHandler $fileHandler FileHandler to be used. Optional
   * @param array $infoFlags Array of WITHOUT_* and BASIC_* constants to define if some info should be left out. Optional
   * @param bool $friendlyUrls True if friendly urls should be used (mod_rewrite), false otherwise
   */
  public function __construct($testInfo, $urlStart, $fileHandler = null, $infoFlags = array(), $friendlyUrls = true) {
    $this->testInfo = $testInfo;
    $this->urlStart = $urlStart;
    $this->fileHandler = $fileHandler ? $fileHandler : new FileHandler();
    $this->infoFlags = $infoFlags;
    $this->friendlyUrls = $friendlyUrls;
  }

  /**
   * @param TestResults $testResults The test results to use for constructing the data array
   * @param string $medianMetric Metric to consider when selecting the median run
   * @return array An array containing all data about the test, in a form that can be encoded with JSON
   */
  public function resultDataArray($testResults, $medianMetric = "loadTime") {
    $id = $this->testInfo->getId();
    $url = $this->testInfo->getUrl();
    $testPath = $this->testInfo->getRootDirectory();
    $pageData = loadAllPageData($testPath);

    $stats = array(0 => array(), 1 => array());
    $pageStats = calculatePageStats($pageData, $stats[0], $stats[1]);

    if(!$url)
      $url = $testResults->getUrlFromRun();
    $testInfo = $this->testInfo->getInfoArray();
    $fvOnly = $this->testInfo->isFirstViewOnly();
    $cacheLabels = array('firstView', 'repeatView');

    // summary information
    $ret = array('id' => $id, 'url' => $url, 'summary' => $this->urlStart . "/results.php?test=$id");
    $runs = max(array_keys($pageData));
    if (isset($testInfo)) {
      if (array_key_exists('url', $testInfo) && strlen($testInfo['url']))
        $ret['testUrl'] = $testInfo['url'];
      if (array_key_exists('location', $testInfo) && strlen($testInfo['location'])) {
        $locstring = $testInfo['location'];
        if( array_key_exists('browser', $testInfo) && strlen($testInfo['browser']) )
          $locstring .= ':' . $testInfo['browser'];
        $ret['location'] = $locstring;
      }
      $testLocation = $this->testInfo->getTestLocation();
      if ($testLocation)
        $ret['from'] = $testLocation;
      if (array_key_exists('connectivity', $testInfo) && strlen($testInfo['connectivity']))
        $ret['connectivity'] = $testInfo['connectivity'];
      if (array_key_exists('bwIn', $testInfo))
        $ret['bwDown'] = $testInfo['bwIn'];
      if (array_key_exists('bwOut', $testInfo))
        $ret['bwUp'] = $testInfo['bwOut'];
      if (array_key_exists('latency', $testInfo))
        $ret['latency'] = $testInfo['latency'];
      if (array_key_exists('plr', $testInfo))
        $ret['plr'] = $testInfo['plr'];
      if (array_key_exists('mobile', $testInfo))
        $ret['mobile'] = $testInfo['mobile'];
      if (array_key_exists('label', $testInfo) && strlen($testInfo['label']))
        $ret['label'] = $testInfo['label'];
      if (array_key_exists('completed', $testInfo))
        $ret['completed'] = $testInfo['completed'];
      if (array_key_exists('tester', $testInfo) && strlen($testInfo['tester']))
        $ret['tester'] = $testInfo['tester'];
      if (array_key_exists('testerDNS', $testInfo) && strlen($testInfo['testerDNS']))
        $ret['testerDNS'] = $testInfo['testerDNS'];
      if (array_key_exists('runs', $testInfo) && $testInfo['runs'])
        $runs = $testInfo['runs'];
      if (array_key_exists('fvonly', $testInfo))
        $fvOnly = $testInfo['fvonly'] ? true : false;
    }
    $cachedMax = 0;
    if (!$fvOnly)
      $cachedMax = 1;
    $ret['runs'] = $runs;
    $ret['fvonly'] = $fvOnly;
    $ret['successfulFVRuns'] = $testResults->countSuccessfulRuns(false);
    if (!$fvOnly)
      $ret['successfulRVRuns'] = $testResults->countSuccessfulRuns(true);

    // average
    if (!$this->hasInfoFlag(self::WITHOUT_AVERAGE)) {
      $ret['average'] = array();
      for ($cached = 0; $cached <= $cachedMax; $cached++) {
        $label = $cacheLabels[$cached];
        $ret['average'][$label] = $stats[$cached];
      }
    }

    // standard deviation
    if (!$this->hasInfoFlag(self::WITHOUT_STDDEV)) {
      $ret['standardDeviation'] = array();
      for ($cached = 0; $cached <= $cachedMax; $cached++) {
        $label = $cacheLabels[$cached];
        $ret['standardDeviation'][$label] = array();
        foreach($stats[$cached] as $key => $val)
          $ret['standardDeviation'][$label][$key] = PageDataStandardDeviation($pageData, $key, $cached);
      }
    }

    // median
    if (!$this->hasInfoFlag(self::WITHOUT_MEDIAN)) {
      $ret['median'] = array();
      for ($cached = 0; $cached <= $cachedMax; $cached++) {
        $label = $cacheLabels[$cached];
        $medianRun = GetMedianRun($pageData, $cached, $medianMetric);
        if (array_key_exists($medianRun, $pageData)) {
          $testStepResult = TestStepResult::fromPageData($this->testInfo, $pageData[$medianRun][$cached], $medianRun, $cached, 1);
          $ret['median'][$label] = $this->GetSingleRunData($testStepResult);
        }
      }
    }

    // runs
    if (!$this->hasInfoFlag(self::WITHOUT_RUNS)) {
      $ret['runs'] = array();
      for ($run = 1; $run <= $runs; $run++) {
        $ret['runs'][$run] = array();
        for ($cached = 0; $cached <= $cachedMax; $cached++) {
          $label = $cacheLabels[$cached];
          $testStepResult = TestStepResult::fromPageData($this->testInfo, $pageData[$run][$cached], $run, $cached, 1);
          $ret['runs'][$run][$label] = $this->GetSingleRunData($testStepResult);
        }
      }
    }
    return $ret;
  }

  /**
   * Gather all of the data that we collect for a single run
   *
   * @param TestStepResult $testStepResult
   * @return array Array with run information which can be serialized as JSON
   */
  private function GetSingleRunData($testStepResult) {
    $ret = null;
    if (!$testStepResult) {
      return null;
    }
    $ret = $testStepResult->getRawResults();
    $run = $testStepResult->getRunNumber();
    $cached = $testStepResult->isCachedRun();
    $ret['run'] = $run;
    $localPaths = new TestPaths($this->testInfo->getRootDirectory(), $run, $cached);
    $nameOnlyPaths = new TestPaths("", $run, $cached);
    $urlGenerator = UrlGenerator::create(false, $this->urlStart, $this->testInfo->getId(), $run, $cached);
    $friendlyUrlGenerator = UrlGenerator::create(true, $this->urlStart, $this->testInfo->getId(), $run, $cached);
    $urlPaths = new TestPaths($this->urlStart . substr($this->testInfo->getRootDirectory(), 1), $run, $cached, 1);

    $ret['tester'] = $this->testInfo->getTester($run);

    $basic_results = $this->hasInfoFlag(self::BASIC_INFO_ONLY);

    if (!$basic_results && $this->fileHandler->gzFileExists($localPaths->pageSpeedFile())) {
      $ret['PageSpeedScore'] = $testStepResult->getPageSpeedScore();
      $ret['PageSpeedData'] = $urlGenerator->getGZip($nameOnlyPaths->pageSpeedFile());
    }

    $ret['pages'] = array();
    $ret['pages']['details'] = $urlGenerator->resultPage("details");
    $ret['pages']['checklist'] = $urlGenerator->resultPage("performance_optimization");
    $ret['pages']['breakdown'] = $urlGenerator->resultPage("breakdown");
    $ret['pages']['domains'] = $urlGenerator->resultPage("domains");
    $ret['pages']['screenShot'] = $urlGenerator->resultPage("screen_shot");

    $ret['thumbnails'] = array();
    $ret['thumbnails']['waterfall'] = $friendlyUrlGenerator->thumbnail("waterfall.png");
    $ret['thumbnails']['checklist'] = $friendlyUrlGenerator->thumbnail("optimization.png");
    $ret['thumbnails']['screenShot'] = $friendlyUrlGenerator->thumbnail("screen.png");

    $ret['images'] = array();
    $ret['images']['waterfall'] = $friendlyUrlGenerator->generatedImage("waterfall");
    $ret['images']['connectionView'] = $friendlyUrlGenerator->generatedImage("connection");
    $ret['images']['checklist'] = $friendlyUrlGenerator->generatedImage("optimization");
    $ret['images']['screenShot'] = $urlGenerator->getFile($nameOnlyPaths->screenShotFile());
    if ($this->fileHandler->fileExists($localPaths->screenShotPngFile())) {
      $ret['images']['screenShotPng'] = $urlGenerator->getFile($nameOnlyPaths->screenShotPngFile());
    }

    $ret['rawData'] = array();
    $ret['rawData']['headers'] = $urlPaths->headersFile();
    $ret['rawData']['pageData'] = $urlPaths->pageDataFile();
    $ret['rawData']['requestsData'] = $urlPaths->requestDataFile();
    $ret['rawData']['utilization'] = $urlPaths->utilizationFile();
    if ($this->fileHandler->fileExists($localPaths->bodiesFile())) {
      $ret['rawData']['bodies'] = $urlPaths->bodiesFile();
    }
    if ($this->fileHandler->gzFileExists($localPaths->devtoolsTraceFile())) {
      $ret['rawData']['trace'] = $urlGenerator->getGZip($nameOnlyPaths->devtoolsTraceFile() . ".gz");
    }

    if (!$basic_results) {
      $progress = $testStepResult->getVisualProgress();
      if (array_key_exists('frames', $progress) && is_array($progress['frames']) && count($progress['frames'])) {
        $ret['videoFrames'] = array();
        foreach ($progress['frames'] as $ms => $frame) {
          $videoFrame = array('time' => $ms);
          $videoFrame['image'] = $urlGenerator->getFile($frame['file'], $nameOnlyPaths->videoDir());
          $videoFrame['VisuallyComplete'] = $frame['progress'];
          $ret['videoFrames'][] = $videoFrame;
        }
      }

      $requests = $testStepResult->getRequests();
      $ret['domains'] = $testStepResult->getDomainBreakdown();
      $ret['breakdown'] = $testStepResult->getMimeTypeBreakdown();

      // add requests
      if (!$this->hasInfoFlag(self::WITHOUT_REQUESTS)) {
        $ret['requests'] = $requests;
      }

      // Check to see if we're adding the console log
      if (!$this->hasInfoFlag(self::WITHOUT_CONSOLE)) {
        $console_log = $testStepResult->getConsoleLog();
        if (isset($console_log)) {
          $ret['consoleLog'] = $console_log;
        }
      }

      $statusMessages = $testStepResult->getStatusMessages();
      if ($statusMessages) {
        $ret['status'] = $statusMessages;
      }
    }
    return $ret;
  }

  private function hasInfoFlag($flag) {
    return in_array($flag, $this->infoFlags);
  }
}