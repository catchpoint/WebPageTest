<?php

class RequestHeadersHtmlSnippet {
  private $stepResult;
  private $requests;
  private $useLinks;

  /**
   * RequestDetailsHtmlSnippet constructor.
   * @param TestStepResult $stepResult
   * @param bool $useLinks
   */
  public function __construct($stepResult, $useLinks) {
    $this->stepResult = $stepResult;
    $this->requests = $stepResult->getRequestsWithInfo(true, true)->getRequests();
    $this->useLinks = $useLinks;
  }

  public function create() {
    if (empty($this->requests[0]["headers"])) {
      return "";
    }
    $stepNumber = $this->stepResult->getStepNumber();
    $out = '<p><a id="step' . $stepNumber . '_all" href="javascript:expandAll(' . $stepNumber . ');">+ Expand All</a></p>';
    $out .= '<div id="header_details_step' . $stepNumber . '">';
    foreach ($this->requests as $reqNum => $request) {
      if ($request) {
        $requestNum = $reqNum + 1;
        $out .= $this->_createRequestSnippet($requestNum, $request);
      }
    }
    $out .= '</div>';
    return $out;
  }

  private function _createRequestSnippet($requestNum, $request) {
    $stepNum = $this->stepResult->getStepNumber();
    $out = "<h4><span class=\"a_request\" id=\"step${stepNum}_request$requestNum\" data-target-id=\"step${stepNum}_headers_$requestNum\">";
    $out .= "+ Request $requestNum: " . htmlspecialchars($request['full_url']) . "</span></h4>";
    $out .= '<div class="header_details" id="step' . $stepNum . '_headers_' . $requestNum . '">';
    $out .= "<p class=\"indented2\">\n";
    if (!$this->useLinks)
      $out .= "<b>URL:</b> {$request['full_url']}<br>\n";
    else
      $out .= "<b>URL:</b> <a rel=\"nofollow\" href=\"{$request['full_url']}\">{$request['full_url']}</a><br>\n";
    $out .= "<b>Host:</b> " . htmlspecialchars($request['host']) . "<br>\n";
    if (array_key_exists('ip_addr', $request) && strlen($request['ip_addr']))
      $out .= "<b>IP:</b> {$request['ip_addr']}<br>\n";
    if (array_key_exists('location', $request) && strlen($request['location']))
      $out .= "<b>Location:</b> " . htmlspecialchars($request['location']) . "<br>\n";
    $out .= "<b>Error/Status Code:</b> " . htmlspecialchars($request['responseCode']) . "<br>\n";
    if (isset($request['priority']) && strlen($request['priority']))
      $out .= "<b>Priority:</b> " . htmlspecialchars($request['priority']) . "<br>\n";
    if (isset($request['protocol']) && strlen($request['protocol']))
      $out .= '<b>Protocol: </b>' . htmlspecialchars($request['protocol']) . "<br>\n";
    if (isset($request['http2_stream_id']) && $request['http2_stream_id'] > 0) {
      $out .= "<b>HTTP/2 Stream: </b>" . htmlspecialchars($request['http2_stream_id']);
      if (isset($request['http2_stream_weight']))
        $out .= ", weight " . htmlspecialchars($request['http2_stream_weight']);
      if (isset($request['http2_stream_dependency']))
        $out .= ", depends on " . htmlspecialchars($request['http2_stream_dependency']);
      if (isset($request['http2_stream_exclusive']) && $request['http2_stream_exclusive'] > 0)
        $out .= ", EXCLUSIVE";
      $out .= '<br>';
    }
    if (isset($request['was_pushed']) && $request['was_pushed'] > 0)
        echo '<b>SERVER PUSHED</b>';
    if (array_key_exists('initiator', $request) && strlen($request['initiator'])) {
      $out .= "<b>Initiated By:</b> " . htmlspecialchars($request['initiator']);
      if (array_key_exists('initiator_line', $request) && strlen($request['initiator_line']))
        $out .= " line " . htmlspecialchars($request['initiator_line']);
      if (array_key_exists('initiator_column', $request) && strlen($request['initiator_column']))
        $out .= " column " . htmlspecialchars($request['initiator_column']);
      $out .= "<br>\n";
    }
    if (array_key_exists('client_port', $request) && intval($request['client_port']))
      $out .= "<b>Client Port:</b> " . htmlspecialchars($request['client_port']) . "<br>\n";
    if (array_key_exists('custom_rules', $request)) {
      foreach ($request['custom_rules'] as $rule_name => &$rule) {
        $out .= "<b>Custom Rule - " . htmlspecialchars($rule_name) . ": </b>(" . htmlspecialchars($rule['count']) . " matches) - " . htmlspecialchars($rule['value']) . "<br>\n";
      }
    }
    $out .= "<b>Request Start:</b> " . number_format($request['load_start'] / 1000.0, 3) . " s<br>\n";
    if (array_key_exists('dns_ms', $request) && $request['dns_ms'] > 0)
      $out .= "<b>DNS Lookup:</b> {$request['dns_ms']} ms<br>\n";
    if (array_key_exists('connect_ms', $request) && $request['connect_ms'] > 0)
      $out .= "<b>Initial Connection:</b> {$request['connect_ms']} ms<br>\n";
    if (array_key_exists('ttfb_ms', $request) && $request['ttfb_ms'] > 0)
      $out .= "<b>Time to First Byte:</b> {$request['ttfb_ms']} ms<br>\n";
    if (array_key_exists('download_ms', $request) && $request['download_ms'] > 0)
      $out .= "<b>Content Download:</b> {$request['download_ms']} ms<br>\n";
    $out .= "<b>Bytes In (downloaded):</b> " . number_format($request['bytesIn'] / 1024.0, 1) . " KB<br>\n";
    $out .= "<b>Bytes Out (uploaded):</b> " . number_format($request['bytesOut'] / 1024.0, 1) . " KB<br>\n";
    $urlGenerator = $this->stepResult->createUrlGenerator("", false);

    $responseBodyUrl = null;
    if (isset($request['body_id']) && $request['body_id'] > 0) {
      $responseBodyUrl = $urlGenerator->responseBodyWithBodyId($request['body_id']);
    } elseif (array_key_exists('body', $request) && $request['body']) {
      $responseBodyUrl = $urlGenerator->responseBodyWithRequestNumber($requestNum);
    }
    if ($responseBodyUrl) {
      $out .= "<a href=\"$responseBodyUrl\">View Response Body</a><br>\n";
    }
    $out .= "</p>";
    if (array_key_exists('headers', $request)) {
      if (array_key_exists('request', $request['headers']) && is_array($request['headers']['request'])) {
        $out .= '<p class="indented1"><b>Request Headers:</b></p><p class="indented2">' . "\n";
        foreach ($request['headers']['request'] as $value)
          $out .= htmlspecialchars($value) . "<br>\n";
        $out .= "</p>";
      }
      if (array_key_exists('response', $request['headers']) && is_array($request['headers']['response'])) {
        $out .= '<p class="indented1"><b>Response Headers:</b></p><p class="indented2">' . "\n";
        foreach ($request['headers']['response'] as $value)
          $out .= htmlspecialchars($value) . "<br>\n";
        $out .= "</p>";
      }
    }

    $out .= '</div>';
    return $out;
  }
}