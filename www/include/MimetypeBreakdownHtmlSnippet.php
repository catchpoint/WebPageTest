<?php

require_once __DIR__ . '/ConnectionViewHtmlSnippet.php';

class MimetypeBreakdownHtmlSnippet {
  private $breakdownId;
  private $connectionView;
  private $stepResult;

  /**
   * MimetypeBreakdownHtmlSnippet constructor.
   * @param TestInfo $testInfo
   * @param TestStepResult $stepResult
   */
  public function __construct($testInfo, $stepResult) {
    $this->stepResult = $stepResult;
    $this->breakdownId = "breakdown_" . ($stepResult->isCachedRun() ? "rv" : "fv") . "_step_" . $stepResult->getStepNumber();
    $this->connectionView = new ConnectionViewHtmlSnippet($testInfo, $stepResult);
  }

  public function create() {
    $out = $this->_createChartMarkup();
    $out .= "<div style=\"text-align:center;\">\n";
    $out .= "<h3 name=\"connection\">Connection View</h3>\n";
    $out .= $this->connectionView->create();
    $out .= "</div>\n";
    $out .= $this->_createJavascript();
    return $out;
  }

  public function _createChartMarkup() {
    $id = $this->breakdownId;
    return <<<EOT
      <div id="$id">
      <table align="center" data-breakdown-id="$id" class="breakdownFrame">
          <tr class="breakdownFramePies">
              <td>
                  <div class="pieRequests" style="width:450px; height:300px;"></div>
              </td>
              <td>
                  <div class="pieBytes" style="width:450px; height:300px;"></div>
              </td>
          </tr>
          <tr>
              <td>
                  <div class="tableRequests" style="width: 100%;"></div>
              </td>
              <td>
                  <div class="tableBytes" style="width: 100%;"></div>
              </td>
          </tr>
      </table>
      </div>
EOT;
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


  public function _createJavascript() {
    $jsonData = $this->_getJSONBreakdown();
    $id = $this->breakdownId;
    $out = "<script type=\"text/javascript\">";
    $out .= "if (typeof wptBreakdownData == 'undefined') var wptBreakdownData = {};";
    $out .= "wptBreakdownData['$id'] = $jsonData;";
    $out .= "</script>";
    return $out;
  }

  public function getBreakdownId() {
    return $this->breakdownId;
  }
}