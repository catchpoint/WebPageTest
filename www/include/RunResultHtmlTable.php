<?php

require_once __DIR__ . '/../common_lib.inc';

class RunResultHtmlTable {
  const SPEED_INDEX_URL = "https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index";

  const COL_LABEL = "label";
  const COL_ABOVE_THE_FOLD = "aft";
  const COL_USER_TIME = "userTime";
  const COL_DOM_TIME = "domTime";
  const COL_DOM_ELEMENTS = "domElements";
  const COL_TTI = "TimeToInteractive";
  const COL_SPEED_INDEX = "SpeedIndex";
  const COL_VISUAL_COMPLETE = "visualComplete";
  const COL_RESULT = "result";
  const COL_COST = "cost";
  const COL_CERTIFICATE_BYTES = "certificate_bytes";

  /* @var TestInfo */
  private $testInfo;
  /* @var TestRunResults */
  private $runResults;
  private $rvRunResults;

  private $isMultistep;

  private $leftOptionalColumns;
  private $rightOptionalColumns;
  private $enabledColumns;
  private $enableLabelLinks;

  /**
   * RunResultHtmlTable constructor.
   * @param TestInfo $testInfo
   * @param TestRunResults $runResults
   * @param TestRunResults $rvRunResults Optional. Run results of the repeat view
   */
  public function __construct($testInfo, $runResults, $rvRunResults=null) {
    $this->testInfo = $testInfo;
    $this->runResults = $runResults;
    $this->rvRunResults = $rvRunResults;
    $this->isMultistep = $runResults->isMultistep();
    $this->leftOptionalColumns = array(self::COL_LABEL, self::COL_USER_TIME,
      self::COL_TTI, self::COL_SPEED_INDEX, self::COL_VISUAL_COMPLETE, self::COL_RESULT);
    $this->rightOptionalColumns = array(self::COL_CERTIFICATE_BYTES, self::COL_COST);
    $this->enabledColumns = array();

    // optional columns default setting based on data
    $this->enabledColumns[self::COL_LABEL] = $this->testInfo->getRuns() > 1 || $this->isMultistep || $this->rvRunResults;
    $this->enabledColumns[self::COL_ABOVE_THE_FOLD] = $testInfo->hasAboveTheFoldTime();
    $this->enabledColumns[self::COL_RESULT] = true;
    $this->enabledColumns[self::COL_CERTIFICATE_BYTES] = $runResults->hasValidNonZeroMetric('certificate_bytes');
    $checkByMetric = array(self::COL_USER_TIME, self::COL_DOM_TIME, self::COL_TTI, self::COL_SPEED_INDEX,
                           self::COL_VISUAL_COMPLETE);
    foreach ($checkByMetric as $col) {
      $this->enabledColumns[$col] = $runResults->hasValidMetric($col) ||
                                   ($rvRunResults && $rvRunResults->hasValidMetric($col));
    }
    
    // Special-case the check for TTI
    if (!$this->enabledColumns[self::COL_TTI]) {
      $this->enabledColumns[self::COL_TTI] = $runResults->hasValidMetric('TTIMeasurementEnd') ||
                                   ($rvRunResults && $rvRunResults->hasValidMetric('TTIMeasurementEnd'));
    }
  }

  /**
   * @param bool $use True to use links for the labels, false otherwise
   */
  public function useLabelLinks($use) {
    $this->enableLabelLinks = $use;
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
    $colspan = 3 + $this->_countLeftEnabledColumns();
    $out = "<tr>\n";
    $out .= $this->_headCell("", "empty", $colspan);
    $out .= $this->_headCell("Document Complete", "border", 3);
    $out .= $this->_headCell("Fully Loaded", "border", 3 + $this->_countRightEnabledColumns());
    $out .= "</tr>\n";

    $out .= "<tr>";
    if ($this->isColumnEnabled(self::COL_LABEL)) {
      if ($this->isMultistep) {
        $out .= $this->_headCell("Step");
      } else {
        $out .= $this->_headCell("", "empty", 1);
      }
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
    if ($this->isColumnEnabled(self::COL_TTI)) {
      $out .= $this->_headCell("<a href=\"https://github.com/WPO-Foundation/webpagetest/blob/master/docs/Metrics/TimeToInteractive.md\">Interactive (beta)</a>");
    }
    if ($this->isColumnEnabled(self::COL_RESULT)) {
      $out .= $this->_headCell("Result (error&nbsp;code)");
    }

    for ($i = 0; $i < 2; $i++) {
      $out .= $this->_headCell("Time", "border");
      $out .= $this->_headCell("Requests");
      $out .= $this->_headCell("Bytes In");
    }

    if ($this->isColumnEnabled(self::COL_CERTIFICATE_BYTES)) {
      $out .= $this->_headCell("Certificates");
    }
    
    if ($this->isColumnEnabled(self::COL_COST)) {
      $out .= $this->_headCell("Cost");
    }

    return $out;
  }

  private function _createBody() {
    $out = "";
    if ($this->isMultistep && $this->rvRunResults) {
      $out .= $this->_headlineRow($this->runResults->isCachedRun(), $this->runResults->getRunNumber());
    }
    for ($i = 1; $i <= $this->runResults->countSteps(); $i++) {
      $out .= $this->_createRow($this->runResults->getStepResult($i), $i);
    }
    if ($this->rvRunResults) {
      if ($this->isMultistep) {
        $out .= $this->_headlineRow($this->rvRunResults->isCachedRun(), $this->rvRunResults->getRunNumber());
      }
      for ($i = 1; $i <= $this->rvRunResults->countSteps(); $i++) {
        $out .= $this->_createRow($this->rvRunResults->getStepResult($i), $i);
      }
    }
    return $out;
  }

  private function _headlineRow($isRepeatView, $runNumber) {
    $label = $this->_rvLabel($isRepeatView, $runNumber);
    $colspan = 9 + $this->_countLeftEnabledColumns() + $this->_countRightEnabledColumns();
    return "<tr><td colspan='$colspan' class='separation'>$label</td></tr>\n";
  }

  private function _rvLabel($isRepeatView, $runNumber) {
    $label = $isRepeatView ? "Repeat View" : "First View";
    $label .= $this->testInfo->getRuns() > 1 ? " (<a href='#run$runNumber'>Run $runNumber</a>)" : "";
    return $label;
  }

  /**
   * @param TestStepResult $stepResult
   * @param int $row Row number
   * @return string HTML Table row
   */
  private function _createRow($stepResult, $row) {
    $stepNum = $stepResult->getStepNumber();
    $cachedRun = $stepResult->isCachedRun();
    $idPrefix = "";
    $class = $row % 2 == 0 ? "even" : null;
    if ($this->rvRunResults) {
      $idPrefix = $stepResult->isCachedRun() ? "rv" : "fv";
    }
    $idSuffix = $this->isMultistep ? ("-step" . $stepNum) : "";
    $out = "<tr>\n";
    if ($this->isColumnEnabled(self::COL_LABEL)) {
      $out .= $this->_bodyCell("", $this->_labelColumnText($stepResult), $class);
    }
    $out .= $this->_bodyCell($idPrefix . "LoadTime" . $idSuffix, $this->_getIntervalMetric($stepResult, 'loadTime'), $class);
    $out .= $this->_bodyCell($idPrefix . "TTFB" . $idSuffix, $this->_getIntervalMetric($stepResult, 'TTFB'), $class);
    $out .= $this->_bodyCell($idPrefix . "StartRender" . $idSuffix, $this->_getIntervalMetric($stepResult, 'render'), $class);

    if ($this->isColumnEnabled(self::COL_USER_TIME)) {
      $out .= $this->_bodyCell($idPrefix . "UserTime" . $idSuffix, $this->_getIntervalMetric($stepResult, "userTime"), $class);
    }
    if ($this->isColumnEnabled(self::COL_ABOVE_THE_FOLD)) {
      $aft = $stepResult->getMetric("aft");
      $aft = $aft !== null ? (number_format($aft / 1000.0, 1) . 's') : "N/A";
      $out .= $this->_bodyCell($idPrefix . "aft" . $idSuffix, $aft, $class);
    }
    if ($this->isColumnEnabled(self::COL_VISUAL_COMPLETE)) {
      $out .= $this->_bodyCell($idPrefix. "visualComplete" . $idSuffix, $this->_getIntervalMetric($stepResult, "visualComplete"), $class);
    }
    if($this->isColumnEnabled(self::COL_SPEED_INDEX)) {
      $speedIndex = $stepResult->getMetric("SpeedIndexCustom");
      $speedIndex = $speedIndex !== null ? $speedIndex : $stepResult->getMetric("SpeedIndex");
      $speedIndex = $speedIndex !== null ? $speedIndex : "-";
      $out .= $this->_bodyCell($idPrefix . "SpeedIndex" . $idSuffix, $speedIndex, $class);
    }
    if ($this->isColumnEnabled(self::COL_DOM_TIME)) {
      $out .= $this->_bodyCell($idPrefix . "DomTime" . $idSuffix, $this->_getIntervalMetric($stepResult, "domTime"), $class);
    }
    if ($this->isColumnEnabled(self::COL_TTI)) {
      $value = '-';
      if ($stepResult->getMetric("TimeToInteractive"))
        $value = $this->_getIntervalMetric($stepResult, "TimeToInteractive");
      elseif ($stepResult->getMetric("TTIMeasurementEnd"))
        $value = '&GT; ' . $this->_getIntervalMetric($stepResult, "TTIMeasurementEnd");
      $out .= $this->_bodyCell($idPrefix. "TimeToInteractive" . $idSuffix, $value, $class);
    }
    if ($this->isColumnEnabled(self::COL_RESULT)) {
      $out .= $this->_bodyCell($idPrefix . "result" . $idSuffix, $this->_getSimpleMetric($stepResult, "result"), $class);
    }

    $borderClass = $class ? ("border " . $class) : "border";
    $out .= $this->_bodyCell($idPrefix . "DocComplete" . $idSuffix, $this->_getIntervalMetric($stepResult, "docTime"), $borderClass);
    $out .= $this->_bodyCell($idPrefix . "RequestsDoc" . $idSuffix, $this->_getSimpleMetric($stepResult, "requestsDoc"), $class);
    $out .= $this->_bodyCell($idPrefix . "BytesInDoc" . $idSuffix, $this->_getByteMetricInKbyte($stepResult, "bytesInDoc"), $class);


    $out .= $this->_bodyCell($idPrefix . "FullyLoaded" . $idSuffix, $this->_getIntervalMetric($stepResult, "fullyLoaded"), $borderClass);
    $out .= $this->_bodyCell($idPrefix . "Requests" . $idSuffix, $this->_getSimpleMetric($stepResult, "requests"), $class);
    $out .= $this->_bodyCell($idPrefix . "BytesIn" . $idSuffix, $this->_getByteMetricInKbyte($stepResult, "bytesIn"), $class);

    if ($this->isColumnEnabled(self::COL_CERTIFICATE_BYTES)) {
      $out .= $this->_bodyCell($idPrefix . "CertificateBytes" . $idSuffix, $this->_getByteMetricInKbyte($stepResult, "certificate_bytes"), $class);
    }
    
    if ($this->isColumnEnabled(self::COL_COST)) {
      if ($cachedRun) {
        $out .= "<td>&nbsp;</td>";
      } else {
        $out .= $this->_bodyCell($idPrefix . "Cost" . $idSuffix, $this->_costColumnText($stepResult), $class);
      }
    }

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

  private function _countLeftEnabledColumns() {
    $enabled = 0;
    foreach ($this->leftOptionalColumns as $col) {
      if ($this->isColumnEnabled($col)) {
        $enabled++;
      }
    }
    return $enabled;
  }

  private function _countRightEnabledColumns() {
    $enabled = 0;
    foreach ($this->rightOptionalColumns as $col) {
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

  /**
   * @param TestStepResult $stepResult
   * @return string
   */
  private function _labelColumnText($stepResult) {
    $runNumber = $stepResult->getRunNumber();
    if (!$this->isMultistep) {
      return $this->_rvLabel($stepResult->isCachedRun(), $runNumber);
    }
    $label = FitText($stepResult->readableIdentifier(), 30);
    if ($this->enableLabelLinks) {
      $label = "<a href='#run" . $runNumber . "_step" . $stepResult->getStepNumber() . "'>" . $label . "</a>";
    }
    return $label;
  }

  /**
   * @param $stepResult
   * @return string
   */
  private function _costColumnText($stepResult) {
    // one dollar sign for every 500KB
    $dollars = "";
    $count = max(1, min(5, ceil($stepResult->getMetric("bytesIn") / (500 * 1024))));
    for ($i = 1; $i <= 5; $i++)
      $dollars .= $i <= $count ? '$' : '-';
    $id = $this->testInfo->getId();
    $text = "<a title=\"Find out how much it costs for someone to use your site on mobile networks around the world.\" " .
      "href=\"http://whatdoesmysitecost.com/test/$id\">$dollars</a>";
    return $text;
  }
}
