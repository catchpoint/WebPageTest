<?php

require_once __DIR__ . '/../common_lib.inc';

class RunResultHtmlTable {
  const SPEED_INDEX_URL = "https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index";

  /* @var TestInfo */
  private $testInfo;
  /* @var TestRunResults */
  private $runResults;

  private $hasAboveTheFoldTime;
  private $isMultistep;

  /**
   * RunResultHtmlTable constructor.
   * @param TestInfo $testInfo
   * @param TestRunResults $runResults
   */
  public function __construct($testInfo, $runResults) {
    $this->testInfo = $testInfo;
    $this->runResults = $runResults;
    $this->hasAboveTheFoldTime = $testInfo->hasAboveTheFoldTime();
    $this->isMultistep = $runResults->isMultistep();
  }

  public function create() {
    $out = '<table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">' . "\n";
    $out .= $this->_create_head();
    $out .= $this->_create_body();
    $out .= "</table>\n";
    return $out;
  }

  private function _create_head() {
    $data = $this->runResults->getStepResult(1)->getRawResults();
    $cols = 4;
    if (array_key_exists('userTime', $data) && (float)$data['userTime'] > 0.0)
      $cols++;
    if (array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0)
      $cols++;
    if ($this->hasAboveTheFoldTime)
      $cols++;
    if (array_key_exists('domElements', $data) && $data['domElements'] > 0)
      $cols++;
    if (array_key_exists('SpeedIndex', $data) && (int)$data['SpeedIndex'] > 0)
      $cols++;
    if (array_key_exists('visualComplete', $data) && (float)$data['visualComplete'] > 0.0)
      $cols++;

    $out = "<tr>\n";
    $out .= $this->_head_cell("", "empty", $cols);
    $out .= $this->_head_cell("Document Complete", "border", 3);
    $out .= $this->_head_cell("Fully Loaded", "border", 3);
    $out .= "</tr>\n";

    $out .= "<tr>";
    $out .= $this->_head_cell("Load Time");
    $out .= $this->_head_cell("First Byte");
    $out .= $this->_head_cell("Start Render");
    if (array_key_exists('userTime', $data) && (float)$data['userTime'] > 0.0 ) {
      $out .= $this->_head_cell("User Time");
    }
    if($this->hasAboveTheFoldTime) {
      $out .= $this->_head_cell("Above the Fold");
    }
    if (array_key_exists('visualComplete', $data) && (float)$data['visualComplete'] > 0.0) {
      $out .= $this->_head_cell("Visually Complete");
    }
    if (array_key_exists('SpeedIndex', $data) && (int)$data['SpeedIndex'] > 0) {
      $out .= $this->_head_cell('<a href="' . self::SPEED_INDEX_URL . '" target="_blank">Speed Index</a>');
    }
    if (array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0 ) {
      $out .= $this->_head_cell("DOM Element");
    }
    if (array_key_exists('domElements', $data) && $data['domElements'] > 0 ) {
      $out .= $this->_head_cell("DOM Elements");
    }
    $out .= $this->_head_cell("Result (error code)");

    for ($i = 0; $i < 2; $i++) {
      $out .= $this->_head_cell("Time", "border");
      $out .= $this->_head_cell("Requests");
      $out .= $this->_head_cell("Bytes In");
    }

    return $out;
  }

  private function _create_body() {
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

  private function _head_cell($innerHtml, $classNames = null, $colspan = 0) {
    $attributes = '';
    $attributes .= $classNames ? ('class="' . $classNames . '" ') : '';
    $attributes .= $colspan > 1 ? ('colspan="' . $colspan . '" ') : '';
    return '<th align="center" ' . $attributes . 'valign="middle">' . $innerHtml . "</th>\n";
  }
}
