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
    $data = $this->runResults->getStepResult(1)->getRawResults();
    $out = "<tr>\n";
    $out .= "<td id=\"LoadTime\" valign=\"middle\">" . formatMsInterval($data['loadTime'], 3) . "</td>\n";
    $out .= "<td id=\"TTFB\" valign=\"middle\">" . formatMsInterval($data['TTFB'], 3) . "</td>\n";
    //echo "<td id=\"startRender\" valign=\"middle\">" . number_format($data['render'] / 1000.0, 3) . "s</td>\n";
    $out .= "<td id=\"startRender\" valign=\"middle\">" . formatMsInterval($data['render'], 3) . "</td>\n";
    if (array_key_exists('userTime', $data) && (float)$data['userTime'] > 0.0 )
      $out .= "<td id=\"userTime\" valign=\"middle\">" . formatMsInterval($data['userTime'], 3) . "</td>\n";
    if ($this->hasAboveTheFoldTime) {
      $aft = number_format($data['aft'] / 1000.0, 1) . 's';
      if( !$data['aft'] )
        $aft = 'N/A';
      $out .= "<td id=\"aft\" valign=\"middle\">$aft</th>";
    }
    if( array_key_exists('visualComplete', $data) && (float)$data['visualComplete'] > 0.0 )
      $out .= "<td id=\"visualComplate\" valign=\"middle\">" . formatMsInterval($data['visualComplete'], 3) . "</td>\n";
    if( array_key_exists('SpeedIndex', $data) && (int)$data['SpeedIndex'] > 0 ) {
      if (array_key_exists('SpeedIndexCustom', $data))
        $out .= "<td id=\"speedIndex\" valign=\"middle\">{$data['SpeedIndexCustom']}</td>\n";
      else
        $out .= "<td id=\"speedIndex\" valign=\"middle\">{$data['SpeedIndex']}</td>\n";
    }
    if (array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0 )
      $out .= "<td id=\"domTime\" valign=\"middle\">" . formatMsInterval($data['domTime'], 3) . "</td>\n";
    if (array_key_exists('domElements', $data) && $data['domElements'] > 0 )
      $out .= "<td id=\"domElements\" valign=\"middle\">{$data['domElements']}</td>\n";
    $out .= "<td id=\"result\" valign=\"middle\">{$data['result']}</td>\n";

    $out .= "<td id=\"docComplete\" class=\"border\" valign=\"middle\">" . formatMsInterval($data['docTime'], 3) . "</td>\n";
    $out .= "<td id=\"requestsDoc\" valign=\"middle\">{$data['requestsDoc']}</td>\n";
    $out .= "<td id=\"bytesInDoc\" valign=\"middle\">" . number_format($data['bytesInDoc'] / 1024, 0) . " KB</td>\n";

    $out .= "<td id=\"fullyLoaded\" class=\"border\" valign=\"middle\">" . formatMsInterval($data['fullyLoaded'], 3) . "</td>\n";
    $out .= "<td id=\"requests\" valign=\"middle\">{$data['requests']}</td>\n";
    $out .= "<td id=\"bytesIn\" valign=\"middle\">" . number_format($data['bytesIn'] / 1024, 0) . " KB</td>\n";
    $out .= "</tr>\n";
    return $out;
  }

  private function _headCell($innerHtml, $classNames = null, $colspan = 0) {
    $attributes = '';
    $attributes .= $classNames ? ('class="' . $classNames . '" ') : '';
    $attributes .= $colspan > 1 ? ('colspan="' . $colspan . '" ') : '';
    return '<th align="center" ' . $attributes . 'valign="middle">' . $innerHtml . "</th>\n";
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
}
