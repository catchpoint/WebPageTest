<?php

require_once __DIR__ . '/ConnectionViewHtmlSnippet.php';

class MimetypeBreakdownHtmlSnippet {
  private $breakdownId;
  private $connectionView;

  /**
   * MimetypeBreakdownHtmlSnippet constructor.
   * @param TestInfo $testInfo
   * @param TestStepResult $stepResult
   */
  public function __construct($testInfo, $stepResult) {
    $this->breakdownId = "breakdown_" . ($stepResult->isCachedRun() ? "rv" : "fv") . "_step_" . $stepResult->getStepNumber();
    $this->connectionView = new ConnectionViewHtmlSnippet($testInfo, $stepResult);
  }

  public function create() {
    $id = $this->breakdownId;
    $out = <<<EOT
      <table align="center" id="$id">
          <tr>
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
      <div style="text-align:center;">
        <h4 name="connection">Connection View</h4>
EOT;
    $out .= $this->connectionView->create();
    $out .= "</div>\n";
    return $out;
  }

  public function getBreakdownId() {
    return $this->breakdownId;
  }
}