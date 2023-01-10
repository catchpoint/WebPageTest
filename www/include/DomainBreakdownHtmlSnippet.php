<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

require_once INCLUDES_PATH . '/include/BreakdownHtmlSnippet.php';

class DomainBreakdownHtmlSnippet extends BreakdownHtmlSnippet
{
    private $stepResult;

  /**
   * DomainBreakdownHtmlSnippet constructor.
   * @param TestInfo $testInfo
   * @param TestStepResult $stepResult
   */
    public function __construct($testInfo, $stepResult)
    {
        parent::__construct($stepResult);
        $this->stepResult = $stepResult;
    }

    public function create()
    {
        $out = $this->createChartMarkup();
        $out .= $this->createJavaScript("wptDomainBreakdownData", $this->_getJSONBreakdown());
        return $out;
    }

    private function _getJSONBreakdown()
    {
        return json_encode($this->stepResult->getJSFriendlyDomainBreakdown());
    }
}
