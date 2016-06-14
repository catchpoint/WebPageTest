<?php

require_once __DIR__ . '/TestPaths.php';
require_once __DIR__ . '/UrlGenerator.php';

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

  /**
   * XmlResultGenerator constructor.
   * @param TestInfo $testInfo Information about the test
   * @param string $urlStart Start for test related URLS
   * @param FileHandler $fileHandler FileHandler to be used
   * @param array $additionalInfo Array of INFO_* constants to define which additional information should be printed
   */
  public function __construct($testInfo, $urlStart, $fileHandler, $additionalInfo) {
    $this->testInfo = $testInfo;
    $this->baseUrl = $urlStart;
    $this->additionalInfo = $additionalInfo;
    $this->fileHandler = $fileHandler;
  }

  /**
   * @param TestRunResult $testResult Result for the median run
   */
  public function printMedianRun($testResult) {
    $run = $testResult->getRunNumber();

    echo "<run>" . $run . "</run>\n";
    $this->printTester($run);
    echo ArrayToXML($testResult->getRawResults());
    $this->printPageSpeed($testResult);
    $this->printPageSpeedData($testResult);
    $this->printAdditionalInformation($testResult, true);
  }

  /**
   * @param TestRunResult $testResult Result of this run
   */
  public function printRun($testResult) {
    $run = $testResult->getRunNumber();
    $cached = $testResult->isCachedRun() ? 1 : 0;
    $testRoot = $this->testInfo->getRootDirectory();
    $testId = $this->testInfo->getId();

    $localPaths = new TestPaths($testRoot, $run, $cached);
    $nameOnlyPaths = new TestPaths("", $run, $cached);
    $urlPaths = new TestPaths($this->baseUrl . substr($testRoot, 1), $run, $cached);

    $this->printTester($run);

    echo "<results>\n";
    echo ArrayToXML($testResult->getRawResults());
    $this->printPageSpeed($testResult);
    echo "</results>\n";

    // links to the relevant pages
    $urlGenerator = UrlGenerator::create(FRIENDLY_URLS, $this->baseUrl, $testId, $run, $cached);
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
    if ($this->fileHandler->FileExists($localPaths->screenShotFile())) {
      echo "<screenShot>" . htmlspecialchars($urlGenerator->thumbnail("screen.jpg")) . "</screenShot>\n";
    }
    echo "</thumbnails>\n";

    echo "<images>\n";
    echo "<waterfall>" . htmlspecialchars($urlGenerator->generatedImage("waterfall")) . "</waterfall>\n";
    echo "<connectionView>" . htmlspecialchars($urlGenerator->generatedImage("connection")) . "</connectionView>\n";
    echo "<checklist>" . htmlspecialchars($urlGenerator->generatedImage("optimization")) . "</checklist>\n";
    if ($this->fileHandler->FileExists($localPaths->screenShotFile())) {
      echo "<screenShot>" . htmlspecialchars($urlGenerator->getFile($nameOnlyPaths->screenShotFile())) . "</screenShot>\n";
    }
    if ($this->fileHandler->FileExists($localPaths->screenShotPngFile())) {
      echo "<screenShotPng>" . htmlspecialchars($urlGenerator->getFile($nameOnlyPaths->screenShotPngFile())) . "</screenShotPng>\n";
    }
    echo "</images>\n";

    // raw results (files accessed directly on the file system, but via URL)
    echo "<rawData>\n";
    if ($this->fileHandler->GzFileExists($localPaths->headersFile()))
      echo "<headers>" . $urlPaths->headersFile() . "</headers>\n";
    if ($this->fileHandler->GzFileExists($localPaths->bodiesFile()))
      echo "<bodies>" . $urlPaths->bodiesFile() . "</bodies>\n";
    if ($this->fileHandler->GzFileExists($localPaths->pageDataFile()))
      echo "<pageData>" . $urlPaths->pageDataFile() . "</pageData>\n";
    if ($this->fileHandler->GzFileExists($localPaths->requestDataFile()))
      echo "<requestsData>" . $urlPaths->requestDataFile() . "</requestsData>\n";
    if ($this->fileHandler->GzFileExists($localPaths->utilizationFile()))
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

    if ($this->fileHandler->GzFileExists($localPaths->pageSpeedFile())) {
      echo "<PageSpeedData>" . $urlPaths->pageSpeedFile() . "</PageSpeedData>\n";
    }
  }

  /**
   * @param TestRunResult $testResult Result Data
   * @param bool $forMedian True if the printing is for median output, false otherwise
   */
  private function printAdditionalInformation($testResult, $forMedian) {
    $testId = $this->testInfo->getId();
    $testRoot = $this->testInfo->getRootDirectory();
    $run = $testResult->getRunNumber();
    $cached = $testResult->isCachedRun();

    $this->printDomainBreakdown($testResult);
    $this->printMimeTypeBreakdown($testResult);
    $this->printRequests($testResult, $forMedian);

    StatusMessages($testId, $testRoot, $run, $cached ? 1 : 0);
    ConsoleLog($testId, $testRoot, $run, $cached ? 1 : 0);
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
  function printDomainBreakdown($testResult) {
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
  function printMimeTypeBreakdown($testResult) {
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
}


/**
* Dump any logged browser status messages
*
* @param mixed $id
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function StatusMessages($id, $testPath, $run, $cached) {
    $cachedText = '';
    if ($cached)
        $cachedText = '_Cached';
    $statusFile = "$testPath/$run{$cachedText}_status.txt";
    if (gz_is_file($statusFile)) {
        echo "<status>\n";
        $messages = array();
        $lines = gz_file($statusFile);
        foreach($lines as $line) {
            $line = trim($line);
            if (strlen($line)) {
                $parts = explode("\t", $line);
                $time = xml_entities(trim($parts[0]));
                $message = xml_entities(trim($parts[1]));
                echo "<entry>\n";
                echo "<time>$time</time>\n";
                echo "<message>$message</message>\n";
                echo "</entry>\n";
            }
        }
        echo "</status>\n";
    }
}

/**
* Dump the console log if we have one
*
* @param mixed $id
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function ConsoleLog($id, $testPath, $run, $cached) {
    if(isset($_GET['console']) && $_GET['console'] == 0) {
        return;
    }
    $consoleLog = DevToolsGetConsoleLog($testPath, $run, $cached);
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