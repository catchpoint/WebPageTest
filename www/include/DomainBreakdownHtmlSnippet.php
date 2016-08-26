<?php

require_once __DIR__ . '/BreakdownHtmlSnippet.php';

class DomainBreakdownHtmlSnippet extends BreakdownHtmlSnippet {
  private $stepResult;

  /**
   * DomainBreakdownHtmlSnippet constructor.
   * @param TestInfo $testInfo
   * @param TestStepResult $stepResult
   */
  public function __construct($testInfo, $stepResult) {
    parent::__construct($stepResult);
    $this->stepResult = $stepResult;
  }

  public function create() {
    $out = $this->createChartMarkup();
    $out .= $this->createJavascript("wptDomainBreakdownData", $this->_getJSONBreakdown());
    return $out;
  }

  private function _getJSONBreakdown() {
    return json_encode($this->stepResult->getJSFriendlyDomainBreakdown());
  }
}
