<?php
require_once('common.inc');
require_once('page_data.inc');
if(extension_loaded('newrelic')) { 
    newrelic_add_custom_tracer('GetRelayStatus');
    newrelic_add_custom_tracer('GetAppurifyStatus');
}

$testQueue = array();

/**
* Get the status of the given test ID (and return the info in an array)
* 
*/
function GetTestStatus($id, $includePosition = true) {
    global $testQueue;
    
    $ret = array('statusCode' => 400, 'statusText' => 'Test not found');
    $testPath = './' . GetTestPath($id);
    $testInfoJson = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
    if (isset($testInfoJson['relayId'])) {
        $ret = GetRelayStatus($id, $testPath, $testInfoJson);
        $ret['remote'] = true;
    } elseif (array_key_exists('loc_type', $testInfoJson) && $testInfoJson['loc_type'] == 'Appurify') {
        $ret = GetAppurifyStatus($id, $testPath, $testInfoJson);
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
            if (!$testInfoJson['fvonly'])
                $ret['testsExpected'] *= 2;
            
            if( isset($test['test']['loc']) )
                $ret['location'] = $test['test']['loc'];

            // see if it is a bulk test
            if ($test['test']['batch'] || $test['test']['batch_locations'])
                GetBatchStatus($ret);
            else {
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
                    $now = time();
                    $elapsed = 0;
                    if ($now > $start)
                      $elapsed = $now - $start;
                    $ret['elapsed'] = $elapsed;

                    if (isset($test['test']['completeTime'])) {
                        $ret['statusCode'] = 200;
                        $ret['statusText'] = 'Test Complete';
                        $ret['completeTime'] = $test['test']['completeTime'];
                        $ret['testsCompleted'] = $ret['testsExpected'];
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
                            
                          // force the test to end if it started but we haven't seen progress in the last 10 minutes
                          if ($elapsed > 10) {
                              $elapsedUpdate = 100;
                              if (isset($testInfoJson['last_updated']) && $now > $testInfoJson['last_updated'])
                                $elapsedUpdate = ($now - $testInfoJson['last_updated']) / 60;
                              if ($elapsedUpdate > 10) {
                                // force the test to end
                                $testInfoJson['completed'] = $now;
                                gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfoJson));
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
                        }
                    }

                    if ($includePosition) {
                        $pageData = loadAllPageData($testPath);
                        
                        // count the number of fv and rv tests that have completed
                        $fvRuns = 0;
                        $rvRuns = 0;
                        foreach ($pageData as &$run) {
                            if( isset($run[0]) )
                                $fvRuns++;
                            if( isset($run[1]) )
                                $rvRuns++;
                        }
                        
                        $ret['fvRunsCompleted'] = $fvRuns;
                        $ret['rvRunsCompleted'] = $rvRuns;
                        $ret['testsCompleted'] = $fvRuns + $rvRuns;
                        if ($ret['testsCompleted'] > 0 && $ret['testsExpected'] > 1 && $ret['statusCode'] == 100) {
                            $ret['statusText'] = "Completed {$ret['testsCompleted']} of {$ret['testsExpected']} tests";
                        }
                        
                        // TODO: Add actual summary result information
                    }
                } else {
                    if ($includePosition && array_key_exists('workdir', $testInfoJson)) {
                        $count = FindJobPosition($testInfoJson['workdir'], $id);
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
                        }
                    } else {
                        $ret['statusCode'] = 101;
                        $ret['statusText'] = 'Test Pending';
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
                $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
                if( $testInfo['started'] )
                    $started = true;
                if( $testInfo['cancelled'] )
                    $cancelled = true;
                elseif( !$testInfo['completed'] )
                    $complete = false;

                // go through all of the variations as well
                foreach ($test['v'] as $variationId) {
                    $testPath = './' . GetTestPath($variationId);
                    $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
                    if ($testInfo['started'])
                        $started = true;
                    if ($testInfo['cancelled'])
                        $cancelled = true;
                    elseif (!$testInfo['completed']) {
                        $complete = false;
                        break;
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
    $locations = parse_ini_file('./settings/locations.ini', true);
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
                    if ($zip->extractTo($testPath)) {
                        SendAsyncRequest("/work/postprocess.php?test=$id");
                        http_fetch("{$server}delete.php?test=$id&rkey=$key");
                        $ret = $status['data'];
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

/**
* Check on the status of a pending Appurify test
* 
* @param mixed $id
* @param mixed $testPath
* @param mixed $test
*/
function GetAppurifyStatus($id, $testPath, &$test) {
  $ret = array('statusCode' => 401, 'statusText' => 'Test request not found');
  if (array_key_exists('appurify_tests', $test) &&
      is_array($test['appurify_tests']) &&
      count($test['appurify_tests'])) {
    $ret['statusCode'] = 102;
    $ret['statusText'] = 'Server Unreachable';
    $waiting = false;
    $installing = false;
    $started = false;
    require_once('./lib/appurify.inc.php');
    $appurify = new Appurify($test['appurify_key'], $test['appurify_secret']);
    $all_complete = true;
    $dirty = false;
    $ok = true;
    foreach ($test['appurify_tests'] as $index => &$run) {
      $completed = array_key_exists('completed', $run) ? $run['completed'] : false;
      if (!$completed) {
        if ($appurify->CheckTestRun($test, $run, $index, $testPath)) {
          if (array_key_exists('status', $run)) {
            if ($run['status'] == 'in_progress' ||
                $run['status'] == 'in-progress') {
              if (array_key_exists('detailed_status', $run) &&
                  $run['detailed_status'] == 'queueing')
                $waiting = true;
              elseif (array_key_exists('detailed_status', $run) &&
                  $run['detailed_status'] == 'installing')
                $installing = true;
              else
                $started = true;
            } else
              $waiting = true;
          }
          if (array_key_exists('completed', $run) && $run['completed']) {
            $completed = true;
            $dirty = true;
          }
        } else {
          $ok = false;
          break;
        }
      }
      if (!$completed)
        $all_complete = false;
    }
    if ($dirty)
      gz_file_put_contents("$testPath/testinfo.json", json_encode($test));
    if ($ok) {
      if ($all_complete) {
        $now = time();
        $test['completed'] = $now;
        gz_file_put_contents("$testPath/testinfo.json", json_encode($test));
        $ini = file_get_contents("$testPath/testinfo.ini");
        $date = gmdate("m/d/y G:i:s", $now);

        // update the completion time if it isn't already set
        if (!strpos($ini, 'completeTime')) {
            $complete = "[test]\r\ncompleteTime=$date";
            $out = str_replace('[test]', $complete, $ini);
            file_put_contents("$testPath/testinfo.ini", $out);
        }
        $ret['statusCode'] = 200;
        $ret['statusText'] = 'Test Complete';
        $ret['completeTime'] = $date;
        SendAsyncRequest("/work/postprocess.php?test=$id");
      } elseif ($started) {
        $ret['statusCode'] = 100;
        $ret['statusText'] = 'Running Test';
      } elseif ($installing) {
        $ret['statusCode'] = 100;
        $ret['statusText'] = 'Preparing Device';
      } elseif ($waiting) {
        $ret['statusCode'] = 101;
        $ret['statusText'] = 'Waiting for Available Device';
      }
    }
  }
  return $ret;
}

?>
