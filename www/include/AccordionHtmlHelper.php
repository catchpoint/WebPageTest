<?php

class AccordionHtmlHelper {
  private $runResults;

  /**
   * AccordionHtmlHelper constructor.
   * @param TestRunResults $testRunResults The run results
   */
  public function __construct($testRunResults) {
    $this->runResults = $testRunResults;
  }

  /**
   * Returns an accordion of a given snippetType for all steps of the run
   * @param string $namePrefix Name prefix of the anchor
   * @param string $snippetType Type of the snipper: "waterfall", "connection", "requestDetails", or "requestHeaders"
   * @param string $jsInitCall Javascript function to call after init. Optional
   * @return string The HTML accordion
   */
  function createAccordion($namePrefix, $snippetType, $jsInitCall = "") {
    $out = "";
    $cached = $this->runResults->isCachedRun() ? 1 : 0;
    for ($i = 1; $i <= $this->runResults->countSteps(); $i++) {
      $snippetNodeId = "snippet_" . $snippetType . "_step" . $i . "_" . ($cached ? "rv" : "fv");
      $stepResult = $this->runResults->getStepResult($i);
      $out .= "<div class=\"accordion_block\">\n";
      $out .= "<h2 id=\"". $namePrefix . "_step" . $i . "\" class=\"accordion_opener accordion_closed\" " .
        "data-snippettype='$snippetType' data-step='$i' data-cachedrun='$cached' data-jsinit='$jsInitCall' ".
        "data-snippetnode='#$snippetNodeId'>";
      $out .= $stepResult->readableIdentifier();
      $out .= "</h2>\n";
      $out .= "<div id=\"$snippetNodeId\" class='snippet_container snippet_container_$snippetType'></div>\n";
      $out .= "</div>\n";
    }
    return $out;
  }
}
