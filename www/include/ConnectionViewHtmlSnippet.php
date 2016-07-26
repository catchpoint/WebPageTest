<?php

require_once __DIR__ . '/../waterfall.inc';

class ConnectionViewHtmlSnippet {
  private $testInfo;
  private $stepResult;
  private $requests;

  /**
   * ConnectionViewHtmlSnippet constructor.
   * @param TestInfo $testInfo
   * @param TestStepResult $stepResult
   */
  public function __construct($testInfo, $stepResult) {
    $this->testInfo = $testInfo;
    $this->stepResult = $stepResult;
    $this->requests = $stepResult->getRequestsWithInfo(true, true);
  }
  public function create() {
    $out = "<map name=\"connection_map\">\n";
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
    $data = $this->stepResult->getRawResults();
    $map = GetWaterfallMap($connection_rows, $this->stepResult->readableIdentifier(), $options, $data);
    foreach($map as $entry) {
      if (array_key_exists('request', $entry)) {
        $index = $entry['request'] + 1;
        $title = "$index: " . htmlspecialchars($entry['url']);
        $out .= "<area href=\"#request$index\" alt=\"$title\" title=\"$title\" shape=RECT coords=\"{$entry['left']},{$entry['top']},{$entry['right']},{$entry['bottom']}\">\n";
      } elseif(array_key_exists('url', $entry)) {
        $out .= "<area href=\"#request\" alt=\"{$entry['url']}\" title=\"{$entry['url']}\" shape=RECT coords=\"{$entry['left']},{$entry['top']},{$entry['right']},{$entry['bottom']}\">\n";
      }
    }
    $out .= "</map>\n";

    $out .= <<<EOT
<table border="1" bordercolor="silver" cellpadding="2px" cellspacing="0" style="width:auto; font-size:11px; margin-left:auto; margin-right:auto;">
  <tr>
    <td><table><tr><td><div class="bar" style="width:15px; background-color:#007B84"></div></td><td>DNS Lookup</td></tr></table></td>
    <td><table><tr><td><div class="bar" style="width:15px; background-color:#FF7B00"></div></td><td>Initial Connection</td></tr></table></td>
EOT;
    if($this->requests->hasSecureRequests()) {
      $out .= '<td><table><tr><td><div class="bar" style="width:15px; background-color:#CF25DF"></div></td><td>SSL Negotiation</td></tr></table></td>';
    }
    $out .= '<td><table><tr><td><div class="bar" style="width:2px; background-color:#28BC00"></div></td><td>Start Render</td></tr></table></td>';
    if(array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0 ) {
      $out .= '<td><table><tr><td><div class="bar" style="width:2px; background-color:#F28300"></div></td><td>DOM Element</td></tr></table></td>';
    }
    if(array_key_exists('domContentLoadedEventStart', $data) && (float)$data['domContentLoadedEventStart'] > 0.0 ) {
      $out .= '<td><table><tr><td><div class="bar" style="width:15px; background-color:#D888DF"></div></td><td>DOM Content Loaded</td></tr></table></td>';
    }
    if(array_key_exists('loadEventStart', $data) && (float)$data['loadEventStart'] > 0.0 ) {
      $out .= '<td><table><tr><td><div class="bar" style="width:15px; background-color:#C0C0FF"></div></td><td>On Load</td></tr></table></td>';
    }
    $out .= <<<EOT
    <td><table><tr><td><div class="bar" style="width:2px; background-color:#0000FF"></div></td><td>Document Complete</td></tr></table></td>
  </tr>
</table>
<br>
EOT;
    $out .= '<img class="progress" alt="Connection View waterfall diagram" usemap="#connection_map" id="connectionView" src="';
    $extenstion = 'php';
    if( FRIENDLY_URLS )
      $extenstion = 'png';
    $out .= "/waterfall.$extenstion?type=connection&width=930&test=$id&run=$run&cached=$cached&mime=1\">";
    return $out;
  }
}
