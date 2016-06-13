<?php

require_once __DIR__ . '/TestPaths.php';
require_once __DIR__ . '/UrlGenerator.php';

class XmlResultGenerator {

  /**
   * @var TestInfo Information about the test
   */
  private $testInfo;
  private $pageData;
  private $baseUrl;
  private $pagespeed;
  private $fileHandler;

  /**
   * XmlResultGenerator constructor.
   * @param TestInfo $testInfo Information about the test
   * @param array $pageData Data about results
   * @param string $urlStart Start for test related URLS
   * @param FileHandler $fileHandler FileHandler to be used
   * @param bool $pagespeed True if pagespeed data should be generated
   */
  public function __construct($testInfo, &$pageData, $urlStart, $fileHandler, $pagespeed) {
    $this->testInfo = $testInfo;
    $this->pageData = $pageData;
    $this->baseUrl = $urlStart;
    $this->pagespeed = $pagespeed;
    $this->fileHandler = $fileHandler;
  }


  function printRun($run, $cached = false) {
    $cached = $cached ? 1 : 0;
    $testRoot = $this->testInfo->getRootDirectory();
    $testId = $this->testInfo->getId();
    $localPaths = new TestPaths($testRoot, $run, $cached);
    $nameOnlyPaths = new TestPaths("", $run, $cached);
    $urlPaths = new TestPaths($this->baseUrl . substr($testRoot, 1), $run, $cached);

    $tester = $this->testInfo->getTester($run);
    if ($tester) {
      echo "<tester>" . xml_entities($tester) . "</tester>\n";
    }

    echo "<results>\n";
    echo ArrayToXML($this->pageData[$run][$cached]);
    if ($this->pagespeed) {
      $score = GetPageSpeedScore($localPaths->pageSpeedFile());
      if (strlen($score))
        echo "<PageSpeedScore>$score</PageSpeedScore>\n";
    }
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
    if ($this->fileHandler->GzFileExists($localPaths->pageSpeedFile()))
      echo "<PageSpeedData>" . $urlPaths->pageSpeedFile() . "</PageSpeedData>\n";
    echo "</rawData>\n";

    // video frames
    $progress = GetVisualProgress($testRoot, $run, $cached, null, null, $this->getStartOffset($run, $cached));
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

    xmlDomains($testId, $testRoot, $run, $cached ? 1 : 0);
    xmlBreakdown($testId, $testRoot, $run, $cached ? 1 : 0);
    if (array_key_exists('requests', $_REQUEST) && $_REQUEST['requests'] != 'median')
      xmlRequests($testId, $testRoot, $run, $cached ? 1 : 0);
    StatusMessages($testId, $testRoot, $run, $cached ? 1 : 0);
    ConsoleLog($testId, $testRoot, $run, $cached ? 1 : 0);
  }

  private function getStartOffset($run, $cached) {
    if (!array_key_exists('testStartOffset', $this->pageData[$run][$cached])) {
      return 0;
    }
    return intval(round($this->pageData[$run][$cached]['testStartOffset']));
  }

}

/**
* Dump a breakdown of the requests and bytes by domain
*/
function xmlDomains($id, $testPath, $run, $cached) {
    if (array_key_exists('domains', $_REQUEST) && $_REQUEST['domains']) {
        echo "<domains>\n";
        $requests;
        $breakdown = getDomainBreakdown($id, $testPath, $run, $cached, $requests);
        foreach ($breakdown as $domain => &$values) {
            $domain = $domain;
            echo "<domain host=\"" . xml_entities($domain) . "\">\n";
            echo "<requests>{$values['requests']}</requests>\n";
            echo "<bytes>{$values['bytes']}</bytes>\n";
            echo "<connections>{$values['connections']}</connections>\n";
            if (isset($values['cdn_provider']))
              echo "<cdn_provider>{$values['cdn_provider']}</cdn_provider>\n";
            echo "</domain>\n";
        }
        echo "</domains>\n";
    }
}

/**
* Dump a breakdown of the requests and bytes by mime type
*/
function xmlBreakdown($id, $testPath, $run, $cached) {
    if (array_key_exists('breakdown', $_REQUEST) && $_REQUEST['breakdown']) {
        echo "<breakdown>\n";
        $requests;
        $breakdown = getBreakdown($id, $testPath, $run, $cached, $requests);
        foreach ($breakdown as $mime => &$values) {
            $domain = strrev($domain);
            echo "<$mime>\n";
            echo "<requests>{$values['requests']}</requests>\n";
            echo "<bytes>{$values['bytes']}</bytes>\n";
            echo "</$mime>\n";
        }
        echo "</breakdown>\n";
    }
}


/**
* Dump information about all of the requests
*/
function xmlRequests($id, $testPath, $run, $cached) {
    if (array_key_exists('requests', $_REQUEST) && $_REQUEST['requests']) {
        echo "<requests>\n";
        $secure = false;
        $haveLocations = false;
        $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false, true);
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