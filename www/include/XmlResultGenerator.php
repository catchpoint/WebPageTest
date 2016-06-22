<?php

require_once __DIR__ . '/TestPaths.php';
require_once __DIR__ . '/UrlGenerator.php';

// TODO: get rid of this in the long run (for xml_entities)
require_once __DIR__ . '/../common_lib.inc';

class XmlResultGenerator {

  const INFO_PAGESPEED = 0;
  const INFO_REQUESTS = 1;
  const INFO_MEDIAN_REQUESTS = 2;
  const INFO_DOMAIN_BREAKDOWN = 3;
  const INFO_MIMETYPE_BREAKDOWN = 4;
  const INFO_CONSOLE = 5;

  /**
   * @var TestInfo Information about the test
   */
  private $testInfo;
  private $baseUrl;
  private $additionalInfo;
  private $fileHandler;
  private $friendlyUrls;

  /**
   * XmlResultGenerator constructor.
   * @param TestInfo $testInfo Information about the test
   * @param string $urlStart Start for test related URLS
   * @param FileHandler $fileHandler FileHandler to be used
   * @param array $additionalInfo Array of INFO_* constants to define which additional information should be printed
   * @param bool $friendlyUrls True if friendly urls should be used (mod_rewrite), false otherwise
   */
  public function __construct($testInfo, $urlStart, $fileHandler, $additionalInfo, $friendlyUrls) {
    $this->testInfo = $testInfo;
    $this->baseUrl = $urlStart;
    $this->additionalInfo = $additionalInfo;
    $this->fileHandler = $fileHandler;
    $this->friendlyUrls = $friendlyUrls;
  }

  /**
   * @param TestResults $testResults
   * @param string $median_metric
   * @param string $requestId
   */
  public function printAllResults($testResults, $median_metric, $requestId = null) {
    $pageData = $testResults->getPageData();
    $test = $this->testInfo->getRawData();
    $urlGenerator = UrlGenerator::create($this->friendlyUrls, $this->baseUrl, $this->testInfo->getId(), 0, 0);

    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    echo "<response>\n";
    echo "<statusCode>200</statusCode>\n";
    echo "<statusText>Ok</statusText>\n";
    if (!empty($requestId))
      echo "<requestId>$requestId</requestId>\n";
    echo "<data>\n";

    // spit out the calculated averages
    $fv = null;
    $rv = null;
    $pageStats = calculatePageStats($pageData, $fv, $rv);

    echo "<testId>" . $this->testInfo->getId() . "</testId>\n";
    echo "<summary>" . $urlGenerator->resultSummary() . "</summary>\n";

    if (isset($test['testinfo']))
    {
      if( @strlen($test['testinfo']['url']) )
        echo "<testUrl>" . xml_entities($test['testinfo']['url']) . "</testUrl>\n";
      if( @strlen($test['testinfo']['location']) ) {
        $locstring = $test['testinfo']['location'];
        if( @strlen($test['testinfo']['browser']) )
          $locstring .= ':' . $test['testinfo']['browser'];
        echo "<location>$locstring</location>\n";
      }
      if ( @strlen($test['test']['location']) )
        echo "<from>" . xml_entities($test['test']['location']) . "</from>\n";
      if( @strlen($test['testinfo']['connectivity']) )
      {
        echo "<connectivity>{$test['testinfo']['connectivity']}</connectivity>\n";
        echo "<bwDown>{$test['testinfo']['bwIn']}</bwDown>\n";
        echo "<bwUp>{$test['testinfo']['bwOut']}</bwUp>\n";
        echo "<latency>{$test['testinfo']['latency']}</latency>\n";
        echo "<plr>{$test['testinfo']['plr']}</plr>\n";
      }
      if( isset($test['testinfo']['mobile']) )
        echo "<mobile>" . xml_entities($test['testinfo']['mobile']) .   "</mobile>\n";
      if( @strlen($test['testinfo']['label']) )
        echo "<label>" . xml_entities($test['testinfo']['label']) . "</label>\n";
      if( @strlen($test['testinfo']['completed']) )
        echo "<completed>" . gmdate("r",$test['testinfo']['completed']) . "</completed>\n";
      if( @strlen($test['testinfo']['tester']) )
        echo "<tester>" . xml_entities($test['testinfo']['tester']) . "</tester>\n";
      if( @strlen($test['testinfo']['testerDNS']) )
        echo "<testerDNS>" . xml_entities($test['testinfo']['testerDNS']) . "</testerDNS>\n";
    }
    $runs = max(array_keys($pageData));
    echo "<runs>$runs</runs>\n";
    echo "<successfulFVRuns>" . CountSuccessfulTests($pageData, 0) . "</successfulFVRuns>\n";
    if( isset($rv) ) {
      echo "<successfulRVRuns>" . CountSuccessfulTests($pageData, 1) . "</successfulRVRuns>\n";
    }
    echo "<average>\n";
    echo "<firstView>\n";
    foreach( $fv as $key => $val ) {
      $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
      echo "<$key>" . number_format($val,0, '.', '') . "</$key>\n";
    }
    echo "</firstView>\n";
    if( isset($rv) )
    {
      echo "<repeatView>\n";
      foreach( $rv as $key => $val ) {
        $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
        echo "<$key>" . number_format($val,0, '.', '') . "</$key>\n";
      }
      echo "</repeatView>\n";
    }
    echo "</average>\n";
    echo "<standardDeviation>\n";
    echo "<firstView>\n";
    foreach( $fv as $key => $val ) {
      $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
      echo "<$key>" . PageDataStandardDeviation($pageData, $key, 0) . "</$key>\n";
    }
    echo "</firstView>\n";
    if( isset($rv) )
    {
      echo "<repeatView>\n";
      foreach( $rv as $key => $val ) {
        $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
        echo "<$key>" . PageDataStandardDeviation($pageData, $key, 1) . "</$key>\n";
      }
      echo "</repeatView>\n";
    }
    echo "</standardDeviation>\n";

    // output the median run data
    $fvMedian = GetMedianRun($pageData, 0, $median_metric);
    if( $fvMedian )
    {
      echo "<median>\n";
      $this->printMedianRun($testResults->getRunResult($fvMedian, false));

      if( isset($rv) )
      {
        if (array_key_exists('rvmedian', $_REQUEST) && $_REQUEST['rvmedian'] == 'fv')
          $rvMedian = $fvMedian;
        else
          $rvMedian = GetMedianRun($pageData, 1, $median_metric);
        if($rvMedian)
        {
          $this->printMedianRun($testResults->getRunResult($rvMedian, true));
        }
      }
      echo "</median>\n";
    }

    // spit out the raw data for each run
    for( $i = 1; $i <= $runs; $i++ )
    {
      echo "<run>\n";
      echo "<id>$i</id>\n";

      $this->printRun($testResults->getRunResult($i, false));
      $this->printRun($testResults->getRunResult($i, true));

      echo "</run>\n";
    }

    echo "</data>\n";
    echo "</response>\n";
  }

  /**
   * @param TestRunResult $testResult Result for the median run
   */
  public function printMedianRun($testResult) {
    $run = $testResult->getRunNumber();

    $this->printViewRootStartTag($testResult->isCachedRun());
    echo "<run>" . $run . "</run>\n";
    $this->printTester($run);
    echo ArrayToXML($testResult->getRawResults());
    $this->printPageSpeed($testResult);
    $this->printPageSpeedData($testResult);
    $this->printAdditionalInformation($testResult, true);
    $this->printViewRootEndTag($testResult->isCachedRun());
  }

  /**
   * @param TestRunResult $testResult Result of this run
   */
  public function printRun($testResult) {
    if (empty($testResult)) {
      return;
    }

    $run = $testResult->getRunNumber();
    $cached = $testResult->isCachedRun() ? 1 : 0;
    $testRoot = $this->testInfo->getRootDirectory();
    $testId = $this->testInfo->getId();

    $localPaths = new TestPaths($testRoot, $run, $cached);
    $nameOnlyPaths = new TestPaths("", $run, $cached);
    $urlPaths = new TestPaths($this->baseUrl . substr($testRoot, 1), $run, $cached);

    $this->printViewRootStartTag($testResult->isCachedRun());
    $this->printTester($run);

    echo "<results>\n";
    echo ArrayToXML($testResult->getRawResults());
    $this->printPageSpeed($testResult);
    echo "</results>\n";

    // links to the relevant pages
    $urlGenerator = UrlGenerator::create($this->friendlyUrls, $this->baseUrl, $testId, $run, $cached);
    echo "<pages>\n";
    echo "<details>" . htmlspecialchars($urlGenerator->resultPage("details")) . "</details>\n";
    echo "<checklist>" . htmlspecialchars($urlGenerator->resultPage("performance_optimization")) . "</checklist>\n";
    echo "<breakdown>" . htmlspecialchars($urlGenerator->resultPage("breakdown")) . "</breakdown>\n";
    echo "<domains>" . htmlspecialchars($urlGenerator->resultPage("domains")) . "</domains>\n";
    echo "<screenShot>" . htmlspecialchars($urlGenerator->resultPage("screen_shot")) . "</screenShot>\n";
    echo "</pages>\n";

    // urls for the relevant images
    echo "<thumbnails>\n";
    echo "<waterfall>" . htmlspecialchars($urlGenerator->thumbnail("waterfall.png")) . "</waterfall>\n";
    echo "<checklist>" . htmlspecialchars($urlGenerator->thumbnail("optimization.png")) . "</checklist>\n";
    if ($this->fileHandler->fileExists($localPaths->screenShotFile())) {
      echo "<screenShot>" . htmlspecialchars($urlGenerator->thumbnail("screen.jpg")) . "</screenShot>\n";
    }
    echo "</thumbnails>\n";

    echo "<images>\n";
    echo "<waterfall>" . htmlspecialchars($urlGenerator->generatedImage("waterfall")) . "</waterfall>\n";
    echo "<connectionView>" . htmlspecialchars($urlGenerator->generatedImage("connection")) . "</connectionView>\n";
    echo "<checklist>" . htmlspecialchars($urlGenerator->generatedImage("optimization")) . "</checklist>\n";
    if ($this->fileHandler->fileExists($localPaths->screenShotFile())) {
      echo "<screenShot>" . htmlspecialchars($urlGenerator->getFile($nameOnlyPaths->screenShotFile())) . "</screenShot>\n";
    }
    if ($this->fileHandler->fileExists($localPaths->screenShotPngFile())) {
      echo "<screenShotPng>" . htmlspecialchars($urlGenerator->getFile($nameOnlyPaths->screenShotPngFile())) . "</screenShotPng>\n";
    }
    echo "</images>\n";

    // raw results (files accessed directly on the file system, but via URL)
    echo "<rawData>\n";
    if ($this->fileHandler->gzFileExists($localPaths->headersFile()))
      echo "<headers>" . $urlPaths->headersFile() . "</headers>\n";
    if ($this->fileHandler->gzFileExists($localPaths->bodiesFile()))
      echo "<bodies>" . $urlPaths->bodiesFile() . "</bodies>\n";
    if ($this->fileHandler->gzFileExists($localPaths->pageDataFile()))
      echo "<pageData>" . $urlPaths->pageDataFile() . "</pageData>\n";
    if ($this->fileHandler->gzFileExists($localPaths->requestDataFile()))
      echo "<requestsData>" . $urlPaths->requestDataFile() . "</requestsData>\n";
    if ($this->fileHandler->gzFileExists($localPaths->utilizationFile()))
      echo "<utilization>" . $urlPaths->utilizationFile() . "</utilization>\n";
    $this->printPageSpeedData($testResult);
    echo "</rawData>\n";

    // video frames
    $progress = $testResult->getVisualProgress();
    if (array_key_exists('frames', $progress) && is_array($progress['frames']) && count($progress['frames'])) {
      echo "<videoFrames>\n";
      foreach ($progress['frames'] as $ms => $frame) {
        echo "<frame>\n";
        echo "<time>$ms</time>\n";
        echo "<image>" .
            htmlspecialchars($urlGenerator->getFile($frame['file'], $nameOnlyPaths->videoDir())) .
          "</image>\n";
        echo "<VisuallyComplete>{$frame['progress']}</VisuallyComplete>\n";
        echo "</frame>\n";
      }
      echo "</videoFrames>\n";
    }

    $this->printAdditionalInformation($testResult, false);
    $this->printViewRootEndTag($testResult->isCachedRun());
  }

  private function printViewRootStartTag($isCachedRun) {
    if (!$isCachedRun) {
      echo "<firstView>\n";
    } else {
      echo "<repeatView>\n";
    }
  }

  private function printViewRootEndTag($isCachedRun) {
    if (!$isCachedRun) {
      echo "</firstView>\n";
    } else {
      echo "</repeatView>\n";
    }
  }

  /**
   * @param int $run The run to print the tester for
   */
  private function printTester($run) {
    $tester = $this->testInfo->getTester($run);
    if ($tester) {
      echo "<tester>" . xml_entities($tester) . "</tester>\n";
    }
  }

  /**
   * @param TestRunResult $testResult Result of the run
   */
  private function printPageSpeed($testResult) {
    if ($this->shouldPrintInfo(self::INFO_PAGESPEED)) {
      $score = $testResult->getPageSpeedScore();
      if (strlen($score)) {
        echo "<PageSpeedScore>$score</PageSpeedScore>\n";
      }
    }
  }

  /**
   * @param TestRunResult $testResult Result Data
   */
  private function printPageSpeedData($testResult) {
    $testRoot = $this->testInfo->getRootDirectory();
    $localPaths = new TestPaths($testRoot, $testResult->getRunNumber(), $testResult->isCachedRun());
    $urlPaths = new TestPaths($this->baseUrl . substr($testRoot, 1), $testResult->isCachedRun());

    if ($this->fileHandler->gzFileExists($localPaths->pageSpeedFile())) {
      echo "<PageSpeedData>" . $urlPaths->pageSpeedFile() . "</PageSpeedData>\n";
    }
  }

  /**
   * @param TestRunResult $testResult Result Data
   * @param bool $forMedian True if the printing is for median output, false otherwise
   */
  private function printAdditionalInformation($testResult, $forMedian) {
    $this->printDomainBreakdown($testResult);
    $this->printMimeTypeBreakdown($testResult);
    $this->printRequests($testResult, $forMedian);
    $this->printStatusMessages($testResult);
    $this->printConsoleLog($testResult);
  }

  /**
   * @param int $infotype The kind of info to check for (see INFO_* constants)
   * @return bool True if this type of information should be printed, false otherwise
   */
  private function shouldPrintInfo($infotype) {
    return in_array($infotype, $this->additionalInfo, true);
  }

  /**
   * Print information about all of the requests
   * @param TestRunResult $testResult Result Data for affected run
   * @param $forMedian True if the output is for median, false otherwise
   */
  private function printRequests($testResult, $forMedian) {
    if (!$this->shouldPrintInfo(self::INFO_REQUESTS) &&
        !($forMedian && $this->shouldPrintInfo(self::INFO_MEDIAN_REQUESTS))) {
      return;
    }
    echo "<requests>\n";
    $requests = $testResult->getRequests();
    foreach ($requests as &$request) {
      echo "<request number=\"{$request['number']}\">\n";
      foreach ($request as $field => $value) {
        if (!is_array($value))
          echo "<$field>" . xml_entities($value) . "</$field>\n";
      }
      if (array_key_exists('headers', $request) && is_array($request['headers'])) {
        echo "<headers>\n";
        if (array_key_exists('request', $request['headers']) && is_array($request['headers']['request'])) {
          echo "<request>\n";
          foreach ($request['headers']['request'] as $value)
            echo "<header>" . xml_entities($value) . "</header>\n";
          echo "</request>\n";
        }
        if (array_key_exists('response', $request['headers']) && is_array($request['headers']['response'])) {
          echo "<response>\n";
          foreach ($request['headers']['response'] as $value)
            echo "<header>" . xml_entities($value) . "</header>\n";
          echo "</response>\n";
        }
        echo "</headers>\n";
      }
      echo "</request>\n";
    }
    echo "</requests>\n";
  }

  /**
   * Print a breakdown of the requests and bytes by domain
   * @param TestRunResult $testResult Result data of affected run
   */
  private function printDomainBreakdown($testResult) {
    if (!$this->shouldPrintInfo(self::INFO_DOMAIN_BREAKDOWN)) {
      return;
    }
    echo "<domains>\n";
    $breakdown = $testResult->getDomainBreakdown();
    foreach ($breakdown as $domain => &$values) {
      echo "<domain host=\"" . xml_entities($domain) . "\">\n";
      echo "<requests>{$values['requests']}</requests>\n";
      echo "<bytes>{$values['bytes']}</bytes>\n";
      echo "<connections>{$values['connections']}</connections>\n";
      if (isset($values['cdn_provider'])) {
        echo "<cdn_provider>{$values['cdn_provider']}</cdn_provider>\n";
      }
      echo "</domain>\n";
    }
    echo "</domains>\n";
  }

  /**
   * Print a breakdown of the requests and bytes by mime type
   * @param TestRunResult $testResult Result data of affected run
   */
  private function printMimeTypeBreakdown($testResult) {
    if (!$this->shouldPrintInfo(self::INFO_MIMETYPE_BREAKDOWN)) {
      return;
    }
    echo "<breakdown>\n";
    $breakdown = $testResult->getMimeTypeBreakdown();
    foreach ($breakdown as $mime => &$values) {
      echo "<$mime>\n";
      echo "<requests>{$values['requests']}</requests>\n";
      echo "<bytes>{$values['bytes']}</bytes>\n";
      echo "</$mime>\n";
    }
    echo "</breakdown>\n";
  }

  /**
   * Print any logged browser status messages
   * @param TestRunResult $testResult Result data of affected run
   */
  private function printStatusMessages($testResult) {
    $messages = $testResult->getStatusMessages();
    if (!$messages) {
      return;
    }
    echo "<status>\n";
    foreach($messages as $message) {
      echo "<entry>\n";
      echo "<time>" . xml_entities($message["time"]) . "</time>\n";
      echo "<message>" . xml_entities($message["message"]) . "</message>\n";
      echo "</entry>\n";
    }
    echo "</status>\n";
  }

  /**
   * Print the console log if requested
   * @param TestRunResult $testResult Result data of affected run
   */
  private function printConsoleLog($testResult) {
    if (!$this->shouldPrintInfo(self::INFO_CONSOLE)) {
      return;
    }
    $consoleLog = $testResult->getConsoleLog();
    if (isset($consoleLog) && is_array($consoleLog) && count($consoleLog)) {
      echo "<consoleLog>\n";
      foreach( $consoleLog as &$entry ) {
        echo "<entry>\n";
        echo "<source>" . xml_entities($entry['source']) . "</source>\n";
        echo "<level>" . xml_entities($entry['level']) . "</level>\n";
        echo "<message>" . xml_entities($entry['text']) . "</message>\n";
        echo "<url>" . xml_entities($entry['url']) . "</url>\n";
        echo "<line>" . xml_entities($entry['line']) . "</line>\n";
        echo "</entry>\n";
      }
      echo "</consoleLog>\n";
    }
  }
}

function ArrayToXML($array) {
  $ret = '';
  if (is_array($array)) {
    foreach($array as $key => $val ) {
      if (is_numeric($key))
        $key = 'value';
      $key = preg_replace('/[^a-zA-Z0-9\.\-_]/', '_', $key);
      $ret .= "<$key>";
      if (is_array($val))
        $ret .= "\n" . ArrayToXML($val);
      else
        $ret .= xml_entities($val);
      $ret .= "</$key>\n";
    }
  }
  return $ret;
}
