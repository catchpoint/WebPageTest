<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

require_once INCLUDES_PATH . '/common_lib.inc'; // TODO: remove if we don't use GetTestInfo anymore

class TestInfo
{
    private $id;
    private $rootDirectory;
    private $rawData;


    private function __construct($id, $rootDirectory, $testInfo)
    {
      // This isn't likely to stay the standard constructor, so we name it explicitly as a static function below

      // Manually build the test run info if it isn't present
        $runs = null;
        if (!isset($testInfo['testinfo']['steps']) || !$testInfo['testinfo']['steps']) {
            if (!isset($runs)) {
                $this->ScanTestSteps($rootDirectory, $runs);
            }
            if (isset($runs)) {
                $testInfo['testinfo']['steps'] = 1;
                foreach ($runs as $run) {
                    if ($run['steps'] > $testInfo['testinfo']['steps']) {
                        $testInfo['testinfo']['steps'] = $run['steps'];
                    }
                }
            }
        }

        $this->id = $id;
        $this->rootDirectory = $rootDirectory;
        $this->rawData = $testInfo;
    }

  /**
   * @param string $id The test ID
   * @param string $rootDirectory The root directory of the test data
   * @param array $testInfo Array with information about the test
   * @return TestInfo The created instance
   */
    public static function fromValues($id, $rootDirectory, $testInfo)
    {
        return new self($id, $rootDirectory, $testInfo);
    }

    public static function fromFiles($rootDirectory, $touchFile = true)
    {
        $test = array();
        $iniPath = $rootDirectory . "/testinfo.ini";
        if (is_file($iniPath)) {
            $test = parse_ini_file($iniPath, true);
            if (!$touchFile) {
                touch($iniPath);
            }
        }
        $test["testinfo"] = GetTestInfo($rootDirectory);
        if (isset($test) && is_array($test) && isset($test['testinfo']["id"])) {
            return new self($test['testinfo']["id"], $rootDirectory, $test);
        } elseif (isset($test) && is_array($test) && isset($test['test']['id'])) {
            return new self($test['test']['id'], $rootDirectory, $test);
        } else {
            return new self('010101_0_0', $rootDirectory, $test);
        }
    }

  /**
   * @return string The id of the test
   */
    public function getId()
    {
        return $this->id;
    }

  /**
   * @return string The test URL, if set. null otherwise
   */
    public function getUrl()
    {
        return empty($this->rawData['testinfo']['url']) ? null : $this->rawData['testinfo']['url'];
    }

  /**
   * @return int The number of runs in this test
   */
    public function getRuns()
    {
        return empty($this->rawData['test']['runs']) ? 0 : $this->rawData['test']['runs'];
    }

  /**
   * @return string The type of the test
   */
    public function getTestType()
    {
        $type = isset($this->rawData['testinfo']['type']) ? $this->rawData['testinfo']['type'] : '';
        return $type;
    }

  /**
   * @return bool True if the test only has first views, false otherwise
   */
    public function isFirstViewOnly()
    {
        return !empty($this->rawData['test']['fvonly']); // empty also checks for false or null
    }

  /**
   * @return bool True if the test contains AFT values, false otherwise
   */
    public function hasAboveTheFoldTime()
    {
        return !empty($this->rawData['test']['aft']);
    }


    public function getRawData()
    {
        return $this->rawData;
    }


  /**
   * @return bool True if the test is complete, false otherwise
   */
    public function isComplete()
    {
        return !empty($this->rawData['testinfo']['completed']) || is_file($this->rootDirectory . '/test.complete'); // empty also checks for false or null
    }

  /**
   * @param int $run The run number, starting from 1
   * @return int The number of steps in this run
   */
    public function stepsInRun($run)
    {
        if (empty($this->rawData['testinfo']['steps'])) {
            return 1;
        }
        return $this->rawData['testinfo']['steps'];
    }

  /**
   * @return string The root directory for the test, relative to the WebpageTest root
   */
    public function getRootDirectory()
    {
        return $this->rootDirectory;
    }

  /**
   * @return string|null The location as saved in the ini file or null if not set
   */
    public function getTestLocation()
    {
        if (empty($this->rawData['test']['location'])) {
            return null;
        }
        return $this->rawData['test']['location'];
    }

  /**
   * @return array The test info as saved in testinfo.json
   */
    public function getInfoArray()
    {
        return empty($this->rawData["testinfo"]) ? null : $this->rawData["testinfo"];
    }

  /**
   * @return int The maximum number of steps executed in one of the runs
   */
    public function getSteps()
    {
        return empty($this->rawData['testinfo']['steps']) ? 1 : $this->rawData['testinfo']['steps'];
    }

  /**
   * @return int The configured latency for the test
   */
    public function getLatency()
    {
        return empty($this->rawData['testinfo']['latency']) ? null : $this->rawData['testinfo']['latency'];
    }

  /**
   * @param int $run The run number
   * @return null|string Tester for specified run
   */
    public function getTester($run)
    {
        if (!array_key_exists('testinfo', $this->rawData)) {
            return null;
        }
        $tester = null;
        if (array_key_exists('tester', $this->rawData['testinfo'])) {
            $tester = $this->rawData['testinfo']['tester'];
        }
        if (
            array_key_exists('test_runs', $this->rawData['testinfo']) &&
            array_key_exists($run, $this->rawData['testinfo']['test_runs']) &&
            array_key_exists('tester', $this->rawData['testinfo']['test_runs'][$run])
        ) {
            $tester = $this->rawData['testinfo']['test_runs'][$run]['tester'];
        }
        return $tester;
    }

  /**
   * @return bool True if the test is marked as an test_error, false otherwise
   */
    public function isTestError()
    {
        return !empty($this->rawData['testinfo']['test_error']);
    }

  /**
   * @return string|null The error (if exists) or null if there is no error
   */
    public function getRunError($run, $cached)
    {
        $cachedIdx = $cached ? 1 : 0;
        if (empty($this->rawData['testinfo']['errors'][$run][$cachedIdx])) {
            return null;
        }
        return $this->rawData['testinfo']['errors'][$run][$cachedIdx];
    }

  /**
   * @return bool True if the test is supposed to have a video, false otherwise
   */
    public function hasVideo()
    {
        return (isset($this->rawData['test']['Capture Video']) && $this->rawData['test']['Capture Video']) ||
           (isset($this->rawData['test']['Video']) && $this->rawData['test']['Video']) ||
           (isset($this->rawData['test']['video']) && $this->rawData['test']['video']);
    }

  /**
   * @return bool True if the test is supposed to have screenshots (images), false otherwise
   */
    public function hasScreenshots()
    {
        return empty($this->rawData["testinfo"]["noimages"]);
    }

  /**
   * @return bool True if the test is supposed to have a timeline, false otherwise
   */
    public function hasTimeline()
    {
        $ret = !empty($this->rawData["testinfo"]["timeline"]);
        if ($ret && !empty($this->rawData["testinfo"]["discard_timeline"])) {
            $ret = false;
        }
        return $ret;
    }

    private function ScanTestSteps($rootDirectory, &$runs)
    {
        $files = glob("$rootDirectory/*.gz");
        foreach ($files as $file) {
            $run = null;
            $step = null;
            if (preg_match('/^(\d+)_(\d+)_/', basename($file), $matches)) {
                $run = intval($matches[1]);
                $step = intval($matches[2]);
            } elseif (preg_match('/^(\d+)_/', basename($file), $matches)) {
                $run = intval($matches[1]);
                $step = 1;
            }
            if (isset($run) && isset($step)) {
                if (!isset($runs)) {
                    $runs = array();
                }
                if (!isset($runs[$run])) {
                    $runs[$run] = array('steps' => 1, 'done' => true);
                }
                if ($step > $runs[$run]['steps']) {
                    $runs[$run]['steps'] = $step;
                }
            }
        }
    }
}
