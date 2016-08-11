<?php

require_once __DIR__ . '/../common_lib.inc';

class RunResultHtmlTable {
  const SPEED_INDEX_URL = "https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index";

  const COL_LABEL = "label";
  const COL_ABOVE_THE_FOLD = "aft";
  const COL_USER_TIME = "userTime";
  const COL_DOM_TIME = "domTime";
  const COL_DOM_ELEMENTS = "domElements";
  const COL_SPEED_INDEX = "SpeedIndex";
  const COL_VISUAL_COMPLETE = "visualComplete";
  const COL_RESULT = "result";

  /* @var TestInfo */
  private $testInfo;
  /* @var TestRunResults */
  private $runResults;

  private $isMultistep;

  private $allOptionalColumns;
  private $enabledColumns;

  /**
   * RunResultHtmlTable constructor.
   * @param TestInfo $testInfo
   * @param TestRunResults $runResults
   */
  public function __construct($testInfo, $runResults) {
    $this->testInfo = $testInfo;
    $this->runResults = $runResults;
    $this->isMultistep = $runResults->isMultistep();
    $this->allOptionalColumns = array(self::COL_LABEL, self::COL_ABOVE_THE_FOLD, self::COL_USER_TIME,
      self::COL_DOM_TIME, self::COL_DOM_ELEMENTS, self::COL_SPEED_INDEX, self::COL_VISUAL_COMPLETE, self::COL_RESULT);
    $this->enabledColumns = array();

    // optional columns default setting based on data
    $this->enabledColumns[self::COL_LABEL] = $this->isMultistep;
    $this->enabledColumns[self::COL_ABOVE_THE_FOLD] = $testInfo->hasAboveTheFoldTime();
    $this->enabledColumns[self::COL_RESULT] = true;
    $checkByMetric = array(self::COL_USER_TIME, self::COL_DOM_TIME, self::COL_DOM_ELEMENTS, self::COL_SPEED_INDEX,
                           self::COL_VISUAL_COMPLETE);
    foreach ($checkByMetric as $col) {
      $this->enabledColumns[$col] = $runResults->hasValidMetric($col);
    }
  }

  /**
   * @param string[] $columns The columns to enable (one of the COL_ constants)
   */
  public function enableColumns($columns) {
    foreach ($columns as $column) {
      $this->enabledColumns[$column] = true;
    }
  }

  /**
   * @param string[] $columns The columns to disable (one of the COL_ constants)
   */
  public function disableColumns($columns) {
    foreach ($columns as $column) {
      $this->enabledColumns[$column] = false;
    }
  }

  /**
   * @param string $column The column to show or not show (one of the COL_ comnstants)
   * @return bool True if the column is enabled, false otherwise
   */
  public function isColumnEnabled($column) {
    return !empty($this->enabledColumns[$column]);
  }

  public function create() {
    $out = '<table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">' . "\n";
    $out .= $this->_createHead();
    $out .= $this->_createBody();
    $out .= "</table>\n";
    return $out;
  }

  private function _createHead() {
    $colspan = 3 + $this->_countEnabledColumns();
    $out = "<tr>\n";
    $out .= $this->_headCell("", "empty", $colspan);
    $out .= $this->_headCell("Document Complete", "border", 3);
    $out .= $this->_headCell("Fully Loaded", "border", 3);
    $out .= "</tr>\n";

    $out .= "<tr>";
    if ($this->isColumnEnabled(self::COL_LABEL)) {
      $out .= $this->_headCell("Step");
    }
    $out .= $this->_headCell("Load Time");
    $out .= $this->_headCell("First Byte");
    $out .= $this->_headCell("Start Render");
    if ($this->isColumnEnabled(self::COL_USER_TIME)) {
      $out .= $this->_headCell("User Time");
    }
    if($this->isColumnEnabled(self::COL_ABOVE_THE_FOLD)) {
      $out .= $this->_headCell("Above the Fold");
    }
    if ($this->isColumnEnabled(self::COL_VISUAL_COMPLETE)) {
      $out .= $this->_headCell("Visually Complete");
    }
    if ($this->isColumnEnabled(self::COL_SPEED_INDEX)) {
      $out .= $this->_headCell('<a href="' . self::SPEED_INDEX_URL . '" target="_blank">Speed Index</a>');
    }
    if ($this->isColumnEnabled(self::COL_DOM_TIME)) {
      $out .= $this->_headCell("DOM Element");
    }
    if ($this->isColumnEnabled(self::COL_DOM_ELEMENTS)) {
      $out .= $this->_headCell("DOM Elements");
    }
    if ($this->isColumnEnabled(self::COL_RESULT)) {
      $out .= $this->_headCell("Result (error&nbsp;code)");
    }

    for ($i = 0; $i < 2; $i++) {
      $out .= $this->_headCell("Time", "border");
      $out .= $this->_headCell("Requests");
      $out .= $this->_headCell("Bytes In");
    }

    return $out;
  }

  private function _createBody() {
    $out = "";
    for ($i = 1; $i <= $this->runResults->countSteps(); $i++) {
      $out .= $this->_createRow($this->runResults->getStepResult($i));
    }
    return $out;
  }

  /**
   * @param TestStepResult $stepResult
   * @return string HTML Table row
   */
  private function _createRow($stepResult) {
    $stepNum = $stepResult->getStepNumber();
    $idSuffix = $this->isMultistep ? ("-step" . $stepNum) : "";
    $out = "<tr>\n";
    if ($this->isColumnEnabled(self::COL_LABEL)) {
      $out .= $this->_bodyCell("", FitText($stepResult->readableIdentifier(), 30));
    }
    $out .= $this->_bodyCell("LoadTime" . $idSuffix, $this->_getIntervalMetric($stepResult, 'loadTime'));
    $out .= $this->_bodyCell("TTFB" . $idSuffix, $this->_getIntervalMetric($stepResult, 'TTFB'));
    $out .= $this->_bodyCell("startRender" . $idSuffix, $this->_getIntervalMetric($stepResult, 'render'));

    if ($this->isColumnEnabled(self::COL_USER_TIME)) {
      $out .= $this->_bodyCell("userTime" . $idSuffix, $this->_getIntervalMetric($stepResult, "userTime"));
    }
    if ($this->isColumnEnabled(self::COL_ABOVE_THE_FOLD)) {
      $aft = $stepResult->getMetric("aft");
      $aft = $aft !== null ? (number_format($aft / 1000.0, 1) . 's') : "N/A";
      $out .= $this->_bodyCell("aft" . $idSuffix, $aft);
    }
    if ($this->isColumnEnabled(self::COL_VISUAL_COMPLETE)) {
      $out .= $this->_bodyCell("visualComplete" . $idSuffix, $this->_getIntervalMetric($stepResult, "visualComplete"));
    }
    if($this->isColumnEnabled(self::COL_SPEED_INDEX)) {
      $speedIndex = $stepResult->getMetric("SpeedIndexCustom");
      $speedIndex = $speedIndex !== null ? $speedIndex : $stepResult->getMetric("SpeedIndex");
      $speedIndex = $speedIndex !== null ? $speedIndex : "-";
      $out .= $this->_bodyCell("speedIndex" . $idSuffix, $speedIndex);
    }
    if ($this->isColumnEnabled(self::COL_DOM_TIME)) {
      $out .= $this->_bodyCell("domTime" . $idSuffix, $this->_getIntervalMetric($stepResult, "domTime"));
    }
    if ($this->isColumnEnabled(self::COL_DOM_ELEMENTS)) {
      $domElements = $stepResult->getMetric("domElements");
      $domElements = $domElements !== null ? $domElements : "-";
      $out .= $this->_bodyCell("domElements" . $idSuffix, $domElements);
    }
    if ($this->isColumnEnabled(self::COL_RESULT)) {
      $out .= $this->_bodyCell("result" . $idSuffix, $this->_getSimpleMetric($stepResult, "result"));
    }

    $out .= $this->_bodyCell("docComplete" . $idSuffix, $this->_getIntervalMetric($stepResult, "docTime"), "border");
    $out .= $this->_bodyCell("requestsDoc" . $idSuffix, $this->_getSimpleMetric($stepResult, "requestsDoc"));
    $out .= $this->_bodyCell("bytesInDoc" . $idSuffix, $this->_getByteMetricInKbyte($stepResult, "bytesInDoc"));


    $out .= $this->_bodyCell("fullyLoaded" . $idSuffix, $this->_getIntervalMetric($stepResult, "fullyLoaded"), "border");
    $out .= $this->_bodyCell("requests" . $idSuffix, $this->_getSimpleMetric($stepResult, "requests"));
    $out .= $this->_bodyCell("bytesIn" . $idSuffix, $this->_getByteMetricInKbyte($stepResult, "bytesIn"));

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
    $attributes = '';
    $attributes .= $id ? 'id="' . $id . '" ' : '';
    $attributes .= $classNames ? ('class="' . $classNames . '" ') : '';
    return '<td '. $attributes . 'valign="middle">' . $innerHtml . "</td>\n";
  }

  private function _countEnabledColumns() {
    $enabled = 0;
    foreach ($this->allOptionalColumns as $col) {
      if ($this->isColumnEnabled($col)) {
        $enabled++;
      }
    }
    return $enabled;
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
