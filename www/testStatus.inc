<?php
require_once('common_lib.inc');
require_once('page_data.inc');
if(extension_loaded('newrelic')) { 
    newrelic_add_custom_tracer('GetRelayStatus');
}

$testQueue = array();

/**
* Get the status of the given test ID (and return the info in an array)
* 
*/
function GetTestStatus($id, $includePosition = true) {
  global $testQueue;
  
  if (isset($_REQUEST['noposition']) && $_REQUEST['noposition'])
    $includePosition = false;
  $testPath = './' . GetTestPath($id);
  
  // Fast-path for pending tests when we don't need to know the queue position (avoid test and location locks)
  $waiting_file = "$testPath/test.waiting";
  if (!$includePosition && is_file($waiting_file))
    return array('statusCode' => 101, 'statusText' => 'Test pending', 'id' => $id);
  
  $ret = array('statusCode' => 400, 'statusText' => 'Test not found', 'id' => $id);
  $now = time();
  RestoreTest($id);
  if (is_dir($testPath) && is_file("$testPath/testinfo.ini")) {
    $testInfoJson = GetTestInfo($id);
    if ($testInfoJson) {
      $ret['testInfo'] = PopulateTestInfo($testInfoJson);
      if (isset($testInfoJson['relayId'])) {
        $ret = array('statusCode' => 101, 'statusText' => 'Test status unavailable', 'id' => $id);
        $ret = GetRelayStatus($id, $testPath, $testInfoJson);
        $ret['remote'] = true;
      } else {
        $test = @parse_ini_file("$testPath/testinfo.ini",true);
        if (isset($test) && isset($test['test'])) {
          $ret['testId'] = $id;
          $ret['runs'] = (int)$test['test']['runs'];
          $ret['fvonly'] = (int)$test['test']['fvonly'];
          $ret['remote'] = false;
          $ret['testsExpected'] = $testInfoJson['runs'];
          if (array_key_exists('discard', $testInfoJson) && $testInfoJson['discard'] > 0)
            $ret['testsExpected'] -= $testInfoJson['discard'];
          
          if( isset($test['test']['loc']) )
            $ret['location'] = $test['test']['loc'];

          // see if it is a bulk test
          if ($test['test']['batch'] || $test['test']['batch_locations']) {
            GetBatchStatus($ret);
          } else {
            // Ignore the cancelled tests.
            if (isset($testInfoJson['cancelled'])) {
                $ret['statusCode'] = 402;
                $ret['statusText'] = 'Test Cancelled';
                return $ret;
            }
            if ((array_key_exists('started', $testInfoJson) && 
                $testInfoJson['started']) || 
                isset($test['test']['completeTime'])) {
              $ret['startTime'] = $test['test']['startTime'];
              $start = $testInfoJson['started'];
              $elapsed = 0;
              if ($now > $start)
                $elapsed = $now - $start;
              $ret['elapsed'] = $elapsed;

              if (isset($test['test']['completeTime'])) {
                $ret['statusCode'] = 200;
                $ret['statusText'] = 'Test Complete';
                $ret['completeTime'] = $test['test']['completeTime'];
                $ret['testsCompleted'] = $ret['testsExpected'];
                if (isset($testInfoJson['completed']))
                  $ret['elapsed'] = $testInfoJson['completed'] - $testInfoJson['started'];
              } else {
                $ret['statusCode'] = 100;
                if( $elapsed == 0 )
                  $ret['statusText'] = "Test just started";
                elseif( $elapsed == 1 )
                  $ret['statusText'] = "Test Started $elapsed second ago";
                elseif( $elapsed < 60 )
                  $ret['statusText'] = "Test Started $elapsed seconds ago";
                else {
                  $elapsed = floor($elapsed / 60);
                  if( $elapsed == 1 )
                    $ret['statusText'] = "Test Started $elapsed minute ago";
                  elseif( $elapsed < 60 )
                    $ret['statusText'] = "Test Started $elapsed minutes ago";
                  else
                    $ret['statusText'] = "Test Started $elapsed minutes ago (probably failed)";
                    
                  // For any test that runs for over 60 minutes and where we haven't seen an update
                  // in the last 60 minutes, Force individual runs to end if they didn't complete
                  // within 60 minutes and force the overall test to end if all of the individual
                  // runs are complete.
                  if ($elapsed > 60) {
                    $elapsedUpdate = 100;
                    if (isset($testInfoJson['last_updated']) && $now > $testInfoJson['last_updated'])
                      $elapsedUpdate = ($now - $testInfoJson['last_updated']) / 60;
                    $ret['elapsedUpdate'] = $elapsedUpdate;
                    if ($elapsedUpdate > 60) {
                      $allComplete = true;
                      $lock = LockTest($id);
                      if ($lock) {
                        $testInfoJson = GetTestInfo($id);
                        if ($testInfoJson) {
                          if (array_key_exists('test_runs', $testInfoJson) && $testInfoJson['shard_test']) {
                            foreach($testInfoJson['test_runs'] as $run => &$testRun) {
                              if (!array_key_exists('done', $testRun) || !$testRun['done']) {
                                if (array_key_exists('started', $testRun) && $testRun['started'] && $testRun['started'] < $now) {
                                  $runElapsed = intval(($now - $testRun['started']) / 60);
                                  if ($runElapsed > 60) {
                                    $testRun['done'] = true;
                                    if (array_key_exists('tester', $testRun) && strlen($testRun['tester']))
                                      $tester = " on {$testRun['tester']}";
                                    logTestMsg($id, "Test run $run has been running for $runElapsed minutes$tester, forcing done.");
                                  } else {
                                    $allComplete = false;
                                  }
                                } else {
                                  $allComplete = false;
                                }
                              }
                            }
                          }
                          if ($allComplete) {
                            logTestMsg($id, "Test has been running for $elapsed minutes and it has been $elapsedUpdate since the last update, forcing the full test to finish.");
                            $testInfoJson['completed'] = $now;
                            $test = file_get_contents("$testPath/testinfo.ini");
                            $date = gmdate("m/d/y G:i:s", $now);

                            // update the completion time if it isn't already set
                            if (!strpos($test, 'completeTime')) {
                              $complete = "[test]\r\ncompleteTime=$date";
                              $out = str_replace('[test]', $complete, $test);
                              file_put_contents("$testPath/testinfo.ini", $out);
                            }
                            $ret['statusCode'] = 200;
                            $ret['statusText'] = 'Test Complete';
                            $ret['completeTime'] = $date;
                          }
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
                
                // count the number of fv and rv tests that have completed
                $fvRuns = 0;
                $rvRuns = 0;
                for ($run = 1; $run <= $runs; $run++) {
                  if(gz_is_file("$testPath/{$run}_IEWPG.txt") || gz_is_file("$testPath/{$run}_devtools.json.txt"))
                      $fvRuns++;
                  if(gz_is_file("$testPath/{$run}_Cached_IEWPG.txt") || gz_is_file("$testPath/{$run}_Cached_devtools.json.txt"))
                      $rvRuns++;
                }
                
                $ret['fvRunsCompleted'] = $fvRuns;
                $ret['rvRunsCompleted'] = $rvRuns;
                if (array_key_exists('test_runs', $testInfoJson)) {
                  $ret['testsCompleted'] = 0;
                  foreach($testInfoJson['test_runs'] as &$testRun)
                    if (array_key_exists('done', $testRun) && $testRun['done'])
                      $ret['testsCompleted']++;
                } else {
                  $ret['testsCompleted'] = $fvRuns;
                }
                if ($ret['testsCompleted'] > 0 && $ret['testsExpected'] > 1 && $ret['statusCode'] == 100) {
                  $ret['statusText'] = "Completed {$ret['testsCompleted']} of {$ret['testsExpected']} tests";
                }
                
                // TODO: Add actual summary result information
              }
            } else {
              if ($includePosition && array_key_exists('workdir', $testInfoJson)) {
                $count = FindJobPosition($testInfoJson['location'], $testInfoJson['workdir'], $id);
                if ($count >= 0) {
                  $ret['statusCode'] = 101;
                  $ret['behindCount'] = $count;
                  if( $count > 1 )
                    $ret['statusText'] = "Waiting behind $count other tests...";
                  elseif( $count == 1 )
                    $ret['statusText'] = "Waiting behind 1 other test...";
                  else
                    $ret['statusText'] = "Waiting at the front of the queue...";
                } else {
                  $ret['statusCode'] = 401;
                  $ret['statusText'] = 'Test request not found';
                  
                  // force the test to end - something went very wrong
                  $lock = LockTest($id);
                  if ($lock) {
                    $testInfoJson = GetTestInfo($id);
                    if ($testInfoJson) {
                      $testInfoJson['completed'] = $now;
                      $test = file_get_contents("$testPath/testinfo.ini");
                      $date = gmdate("m/d/y G:i:s", $now);

                      // update the completion time if it isn't already set
                      if (!strpos($test, 'completeTime')) {
                        $complete = "[test]\r\ncompleteTime=$date";
                        $out = str_replace('[test]', $complete, $test);
                        file_put_contents("$testPath/testinfo.ini", $out);
                      }
                      $ret['statusCode'] = 200;
                      $ret['statusText'] = 'Test Complete';
                      $ret['completeTime'] = $date;
                      logTestMsg($id, "The test was not started but the test job could not be found.  Forcing it to end.");
                      SaveTestInfo($id, $testInfoJson);
                    }
                    UnlockTest($lock);
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
  }

  return $ret;
}

/**
 * Get the status text for the given test.
 */
function GetTestStatusText($id) {
  $status = GetTestStatus($id);
  return $status['statusText'];
}

/**
* Check the status of a batch test
* 
* @param mixed $status
*/
function GetBatchStatus(&$status) {
    $dirty = false;
    $id = $status['testId'];
    $testPath = './' . GetTestPath($id);
    if (gz_is_file("$testPath/bulk.json"))
        $tests = json_decode(gz_file_get_contents("$testPath/bulk.json"), true);
    elseif (gz_is_file("$testPath/tests.json")) {
        $legacyData = json_decode(gz_file_get_contents("$testPath/tests.json"), true);
        $tests = array();
        $tests['variations'] = array();
        $tests['urls'] = array();
        foreach( $legacyData as &$legacyTest )
            $tests['urls'][] = array('u' => $legacyTest['url'], 'id' => $legacyTest['id']);
    }

    if (count($tests['urls'])) {
        $started = false;
        $allComplete = true;
        $cancelled = false;

        foreach ($tests['urls'] as &$test) {
            if ($test['c'])
                $started = true;
            else {
                $complete = true;
                $id = $test['id'];
                $testPath = './' . GetTestPath($id);
                $testInfo = GetTestInfo($id);
                if ($testInfo) {
                  if( $testInfo['started'] )
                      $started = true;
                  if( $testInfo['cancelled'] )
                      $cancelled = true;
                  elseif( !$testInfo['completed'] )
                      $complete = false;
                }

                // go through all of the variations as well
                foreach ($test['v'] as $variationId) {
                    $testPath = './' . GetTestPath($variationId);
                    $testInfo = GetTestInfo($variationId);
                    if ($testInfo) {
                      if ($testInfo['started'])
                          $started = true;
                      if ($testInfo['cancelled'])
                          $cancelled = true;
                      elseif (!$testInfo['completed']) {
                          $complete = false;
                          break;
                      }
                    }
                }
                
                if ($complete) {
                    $test['c'] = 1;
                    $dirty = true;
                } else
                    $allComplete = false;
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
        if( $dirty )
            gz_file_put_contents("$testPath/bulk.json", json_encode($tests));
    }
}

/**
* Get the status of a test from a remote relay
*/
function GetRelayStatus($id, $testPath, &$test) {
    $ret = null;
    $locations = LoadLocationsIni();
    $location = $test['location'];
    $split = strpos($location, ':');
    if ($split > 0)
        $location = substr($location, 0, $split);
    $server = $locations[$location]['relayServer'];
    $key = $locations[$location]['relayKey'];
    
    $status = json_decode(http_fetch("{$server}testStatus.php?test=$id&rkey=$key&pos=1"), true);
    if (is_array($status)) {
        if ($status['statusCode'] == 200) {
            // download the test result and delete it from the relay server
            $tmp = tempnam(realpath('./tmp'), 'relay');
            if (file_put_contents($tmp, http_fetch("{$server}download.php?test=$id&rkey=$key"))) {
                $zip = new ZipArchive();
                if ($zip->open($tmp) === true) {
                    $lock = LockTest($id);
                    if ($lock) {
                      if ($zip->extractTo($testPath)) {
                          SendAsyncRequest("/work/postprocess.php?test=$id");
                          http_fetch("{$server}delete.php?test=$id&rkey=$key");
                          $ret = $status['data'];
                      }
                      Unlock($lock);
                    }
                        
                    $zip->close();
                }
            }
            @unlink($tmp);
        } else
            $ret = $status['data'];
    }
    
    if( !isset($ret) ) {
        // if we got no response from the server, put it into an unkown state in case the server is down
        $ret = array('statusCode' => 102, 'statusText' => 'Server Unreachable');
    }
    
    return $ret;
}

?>
