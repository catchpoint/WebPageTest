<?php

class RequestDetailsHtmlSnippet {
  private $testInfo;
  private $stepResult;
  private $requests;
  private $useLinks;

  /**
   * RequestDetailsHtmlSnippet constructor.
   * @param TestInfo $testInfo
   * @param TestStepResult $stepResult
   * @param bool $useLinks
   */
  public function __construct($testInfo, $stepResult, $useLinks) {
    $this->testInfo = $testInfo;
    $this->stepResult = $stepResult;
    $this->requests = $stepResult->getRequestsWithInfo(true, true);
    $this->useLinks = $useLinks;
  }

  public function create() {
    $out = $this->_createLegend();
    $out .= "<br>\n";
    $out .= "<div class=\"center\">\n";
    $out .= $this->_createTable();
    $out .= "</div>\n";

    if ($this->requests->hasLocationData()) {
      $out .= '<p class="center">*This product includes GeoLite data created by MaxMind, available from ' .
              '<a href="http://maxmind.com/">http://maxmind.com/</a>.</p>';
    }
    return $out;
  }

  private function _createLegend() {
    $out = <<<EOT
<table border="1" bordercolor="silver" cellpadding="2px" cellspacing="0" style="width:auto; font-size:11px; margin-left:auto; margin-right:auto;">
    <tbody>
    <tr>
        <td><table><tbody><tr><td><div class="bar" style="width:15px; background-color:#dfffdf"></div></td><td>Before Start Render</td></tr></tbody></table></td>
        <td><table><tbody><tr><td><div class="bar" style="width:15px; background-color:#dfdfff"></div></td><td>Before On Load </td></tr></tbody></table></td>
        <td><table><tbody><tr><td><div class="bar" style="width:15px; background-color:gainsboro"></div></td><td>After On Load</td></tr></tbody></table></td>
    </tr>
    </tbody>
</table>
EOT;
    return $out;
  }

  private function _createTable() {
    $out = "<table class=\"tableDetails details center\">\n";
    $out .= "<caption>Request Details</caption>\n";
    $out .= $this->_createTableHead();
    $out .= $this->_createTableBody();
    $out .= "</table>\n";
    return $out;
  }

  private function _createTableHead() {
    $out = <<< EOT
    <thead>
	<tr>
		<th class="reqNum">#</th>
		<th class="reqUrl">Resource</th>
		<th class="reqMime">Content Type</th>
		<th class="reqStart">Request Start</th>
		<th class="reqDNS">DNS Lookup</th>
		<th class="reqSocket">Initial Connection</th>
EOT;
    if ($this->requests->hasSecureRequests()) {
      $out .= "<th class=\"reqSSL\">SSL Negotiation</th>\n";
    }
    $out .= <<<EOT
<th class="reqTTFB">Time to First Byte</th>
<th class="reqDownload">Content Download</th>
<th class="reqBytes">Bytes Downloaded</th>
<th class="reqResult">Error/Status Code</th>
<th class="reqIP">IP</th>
EOT;
    if ($this->requests->hasLocationData()) {
      $out .= "<th class=\"reqLocation\">Location*</th>";
    }
    $out .= "</tr>\n</thead>\n";
    return $out;
  }

  private function _createTableBody() {
    $out = "<tbody>\n";

    // loop through all of the requests and spit out a data table
    foreach ($this->requests->getRequests() as $reqNum => $request) {
      if (!$request) {
        continue;
      }

      $out .= '<tr>';
      $requestNum = $reqNum + 1;
      $highlight = $this->_getRowHighlightClass($requestNum, $request);

      if (!$this->useLinks) {
        $out .= '<td class="reqNum ' . $highlight . '">' . $requestNum . '</td>';
      } else {
        $out .= '<td class="reqNum ' . $highlight . '"><a href="#request' . $requestNum . '">' . $requestNum . '</a></td>';
      }

      if ($request['host'] || $request['url']) {
        $protocol = 'http://';
        if ($request['is_secure'] && $request['is_secure'] == 1)
          $protocol = 'https://';
        $url = $protocol . $request['host'] . $request['url'];
        $displayurl = ShortenUrl($url);
        if (!$this->useLinks) {
          $out .= "<td class=\"reqUrl $highlight\"><a title=\"$url\" href=\"#request$requestNum\">$displayurl</a></td>";
        } else {
          $out .= '<td class="reqUrl ' . $highlight . '"><a rel="nofollow" href="' . $url . '">' . $displayurl . '</a></td>';
        }
      } else
        $out .= '<td class="reqUrl ' . $highlight . '">-</td>';

      if (array_key_exists('contentType', $request) && strlen($request['contentType']))
        $out .= '<td class="reqMime ' . $highlight . '">' . $request['contentType'] . '</td>';
      else
        $out .= '<td class="reqMime ' . $highlight . '">-</td>';

      if ($request['load_start'])
        $out .= '<td class="reqStart ' . $highlight . '">' . $request['load_start'] / 1000.0 . ' s</td>';
      else
        $out .= '<td class="reqStart ' . $highlight . '">-</td>';

      if ($request['dns_ms'] && (int)$request['dns_ms'] !== -1)
        $out .= '<td class="reqDNS ' . $highlight . '">' . $request['dns_ms'] . ' ms</td>';
      elseif ($request['dns_end'] > 0) {
        $time = $request['dns_end'] - $request['dns_start'];
        $out .= '<td class="reqDNS ' . $highlight . '">' . $time . ' ms</td>';
      } else
        $out .= '<td class="reqDNS ' . $highlight . '">-</td>';

      if ($request['connect_ms'] && (int)$request['connect_ms'] !== -1) {
        $out .= '<td class="reqSocket ' . $highlight . '">' . $request['connect_ms'] . ' ms</td>';
        if ($request['is_secure'] && $request['is_secure'] == 1) {
          $out .= '<td class="reqSSL ' . $highlight . '">' . (int)$request['ssl_ms'] . ' ms</td>';
        } elseif ($this->requests->hasSecureRequests())
          $out .= '<td class="reqSSL ' . $highlight . '">-</td>';
      } elseif ($request['connect_end'] > 0) {
        $time = $request['connect_end'] - $request['connect_start'];
        $out .= '<td class="reqSocket ' . $highlight . '">' . $time . ' ms</td>';
        if ($this->requests->hasSecureRequests()) {
          if ($request['ssl_end'] > 0) {
            $time = $request['ssl_end'] - $request['ssl_start'];
            $out .= '<td class="reqSSL ' . $highlight . '">' . $time . ' ms</td>';
          } else {
            $out .= '<td class="reqSSL ' . $highlight . '">-</td>';
          }
        }
      } else {
        $out .= '<td class="reqSocket ' . $highlight . '">-</td>';
        if ($this->requests->hasSecureRequests())
          $out .= '<td class="reqSSL ' . $highlight . '">-</td>';
      }

      if (array_key_exists('ttfb_ms', $request) && $request['ttfb_ms'])
        $out .= '<td class="reqTTFB ' . $highlight . '">' . $request['ttfb_ms'] . ' ms</td>';
      else
        $out .= '<td class="reqTTFB ' . $highlight . '">-</td>';

      if (array_key_exists('download_ms', $request) && $request['download_ms'])
        $out .= '<td class="reqDownload ' . $highlight . '">' . $request['download_ms'] . ' ms</td>';
      else
        $out .= '<td class="reqDownload ' . $highlight . '">-</td>';

      if (array_key_exists('bytesIn', $request) && $request['bytesIn'])
        $out .= '<td class="reqBytes ' . $highlight . '">' . number_format($request['bytesIn'] / 1024, 1) . ' KB</td>';
      else
        $out .= '<td class="reqBytes ' . $highlight . '">-</td>';

      if (array_key_exists('responseCode', $request) && $request['responseCode'])
        $out .= '<td class="reqResult ' . $highlight . '">' . $request['responseCode'] . '</td>';
      else
        $out .= '<td class="reqResult ' . $highlight . '">-</td>';

      if (array_key_exists('ip_addr', $request) && $request['ip_addr'])
        $out .= '<td class="reqIP ' . $highlight . '">' . $request['ip_addr'] . '</td>';
      else
        $out .= '<td class="reqIP ' . $highlight . '">-</td>';

      if ($this->requests->hasLocationData())
        $out .= '<td class="reqLocation ' . $highlight . '">' . $request['location'] . "</td>\n";

      $out .= '</tr>';
    }
    $out .= "</tbody>\n";
    return $out;
  }

  private function _getRowHighlightClass($requestNum, $request) {
    $highlight = '';
    $result = (int)$request['responseCode'];
    if ($result != 401 && $result >= 400)
      $highlight = 'error ';
    elseif ($result >= 300)
      $highlight = 'warning ';

    $highlight .= (int)$requestNum % 2 == 1 ? 'odd' : 'even';

    if ($request['load_start'] < (int) $this->stepResult->getMetric("render"))
      $highlight .= 'Render';
    elseif ($request['load_start'] < (int) $this->stepResult->getMetric("docTime"))
      $highlight .= 'Doc';

    return $highlight;
  }

}