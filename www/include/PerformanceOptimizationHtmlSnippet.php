<?php
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
    $out = "<div style=\"text-align:center;\">\n";
    $out .= "<h1>Full Optimization Checklist</h1>\n";
    $out .= "<img alt=\"Optimization Checklist\" src=\"$imageUrl\" id=\"checklist_step$stepNum\">\n";
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
    $out = "<div class='details'>\n";
    $out .= "<h2>Details</h2>";
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
