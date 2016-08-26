<?php

abstract class BreakdownHtmlSnippet {

  protected $breakdownId;

  /**
   * @param TestStepResult $stepResult
   */
  protected function __construct($stepResult) {
    $this->breakdownId = "breakdown_" . ($stepResult->isCachedRun() ? "rv" : "fv") . "_step_" . $stepResult->getStepNumber();
  }

  /**
   * @return string The created HTML snippet
   */
  public abstract function create();

  protected function createChartMarkup() {
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

  protected function createJavascript($jsVarName, $jsonBreakdown) {
    $id = $this->breakdownId;
    $out = "<script type=\"text/javascript\">";
    $out .= "if (typeof $jsVarName == 'undefined') var $jsVarName = {};";
    $out .= $jsVarName . "['$id'] = $jsonBreakdown;";
    $out .= "</script>";
    return $out;
  }

  public function getBreakdownId() {
    return $this->breakdownId;
  }
}
