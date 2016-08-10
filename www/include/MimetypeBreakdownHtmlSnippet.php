<?php

require_once __DIR__ . '/BreakdownHtmlSnippet.php';
require_once __DIR__ . '/ConnectionViewHtmlSnippet.php';

class MimetypeBreakdownHtmlSnippet extends BreakdownHtmlSnippet {
  private $connectionView;
  private $stepResult;

  /**
   * MimetypeBreakdownHtmlSnippet constructor.
   * @param TestInfo $testInfo
   * @param TestStepResult $stepResult
   */
  public function __construct($testInfo, $stepResult) {
    parent::__construct($stepResult);
    $this->stepResult = $stepResult;
    $this->connectionView = new ConnectionViewHtmlSnippet($testInfo, $stepResult);
  }

  public function create() {
    $out = $this->createChartMarkup();
    $out .= "<div style=\"text-align:center;\">\n";
    $out .= "<h3 name=\"connection\">Connection View</h3>\n";
    $out .= $this->connectionView->create();
    $out .= "</div>\n";
    $out .= $this->createJavascript("wptBreakdownData", $this->_getJSONBreakdown());
    return $out;
  }

  private function _getJSONBreakdown() {
    $breakdown = $this->stepResult->getMimeTypeBreakdown();
    ksort($breakdown);
    $jsFriendly = array();
    foreach ($breakdown as $type => $values) {
      $jsFriendly[] = array(
        "type" => $type,
        "requests" => $values["requests"],
        "bytes" => $values["bytes"],
        "color" => $values["color"]
      );
    }
    return json_encode($jsFriendly);
  }
}
