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

    return $out;
  }

  private function _createLegend() {
    $out = '<table border="1" bordercolor="silver" cellpadding="2px" cellspacing="0" ' .
           'style="width:auto; font-size:11px; margin-left:auto; margin-right:auto;">';
    $out .= "\n<tbody>\n<tr>\n";
    $out .= $this->_createLegendCell("#dfffdf", "Before Start Render");
    $out .= $this->_createLegendCell("#dfdfff", "Before On Load");
    $out .= $this->_createLegendCell("gainsboro", "After On Load");
    $out .= "\n</tr>\n</tbody>\n</table>\n";
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
    $out = "<thead>\n<tr>\n";
    $out .= "<th class=\"reqNum\">#</th>\n";
    $out .= "<th class=\"reqUrl\">Resource</th>\n";
    $out .= "<th class=\"reqMime\">Content Type</th>\n";
    $out .= "<th class=\"reqStart\">Request Start</th>\n";
    $out .= "<th class=\"reqDNS\">DNS Lookup</th>\n";
    $out .= "<th class=\"reqSocket\">Initial Connection</th>\n";
    if ($this->requests->hasSecureRequests()) {
      $out .= "<th class=\"reqSSL\">SSL Negotiation</th>\n";
    }
    $out .= "<th class=\"reqTTFB\">Time to First Byte</th>\n";
    $out .= "<th class=\"reqDownload\">Content Download</th>\n";
    $out .= "<th class=\"reqBytes\">Bytes Downloaded</th>\n";
    if ($this->requests->hasSecureRequests()) {
      $out .= "<th class=\"reqCertBytes\">Certificates</th>\n";
    }
    $out .= "<th class=\"reqResult\">Error/Status Code</th>\n";
    $out .= "<th class=\"reqIP\">IP</th>\n";

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

      $out .= $this->_createTableRow($reqNum, $request);
    }
    $out .= "</tbody>\n";
    return $out;
  }

  private function _createTableRow($reqNum, $request) {
    $stepNum = $this->stepResult->getStepNumber();
    $out = '<tr>';
    $requestNum = $reqNum + 1;
    $highlight = $this->_getRowHighlightClass($requestNum, $request);

    $reqNumValue = $this->useLinks ? ('<a href="#step' . $stepNum . '_request' . $requestNum . '">' . $requestNum . '</a>') : $requestNum;
    $out .= $this->_createDataCell($reqNumValue, "reqNum", $highlight);

    $reqUrl = $this->_createRequestUrlLink($request, $requestNum);
    $out .= $this->_createDataCell($reqUrl, "reqUrl", $highlight);

    $out .= $this->_createDataCell(@$request["contentType"], "reqMime", $highlight);

    $loadStart = empty($request["load_start"]) ? "-" : (($request["load_start"] / 1000.0) . " s");
    $out .= $this->_createDataCell($loadStart, "reqStart", $highlight);

    $reqDns = null;
    if (!empty($request['dns_ms']) && (int)$request['dns_ms'] !== -1) {
      $reqDns = $request['dns_ms'] . " ms";
    } else if (!empty($request['dns_end']) && $request['dns_end'] > 0) {
      $reqDns = ($request['dns_end'] - $request['dns_start']) . " ms";
    }
    $out .= $this->_createDataCell($reqDns, "reqDNS", $highlight);

    $out .= $this->_createSocketSSLCells($request, $highlight);

    $ttfbMs = empty($request["ttfb_ms"]) ? "-" : ($request["ttfb_ms"] . " ms");
    $out .= $this->_createDataCell($ttfbMs, "reqTTFB", $highlight);

    $downloadMs = empty($request["download_ms"]) ? "-" : ($request["download_ms"] . " ms");
    $out .= $this->_createDataCell($downloadMs, "reqDownload", $highlight);

    $bytesIn = empty($request["bytesIn"]) ? null : (number_format($request['bytesIn'] / 1024, 1) . " KB");
    $out .= $this->_createDataCell($bytesIn, "reqBytes", $highlight);

    if ($this->requests->hasSecureRequests()) {
      $reqCertBytes = null;
      if (!empty($request['certificate_bytes']) && (int)$request['certificate_bytes'] > 0)
        $reqCertBytes = $request['certificate_bytes'] . ' B';
      $out .= $this->_createDataCell($reqCertBytes, "reqCertBytes", $highlight);
    }
    
    $out .= $this->_createDataCell(@$request["responseCode"], "reqResult", $highlight);
    $out .= $this->_createDataCell(@$request["ip_addr"], "reqIP", $highlight);

    $out .= '</tr>';
    return $out;
  }

  private function _createDataCell($value, $class, $highlight) {
    $value = empty($value) ? "-" : $value;
    return "<td class=\"" . $class . " " . $highlight . "\">" . $value . "</td>\n";
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

  private function _createRequestUrlLink($request, $requestNum) {
    if (!$request['host'] && !$request['url']) {
      return null;
    }
    $protocol = $request['is_secure'] == 1 ? "https://" : "http://";
    $url = $protocol . $request['host'] . $request['url'];
    $displayurl = ShortenUrl($url);
    if ($this->useLinks) {
      $reqUrl = '<a rel="nofollow" href="' . $url . '">' . $displayurl . '</a>';
    } else {
      $reqUrl = "<a title=\"$url\" href=\"#step" . $this->stepResult->getStepNumber() . "_request$requestNum\">$displayurl</a>";
    }
    return $reqUrl;
  }

  private function _createSocketSSLCells($request, $highlight) {
    $reqSocket = null;
    $reqSSL = null;

    if (!empty($request['connect_ms']) && (int)$request['connect_ms'] !== -1) {
      $reqSocket = $request['connect_ms'] . ' ms';
      if (!empty($request['is_secure']) && $request['is_secure'] == 1) {
        $reqSSL = (int)$request['ssl_ms'] . ' ms';
      }
    } elseif (!empty($request['connect_end']) && $request['connect_end'] > 0) {
      $reqSocket = $request['connect_end'] - $request['connect_start'];
      if (!empty($request['ssl_end']) && $request['ssl_end'] > 0) {
        $reqSSL = $request['ssl_end'] - $request['ssl_start'];
      }
    }

    $out = $this->_createDataCell($reqSocket, "reqSocket", $highlight);
    if ($this->requests->hasSecureRequests()) {
      $out .= $this->_createDataCell($reqSSL, "reqSSL", $highlight);
    }
    return $out;
  }

  private function _createLegendCell($color, $label) {
    $out = '<td><table><tbody><tr><td><div class="bar" style="width:15px; background-color:' . $color . '"></div></td>';
    $out .= "<td>" . $label . "</td></tr></tbody></table></td>\n";
    return $out;
  }

}