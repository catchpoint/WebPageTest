<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

require_once INCLUDES_PATH . '/common_lib.inc';
require_once INCLUDES_PATH . '/page_data.inc';
require_once INCLUDES_PATH . '/object_detail.inc';
require_once INCLUDES_PATH . '/breakdown.inc';
require_once INCLUDES_PATH . '/devtools.inc.php';

class ResultProcessing
{
    private $testRoot;
    private $id;
    private $run;
    private $cached;

  /**
   * ResultProcessing constructor.
   * @param string $testRoot Path to test result directory
   * @param string $id ID of the test
   * @param int $run Run number
   * @param bool $cached False for first view, true for repeat view (cached)
   */
    public function __construct($testRoot, $id, $run, $cached)
    {
        $this->testRoot = strval($testRoot);
        $this->id = strval($id);
        $this->run = intval($run);
        $this->cached = $cached ? true : false;
    }

  /**
   * Counts the steps for this run by counting the run-specific IEWPG files
   * @return int The number of steps in this run
   */
    public function countSteps()
    {
    // Scan through all of the files that have the common pattern
        if ($this->cached) {
            $pattern = "/^" . $this->run . "_Cached_([0-9]+_)?/";
        } else {
            $pattern = "/^" . $this->run . "_([0-9]+_)?/";
        }
        $files = scandir($this->testRoot);
        $steps = 1;
        foreach ($files as $file) {
            if (preg_match($pattern, $file, $matches)) {
                if (isset($matches[1])) {
                    $step = intval($matches[1]);
                    if ($step > $steps) {
                        $steps = $step;
                    }
                }
            }
        }
        return $steps;
    }

    public function postProcessRun()
    {
        $testerError = null;
        $secure = false;
        loadPageRunData($this->testRoot, $this->run, $this->cached);
        $steps = $this->countSteps();
        for ($i = 1; $i <= $steps; $i++) {
            $rootUrls = UrlGenerator::create(true, "", $this->id, $this->run, $this->cached, $i);
            $stepPaths = new TestPaths($this->testRoot, $this->run, $this->cached, $i);
            $requests = getRequestsForStep($stepPaths, $rootUrls, $secure, true);
            if (isset($requests) && is_array($requests) && count($requests)) {
                getBreakdownForStep($stepPaths, $rootUrls, $requests);
            } else {
                $testerError = 'Missing Results';
            }
        }
        return $testerError;
    }
}
