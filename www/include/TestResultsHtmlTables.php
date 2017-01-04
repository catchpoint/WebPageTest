<?php

require_once __DIR__ . '/../common_lib.inc';

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
  private $tcpDumpViewSettings;
  private $isMultistep;

  private $waterfallDisplayed;
  private $screenshotDisplayed;

  /**
   * TestResultsHtmlTables constructor.
   * @param TestInfo $testInfo Test information
   * @param TestResults $testResults The results of the test
   * @param bool $testComplete True if the test is complete, false otherwise
   * @param string|null $median_metric The metric to use to determine the median. (load time by default)
   * @param string|null $tcpDumpViewSettings The settings for viewing a TCP dump (URL or null)
   */
  public function __construct($testInfo, $testResults, $testComplete, $median_metric, $tcpDumpViewSettings) {
    $this->testInfo = $testInfo;
    $this->testResults = $testResults;
    $this->testComplete = $testComplete;
    $this->breakdown = null;
    $this->hasVideo = $this->testInfo->hasVideo();
    $this->hasScreenshots = $this->testInfo->hasScreenshots();
    $this->firstViewMedianRun = $this->testResults->getMedianRunNumber($median_metric, false);
    $this->tcpDumpViewSettings = $tcpDumpViewSettings;
    $this->isMultistep = $this->testInfo->getSteps() > 1;
  }

  public function create() {
    $runs = $this->testInfo->getRuns();
    $this->waterfallDisplayed = false;
    $this->screenshotDisplayed = false;
    $out = "";
    for ($run = 1; $run <= $runs; $run++) {
      $runResults = $this->testResults->getRunResult($run, false);
      if ($runs > 1) {
        $out .=  '<h4><a name="run' . $run . '">Run ' . $run . ':</a></h4>';
      }
      if (!$runResults) {
        $error_str = $this->testComplete ? 'Test Error: Data is missing.' : 'Waiting for test result...';
        $out .=  '<p>' . htmlspecialchars($error_str) . '</p>';
      } else {
        $out .= $this->_createTableForRun($run);
      }
    }
    return $out;
  }

  private function _createTableForRun($run) {
    $fvMedian = $this->firstViewMedianRun;
    $out = "<table id=\"table$run\" class=\"pretty result\" align=\"center\" border=\"1\" cellpadding=\"20\" cellspacing=\"0\">\n";
    $columns = $this->_countTableColumns();
    $out .= $this->_createTableHead();

    $firstViewResults = $this->testResults->getRunResult($run, false);
    $hasRepeatView = !$this->testInfo->isFirstViewOnly() || $this->testResults->getRunResult($run, true);

    if ($this->isMultistep && $hasRepeatView) {
      $out .= $this->_createSeparationRow("First View", $columns);
    }
    $out .= $this->_createRunResultRows($run, false, $columns);

    if ($hasRepeatView) {
      if ($this->isMultistep) {
        $out .= $this->_createSeparationRow("Repeat View", $columns);
      }
      $out .= $this->_createRunResultRows($run, true, $columns);
    }

    if ($this->testComplete && $run == $fvMedian && $firstViewResults && $firstViewResults->isValid() && !$this->isMultistep) {
      $out .= $this->_createBreakdownRow($firstViewResults->getStepResult(1), $columns);
    }

    $out .= "</table>\n<br>\n";
    return $out;
  }

  private function _countTableColumns() {
    $columns = 2;
    if ($this->hasScreenshots) {
      $columns++;
    }
    if ($this->hasVideo) {
      $columns++;
    }
    return $columns;
  }

  private function _createSeparationRow($label, $colspan) {
    return "<tr><td colspan='$colspan' class='separation'>$label</td></tr>\n";
  }

  /**
   * @param int $run Run number
   * @param bool $cached False for first view, true for repeat view
   * @param int $tableColumns number of columns in the table
   * @return string The created markup
   */
  private function _createRunResultRows($run, $cached, $tableColumns) {
    $runResults = $this->testResults->getRunResult($run, $cached);
    if (!$runResults || !$runResults->isValid()) {
      return $this->_createErrorRow($run, $cached, $tableColumns);
    }

    $evenRow = false;
    $out = "";
    foreach ($runResults->getStepResults() as $stepResult) {
      $out .= $this->_createStepResultRow($stepResult, $evenRow);
      $evenRow = !$evenRow;
    }
    return $out;
  }

  /**
   * @param TestStepResult $stepResult
   * @param int $tableColumns Number of columsn in the table
   * @return string The created markup
   */
  private function _createBreakdownRow($stepResult, $tableColumns) {
    $urlGenerator = $stepResult->createUrlGenerator("", FRIENDLY_URLS);
    $b = getBreakdownForStep($stepResult->createTestPaths(), $urlGenerator, $requests);
    if (is_array($b)) {
      $this->breakdown[] = array('run' => $stepResult->getRunNumber(), 'data' => $b);
    }
    $out = "<tr>\n";

    $out .= "<td align=\"left\" valign=\"middle\">\n";
    $breakdownUrl = $urlGenerator->resultPage("breakdown");
    $out .= "<a href=\"$breakdownUrl\">Content Breakdown</a>";
    $out .= "</td>";

    $span = $tableColumns - 1;
    $out .= "<td align=\"left\" valign=\"middle\" colspan=\"$span\">";
    $run = $stepResult->getRunNumber();
    $out .= "<table><tr><td style=\"border:none;\"><div id=\"requests_$run\"></div></td>";
    $out .= "<td style=\"border:none;\"><div id=\"bytes_$run\"></div></td></tr></table>";
    $out .= "</td>\n";

    $out .= "</tr>\n";
    return $out;
  }

  public function getBreakdown() {
    return $this->breakdown;
  }

  private function _createTableHead() {
    $out =  "<tr>\n";
    $out .=  "<th align=\"center\" class=\"empty\" valign=\"middle\"></th>\n";
    $out .=  "<th align=\"center\" valign=\"middle\">Waterfall</th>\n";
    if ($this->hasScreenshots) {
      $out .=  '<th align="center" valign="middle">Screen Shot</th>';
    }
    if ($this->hasVideo) {
      $out .=  '<th align="center" valign="middle">Video</th>';
    }
    $out .=  '</tr>';
    return $out;
  }

  /**
   * @param TestStepResult $stepResult
   * @param bool $evenRow
   * @return string Created markup
   */
  private function _createStepResultRow($stepResult, $evenRow) {
    $rowId = "run" . $stepResult->getRunNumber() . "_step" . $stepResult->getStepNumber();
    $out = "<tr id='$rowId' class='stepResultRow'>\n";
    $out .= $this->_createResultCell($stepResult, $evenRow);
    $out .= $this->_createWaterfallCell($stepResult, $evenRow);
    if ($this->hasScreenshots) {
      $out .= $this->_createScreenshotCell($stepResult, $evenRow);
    }
    if ($this->hasVideo) {
      $out .= $this->_createVideoCell($stepResult, $evenRow);
    }
    $out .= "</tr>\n";
    return $out;
  }

  /**
   * @param TestStepResult $stepResult
   * @param bool $even true for even rows
   * @return string The created markup
   */
  private function _createResultCell($stepResult, $even) {
    $evenClass = $even ? " even" : "";
    $out = "<td align=\"left\" valign=\"middle\" class='resultCell$evenClass'>\n";
    if ($this->isMultistep) {
      $out .= FitText($stepResult->readableIdentifier(), 30);
    } else {
      $out .=  $stepResult->isCachedRun() ? "Repeat View" : "First View";
    }
    $out .=  $this->_getResultLabel($stepResult);
    $out .=  $this->_getDynatraceLinks($stepResult);
    $out .=  $this->_getCaptureLinks($stepResult);
    $out .=  $this->_getTimelineLinks($stepResult);
    $out .=  $this->_getTraceLinks($stepResult);
    $out .=  $this->_getNetlogLinks($stepResult);
    $out .=  '</td>';
    return $out;
  }

  /**
   * @param TestStepResult $stepResult
   * @return string The created markup
   */
  private function _createVideoCell($stepResult, $even) {
    $localPaths = $stepResult->createTestPaths();
    $nameOnlyPaths = $stepResult->createTestPaths("");
    $class = $even ? 'class="even"' : '';
    $out = "<td align=\"center\" valign=\"middle\" $class>";
    if (is_dir($localPaths->videoDir())) {
      $urlGenerator = $stepResult->createUrlGenerator("", false);
      $end = $this->getRequestEndParam($stepResult);

      $filmstripUrl = $urlGenerator->filmstripView($end);
      $out .=  "<a href=\"$filmstripUrl\">Filmstrip View</a><br>-<br>";

      $createUrl = $urlGenerator->createVideo($end);
      $out .=  "<a href=\"$createUrl\">Watch Video</a>";

      $rawVideoPath = $localPaths->rawDeviceVideo();
      if (is_file($rawVideoPath)) {
        $rawVideoUrl = htmlspecialchars($urlGenerator->getFile($nameOnlyPaths->rawDeviceVideo()));
        $out .=  "<br>-<br><a href=\"$rawVideoUrl\">Raw Device Video</a>";
      }
    } else {
      $out .=  "not available";
    }
    $out .=  '</td>';
    return $out;
  }

  /**
   * @param TestStepResult $stepResult
   * @param bool $even
   * @return string The created markup
   */
  private function _createWaterfallCell($stepResult, $even) {
    $end = $this->getRequestEndParam($stepResult);
    $endParam = $end ? "end=$end" : null;

    $urlGenerator = $stepResult->createUrlGenerator("", FRIENDLY_URLS && !$endParam);
    $hash = "#waterfall_view_step" . $stepResult->getStepNumber();
    $detailsUrl = $urlGenerator->resultPage("details", $endParam) . $hash;
    $thumbUrl = $urlGenerator->thumbnail("waterfall.png");
    $class = $even ? 'class="even"' : '';
    $onload =  $this->waterfallDisplayed ? "" : " onload=\"markUserTime('aft.First Waterfall')\"";

    $out = "<td align=\"center\" $class valign=\"middle\">\n";
    $out .=  "<a href=\"$detailsUrl\"><img class=\"progress\" width=\"250\" src=\"$thumbUrl\" $onload></a>\n";
    $out .=  "</td>\n";

    $this->waterfallDisplayed = true;
    return $out;
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
   * @return string The created markup
   */
  private function _createScreenshotCell($stepResult, $even) {
    $urlGenerator = $stepResult->createUrlGenerator("", FRIENDLY_URLS);
    $class = $even ? 'class="even"' : '';
    $onload = $this->screenshotDisplayed ? "" : " onload=\"markUserTime('aft.First Screen Shot')\"";
    $screenShotUrl = $urlGenerator->resultPage("screen_shot") . "#step_" . $stepResult->getStepNumber();
    $thumbnailUrl = $urlGenerator->thumbnail("screen.jpg");
    $out = "<td align=\"center\" valign=\"middle\" $class>\n";
    $out .= "<a href=\"$screenShotUrl\"><img class=\"progress\"$onload width=\"250\" src=\"$thumbnailUrl\"></a>\n";
    $out .= "</td>\n";
    return $out;
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
    $out .= " (<a href=\"$viewUrl\" target=\"_blank\" title=\"View Chrome Dev Tools Timeline\">view</a>)\n";
    $out .= "<br>\n";
    $out .= "<a href=\"$breakdownUrl\" title=\"View browser main thread activity by event type\">Processing Breakdown</a>";
    return $out;
  }

  /**
   * @param TestStepResult $stepResult
   * @return string Markup with links
   */
  private function _getCaptureLinks($stepResult) {
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
    if ($this->tcpDumpViewSettings) {
      $view_url = $this->tcpDumpViewSettings . urlencode("http://$wpt_host$tcpdump_url");
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
    if ((empty($infoArray["trace"]) && !$this->testInfo->hasTimeline()) || !gz_is_file($localPaths->devtoolsTraceFile())) {
      return "";
    }
    $filenamePaths = $stepResult->createTestPaths("");
    $urlGenerator = $stepResult->createUrlGenerator("", FRIENDLY_URLS);
    $zipUrl = $urlGenerator->getGZip($filenamePaths->devtoolsTraceFile());
    $viewUrl = $urlGenerator->stepDetailPage("chrome/trace");

    $out = "<br><br><a href=\"$zipUrl\" title=\"Download Chrome Trace\">Trace</a>\n";
    $out .= " (<a href=\"$viewUrl\" target=\"_blank\" title=\"View Chrome Trace\">view</a>)\n";
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

  private function _createErrorRow($run, $cached, $tableColumns) {
    $error = $this->testInfo->getRunError($run, $cached);
    $error_str = $error ? htmlspecialchars('Test Error: ' . $error) : "Test Data Missing";
    $cachedLabel = $cached ? "Repeat View" : "First View";
    $out = "<tr id='run${run}_step1' class='stepResultRow'>";
    $out .= "<td colspan=\"$tableColumns\" align=\"left\" valign=\"middle\">$cachedLabel: $error_str</td></tr>\n";
    return $out;
  }

}