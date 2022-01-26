<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once __DIR__ . '/../optimization.inc';

class PerformanceOptimizationHtmlSnippet {
  private $testInfo;
  private $stepResult;
  private $adsFile;

  /**
   * PerformanceOptimizationHtmlSnippet constructor.
   * @param TestInfo $testInfo
   * @param TestStepResult $stepResult
   */
  public function __construct($testInfo, $stepResult) {
    $this->testInfo = $testInfo;
    $this->stepResult = $stepResult;
    $this->adsFile = null;
  }

  public function setAdsFile($filename) {
    $this->adsFile = $filename;
  }

  public function create() {
    $out = $this->_createChecklistSnippet();
    $out .= $this->_createAdsSnippet();
    $out .= $this->_createDetailSnippet();
    return $out;
  }

  private function _createChecklistSnippet() {
    $stepNum = $this->stepResult->getStepNumber();
    $urlGenerator = $this->stepResult->createUrlGenerator("", defined("FRIENDLY_URLS") && FRIENDLY_URLS);
    $imageUrl = $urlGenerator->optimizationChecklistImage();
    $out = "<div>\n";
    $out .= "<h4>Full Optimization Checklist</h4>\n";
    $out .= "<div class=\"overflow-container\"><img alt=\"Optimization Checklist\" src=\"$imageUrl\" id=\"checklist_step$stepNum\"></div>\n";
    $out .= "<br></div>";
    return $out;
  }

  private function _createAdsSnippet() {
    if (!$this->adsFile || !file_exists($this->adsFile)) {
      return "";
    }
    ob_start();
    include $this->adsFile;
    $out = "<br>" . ob_get_contents() . "<br>";
    ob_end_clean();
    return $out;
  }

  private function _createDetailSnippet() {
    $out = "<div class='details overflow-container'>\n";
    $out .= "<h4>Details</h4>";
    $pageData = $this->stepResult->getRawResults();
    $requests = $this->stepResult->getRequestsWithInfo(false, false)->getRequests();
    $infoArray = $this->testInfo->getInfoArray();
    $localPaths = $this->stepResult->createTestPaths();
    $stepNum = $this->stepResult->getStepNumber();
    $out .= dumpOptimizationReportForStep($localPaths, $pageData, $requests, $infoArray, $stepNum);
    $out .= "</div>\n";
    return $out;
  }
}
