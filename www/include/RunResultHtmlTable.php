<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

require_once __DIR__ . '/../common_lib.inc';

class RunResultHtmlTable {
  const SPEED_INDEX_URL = "https://docs.webpagetest.org/metrics/speedindex/";

  const COL_LABEL = "label";
  const COL_START_RENDER = "render";
  const COL_DOM_TIME = "domTime";
  const COL_DOM_ELEMENTS = "domElements";
  const COL_SPEED_INDEX = "SpeedIndex";
  const COL_VISUAL_COMPLETE = "visualComplete";
  const COL_RESULT = "result";
  const COL_COST = "cost";
  const COL_REQUESTS = "requests";
  const COL_FULLYLOADED = "fullyLoaded";
  const COL_CERTIFICATE_BYTES = "certificate_bytes";
  const COL_FIRST_CONTENTFUL_PAINT = 'firstContentfulPaint';
  const COL_LARGEST_CONTENTFUL_PAINT = 'chromeUserTiming.LargestContentfulPaint';
  const COL_CUMULATIVE_LAYOUT_SHIFT = 'chromeUserTiming.CumulativeLayoutShift';
  const COL_TOTAL_BLOCKING_TIME = 'TotalBlockingTime';
  const COL_TIME_TO_INTERACTIVE = 'TimeToInteractive';

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
    $this->leftOptionalColumns = array(self::COL_LABEL, self::COL_FIRST_CONTENTFUL_PAINT, self::COL_SPEED_INDEX, self::COL_RESULT);
    $this->rightOptionalColumns = array(self::COL_CERTIFICATE_BYTES, self::COL_COST);
    $this->enabledColumns = array();
    // optional columns default setting based on data
    $this->enabledColumns[self::COL_LABEL] = $this->testInfo->getRuns() > 1 || $this->isMultistep || $this->rvRunResults;
    $this->enabledColumns[self::COL_RESULT] = true;
    $this->enabledColumns[self::COL_CERTIFICATE_BYTES] = $runResults->hasValidNonZeroMetric('certificate_bytes');
    $checkByMetric = array(self::COL_FIRST_CONTENTFUL_PAINT, self::COL_SPEED_INDEX, self::COL_TIME_TO_INTERACTIVE,
                           self::COL_LARGEST_CONTENTFUL_PAINT, self::COL_CUMULATIVE_LAYOUT_SHIFT, self::COL_TOTAL_BLOCKING_TIME);
    foreach ($checkByMetric as $col) {
      $this->enabledColumns[$col] = $runResults->hasValidMetric($col) ||
                                   ($rvRunResults && $rvRunResults->hasValidMetric($col));
    }
    
    // If strict_video = 1, only show if metric is present, otherwise alway show
    if (GetSetting('strict_video')) {
      array_push($this->leftOptionalColumns, self::COL_START_RENDER);
      $this->enabledColumns[self::COL_START_RENDER] = $runResults->hasValidMetric(self::COL_START_RENDER) ||
                                                      ($rvRunResults && $rvRunResults->hasValidMetric(self::COL_START_RENDER));
    } else {
      $this->enabledColumns[self::COL_START_RENDER] = true;
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

  public function create( $repeatMetricLabels = false ) {
    if( !$repeatMetricLabels ){
      $out = '<div class="scrollableTable">';
      $out .= '<table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">' . "\n";
      $out .= '<thead>' . $this->_createHead() . '</thead>';
    }
    $out .= $this->_createBody($repeatMetricLabels);
    if( !$repeatMetricLabels ){
      $out .= "</table></div>\n";
    }
    
    return $out;
  }

  private function _createHead() {
    $out = '';
    //$colspan = 1 + $this->_countLeftEnabledColumns() - GetSetting('strict_video', 0); // if strict_video = 1, render is optional
    // $out = "<tr class=\"metric_groups\">\n";
    // $out .= $this->_headCell("", "empty pin");
    // $out .= $this->_headCell("", "empty", $colspan);

    // // Count the web vitals metrics that we have
    // $test_id = $this->testInfo->getId();
    // $run = $this->runResults->getRunNumber();
    // $cached = $this->runResults->isCachedRun() ? '1' : '0';
    // $vitals_url = htmlspecialchars("/vitals.php?test=$test_id&run=$run&cached=$cached");
    // $vitals_count = 0;
    // if ($this->isColumnEnabled(self::COL_LARGEST_CONTENTFUL_PAINT)) {
    //   $vitals_count++;
    // }
    // if ($this->isColumnEnabled(self::COL_CUMULATIVE_LAYOUT_SHIFT)) {
    //   $vitals_count++;
    // }
    // if ($this->isColumnEnabled(self::COL_TOTAL_BLOCKING_TIME)) {
    //   $vitals_count++;
    // }
    // if ($vitals_count > 0) {
    //   $out .= $this->_headCell("<span><a href='$vitals_url'>Web Vitals</a></span>", "border", $vitals_count);
    //}
//    $out .= $this->_headCell("<span>Document Complete</span>", "border", 3);
    // $out .= $this->_headCell("<span>Fully Loaded</span>", "border", 3 + $this->_countRightEnabledColumns());
    // $out .= "</tr>\n";


    $out .= "<tr class=\"metric_labels\">";
    if ($this->isColumnEnabled(self::COL_LABEL)) {
      if ($this->isMultistep) {
        // TODO test multistep
        //$out .= $this->_headCell("Step");
      } else {
        //$out .= $this->_headCell("", "empty pin", 1);
      }
    }
    $out .= $this->_headCell("First Byte");
    if ($this->isColumnEnabled(self::COL_START_RENDER)) {
      $out .= $this->_headCell("Start Render");
    }
    if ($this->isColumnEnabled(self::COL_FIRST_CONTENTFUL_PAINT)) {
      $out .= $this->_headCell('<abbr title="First Contentful Paint">FCP</abbr>');
    }
    if ($this->isColumnEnabled(self::COL_SPEED_INDEX)) {
      $out .= $this->_headCell('<a href="' . self::SPEED_INDEX_URL . '" target="_blank">Speed Index</a>');
    }
    if ($this->isColumnEnabled(self::COL_RESULT)) {
      $out .= $this->_headCell("Result (error&nbsp;code)");
    }
    $vitalsBorder = "border";
    if ($this->isColumnEnabled(self::COL_LARGEST_CONTENTFUL_PAINT)) {
      $out .= $this->_headCell("<a href='$vitals_url#lcp'><abbr title='Largest Contentful Paint'>LCP</abbr></a>", $vitalsBorder);
      $vitalsBorder = null;
    }
    if ($this->isColumnEnabled(self::COL_CUMULATIVE_LAYOUT_SHIFT)) {
      $out .= $this->_headCell("<a href='$vitals_url#cls'><abbr title='Cumulative Layout Shift'>CLS</abbr></a>", $vitalsBorder);
      $vitalsBorder = null;
    }
    if ($this->isColumnEnabled(self::COL_TOTAL_BLOCKING_TIME)) {
      $out .= $this->_headCell("<a href='$vitals_url#tbt'><abbr title='Total Blocking Time'>TBT</abbr></a>", $vitalsBorder);
      $vitalsBorder = null;
    }

    for ($i = 1; $i < 2; $i++) {
      if ($this->isColumnEnabled(self::COL_FULLYLOADED)) {
        $out .= $this->_headCell("Time", "border");
      }
      if ($this->isColumnEnabled(self::COL_REQUESTS)) {
        $out .= $this->_headCell("Requests");
      }
      $out .= $this->_headCell("Total Bytes");
      
    }

    if ($this->isColumnEnabled(self::COL_CERTIFICATE_BYTES)) {
      $out .= $this->_headCell("Certificates");
    }
    
    if ($this->isColumnEnabled(self::COL_COST)) {
      $out .= $this->_headCell("Cost");
    }

    return $out;
  }

  private function _createBody($repeatMetricLabels = false) {
    $out = "";
    if ($this->isMultistep && $this->rvRunResults) {
      $out .= $this->_headlineRow($this->runResults->isCachedRun(), $this->runResults->getRunNumber());
    }
    for ($i = 1; $i <= $this->runResults->countSteps(); $i++) {
      $out .= $this->_createRow($this->runResults->getStepResult($i), $i, $repeatMetricLabels);
    }
    if ($this->rvRunResults) {
      if ($this->isMultistep) {
        $out .= $this->_headlineRow($this->rvRunResults->isCachedRun(), $this->rvRunResults->getRunNumber());
      }
      for ($i = 1; $i <= $this->rvRunResults->countSteps(); $i++) {
        $out .= $this->_createRow($this->rvRunResults->getStepResult($i), $i, $repeatMetricLabels);
      }
    }
    return $out;
  }

  private function _headlineRow($isRepeatView, $runNumber) {
    $label = $this->_rvLabel($isRepeatView, $runNumber);
    $colspan = 8 + $this->_countLeftEnabledColumns() + $this->_countRightEnabledColumns();
    return "<tr><th colspan='$colspan' class='separation'>$label</th></tr>\n";
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
  private function _createRow($stepResult, $row, $repeatMetricLabels = false) {
    $stepNum = $stepResult->getStepNumber();
    $cachedRun = $stepResult->isCachedRun();
    $idPrefix = "";
    $class = $row % 2 == 0 ? "even" : null;
    if ($this->rvRunResults) {
      $idPrefix = $stepResult->isCachedRun() ? "rv" : "fv";
    }
    $idSuffix = $this->isMultistep ? ("-step" . $stepNum) : "";
    $out = '';

    if( $repeatMetricLabels ){
      $out = '<div class="scrollableTable">';
      $out .= '<table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">' . "\n";
    }

    if ($this->isColumnEnabled(self::COL_LABEL)) {
      $out .= "<tr class='runview'>\n";
      $out .= $this->_headCell($this->_labelColumnText($stepResult), "pin", 3 );
      $out .= "</tr>\n";
    }

    if( $repeatMetricLabels ){
      $out .= $this->_createHead(); 
    }

    
    
    $out .= "<tr>\n";
    
    $out .= $this->_bodyCell($idPrefix . "TTFB" . $idSuffix, $this->_getIntervalMetric($stepResult, 'TTFB'), $class);
    if ($this->isColumnEnabled(self::COL_START_RENDER)) {
      $out .= $this->_bodyCell($idPrefix . "StartRender" . $idSuffix, $this->_getIntervalMetric($stepResult, 'render'), $class);
    }
    if ($this->isColumnEnabled(self::COL_FIRST_CONTENTFUL_PAINT)) {
      $out .= $this->_bodyCell($idPrefix . self::COL_FIRST_CONTENTFUL_PAINT . $idSuffix, $this->_getIntervalMetric($stepResult, self::COL_FIRST_CONTENTFUL_PAINT), $class);
    }
    if($this->isColumnEnabled(self::COL_SPEED_INDEX)) {
      $speedIndex = $stepResult->getMetric("SpeedIndexCustom");
      $speedIndex = $speedIndex !== null ? $speedIndex : $stepResult->getMetric("SpeedIndex");
      $speedIndex = $speedIndex !== null ? formatMsInterval($speedIndex, 3) : "-";
      $out .= $this->_bodyCell($idPrefix . "SpeedIndex" . $idSuffix, $speedIndex, $class);
    }
    if ($this->isColumnEnabled(self::COL_RESULT)) {
      $out .= $this->_bodyCell($idPrefix . "result" . $idSuffix, $this->_getSimpleMetric($stepResult, "result"), $class);
    }

    $borderClass = $class ? ("border " . $class) : "border";

    $vitalsClass = $borderClass;
    if ($this->isColumnEnabled(self::COL_LARGEST_CONTENTFUL_PAINT)) {
      $value = $this->_getIntervalMetric($stepResult, self::COL_LARGEST_CONTENTFUL_PAINT);
      $rawValue = $stepResult->getMetric(self::COL_LARGEST_CONTENTFUL_PAINT);
      $scoreClass = 'good';
      if ($rawValue >= 4000) {
        $scoreClass = 'poor';
      } elseif ($rawValue >= 2500) {
        $scoreClass = 'ok';
      }
      $vclass = $vitalsClass ? ($vitalsClass . ' ' . $scoreClass) : $scoreClass;
      $out .= $this->_bodyCell($idPrefix. self::COL_LARGEST_CONTENTFUL_PAINT . $idSuffix, $value, $vclass);
      $vitalsClass = $class;
    }

    if ($this->isColumnEnabled(self::COL_CUMULATIVE_LAYOUT_SHIFT)) {
      $value = round($this->_getSimpleMetric($stepResult, self::COL_CUMULATIVE_LAYOUT_SHIFT), 3);
      $rawValue = $stepResult->getMetric(self::COL_CUMULATIVE_LAYOUT_SHIFT);
      $scoreClass = 'good';
      if ($rawValue >= 0.25) {
        $scoreClass = 'poor';
      } elseif ($rawValue >= 0.1) {
        $scoreClass = 'ok';
      }
      $vclass = $vitalsClass ? ($vitalsClass . ' ' . $scoreClass) : $scoreClass;
      $out .= $this->_bodyCell($idPrefix. self::COL_CUMULATIVE_LAYOUT_SHIFT . $idSuffix, removeLeadingZero($value), $vclass);
      $vitalsClass = $class;
    }

    if ($this->isColumnEnabled(self::COL_TOTAL_BLOCKING_TIME)) {
      $value = $this->_getIntervalMetric($stepResult, self::COL_TOTAL_BLOCKING_TIME);
      if (!$this->isColumnEnabled(self::COL_TIME_TO_INTERACTIVE)) {
        $value = '<span class="units comparator">&ge;</span> ' . $value;
      }
      $rawValue = $stepResult->getMetric(self::COL_TOTAL_BLOCKING_TIME);
      $scoreClass = 'good';
      if ($rawValue >= 600) {
        $scoreClass = 'poor';
      } elseif ($rawValue >= 300) {
        $scoreClass = 'ok';
      }
      $vclass = $vitalsClass ? ($vitalsClass . ' ' . $scoreClass) : $scoreClass;
      $out .= $this->_bodyCell($idPrefix. self::COL_TOTAL_BLOCKING_TIME . $idSuffix, $value, $vclass);
      $vitalsClass = $class;
    }

    //$out .= $this->_bodyCell($idPrefix . "DocComplete" . $idSuffix, $this->_getIntervalMetric($stepResult, "docTime"), $borderClass);
    //$out .= $this->_bodyCell($idPrefix . "RequestsDoc" . $idSuffix, $this->_getSimpleMetric($stepResult, "requestsDoc"), $class);
    //$out .= $this->_bodyCell($idPrefix . "BytesInDoc" . $idSuffix, $this->_getByteMetricInKbyte($stepResult, "bytesInDoc"), $class);

    if ($this->isColumnEnabled(self::COL_FULLYLOADED)) {
      $out .= $this->_bodyCell($idPrefix . "FullyLoaded" . $idSuffix, $this->_getIntervalMetric($stepResult, "fullyLoaded"), $borderClass);
    }
    if ($this->isColumnEnabled(self::COL_REQUESTS)) {
      $out .= $this->_bodyCell($idPrefix . "Requests" . $idSuffix, $this->_getSimpleMetric($stepResult, "requests"), $class);
    }
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
    if( $repeatMetricLabels ){
      $out .= "</table></div>\n";
      $localPaths = $stepResult->createTestPaths();
      if (is_dir($localPaths->videoDir())) {
        $urlGenerator = $stepResult->createUrlGenerator("", false);
        $end = $this->getRequestEndParam($stepResult);
        $filmstripUrl = $urlGenerator->filmstripView($end);
        $filmstripImage = $urlGenerator->filmstripImage($end);
        $out .= '<div class="results-filmstrip-container">';
        $out .= '<h4>Visual Page Loading Process <span>(<a href=' . $filmstripUrl . '>Explore</a>)</span></h4>';
        $out .= '<a href=' . $filmstripUrl . '><img src="' . $filmstripImage . '-l:+&bg=2a3c64&text=ffffff&thumbSize=110&ival=100"></a></div>';
      }
    }
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

  private function _headCell($innerHtml, $classNames = null, $colspan = 0) {
    $attributes = '';
    $attributes .= $classNames ? ('class="' . $classNames . '" ') : '';
    $attributes .= $colspan > 1 ? ('colspan="' . $colspan . '" ') : '';
    return '<th align="center" ' . $attributes . 'valign="middle">' . $innerHtml . "</th>\n";
  }

  private function _bodyCell($id, $innerHtml, $classNames = null, $isRowHeading = false) {
    $attributes = '';
    $attributes .= $id ? 'id="' . $id . '" ' : '';
    $attributes .= $classNames ? ('class="' . $classNames . '" ') : '';
    $tag = $isRowHeading ? "th" : "td";
    return '<' . $tag . ' '. $attributes . 'valign="middle">' . $innerHtml . "</td>\n";
  }

  private function _bodyHeadCell($id, $innerHtml, $classNames = null) {
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
    $value = $value >= 0 ? $value : -1; // -1 is UNKNOWN_TIME, but we can't include common.inc
    return formatMsInterval($value, 3);
  }

  private function _getSimpleMetric($step, $metric) {
    $value = $step->getMetric($metric);
    return $value !== null ? $value : "-";
  }

  private function _getByteMetricInKbyte($step, $metric) {
    $value = $step->getMetric($metric);
    return $value !== null ? number_format($value / 1024, 0) . "<span class=\"units\">KB</span>" : "-";
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

}
