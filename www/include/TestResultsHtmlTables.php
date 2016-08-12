<?php

class TestResultsHtmlTables {

  /** @var TestInfo */
  private $testInfo;
  /** @var TestResults */
  private $testResults;
  private $testComplete;
  private $breakdown;
  private $hasVideo;
  private $hasScreenshots;
  private $firstViewMedianRun;

  private $waterfallDisplayed;
  private $screenshotDisplayed;
  private $pageData;

  public function __construct($testInfo, $testResults, $testComplete, $median_metric) {
    $this->testInfo = $testInfo;
    $this->testResults = $testResults;
    $this->testComplete = $testComplete;
    $this->breakdown = null;
    $this->hasVideo = $this->testInfo->hasVideo();
    $this->hasScreenshots = $this->testInfo->hasScreenshots();
    $this->firstViewMedianRun = $this->testResults->getMedianRunNumber($median_metric, false);
  }

  public function create(&$pageData, $tcpDumpView) {
    $runs = $this->testInfo->getRuns();
    $this->waterfallDisplayed = false;
    $this->screenshotDisplayed = false;
    $this->pageData = $pageData;
    for ($run = 1; $run <= $runs; $run++) {
      $runResults = $this->testResults->getRunResult($run, false);
      if ($runs > 1) {
        echo '<h4><a name="run' . $run . '">Run ' . $run . ':</a></h4>';
      }
      if (!$runResults) {
        $error_str = $this->testComplete ? 'Test Error: Data is missing.' : 'Waiting for test result...';
        echo '<p>' . htmlspecialchars($error_str) . '</p>';
      } else {
        $this->_createTableForRun($run, $tcpDumpView);
      }
    }
  }

  private function _createTableForRun($run, $tcpDumpView) {
    $pageData = $this->pageData;
    $video = $this->testInfo->hasVideo();
    $testPath = $this->testInfo->getRootDirectory();
    $id = $this->testInfo->getId();
    $fvMedian = $this->firstViewMedianRun;
    $infoArray = $this->testInfo->getInfoArray();
    echo "<table id=\"table<?php echo $run; ?>\" class=\"pretty result\" align=\"center\" border=\"1\" cellpadding=\"20\" cellspacing=\"0\">\n";

    $table_columns = $this->_createTableHead();
    echo '<tr>';
    if (array_key_exists($run, $pageData) && array_key_exists(0, $pageData[$run]) && count($pageData[$run][0])) {
      echo '<td align="left" valign="middle">First View';
      if (isset($test['testinfo']['errors'][$run][0]) && strlen($test['testinfo']['errors'][$run][0]))
        echo '<br>(Test Error: ' . htmlspecialchars($test['testinfo']['errors'][$run][0]) . ')';
      if (isset($pageData[$run][0]['result']) && $pageData[$run][0]['result'] !== 0 && $pageData[$run][0]['result'] !== 99999)
        echo '<br>(Error: ' . LookupError($pageData[$run][0]['result']) . ')';
      else if (isset($pageData[$run][0]['loadTime']))
        echo '<br>(' . number_format($pageData[$run][0]['loadTime'] / 1000.0, 3) . 's)';
      if (is_file("$testPath/{$run}_dynaTrace.dtas")) {
        echo "<br><br><div><a href=\"/$testPath/{$run}_dynaTrace.dtas\" title=\"Download dynaTrace Session\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_session_v3.png\" alt=\"Download dynaTrace Session\"></a></div><br>";
        echo "<a href=\"http://ajax.dynatrace.com/pages/\" target=\"_blank\" title=\"Get dynaTrace AJAX Edition\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_ajax.png\" alt=\"Get dynaTrace Ajax Edition\"></a>";
      }

      $stepResult = $this->testResults->getRunResult($run, false)->getStepResult(1);
      echo $this->_getCaptureLinks($stepResult, $tcpDumpView);
      echo $this->_getTimelineLinks($stepResult);
      if ($infoArray['trace'] && gz_is_file("$testPath/{$run}_trace.json")) {
        echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_trace.json\" title=\"Download Chrome Trace\">Trace</a>";
        echo " (<a href=\"/chrome/trace.php?test=$id&run=$run&cached=0\" title=\"View Chrome Trace\">view</a>)";
      }
      if (gz_is_file("$testPath/{$run}_netlog.txt")) {
        echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_netlog.txt\" title=\"Download Network Log\">Net Log</a>";
      }
      echo "</td>\n";

      $this->_createWaterfallCell($stepResult, false);
      if ($this->hasScreenshots) {
        $this->_createScreenshotCell($stepResult, false);
      }
      if ($this->hasVideo) {
        $this->_createVideoCell($stepResult, false);
      }
    } else {
      echo "<td colspan=\"$table_columns\" align=\"left\" valign=\"middle\">First View: Test Data Missing</td>";
    }
    echo '</tr>';
    if (!$this->testInfo->isFirstViewOnly() || isset($pageData[$run][1])) {
      echo '<tr>';
      if (isset($pageData[$run][1])) {
        if (array_key_exists($run, $pageData) && array_key_exists(1, $pageData[$run]) && count($pageData[$run][1])) {
          echo '<td align="left" class="even" valign="middle">Repeat View';
          if (isset($test['testinfo']['errors'][$run][1]) && strlen($test['testinfo']['errors'][$run][1]))
            echo '<br>(Test Error: ' . htmlspecialchars($test['testinfo']['errors'][$run][0]) . ')';
          if (isset($pageData[$run][1]['result']) && $pageData[$run][1]['result'] !== 0 && $pageData[$run][1]['result'] !== 99999)
            echo '<br>(Error: ' . LookupError($pageData[$run][1]['result']) . ')';
          else if (isset($pageData[$run][1]['loadTime']))
            echo '<br>(' . number_format($pageData[$run][1]['loadTime'] / 1000.0, 3) . 's)';
          if (is_file("$testPath/{$run}_Cached_dynaTrace.dtas")) {
            echo "<br><br><div><a href=\"/$testPath/{$run}_Cached_dynaTrace.dtas\" title=\"Download dynaTrace Session\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_session_v3.png\" alt=\"Download dynaTrace Session\"></a></div><br>";
            echo "<a href=\"http://ajax.dynatrace.com/pages/\" target=\"_blank\" title=\"Get dynaTrace AJAX Edition\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_ajax.png\" alt=\"Get dynaTrace Ajax Edition\"></a>";
          }

          $stepResult = $this->testResults->getRunResult($run, true)->getStepResult(1);
          echo $this->_getCaptureLinks($stepResult, $tcpDumpView);
          echo $this->_getTimelineLinks($stepResult);
          if ($infoArray['trace'] && gz_is_file("$testPath/{$run}_Cached_trace.json")) {
            echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_Cached_trace.json\" title=\"Download Chrome Trace\">Trace</a>";
            echo " (<a href=\"/chrome/trace.php?test=$id&run=$run&cached=1\" title=\"View Chrome Trace\">view</a>)";
          }
          if (gz_is_file("$testPath/{$run}_Cached_netlog.txt")) {
            echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_Cached_netlog.txt\" title=\"Download Network Log\">Net Log</a>";
          }
          echo '</td>';

          $this->_createWaterfallCell($stepResult, true);

          if ($this->hasScreenshots) {
            $this->_createScreenshotCell($stepResult, true);
          }
          if ($this->hasVideo) {
            $this->_createVideoCell($stepResult, true);
          }
        }
      } else if (array_key_exists('testinfo', $test) &&
        array_key_exists('errors', $test['testinfo']) &&
        array_key_exists($run, $test['testinfo']['errors']) &&
        array_key_exists(0, $test['testinfo']['errors'][$run]) &&
        strlen($test['testinfo']['errors'][$run][1])
      ) {
        $error_str = htmlspecialchars('Test Error: ' . $test['testinfo']['errors'][$run][1]);
        echo "<td colspan=\"$table_columns\" align=\"left\" valign=\"middle\">Repeat View: $error_str</td>";
      } else {
        echo "<td colspan=\"$table_columns\" align=\"left\" valign=\"middle\">Repeat View: Test Data Missing</td>";
      }
      echo '</tr>';
    }
    if ($this->testComplete && $run == $fvMedian) {
      $this->_createBreakdownRow($this->testResults->getRunResult($run, false)->getStepResult(1));
    }

    echo "</table>\n<br>\n";

  }


  /**
   * @param TestStepResult $stepResult
   */
  private function _createBreakdownRow($stepResult) {
    $urlGenerator = $stepResult->createUrlGenerator("", FRIENDLY_URLS);
    $b = getBreakdownForStep($stepResult->createTestPaths(), $urlGenerator, $requests);
    if (is_array($b)) {
      $this->breakdown[] = array('run' => $stepResult->getRunNumber(), 'data' => $b);
    }
    echo "<tr>\n";

    echo "<td align=\"left\" valign=\"middle\">\n";
    $breakdownUrl = $urlGenerator->resultPage("breakdown");
    echo "<a href=\"$breakdownUrl\">Content Breakdown</a>";
    echo "</td>";

    $span = 2;
    if ($stepResult->getMetric('optimization_checked'))
      $span++;
    if ($this->hasScreenshots)
      $span++;
    if ($this->hasVideo)
      $span++;

    echo "<td align=\"left\" valign=\"middle\" colspan=\"$span\">";
    $run = $stepResult->getRunNumber();
    echo "<table><tr><td style=\"border:none;\"><div id=\"requests_$run\"></div></td>";
    echo "<td style=\"border:none;\"><div id=\"bytes_$run\"></div></td></tr></table>";
    echo "</td>\n";

    echo "</tr>\n";
  }

  public function getBreakdown() {
    return $this->breakdown;
  }

  private function _createTableHead() {
    echo "<tr>\n";
    echo "<th align=\"center\" class=\"empty\" valign=\"middle\"></th>\n";
    echo "<th align=\"center\" valign=\"middle\">Waterfall</th>\n";
    $table_columns = 2;
    if ($this->hasScreenshots) {
      echo '<th align="center" valign="middle">Screen Shot</th>';
      $table_columns++;
    }
    if ($this->hasVideo) {
      echo '<th align="center" valign="middle">Video</th>';
      $table_columns++;
    }
    echo '</tr>';
    return $table_columns;
}

  /**
   * @param TestStepResult $stepResult
   */
  private function _createVideoCell($stepResult, $even) {
    $localPaths = $stepResult->createTestPaths();
    $class = $even ? 'class="even"' : '';
    echo "<td align=\"center\" valign=\"middle\" $class>";
    if (is_dir($localPaths->videoDir())) {
      $urlGenerator = $stepResult->createUrlGenerator("", false);
      $end = $this->getRequestEndParam($stepResult);

      $filmstripUrl = $urlGenerator->filmstripView($end);
      echo "<a href=\"$filmstripUrl\">Filmstrip View</a><br>-<br>";

      $createUrl = $urlGenerator->createVideo($end);
      echo "<a href=\"$createUrl\">Watch Video</a>";

      $rawVideoPath = $localPaths->rawDeviceVideo();
      if (is_file($rawVideoPath))
        echo "<br>-<br><a href=\"/$rawVideoPath\">Raw Device Video</a>";
    } else {
      echo "not available";
    }
    echo '</td>';
  }

  /**
   * @param TestStepResult $stepResult
   * @param bool $even
   */
  private function _createWaterfallCell($stepResult, $even) {
    $end = $this->getRequestEndParam($stepResult);
    $endParam = $end ? "end=$end" : null;

    $urlGenerator = $stepResult->createUrlGenerator("", FRIENDLY_URLS && !$endParam);
    $detailsUrl = $urlGenerator->resultPage("details", $endParam);
    $thumbUrl = $urlGenerator->thumbnail("waterfall.png");
    $class = $even ? 'class="even"' : '';
    $onload =  $this->waterfallDisplayed ? "" : " onload=\"markUserTime('aft.First Waterfall')\"";

    echo "<td align=\"center\" $class valign=\"middle\">\n";
    echo "<a href=\"$detailsUrl\"><img class=\"progress\" width=\"250\" src=\"$thumbUrl\" $onload></a>\n";
    echo "</td>\n";

    $this->waterfallDisplayed = true;
  }

  /**
   * @param TestStepResult $stepResult
   * @return string|null The $_REQUEST["end"] parameter if set and the run is the first view median run, null otherwise
   */
  private function getRequestEndParam($stepResult) {
    if (!$stepResult->isCachedRun() && $stepResult->getRunNumber() == $this->firstViewMedianRun && array_key_exists('end', $_REQUEST)) {
      return $_REQUEST['end'];
    }
    return null;
  }

  /**
   * @param TestStepResult $stepResult
   * @param bool $even
   */
  private function _createScreenshotCell($stepResult, $even) {
    $urlGenerator = $stepResult->createUrlGenerator("", FRIENDLY_URLS);
    $class = $even ? 'class="even"' : '';
    $onload = $this->screenshotDisplayed ? "" : " onload=\"markUserTime('aft.First Screen Shot')\"";
    $screenShotUrl = $urlGenerator->resultPage("screen_shot");
    $thumbnailUrl = $urlGenerator->thumbnail("screen.jpg");
    echo "<td align=\"center\" valign=\"middle\" $class>\n";
    echo "<a href=\"$screenShotUrl\"><img class=\"progress\"$onload width=\"250\" src=\"$thumbnailUrl\"></a>\n";
    echo "</td>\n";
  }

  /**
   * @param TestStepResult $stepResult
   * @return string Markup with links
   */
  private function _getTimelineLinks($stepResult) {
    if (!$this->testInfo->hasTimeline()) {
      return "";
    }
    $localPaths = $stepResult->createTestPaths();
    if (!gz_is_file($localPaths->devtoolsTraceFile()) &&
        !gz_is_file($localPaths->devtoolsTimelineFile()) &&
        !gz_file($localPaths->devtoolsFile())) {
        return "";
        }
    $urlGenerator = $stepResult->createUrlGenerator("", FRIENDLY_URLS);
    $downloadUrl = $urlGenerator->stepDetailPage("getTimeline");
    $viewUrl = $urlGenerator->stepDetailPage("chrome/timeline");
    $breakdownUrl = $urlGenerator->stepDetailPage("breakdownTimeline");

    $out = "<br><br>\n";
    $out .= "<a href=\"$downloadUrl\" title=\"Download Chrome Dev Tools Timeline\">Timeline</a>\n";
    $out .= " (<a href=\"$viewUrl\" title=\"View Chrome Dev Tools Timeline\">view</a>)\n";
    $out .= "<br>\n";
    $out .= "<a href=\"$breakdownUrl\" title=\"View browser main thread activity by event type\">Processing Breakdown</a>";
    return $out;
  }

  /**
   * @param TestStepResult $stepResult
   * @param string|null $tcpDumpView TcpDumpView URL from settings or null
   * @return string Markup with links
   */
  private function _getCaptureLinks($stepResult, $tcpDumpView) {
    $localPaths = $stepResult->createTestPaths();
    if (!gz_is_file($localPaths->captureFile())) {
      return "";
    }
    $wpt_host = trim($_SERVER['HTTP_HOST']);
    $filenamePaths = $stepResult->createTestPaths("");
    $urlGenerator = $stepResult->createUrlGenerator("", false);

    $tcpdump_url = $urlGenerator->getGZip($filenamePaths->captureFile());
    $out = "<br><br>\n";
    $out .= "<a href=\"$tcpdump_url\" title=\"Download tcpdump session capture\">tcpdump</a>\n";
    if ($tcpDumpView) {
      $view_url = $tcpDumpView . urlencode("http://$wpt_host$tcpdump_url");
      $out .= " - (<a href=\"$view_url\" title=\"View tcpdump session capture\">view</a>)";
    }
    if (gz_is_file($localPaths->keylogFile())) {
      $keylogUrl = $urlGenerator->getGZip($filenamePaths->keylogFile());
      $out .= "<br>(<a href=\"$keylogUrl\" title=\"TLS key log file\">TLS Key Log</a>)";
    }
    return $out;
  }

}