<?php

require_once __DIR__ . '/../waterfall.inc';

class ConnectionViewHtmlSnippet {
  private $testInfo;
  private $stepResult;
  private $requests;
  private $mapName;

  /**
   * ConnectionViewHtmlSnippet constructor.
   * @param TestInfo $testInfo
   * @param TestStepResult $stepResult
   */
  public function __construct($testInfo, $stepResult) {
    $this->testInfo = $testInfo;
    $this->stepResult = $stepResult;
    $this->requests = $stepResult->getRequestsWithInfo(true, true);
    $cached = $this->stepResult->isCachedRun() ? "rv_" : "fv_";
    $this->mapName = "#connection_map_" . $cached . $this->stepResult->getStepNumber();
    $this->imageId = "connectionView_" . $cached . $this->stepResult->getStepNumber();
  }
  public function create() {
    $out = $this->_createMap();
    $out .= $this->_createLegend();
    $out .= "<br>\n";

    $friendlyUrls = defined("FRIENDLY_URLS") && FRIENDLY_URLS;
    $urlGenerator = $this->stepResult->createUrlGenerator("", $friendlyUrls);
    $waterfallImage = $urlGenerator->waterfallImage(true, 930, true);
    $out .= '<img class="progress" alt="Connection View waterfall diagram"' .
            ' usemap="' . $this->mapName . '" id="' . $this->imageId .'" src="' . $waterfallImage . '">';

    return $out;
  }

  private function _createMap() {
    $out = "<map name=\"" . $this->mapName . "\">\n";
    $connection_rows = GetConnectionRows($this->requests->getRequests());
    $options = array(
      'id' => $this->testInfo->getId(),
      'path' => $this->testInfo->getRootDirectory(),
      'run_id' => $this->stepResult->getRunNumber(),
      'is_cached' => $this->stepResult->isCachedRun(),
      'step_id' => $this->stepResult->getStepNumber(),
      'use_cpu' => true,
      'show_labels' => true,
      'width' => 930
    );
    $map = GetWaterfallMap($connection_rows, $this->stepResult->readableIdentifier(), $options, $this->stepResult->getRawResults());
    $stepNumber = $this->stepResult->getStepNumber();
    foreach ($map as $entry) {
      if (array_key_exists('request', $entry)) {
        $index = $entry['request'] + 1;
        $title = "$index: " . htmlspecialchars($entry['url']);
        $out .= "<area href=\"#step${stepNumber}_request$index\" alt=\"$title\" title=\"$title\" shape=RECT coords=\"{$entry['left']},{$entry['top']},{$entry['right']},{$entry['bottom']}\">\n";
      } elseif (array_key_exists('url', $entry)) {
        $out .= "<area href=\"#step${stepNumber}_request\" alt=\"{$entry['url']}\" title=\"{$entry['url']}\" shape=RECT coords=\"{$entry['left']},{$entry['top']},{$entry['right']},{$entry['bottom']}\">\n";
      }
    }
    $out .= "</map>\n";
    return $out;
  }

  private function _createLegend() {
    $out = '<table border="1" bordercolor="silver" cellpadding="2px" cellspacing="0" class="legend" ' .
           'style="width:auto; font-size:11px; margin-left:auto; margin-right:auto;">';
    $out .= "\n<tr>\n";
    $out .= $this->_legendBarTableCell("#007B84", "DNS Lookup", 15);
    $out .= $this->_legendBarTableCell("#FF7B00", "Initial Connection", 15);
    if ($this->requests->hasSecureRequests()) {
      $out .= $this->_legendBarTableCell("#CF25DF", "SSL Negotiation", 15);
    }
    $out .= $this->_legendBarTableCell("#28BC00", "Start Render", 2);
    if ((float) $this->stepResult->getMetric("domTime")) {
      $out .= $this->_legendBarTableCell("#F28300", "DOM Element", 15);
    }
    if ((float) $this->stepResult->getMetric("domContentLoadedEventStart")) {
      $out .= $this->_legendBarTableCell("#D888DF", "DOM Content Loaded", 15);
    }
    if ((float) $this->stepResult->getMetric("loadEventStart")) {
      $out .= $this->_legendBarTableCell("#C0C0FF", "On Load", 15);
    }
    $out .= $this->_legendBarTableCell("#0000FF", "Document Complete", 2);
    $out .= "\n</tr>\n</table>\n";
    return $out;
  }

  private function _legendBarTableCell($color, $label, $width) {
    $style = "style=\"width:" . $width . "px; background-color:" . $color . "\"";
    return "<td><table><tr><td><div class=\"bar\" " . $style . "></div></td><td>" . $label . "</td></tr></table></td>\n";
  }

}
