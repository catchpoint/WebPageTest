<?php

class WaterfallViewHtmlSnippet {

  private $testInfo;
  private $stepResult;
  private $requests;
  private $hasCsi;

  /**
   * WaterfallViewHtmlSnippet constructor.
   * @param TestInfo $testInfo
   * @param TestStepResult $stepResult
   * @param bool $enableCsi True if CSI data should be enabled
   */
  public function __construct($testInfo, $stepResult, $enableCsi) {
    $this->testInfo = $testInfo;
    $this->stepResult = $stepResult;
    $this->requests = $stepResult->getRequestsWithInfo(true, true);
    $this->hasCsi = $enableCsi;
  }

  public function create() {
    $data = $this->stepResult->getRawResults();
    $url = $this->stepResult->readableIdentifier($this->testInfo->getUrl());
    $id = $this->testInfo->getId();
    $run = $this->stepResult->getRunNumber();
    $cached = $this->stepResult->isCachedRun();

    $out = <<<EOT
    <table border="1" bordercolor="silver" cellpadding="2px" cellspacing="0" style="width:auto; font-size:11px; margin-left:auto; margin-right:auto;">
      <tr>
      <td><table><tr><td><div class="bar" style="width:15px; background-color:#1f7c83"></div></td><td>DNS Lookup</td></tr></table></td>
      <td><table><tr><td><div class="bar" style="width:15px; background-color:#e58226"></div></td><td>Initial Connection</td></tr></table></td>
EOT;
    if($this->requests->hasSecureRequests()) {
      $out .= '<td><table><tr><td><div class="bar" style="width:15px; background-color:#c141cd"></div></td><td>SSL Negotiation</td></tr></table></td>';
    }
    $out .= <<<EOT
    <td><table><tr><td><div class="bar" style="width:15px; background-color:#1fe11f"></div></td><td>Time to First Byte</td></tr></table></td>
    <td><table><tr><td><div class="bar" style="width:15px; background-color:#1977dd"></div></td><td>Content Download</td></tr></table></td>
    <td style="vertical-align:middle; padding: 4px;"><div style="background-color:#ffff60">&nbsp;3xx response&nbsp;</div></td>
    <td style="vertical-align:middle; padding: 4px;"><div style="background-color:#ff6060">&nbsp;4xx+ response&nbsp;</div></td>
    </tr>
    </table>
    <table border="1" bordercolor="silver" cellpadding="2px" cellspacing="0" style="width:auto; font-size:11px; margin-left:auto; margin-right:auto; margin-top:11px;">
      <tr>
        <td><table><tr><td><div class="bar" style="width:2px; background-color:#28BC00"></div></td><td>Start Render</td></tr></table></td>
EOT;
    if (array_key_exists('aft', $data) && $data['aft'] )
      $out .= '<td><table><tr><td><div class="bar" style="width:2px; background-color:#FF0000"></div></td><td>Above the Fold</td></tr></table></td>';
    if (array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0 )
      $out .= '<td><table><tr><td><div class="bar" style="width:2px; background-color:#F28300"></div></td><td>DOM Element</td></tr></table></td>';
    if(array_key_exists('firstPaint', $data) && (float)$data['firstPaint'] > 0.0 )
      $out .= '<td><table><tr><td><div class="bar" style="width:2px; background-color:#8FBC83"></div></td><td>msFirstPaint</td></tr></table></td>';
    if(array_key_exists('domInteractive', $data) && (float)$data['domInteractive'] > 0.0 )
      $out .= '<td><table><tr><td><div class="bar" style="width:2px; background-color:#FFC61A"></div></td><td>DOM Interactive</td></tr></table></td>';
    if(array_key_exists('domContentLoadedEventStart', $data) && (float)$data['domContentLoadedEventStart'] > 0.0 )
      $out .= '<td><table><tr><td><div class="bar" style="width:15px; background-color:#D888DF"></div></td><td>DOM Content Loaded</td></tr></table></td>';
    if(array_key_exists('loadEventStart', $data) && (float)$data['loadEventStart'] > 0.0 )
      $out .= '<td><table><tr><td><div class="bar" style="width:15px; background-color:#C0C0FF"></div></td><td>On Load</td></tr></table></td>';
    $out .= '<td><table><tr><td><div class="bar" style="width:2px; background-color:#0000FF"></div></td><td>Document Complete</td></tr></table></td>';
    if(array_key_exists('userTime', $data) || $this->hasCsi)
      $out .= '<td><table><tr><td><div class="arrow-down"></div></td><td>User Timings</td></tr></table></td>';
    $out .= "</tr>\n</table>\n<br>";
    $out .= CreateWaterfallHtml($url, $requests, $id, $run, $cached, $data);
    $out .=  "<br><a href=\"/customWaterfall.php?width=930&test=$id&run=$run&cached=$cached\">customize waterfall</a> &#8226; ";
    $out .=  "<a id=\"view-images\" href=\"/pageimages.php?test=$id&run=$run&cached=$cached\">View all Images</a>";
    return $out;
  }
}