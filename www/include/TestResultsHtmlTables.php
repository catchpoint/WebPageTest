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

  public function __construct($testInfo, $testResults, $testComplete, $median_metric) {
    $this->testInfo = $testInfo;
    $this->testResults = $testResults;
    $this->testComplete = $testComplete;
    $this->breakdown = null;
    $this->hasVideo = $this->testInfo->hasVideo();
    $this->hasScreenshots = $this->testInfo->hasScreenshots();
    $this->firstViewMedianRun = $this->testResults->getMedianRunNumber($median_metric, false);
  }

  public function create($tcpDumpView) {
    $runs = $this->testInfo->getRuns();
    $this->waterfallDisplayed = false;
    $this->screenshotDisplayed = false;
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
    $fvMedian = $this->firstViewMedianRun;
    echo "<table id=\"table<?php echo $run; ?>\" class=\"pretty result\" align=\"center\" border=\"1\" cellpadding=\"20\" cellspacing=\"0\">\n";
    $table_columns = $this->_createTableHead();

    $firstViewResults = $this->testResults->getRunResult($run, false);
    $this->_createRunResultRows($run, false, $tcpDumpView, $table_columns);
    if (!$this->testInfo->isFirstViewOnly() || $this->testResults->getRunResult($run, true)) {
      $this->_createRunResultRows($run, true, $tcpDumpView, $table_columns);
    }
    if ($this->testComplete && $run == $fvMedian && $firstViewResults) {
      $this->_createBreakdownRow($firstViewResults->getStepResult(1), $table_columns);
    }

    echo "</table>\n<br>\n";
  }

  /**
   * @param int $run Run number
   * @param bool $cached False for first view, true for repeat view
   * @param string|null $tcpDumpView From settings
   * @param int $tableColumns number of columns in the table
   */
  private function _createRunResultRows($run, $cached, $tcpDumpView, $tableColumns) {
    $cachedLabel = $cached ? "Repeat View" : "First View";
    $rvError = $this->testInfo->getRunError($run, $cached);
    $runResults = $this->testResults->getRunResult($run, $cached);
    echo '<tr>';
    if ($runResults) {
      $stepResult = $runResults->getStepResult(1);
      $this->_createResultCell($stepResult, $tcpDumpView, $cached);
      $this->_createWaterfallCell($stepResult, $cached);
      if ($this->hasScreenshots) {
        $this->_createScreenshotCell($stepResult, $cached);
      }
      if ($this->hasVideo) {
        $this->_createVideoCell($stepResult, $cached);
      }
    } else if ($rvError) {
      $error_str = htmlspecialchars('Test Error: ' . $rvError);
      echo "<td colspan=\"$tableColumns\" align=\"left\" valign=\"middle\">$cachedLabel: $error_str</td>";
    } else {
      echo "<td colspan=\"$tableColumns\" align=\"left\" valign=\"middle\">$cachedLabel: Test Data Missing</td>";
    }
    echo '</tr>';
  }

  /**
   * @param TestStepResult $stepResult
   * @param int $tableColumns Number of columsn in the table
   */
  private function _createBreakdownRow($stepResult, $tableColumns) {
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

    $span = $tableColumns - 1;
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
   * @param string|null $tcpDumpView TcpDumpView URL from settings or null
   * @param bool $even true for even rows
   */
  private function _createResultCell($stepResult, $tcpDumpView, $even) {
    $class = $even ? "class='even'" : "";
    echo "<td align=\"left\" $class valign=\"middle\">\n";
    echo $stepResult->isCachedRun() ? "Repeat View" : "First View";
    echo $this->_getResultLabel($stepResult);
    echo $this->_getDynatraceLinks($stepResult);
    echo $this->_getCaptureLinks($stepResult, $tcpDumpView);
    echo $this->_getTimelineLinks($stepResult);
    echo $this->_getTraceLinks($stepResult);
    echo $this->_getNetlogLinks($stepResult);
    echo '</td>';
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

  /**
   * @param TestStepResult $stepResult
   * @return string Markup with links
   */
  private function _getDynatraceLinks($stepResult) {
    $dynatracePath = $stepResult->createTestPaths()->dynatraceFile();
    if (!is_file($dynatracePath)) {
      return "";
    }
    $out = "<br><br><div><a href=\"/$dynatracePath\" title=\"Download dynaTrace Session\">\n";
    $out .= "<img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_session_v3.png\" alt=\"Download dynaTrace Session\">\n";
    $out .= "</a></div><br>\n";
    $out .= "<a href=\"http://ajax.dynatrace.com/pages/\" target=\"_blank\" title=\"Get dynaTrace AJAX Edition\">\n";
    $out .= "<img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_ajax.png\" alt=\"Get dynaTrace Ajax Edition\"></a>\n";
    return $out;
  }

  /**
   * @param TestStepResult $stepResult
   * @return string Markup with links
   */
  private function _getTraceLinks($stepResult) {
    $infoArray = $this->testInfo->getInfoArray();
    $localPaths = $stepResult->createTestPaths();
    if (empty($infoArray["trace"]) || !gz_is_file($localPaths->devtoolsTraceFile())) {
      return "";
    }
    $filenamePaths = $stepResult->createTestPaths("");
    $urlGenerator = $stepResult->createUrlGenerator("", FRIENDLY_URLS);
    $zipUrl = $urlGenerator->getGZip($filenamePaths->devtoolsTraceFile());
    $viewUrl = $urlGenerator->stepDetailPage("chrome/trace");

    $out = "<br><br><a href=\"$zipUrl\" title=\"Download Chrome Trace\">Trace</a>\n";
    $out .= " (<a href=\"$viewUrl\" title=\"View Chrome Trace\">view</a>)\n";
    return $out;
  }

  /**
   * @param TestStepResult $stepResult
   * @return string Markup with links
   */
  private function _getNetlogLinks($stepResult) {
    $localPaths = $stepResult->createTestPaths();
    if (!gz_is_file($localPaths->netlogFile())) {
      return "";
    }
    $urlGenerator = $stepResult->createUrlGenerator("", FRIENDLY_URLS);
    $zipUrl = $urlGenerator->getGZip( $stepResult->createTestPaths("")->netlogFile());
    return "<br><br><a href=\"$zipUrl\" title=\"Download Network Log\">Net Log</a>";
  }

  /**
   * @param TestStepResult $stepResult
   * @return string Markup with label
   */
  private function _getResultLabel($stepResult) {
    $out = "";
    $error = $this->testInfo->getRunError($stepResult->getRunNumber(), $stepResult->isCachedRun());
    if ($error) {
      $out .= '<br>(Test Error: ' . htmlspecialchars($error) . ')';
    }
    $result = $stepResult->getMetric("result");
    $loadTime = $stepResult->getMetric("loadTime");
    if ($result !== null && $result !== 0 && $result !== 99999) {
      $out .= '<br>(Error: ' . LookupError($result) . ')';
    } else if ($loadTime !== null) {
      $out .= '<br>(' . number_format($loadTime / 1000.0, 3) . 's)';
    }
    return $out;
  }

}