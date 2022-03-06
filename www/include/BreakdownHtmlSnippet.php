<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

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
        <div data-breakdown-id="$id" class="breakdownFrame">
          <div class="breakdownFrame_item"><div class="pieRequests" ></div><div class="tableRequests"></div></div>
          <div class="breakdownFrame_item"><div class="pieBytes" ></div><div class="tableBytes"></div></div>
        </div>
      </div>
EOT;
  }

  protected function createJavaScript($jsVarName, $jsonBreakdown) {
    $id = $this->breakdownId;
    $out = "<script>";
    $out .= "if (typeof $jsVarName == 'undefined') var $jsVarName = {};";
    $out .= $jsVarName . "['$id'] = $jsonBreakdown;";
    $out .= "</script>";
    return $out;
  }

  public function getBreakdownId() {
    return $this->breakdownId;
  }
}
