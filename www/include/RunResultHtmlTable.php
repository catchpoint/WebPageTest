<?php

class RunResultHtmlTable {

  /* @var TestInfo */
  private $testInfo;
  /* @var TestRunResults */
  private $runResults;

  public function __construct($testInfo, $runResults) {
    $this->testInfo = $testInfo;
    $this->runResults = $runResults;
  }

  public function create() {
    $data = $this->runResults->getStepResult(1)->getRawResults();
    $hasAft = $this->testInfo->hasAboveTheFoldTime();
    $out = '<table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">' . "\n";
    $out .= "<tr>\n";
    $cols = 4;
    if (array_key_exists('userTime', $data) && (float)$data['userTime'] > 0.0)
      $cols++;
    if (array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0)
      $cols++;
    if ($hasAft)
      $cols++;
    if (array_key_exists('domElements', $data) && $data['domElements'] > 0)
      $cols++;
    if (array_key_exists('SpeedIndex', $data) && (int)$data['SpeedIndex'] > 0)
      $cols++;
    if (array_key_exists('visualComplete', $data) && (float)$data['visualComplete'] > 0.0)
      $cols++;
    $out .= <<<EOT
      <th align="center" class="empty" valign="middle" colspan="$cols"</th>
      <th align="center" class="border" valign="middle" colspan="3">Document Complete</th>
      <th align="center" class="border" valign="middle" colspan="3">Fully Loaded</th>
      </tr>
      <tr>
        <th align="center" valign="middle">Load Time</th>
        <th align="center" valign="middle">First Byte</th>
        <th align="center" valign="middle">Start Render</th>
EOT;
    if (array_key_exists('userTime', $data) && (float)$data['userTime'] > 0.0 ) {
      $out .= '<th align="center" valign="middle">User Time</th>' . "\n";
    }
    if($hasAft) {
      $out .= '<th align="center" valign="middle">Above the Fold</th>' . "\n";
    }
    if (array_key_exists('visualComplete', $data) && (float)$data['visualComplete'] > 0.0) {
      $out .= '<th align="center" valign="middle">Visually Complete</th>' . "\n";
    }
    if (array_key_exists('SpeedIndex', $data) && (int)$data['SpeedIndex'] > 0) {
      $out .= '<th align="center" valign="middle"><a href="https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index" target="_blank">Speed Index</a></th>' . "\n";
    }
    if (array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0 ) {
      $out .= '<th align="center" valign="middle">DOM Element</th>' . "\n";
    }
    if (array_key_exists('domElements', $data) && $data['domElements'] > 0 ) {
      $out .= '<th align="center" valign="middle">DOM Elements</th>' . "\n";
    }
    $out .= <<<EOT
        <th align="center" valign="middle">Result (error code)</th>

        <th align="center" class="border" valign="middle">Time</th>
        <th align="center" valign="middle">Requests</th>
        <th align="center" valign="middle">Bytes In</th>

        <th align="center" class="border" valign="middle">Time</th>
        <th align="center" valign="middle">Requests</th>
        <th align="center" valign="middle">Bytes In</th>
      </tr>
      <tr>
EOT;

    $out .= "<td id=\"LoadTime\" valign=\"middle\">" . formatMsInterval($data['loadTime'], 3) . "</td>\n";
    $out .= "<td id=\"TTFB\" valign=\"middle\">" . formatMsInterval($data['TTFB'], 3) . "</td>\n";
    //echo "<td id=\"startRender\" valign=\"middle\">" . number_format($data['render'] / 1000.0, 3) . "s</td>\n";
    $out .= "<td id=\"startRender\" valign=\"middle\">" . formatMsInterval($data['render'], 3) . "</td>\n";
    if (array_key_exists('userTime', $data) && (float)$data['userTime'] > 0.0 )
      $out .= "<td id=\"userTime\" valign=\"middle\">" . formatMsInterval($data['userTime'], 3) . "</td>\n";
    if ($hasAft) {
      $aft = number_format($data['aft'] / 1000.0, 1) . 's';
      if( !$data['aft'] )
        $aft = 'N/A';
      $out .= "<td id=\"aft\" valign=\"middle\">$aft</th>";
    }
    if( array_key_exists('visualComplete', $data) && (float)$data['visualComplete'] > 0.0 )
      $out .= "<td id=\"visualComplate\" valign=\"middle\">" . formatMsInterval($data['visualComplete'], 3) . "</td>\n";
    if( array_key_exists('SpeedIndex', $data) && (int)$data['SpeedIndex'] > 0 ) {
      if (array_key_exists('SpeedIndexCustom', $data))
        $out .= "<td id=\"speedIndex\" valign=\"middle\">{$data['SpeedIndexCustom']}</td>\n";
      else
        $out .= "<td id=\"speedIndex\" valign=\"middle\">{$data['SpeedIndex']}</td>\n";
    }
    if (array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0 )
      $out .= "<td id=\"domTime\" valign=\"middle\">" . formatMsInterval($data['domTime'], 3) . "</td>\n";
    if (array_key_exists('domElements', $data) && $data['domElements'] > 0 )
      $out .= "<td id=\"domElements\" valign=\"middle\">{$data['domElements']}</td>\n";
    $out .= "<td id=\"result\" valign=\"middle\">{$data['result']}</td>\n";

    $out .= "<td id=\"docComplete\" class=\"border\" valign=\"middle\">" . formatMsInterval($data['docTime'], 3) . "</td>\n";
    $out .= "<td id=\"requestsDoc\" valign=\"middle\">{$data['requestsDoc']}</td>\n";
    $out .= "<td id=\"bytesInDoc\" valign=\"middle\">" . number_format($data['bytesInDoc'] / 1024, 0) . " KB</td>\n";

    $out .= "<td id=\"fullyLoaded\" class=\"border\" valign=\"middle\">" . formatMsInterval($data['fullyLoaded'], 3) . "</td>\n";
    $out .= "<td id=\"requests\" valign=\"middle\">{$data['requests']}</td>\n";
    $out .= "<td id=\"bytesIn\" valign=\"middle\">" . number_format($data['bytesIn'] / 1024, 0) . " KB</td>\n";
    $out .= "</tr>\n</table>\n";
    return $out;
  }
}
