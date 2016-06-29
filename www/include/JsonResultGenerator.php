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

  public function resultDataArray($testResults, $medianMetric = "loadTime") {
    $id = $this->testInfo->getId();

    $url = $this->testInfo->getUrl();

    $testPath = './' . GetTestPath($id);
    $pageData = loadAllPageData($testPath);
    $stats = array(0 => array(), 1 => array());
    $pageStats = calculatePageStats($pageData, $stats[0], $stats[1]);
    if( !strlen($url) )
      $url = $pageData[1][0]['URL'];
    $testInfo = GetTestInfo($id);
    if (is_file("$testPath/testinfo.ini"))
      $test = parse_ini_file("$testPath/testinfo.ini", true);
    $fvOnly = false;
    if (!count($stats[1]))
      $fvOnly = true;
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
      if (isset($test) &&
        array_key_exists('test', $test) &&
        is_array($test['test']) &&
        array_key_exists('location', $test['test']) &&
        strlen($test['test']['location']))
        $ret['from'] = $test['test']['location'];
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
    $ret['successfulFVRuns'] = CountSuccessfulTests($pageData, 0);
    if (!$fvOnly)
      $ret['successfulRVRuns'] = CountSuccessfulTests($pageData, 1);

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
          $ret['median'][$label] = $this->GetSingleRunData($id, $testPath, $medianRun, $cached, $pageData, $testInfo);
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
          $ret['runs'][$run][$label] = $this->GetSingleRunData($id, $testPath, $run, $cached, $pageData, $testInfo);
        }
      }
    }
    return $ret;
  }

  /**
   * Gather all of the data that we collect for a single run
   *
   * @param mixed $id
   * @param mixed $testPath
   * @param mixed $run
   * @param mixed $cached
   */
  private function GetSingleRunData($id, $testPath, $run, $cached, &$pageData, $testInfo) {
    $ret = null;
    if (array_key_exists($run, $pageData) &&
      is_array($pageData[$run]) &&
      array_key_exists($cached, $pageData[$run]) &&
      is_array($pageData[$run][$cached])
    ) {
      $path = substr($testPath, 1);
      $ret = $pageData[$run][$cached];
      $ret['run'] = $run;
      $cachedText = '';
      if ($cached)
        $cachedText = '_Cached';

      if (isset($testInfo)) {
        if (array_key_exists('tester', $testInfo))
          $ret['tester'] = $testInfo['tester'];
        if (array_key_exists('test_runs', $testInfo) &&
          array_key_exists($run, $testInfo['test_runs']) &&
          array_key_exists('tester', $testInfo['test_runs'][$run])
        )
          $ret['tester'] = $testInfo['test_runs'][$run]['tester'];
      }

      $basic_results = $this->hasInfoFlag(self::BASIC_INFO_ONLY);

      if (!$basic_results && gz_is_file("$testPath/$run{$cachedText}_pagespeed.txt")) {
        $ret['PageSpeedScore'] = GetPageSpeedScore("$testPath/$run{$cachedText}_pagespeed.txt");
        $ret['PageSpeedData'] = $this->urlStart . "//getgzip.php?test=$id&file=$run{$cachedText}_pagespeed.txt";
      }

      $ret['pages'] = array();
      $ret['pages']['details'] = $this->urlStart . "/details.php?test=$id&run=$run&cached=$cached";
      $ret['pages']['checklist'] = $this->urlStart . "/performance_optimization.php?test=$id&run=$run&cached=$cached";
      $ret['pages']['breakdown'] = $this->urlStart . "/breakdown.php?test=$id&run=$run&cached=$cached";
      $ret['pages']['domains'] = $this->urlStart . "/domains.php?test=$id&run=$run&cached=$cached";
      $ret['pages']['screenShot'] = $this->urlStart . "/screen_shot.php?test=$id&run=$run&cached=$cached";

      $ret['thumbnails'] = array();
      $ret['thumbnails']['waterfall'] = $this->urlStart . "/result/$id/$run{$cachedText}_waterfall_thumb.png";
      $ret['thumbnails']['checklist'] = $this->urlStart . "/result/$id/$run{$cachedText}_optimization_thumb.png";
      $ret['thumbnails']['screenShot'] = $this->urlStart . "/result/$id/$run{$cachedText}_screen_thumb.png";

      $ret['images'] = array();
      $ret['images']['waterfall'] = $this->urlStart . "$path/$run{$cachedText}_waterfall.png";
      $ret['images']['connectionView'] = $this->urlStart . "$path/$run{$cachedText}_connection.png";
      $ret['images']['checklist'] = $this->urlStart . "$path/$run{$cachedText}_optimization.png";
      $ret['images']['screenShot'] = $this->urlStart . "/getfile.php?test=$id&file=$run{$cachedText}_screen.jpg";
      if (is_file("$testPath/$run{$cachedText}_screen.png"))
        $ret['images']['screenShotPng'] = $this->urlStart . "/getfile.php?test=$id&file=$run{$cachedText}_screen.png";

      $ret['rawData'] = array();
      $ret['rawData']['headers'] = $this->urlStart . "$path/$run{$cachedText}_report.txt";
      $ret['rawData']['pageData'] = $this->urlStart . "$path/$run{$cachedText}_IEWPG.txt";
      $ret['rawData']['requestsData'] = $this->urlStart . "$path/$run{$cachedText}_IEWTR.txt";
      $ret['rawData']['utilization'] = $this->urlStart . "$path/$run{$cachedText}_progress.csv";
      if (is_file("$testPath/$run{$cachedText}_bodies.zip"))
        $ret['rawData']['bodies'] = $this->urlStart . "$path/$run{$cachedText}_bodies.zip";
      if (gz_is_file("$testPath/$run{$cachedText}_trace.json"))
        $ret['rawData']['trace'] = $this->urlStart . "//getgzip.php?test=$id&compressed=1&file=$run{$cachedText}_trace.json.gz";

      if (!$basic_results) {
        $startOffset = array_key_exists('testStartOffset', $ret) ? intval(round($ret['testStartOffset'])) : 0;
        $progress = GetVisualProgress($testPath, $run, $cached, null, null, $startOffset);
        if (array_key_exists('frames', $progress) && is_array($progress['frames']) && count($progress['frames'])) {
          $cachedTextLower = strtolower($cachedText);
          $ret['videoFrames'] = array();
          foreach ($progress['frames'] as $ms => $frame) {
            $videoFrame = array('time' => $ms);
            $videoFrame['image'] = $this->urlStart . "/getfile.php?test=$id&video=video_{$run}$cachedTextLower&file={$frame['file']}";
            $videoFrame['VisuallyComplete'] = $frame['progress'];
            $ret['videoFrames'][] = $videoFrame;
          }
        }

        $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false, true);
        $ret['domains'] = getDomainBreakdown($id, $testPath, $run, $cached, $requests);
        $ret['breakdown'] = getBreakdown($id, $testPath, $run, $cached, $requests);

        // add requests
        if (!$this->hasInfoFlag(self::WITHOUT_REQUESTS)) {
          $ret['requests'] = $requests;
        }

        // Check to see if we're adding the console log
        if (!$this->hasInfoFlag(self::WITHOUT_CONSOLE)) {
          $console_log = DevToolsGetConsoleLog($testPath, $run, $cached);
          if (isset($console_log)) {
            $ret['consoleLog'] = $console_log;
          }
        }

        if (gz_is_file("$testPath/$run{$cachedText}_status.txt")) {
          $ret['status'] = array();
          $lines = gz_file("$testPath/$run{$cachedText}_status.txt");
          foreach ($lines as $line) {
            $line = trim($line);
            if (strlen($line)) {
              list($time, $message) = explode("\t", $line);
              if (strlen($time) && strlen($message))
                $ret['status'][] = array('time' => $time, 'message' => $message);
            }
          }
        }
      }
    }

    return $ret;
  }

  private function hasInfoFlag($flag) {
    return in_array($flag, $this->infoFlags);
  }
}