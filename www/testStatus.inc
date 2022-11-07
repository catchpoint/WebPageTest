<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once(INCLUDES_PATH . '/common_lib.inc');
require_once(INCLUDES_PATH . '/page_data.inc');

$testQueue = array();
$testInfoJson = null;

/**
* Get the status of the given test ID (and return the info in an array)
*
*/
function GetTestStatus($id, $includePosition = true)
{
    $testServer = GetServerForTest($id);
    if (isset($testServer)) {
      // Proxy the status through the server that actually owns the test
        $pos = $includePosition ? '1' : '0';
        $status = json_decode(http_fetch("{$testServer}testStatus.php?test=$id&pos=$pos"), true);
        if (is_array($status) && isset($status['data'])) {
            return $status['data'];
        }
    }

    if (isset($_REQUEST['noposition']) && $_REQUEST['noposition']) {
        $includePosition = false;
    }
    $testPath = './' . GetTestPath($id);

  // Fast-path for pending tests when we don't need to know the queue position (avoid test and location locks)
    if (file_exists("$testPath/test.scheduled") && !file_exists("$testPath/.archived")) {
        $ret = array('statusCode' => 101, 'statusText' => 'Test pending', 'id' => $id);
        $status = GetSchedulerTestStatus($id);
        if (isset($status) && is_array($status)) {
            if (isset($status['Position'])) {
                $count = max($status['Position'] - 1, 0);
                $ret['statusCode'] = 101;
                $ret['behindCount'] = $count;
                if ($count > 1) {
                    $ret['statusText'] = "Waiting behind $count other tests...";
                } elseif ($count == 1) {
                    $ret['statusText'] = "Waiting behind 1 other test...";
                } else {
                    $ret['statusText'] = "Waiting at the front of the queue...";
                }
            } else {
                $ret = array('statusCode' => 100,
                     'statusText' => 'Test just started',
                     'startTime' => gmdate("m/d/y G:i:s"),
                     'id' => $id);
            }
        }
        return $ret;
    } elseif (!$includePosition && is_file("$testPath/test.waiting") && !file_exists("$testPath/.archived")) {
        return array('statusCode' => 101, 'statusText' => 'Test pending', 'id' => $id);
    } elseif (is_file("$testPath/test.running") && !file_exists("$testPath/.archived")) {
        $startTime = filemtime("$testPath/test.running");
        $elapsed = time() - $startTime;
        $max_run_minutes = GetSetting('max_run_minutes', 60);
        if ($max_run_minutes > 0 && $elapsed > $max_run_minutes * 60) {
            if (TestArchiveExpired($id)) {
                $statusText = 'Test result expired';
            } else {
                $statusText = 'Test not found';
            }
            $ret = array('statusCode' => 400, 'statusText' => $statusText, 'id' => $id);
            touch("$testPath/test.complete");
            @unlink("$testPath/test.requeued");
            @unlink("$testPath/test.running");
        } else {
            $ret = array('statusCode' => 100,
                  'statusText' => 'Test just started',
                  'startTime' => gmdate("m/d/y G:i:s", filemtime("$testPath/test.running")),
                  'id' => $id);
            $testInfoJson = GetTestInfo($id);
            PopulateTestInfoJson($ret, $testInfoJson);
            if ($elapsed == 0) {
                $ret['statusText'] = "Test just started";
            } elseif ($elapsed == 1) {
                $ret['statusText'] = "Test Started $elapsed second ago";
            } elseif ($elapsed < 60) {
                $ret['statusText'] = "Test Started $elapsed seconds ago";
            } else {
                $elapsed = floor($elapsed / 60);
                if ($elapsed == 1) {
                    $ret['statusText'] = "Test Started $elapsed minute ago";
                } elseif ($elapsed < 60) {
                    $ret['statusText'] = "Test Started $elapsed minutes ago";
                } else {
                    $ret = null;
                }
            }
        }
        if (isset($ret)) {
            return $ret;
        }
    } elseif (is_file("$testPath/test.complete") || file_exists("$testPath/.archived")) {
        $ret = array('statusCode' => 200,
                    'statusText' => 'Test Complete',
                    'id' => $id,
                    'completeTime' => gmdate("m/d/y G:i:s", filemtime("$testPath/test.complete")));
        $testInfoJson = GetTestInfo($id);
        PopulateTestInfoJson($ret, $testInfoJson);
        return $ret;
    }

    if (is_file("$testPath/test.waiting") && !file_exists("$testPath/.archived")) {
        $ret = array('statusCode' => 101, 'statusText' => 'Test pending', 'id' => $id);
    } else {
        if (TestArchiveExpired($id)) {
            $statusText = 'Test result expired';
        } else {
            $statusText = 'Test not found';
        }
        $ret = array('statusCode' => 400, 'statusText' => $statusText, 'id' => $id);
    }
    $now = time();
    RestoreTest($id);
    if (is_dir($testPath) && is_file("$testPath/testinfo.ini")) {
        if (!isset($testInfoJson) || !is_array($testInfoJson)) {
            $testInfoJson = GetTestInfo($id);
        }
        if ($testInfoJson) {
            $ret['testInfo'] = PopulateTestInfo($testInfoJson);
            $test = @parse_ini_file("$testPath/testinfo.ini", true);
            if (isset($test) && isset($test['test'])) {
                $ret['testId'] = $id;
                $ret['runs'] = (int)$test['test']['runs'];
                $ret['fvonly'] = (int)$test['test']['fvonly'];
                $ret['remote'] = false;
                $ret['testsExpected'] = $testInfoJson['runs'];
                if (array_key_exists('discard', $testInfoJson) && $testInfoJson['discard'] > 0) {
                    $ret['testsExpected'] -= $testInfoJson['discard'];
                }

                if (isset($test['test']['loc'])) {
                    $ret['location'] = $test['test']['loc'];
                }

                // See if it is a bulk test
                if ($test['test']['batch'] || $test['test']['batch_locations']) {
                    GetBatchStatus($ret);
                } else {
                    // Ignore the cancelled tests
                    if (isset($testInfoJson['cancelled'])) {
                        $ret['statusCode'] = 402;
                        $ret['statusText'] = 'Test Cancelled';
                        return $ret;
                    }
                    if (
                        (array_key_exists('started', $testInfoJson) &&
                        $testInfoJson['started']) ||
                        isset($test['test']['completeTime'])
                    ) {
                        $ret['startTime'] = isset($test['test']['startTime']) ? $test['test']['startTime'] : $now;
                        $start = isset($testInfoJson['started']) ? $testInfoJson['started'] : $now;
                        $elapsed = 0;
                        if ($now > $start) {
                            $elapsed = $now - $start;
                        }
                        $ret['elapsed'] = $elapsed;

                        if (isset($test['test']['completeTime'])) {
                            $ret['statusCode'] = 200;
                            $ret['statusText'] = 'Test Complete';
                            $ret['completeTime'] = $test['test']['completeTime'];
                            $ret['testsCompleted'] = $ret['testsExpected'];
                            if (isset($testInfoJson['completed'])) {
                                $ret['elapsed'] = max($testInfoJson['completed'] - $start, 0);
                            }
                        } else {
                            $ret['statusCode'] = 100;
                            if ($elapsed == 0) {
                                    $ret['statusText'] = "Test just started";
                            } elseif ($elapsed == 1) {
                                    $ret['statusText'] = "Test Started $elapsed second ago";
                            } elseif ($elapsed < 60) {
                                $ret['statusText'] = "Test Started $elapsed seconds ago";
                            } else {
                                $elapsed = floor($elapsed / 60);
                                if ($elapsed == 1) {
                                    $ret['statusText'] = "Test Started $elapsed minute ago";
                                } elseif ($elapsed < 60) {
                                    $ret['statusText'] = "Test Started $elapsed minutes ago";
                                } else {
                                    $ret['statusText'] = "Test Started $elapsed minutes ago (probably failed)";
                                }

                                // For any test that runs for over max_run_minutes and where we haven't seen an update
                                // Force individual runs to end if they didn't complete within max_run_minutes and force
                                // the overall test to end if all of the individual runs are complete.
                                $max_run_minutes = GetSetting('max_run_minutes', 60);
                                if ($elapsed > $max_run_minutes) {
                                    $elapsedUpdate = 100;
                                    if (isset($testInfoJson['last_updated']) && $now > $testInfoJson['last_updated']) {
                                        $elapsedUpdate = ($now - $testInfoJson['last_updated']) / 60;
                                    }
                                    $ret['elapsedUpdate'] = $elapsedUpdate;
                                    if ($elapsedUpdate > $max_run_minutes) {
                                        $allComplete = true;
                                        $lock = LockTest($id);
                                        if ($lock) {
                                            $testInfoJson = GetTestInfo($id);
                                            if ($testInfoJson && $allComplete) {
                                                logTestMsg($id, "Test has been running for $elapsed minutes and it has been $elapsedUpdate since the last update; forcing the full test to finish.");
                                                $testInfoJson['completed'] = $now;
                                                $test = file_get_contents("$testPath/testinfo.ini");
                                                $date = gmdate("m/d/y G:i:s", $now);

                                                // Update the completion time if it isn't already set
                                                if (isset($test) && is_string($test) && !strpos($test, 'completeTime')) {
                                                    $complete = "[test]\r\ncompleteTime=$date";
                                                    $out = str_replace('[test]', $complete, $test);
                                                    file_put_contents("$testPath/testinfo.ini", $out);
                                                }
                                                $ret['statusCode'] = 200;
                                                $ret['statusText'] = 'Test Complete';
                                                $ret['completeTime'] = $date;
                                                touch("$testPath/test.complete");
                                                @unlink("$testPath/test.requeued");
                                                @unlink("$testPath/test.running");

                                                SendCallback($testInfoJson);
                                            }
                                            SaveTestInfo($id, $testInfoJson);
                                            UnlockTest($lock);
                                        }
                                    }
                                }
                            }
                        }

                        if ($includePosition && isset($testInfoJson) && array_key_exists('runs', $testInfoJson)) {
                            $runs = $testInfoJson['runs'];

                            // Count the number of FV and RV tests that have completed
                            $fvRuns = 0;
                            $rvRuns = 0;
                            for ($run = 1; $run <= $runs; $run++) {
                                if (gz_is_file("$testPath/{$run}_IEWPG.txt") || gz_is_file("$testPath/{$run}_devtools.json.txt")) {
                                        $fvRuns++;
                                }
                                if (gz_is_file("$testPath/{$run}_Cached_IEWPG.txt") || gz_is_file("$testPath/{$run}_Cached_devtools.json.txt")) {
                                    $rvRuns++;
                                }
                            }

                            $ret['fvRunsCompleted'] = $fvRuns;
                            $ret['rvRunsCompleted'] = $rvRuns;
                            if (!file_exists("$testPath/test.complete")) {
                                $ret['testsCompleted'] = 0;
                                $files = glob("$testPath/run.complete.*");
                                if (isset($files) && is_array($files)) {
                                    $ret['testsCompleted'] = min(count($files), $fvRuns);
                                }
                            }
                            if ($ret['testsCompleted'] > 0 && $ret['testsExpected'] > 1 && $ret['statusCode'] == 100) {
                                $ret['statusText'] = "Completed {$ret['testsCompleted']} of {$ret['testsExpected']} tests";
                            }

                    // TODO: Add actual summary-result information
                        }
                    } else {
                        if ($includePosition && array_key_exists('workdir', $testInfoJson)) {
                            $count = FindJobPosition($testInfoJson['location'], $testInfoJson['workdir'], $id);
                            if ($count >= 0) {
                                    $ret['statusCode'] = 101;
                                    $ret['behindCount'] = $count;
                                if ($count > 1) {
                                    $ret['statusText'] = "Waiting behind $count other tests...";
                                } elseif ($count == 1) {
                                    $ret['statusText'] = "Waiting behind 1 other test...";
                                } else {
                                    $ret['statusText'] = "Waiting at the front of the queue...";
                                }
                            } else {
                                // double-check to make sure it really isn't started
                                $testInfoJson = GetTestInfo($id);
                                if (isset($testInfoJson) && isset($testInfoJson['started'])) {
                                    $ret['statusCode'] = 100;
                                    $ret['statusText'] = "Test just started";
                                } else {
                                    $ret['statusCode'] = 401;
                                    $ret['statusText'] = 'Test request not found';

                        // Force the test to end - something went Very Wrong (tm)
                                    $lock = LockTest($id);
                                    if ($lock) {
                                        $testInfoJson = GetTestInfo($id);
                                        if ($testInfoJson) {
                                            $testInfoJson['completed'] = $now;
                                            $test = file_get_contents("$testPath/testinfo.ini");
                                            $date = gmdate("m/d/y G:i:s", $now);

                            // Update the completion time if it isn't already set
                                            if (!strpos($test, 'completeTime')) {
                                                $complete = "[test]\r\ncompleteTime=$date";
                                                $out = str_replace('[test]', $complete, $test);
                                                file_put_contents("$testPath/testinfo.ini", $out);
                                            }
                                            $ret['statusCode'] = 200;
                                            $ret['statusText'] = 'Test Complete';
                                            $ret['completeTime'] = $date;
                                            logTestMsg($id, "The test was not started, but the test job could not be found.  Forcing it to end.");
                                            SaveTestInfo($id, $testInfoJson);
                                        }
                                        UnlockTest($lock);
                                    }
                                }
                            }
                        } else {
                            $ret['statusCode'] = 101;
                            $ret['statusText'] = 'Test Pending';
                        }
                    }
                }
            }
        }
    }

    return $ret;
}

/**
 * Get the status text for the given test
 */
function GetTestStatusText($id)
{
    $status = GetTestStatus($id);
    return $status['statusText'];
}

/**
* Check the status of a batch test
*
* @param mixed $status
*/
function GetBatchStatus(&$status)
{
    $dirty = false;
    $id = $status['testId'];
    $testPath = './' . GetTestPath($id);
    if (gz_is_file("$testPath/bulk.json")) {
        $tests = json_decode(gz_file_get_contents("$testPath/bulk.json"), true);
    } elseif (gz_is_file("$testPath/tests.json")) {
        $legacyData = json_decode(gz_file_get_contents("$testPath/tests.json"), true);
        $tests = array();
        $tests['variations'] = array();
        $tests['urls'] = array();
        foreach ($legacyData as &$legacyTest) {
            $tests['urls'][] = array('u' => $legacyTest['url'], 'id' => $legacyTest['id']);
        }
    }

    if (count($tests['urls'])) {
        $started = false;
        $allComplete = true;
        $cancelled = false;

        foreach ($tests['urls'] as &$test) {
            if ($test['c']) {
                $started = true;
            } else {
                $complete = true;
                $id = $test['id'];
                $testPath = './' . GetTestPath($id);
                $testInfo = GetTestInfo($id);
                if ($testInfo) {
                    if ($testInfo['started']) {
                        $started = true;
                    }
                    if ($testInfo['cancelled']) {
                        $cancelled = true;
                    } elseif (!$testInfo['completed']) {
                        $complete = false;
                    }
                }

                // go through all of the variations as well
                foreach ($test['v'] as $variationId) {
                    $testPath = './' . GetTestPath($variationId);
                    $testInfo = GetTestInfo($variationId);
                    if ($testInfo) {
                        if ($testInfo['started']) {
                            $started = true;
                        }
                        if ($testInfo['cancelled']) {
                            $cancelled = true;
                        } elseif (!$testInfo['completed']) {
                            $complete = false;
                            break;
                        }
                    }
                }

                if ($complete) {
                    $test['c'] = 1;
                    $dirty = true;
                } else {
                    $allComplete = false;
                }
            }
        }

        if ($allComplete) {
            $status['statusCode'] = 200;
            $status['statusText'] = 'Test Complete';
        } elseif ($cancelled) {
            $status['statusCode'] = 402;
            $status['statusText'] = 'Test Cancelled';
        } elseif ($started) {
            $status['statusCode'] = 100;
            $status['statusText'] = 'Test Started';
        } else {
            $status['statusCode'] = 101;
            $status['statusText'] = 'Test Pending';
        }

        // rewrite the bulk file if it changed
        if ($dirty) {
            gz_file_put_contents("$testPath/bulk.json", json_encode($tests));
        }
    }
}

/**
 * Populate common status fields from the test JSON
 */
function PopulateTestInfoJson(&$ret, $testInfoJson)
{
    if (isset($testInfoJson) && is_array($testInfoJson)) {
        $ret['testInfo'] = PopulateTestInfo($testInfoJson);
        $ret['remote'] = false;
        $ret['testsExpected'] = $testInfoJson['runs'];
        if (isset($testInfoJson['started'])) {
            $ret['startTime'] = gmdate("m/d/y G:i:s", $testInfoJson['started']);
            if (isset($testInfoJson['completed'])) {
                $ret['completeTime'] = gmdate("m/d/y G:i:s", $testInfoJson['completed']);
                $ret['elapsed'] = $testInfoJson['completed'] - $testInfoJson['started'];
            } else {
                $ret['elapsed'] = $ret['completeTime'] - time();
            }
        }

        $copy = function ($key) use ($testInfoJson, &$ret) {
            if (isset($testInfoJson[$key])) {
                $ret[$key] = $testInfoJson[$key];
            }
        };
        $keys = array('runs', 'fvonly', 'location');
        foreach ($keys as $key) {
            $copy($key);
        }
    }
}

/**
 * Array To XML Utility
 */
function array2xml($array, $xml = false)
{
    if ($xml === false) {
        $xml = new SimpleXMLElement('<response/>');
    }


    foreach ($array as $key => $value) {
        if (is_array($value)) {
           //get children
            array2xml($value, $xml->addChild($key));
        } else {
            $xml->addChild($key, $value);
        }
    }

    return $xml->asXML();
}
