<?php

require_once __DIR__ . '/../common_lib.inc';

class RunResultHtmlTable {
  const SPEED_INDEX_URL = "https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index";

  /* @var TestInfo */
  private $testInfo;
  /* @var TestRunResults */
  private $runResults;

  private $isMultistep;

  private $hasAboveTheFoldTime;
  private $hasUserTime;
  private $hasDomTime;
  private $hasDomElements;
  private $hasSpeedIndex;
  private $hasVisualComplete;

  /**
   * RunResultHtmlTable constructor.
   * @param TestInfo $testInfo
   * @param TestRunResults $runResults
   */
  public function __construct($testInfo, $runResults) {
    $this->testInfo = $testInfo;
    $this->runResults = $runResults;
    $this->isMultistep = $runResults->isMultistep();

    // optional columns
    $this->hasAboveTheFoldTime = $testInfo->hasAboveTheFoldTime();
    $this->hasUserTime = $runResults->hasValidMetric("userTime");
    $this->hasDomTime = $runResults->hasValidMetric("domTime");
    $this->hasDomElements = $runResults->hasValidMetric("domElements");
    $this->hasSpeedIndex = $runResults->hasValidMetric("SpeedIndex");
    $this->hasVisualComplete = $runResults->hasValidMetric("visualComplete");
  }

  public function create() {
    $out = '<table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">' . "\n";
    $out .= $this->_createHead();
    $out .= $this->_createBody();
    $out .= "</table>\n";
    return $out;
  }

  private function _createHead() {
    $colspan = 4 + $this->_countOptionalColumns();
    $out = "<tr>\n";
    $out .= $this->_headCell("", "empty", $colspan);
    $out .= $this->_headCell("Document Complete", "border", 3);
    $out .= $this->_headCell("Fully Loaded", "border", 3);
    $out .= "</tr>\n";

    $out .= "<tr>";
    $out .= $this->_headCell("Load Time");
    $out .= $this->_headCell("First Byte");
    $out .= $this->_headCell("Start Render");
    if ($this->hasUserTime) {
      $out .= $this->_headCell("User Time");
    }
    if($this->hasAboveTheFoldTime) {
      $out .= $this->_headCell("Above the Fold");
    }
    if ($this->hasVisualComplete) {
      $out .= $this->_headCell("Visually Complete");
    }
    if ($this->hasSpeedIndex) {
      $out .= $this->_headCell('<a href="' . self::SPEED_INDEX_URL . '" target="_blank">Speed Index</a>');
    }
    if ($this->hasDomTime) {
      $out .= $this->_headCell("DOM Element");
    }
    if ($this->hasDomElements) {
      $out .= $this->_headCell("DOM Elements");
    }
    $out .= $this->_headCell("Result (error code)");

    for ($i = 0; $i < 2; $i++) {
      $out .= $this->_headCell("Time", "border");
      $out .= $this->_headCell("Requests");
      $out .= $this->_headCell("Bytes In");
    }

    return $out;
  }

  private function _createBody() {
    $stepResult = $this->runResults->getStepResult(1);

    $out = "<tr>\n";
    $out .= $this->_bodyCell("LoadTime", $this->_getIntervalMetric($stepResult, 'loadTime'));
    $out .= $this->_bodyCell("TTFB", $this->_getIntervalMetric($stepResult, 'TTFB'));
    $out .= $this->_bodyCell("startRender", $this->_getIntervalMetric($stepResult, 'render'));

    if ($this->hasUserTime) {
      $out .= $this->_bodyCell("userTime", $this->_getIntervalMetric($stepResult, "userTime"));
    }
    if ($this->hasAboveTheFoldTime) {
      $aft = $stepResult->getMetric("aft");
      $aft = $aft !== null ? (number_format($aft / 1000.0, 1) . 's') : "N/A";
      $out .= $this->_bodyCell("aft", $aft);
    }
    if ($this->hasVisualComplete) {
      $out .= $this->_bodyCell("visualComplete", $this->_getIntervalMetric($stepResult, "visualComplete"));
    }
    if($this->hasSpeedIndex) {
      $speedIndex = $stepResult->getMetric("SpeedIndexCustom");
      $speedIndex = $speedIndex !== null ? $speedIndex : $stepResult->getMetric("SpeedIndex");
      $speedIndex = $speedIndex !== null ? $speedIndex : "-";
      $out .= $this->_bodyCell("speedIndex", $speedIndex);
    }
    if ($this->hasDomTime) {
      $out .= $this->_bodyCell("domTime", $this->_getIntervalMetric($stepResult, "domTime"));
    }
    if ($this->hasDomElements) {
      $domElements = $stepResult->getMetric("domElements");
      $domElements = $domElements !== null ? $domElements : "-";
      $out .= $this->_bodyCell("domElements", $domElements);
    }
    $out .= $this->_bodyCell("result", $this->_getSimpleMetric($stepResult, "result"));

    $out .= $this->_bodyCell("docComplete", $this->_getIntervalMetric($stepResult, "docTime"), "border");
    $out .= $this->_bodyCell("requestsDoc", $this->_getSimpleMetric($stepResult, "requestsDoc"));
    $out .= $this->_bodyCell("bytesInDoc", $this->_getByteMetricInKbyte($stepResult, "bytesInDoc"));


    $out .= $this->_bodyCell("fullyLoaded", $this->_getIntervalMetric($stepResult, "fullyLoaded"), "border");
    $out .= $this->_bodyCell("requests", $this->_getSimpleMetric($stepResult, "requests"));
    $out .= $this->_bodyCell("bytesIn", $this->_getByteMetricInKbyte($stepResult, "bytesIn"));

    $out .= "</tr>\n";
    return $out;
  }

  private function _headCell($innerHtml, $classNames = null, $colspan = 0) {
    $attributes = '';
    $attributes .= $classNames ? ('class="' . $classNames . '" ') : '';
    $attributes .= $colspan > 1 ? ('colspan="' . $colspan . '" ') : '';
    return '<th align="center" ' . $attributes . 'valign="middle">' . $innerHtml . "</th>\n";
  }

  private function _bodyCell($id, $innerHtml, $classNames = null) {
    $attributes = 'id="' . $id . '" ';
    $attributes .= $classNames ? ('class="' . $classNames . '" ') : '';
    return '<td '. $attributes . 'valign="middle">' . $innerHtml . "</td>\n";
  }

  private function _countOptionalColumns() {
    $cols = 0;
    if ($this->hasUserTime)
      $cols++;
    if ($this->hasDomTime)
      $cols++;
    if ($this->hasAboveTheFoldTime)
      $cols++;
    if ($this->hasDomElements)
      $cols++;
    if ($this->hasSpeedIndex)
      $cols++;
    if ($this->hasVisualComplete)
      $cols++;
    return $cols;
  }

  private function _getIntervalMetric($step, $metric) {
    $value = $step->getMetric($metric);
    $value = $value > 0 ? $value : -1; // -1 is UNKNOWN_TIME, but we can't include common.inc
    return formatMsInterval($value, 3);
  }

  private function _getSimpleMetric($step, $metric) {
    $value = $step->getMetric($metric);
    return $value !== null ? $value : "-";
  }

  private function _getByteMetricInKbyte($step, $metric) {
    $value = $step->getMetric($metric);
    return $value !== null ? number_format($value / 1024, 0) . " KB" : "-";
  }
}
