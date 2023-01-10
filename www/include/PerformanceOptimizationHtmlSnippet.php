<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once INCLUDES_PATH . '/optimization.inc';

class PerformanceOptimizationHtmlSnippet
{
    private $testInfo;
    private $stepResult;

    /**
     * PerformanceOptimizationHtmlSnippet constructor.
     * @param TestInfo $testInfo
     * @param TestStepResult $stepResult
     */
    public function __construct($testInfo, $stepResult)
    {
        $this->testInfo = $testInfo;
        $this->stepResult = $stepResult;
    }

    public function create()
    {
        $out = $this->_createChecklistSnippet();
        $out .= $this->_createDetailSnippet();
        return $out;
    }

    private function _createChecklistSnippet()
    {
        $stepNum = $this->stepResult->getStepNumber();
        $urlGenerator = $this->stepResult->createUrlGenerator("", defined("FRIENDLY_URLS") && FRIENDLY_URLS);
        $imageUrl = $urlGenerator->optimizationChecklistImage();
        $out = "<h4>Full Optimization Checklist</h4>\n";
        $out .= "<p><a title=\"Optimization Checklist download\" href=\"$imageUrl\">Download as an image</a></p>\n";
        $out .= "<div class=\"overflow-container\" id=\"checklist_step$stepNum\">";
        $out .= $this->_createChecklistTableSnippet();
        $out .= "</div>";
        return $out;
    }

    private function _createChecklistTableSnippet()
    {
        $headers = [
            'score_keep-alive' => 'Keep-Alive',
            'score_gzip' => 'GZip',
            'score_compress' => 'Compress Images',
            'score_progressive_jpeg' => 'Progressive JPEG',
            'score_cache' => 'Cache Static',
            'score_cdn' => 'CDN Detected'
        ];

        $requests = $this->stepResult->getRequests();
        $rows = [];
        $max_chars = 40;
        foreach ($requests as $request) {
            // error/warning?
            $color = null;
            if ($request['responseCode'] != 401 && ($request['responseCode'] >= 400 || $request['responseCode'] < 0)) {
                $color = 'error';
            } elseif ($request['responseCode'] >= 300) {
                $color = 'warning';
            }

            // shorten url + path
            $path = parse_url('http://' . $request['host'] . $request['url'], PHP_URL_PATH);
            $object = basename($path);
            // if the last character is a /, add it on
            if (substr($path, -1) == '/') {
                $object .= '/';
            }
            $label = $request['host'] . ' - ' . $object;

            // icons
            $icons = [];
            foreach ($headers as $key => $_) {
                $icons[$key] = null;
                $val = $request[$key];
                if (isset($val)) {
                    if ($val == 0) {
                        $icons[$key] = 'error';
                    } elseif ($val > 0 && $val < 100) {
                        $icons[$key] = 'warning';
                    } elseif ($val == 100) {
                        $icons[$key] = 'check';
                    }
                }
            }

            // done massaging the data
            $rows[] = [
                'label' => FitText($label, $max_chars),
                'color' => $color,
                'icons' => $icons,
            ];
        }

        return view('partials.optimizationchecklist', [
            'headers' => $headers,
            'pageData' => $this->stepResult->getRawResults(),
            'rows' => $rows,
        ]);
    }

    private function _createDetailSnippet()
    {
        $out = "<div class='details overflow-container'>\n";
        $out .= "<h4>Details</h4>";
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
