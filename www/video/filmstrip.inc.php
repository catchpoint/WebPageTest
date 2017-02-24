<?php

// Shared code for creating the visual filmstrips
require_once __DIR__ . '/visualProgress.inc.php';
require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/../include/TestResults.php';
require_once __DIR__ . '/../include/TestStepResult.php';

// build up the actual test data (needs to include testID and RUN in the requests)
$defaultInterval = 0;
$tests = array();
$fastest = null;
$ready = true;
$error = null;
$endTime = 'visual';
$supports60fps = false;
if( array_key_exists('end', $_REQUEST) && strlen($_REQUEST['end']) )
    $endTime = trim($_REQUEST['end']);

$compTests = explode(',', $_REQUEST['tests']);
foreach($compTests as $t) {
    $parts = explode('-', $t);
    if (count($parts) >= 1) {
        $test = array();
        $test['id'] = $parts[0];
        if (ValidateTestId($test['id'])) {
            $test['cached'] = 0;
            $test['step'] = 1;
            $test['end'] = $endTime;

            for ($i = 1; $i < count($parts); $i++) {
                $p = explode(':', $parts[$i]);
                if (count($p) >= 2) {
                    if( $p[0] == 'r' )
                        $test['run'] = (int)$p[1];
                    if( $p[0] == 'l' )
                        $test['label'] = preg_replace('/[^a-zA-Z0-9 \-_]/', '', $p[1]);
                    if( $p[0] == 'c' )
                        $test['cached'] = (int)$p[1];
                    if( $p[0] == 's')
                        $test['step'] = (int)$p[1];
                    if( $p[0] == 'e' )
                        $test['end'] = trim($p[1]);
                    if( $p[0] == 'i' )
                        $test['initial'] = intval(trim($p[1]) * 1000.0);
                }
            }

            RestoreTest($test['id']);
            $test['path'] = GetTestPath($test['id']);

            $test_median_metric = $median_metric;
            $info = GetTestInfo($test['id']);
            if ($info) {
                if (array_key_exists('discard', $info) &&
                    $info['discard'] >= 1 &&
                    array_key_exists('priority', $info) &&
                    $info['priority'] >= 1) {
                    $defaultInterval = 100;
                }
                $test['url'] = $info['url'];
                if (isset($info['medianMetric']))
                  $test_median_metric = $info['medianMetric'];
            }

            $testInfo = @parse_ini_file("./{$test['path']}/testinfo.ini",true);
            if (isset($testInfo) && is_array($testInfo)) {
                if (array_key_exists('test', $testInfo) && array_key_exists('location', $testInfo['test']))
                    $test['location'] = $testInfo['test']['location'];
                if (isset($testInfo['test']) && isset($testInfo['test']['completeTime'])) {
                    $test['done'] = true;
                    $testInfoObject = TestInfo::fromFiles("./" . $test['path']);

                    if( !array_key_exists('run', $test) || !$test['run'] ) {
                        $testResults = TestResults::fromFiles($testInfoObject);
                        $test['run'] = $testResults->getMedianRunNumber($test_median_metric, $test['cached']);
                        $runResults = $testResults->getRunResult($test['run'], $test['cached']);
                        $stepResult = $runResults->getStepResult($test['step']);
                    } else {
                        $stepResult = TestStepResult::fromFiles($testInfoObject, $test['run'], $test['cached'], $test['step']);
                    }
                    $test['stepResult'] = $stepResult;
                    $test['aft'] = (int) $stepResult->getMetric('aft');

                    $loadTime = $stepResult->getMetric('fullyLoaded');
                    if( isset($loadTime) && (!isset($fastest) || $loadTime < $fastest) )
                        $fastest = $loadTime;

                    // figure out the real end time (in ms)
                    if (isset($test['end'])) {
                        $visualComplete = $stepResult->getMetric("visualComplete");
                        if( !strcmp($test['end'], 'visual') && $visualComplete !== null ) {
                            $test['end'] = $visualComplete;
                        } elseif( !strcmp($test['end'], 'load') ) {
                            $test['end'] = $stepResult->getMetric('loadTime');
                        } elseif( !strcmp($test['end'], 'doc') ) {
                            $test['end'] = $stepResult->getMetric('docTime');
                        } elseif(!strncasecmp($test['end'], 'doc+', 4)) {
                            $test['end'] = $stepResult->getMetric('docTime') + (int)((double)substr($test['end'], 4) * 1000.0);
                        } elseif( !strcmp($test['end'], 'full') ) {
                            $test['end'] = 0;
                        } elseif( !strcmp($test['end'], 'all') ) {
                            $test['end'] = -1;
                        } elseif( !strcmp($test['end'], 'aft') ) {
                            $test['end'] = $test['aft'];
                            if( !$test['end'] )
                                $test['end'] = -1;
                        } else {
                            $test['end'] = (int)((double)$test['end'] * 1000.0);
                        }
                    } else {
                        $test['end'] = 0;
                    }
                    if( !$test['end'] )
                        $test['end'] = $stepResult->getMetric('fullyLoaded');
                } else {
                    $test['done'] = false;
                    $ready = false;

                    if( isset($testInfo['test']) && isset($testInfo['test']['startTime']) )
                        $test['started'] = true;
                    else
                        $test['started'] = false;
                }

                $tests[] = $test;
            }
        }
    }
}

$interval = 0;
if (array_key_exists('ival', $_REQUEST))
$interval = floatval($_REQUEST['ival']);
if( $interval <= 0 ) {
  if ($defaultInterval) {
    $interval = $defaultInterval;
  } else if( isset($fastest) ) {
    if( $fastest > 3000 )
      $interval = 500;
    else
      $interval = 100;
  } else
    $interval = 100;
}

$count = count($tests);
if( $count ) {
    setcookie('fs', urlencode($_REQUEST['tests']));
    setcookie('tid', $tests[0]['id']);
    $id = $tests[0]['id'];
    LoadTestData();
}
else
    $error = "No valid tests selected.";

if (array_key_exists('thumbSize', $_REQUEST) && is_numeric($_REQUEST['thumbSize']))
    $thumbSize = intval($_REQUEST['thumbSize']);
if( !isset($thumbSize) || $thumbSize < 50 || $thumbSize > 500 ) {
    if( $count > 6 )
        $thumbSize = 100;
    elseif( $count > 4 )
        $thumbSize = 150;
    else
        $thumbSize = 200;
}


/**
* Load information about each of the tests (particularly about the video frames)
*
*/
function LoadTestData() {
  global $tests;
  global $admin;
  global $supportsAuth;
  global $user;
  global $supports60fps;
  global $interval;

  $count = 0;
  foreach( $tests as &$test ) {
    $count++;
    $testInfo = null;
    $testPath = &$test['path'];
    if (!empty($test['stepResult'])) {
      $url = trim($test['stepResult']->getUrl());
      if (strlen($url))
        $test['url'] = $url;
    }
    
    // Round the end time up based on the selected interval
    if (isset($test['end']))
      $test['end'] = ceil($test['end'] / $interval) * $interval;

    if (array_key_exists('label', $test) && strlen($test['label'])) {
      $test['name'] = $test['label'];
    } else {
      $testInfo = GetTestInfo($test['id']);
      if ($testInfo && array_key_exists('label', $testInfo))
        $test['name'] = trim($testInfo['label']);
    }

    // See if we have an overridden test label in the sqlite DB
    $new_label = getLabel($test['id'], $user);
    if (!empty($new_label))
      $test['name'] = $new_label;

    if( !strlen($test['name']) ) {
      $test['name'] = $test['url'];
      $test['name'] = str_replace('http://', '', $test['name']);
      $test['name'] = str_replace('https://', '', $test['name']);
    }
    $test['index'] = $count;

    $localPaths = new TestPaths("./$testPath", $test["run"], $test["cached"], $test["step"]);
    $videoPath = $localPaths->videoDir();

    $test['video'] = array();
    if( is_dir($videoPath) ) {
      $test['video']['start'] = 20000;
      $test['video']['end'] = 0;
      $test['video']['frames'] = array();
      $test['video']['frame_progress'] = array();
      if (!empty($test["stepResult"]))
        $test['video']['progress'] = $test["stepResult"]->getVisualProgress();
      if (!empty($test['video']['progress']['frames'])) {
        foreach($test['video']['progress']['frames'] as $ms => $frame) {
          if (!$supports60fps && is_array($frame) && array_key_exists('file', $frame) && substr($frame['file'], 0, 3) == 'ms_')
            $supports60fps = true;
            
          if ((!$test['end'] || $test['end'] == -1 || $ms <= $test['end']) &&
              (!isset($test['initial']) || !count($test['video']['frames']) || $ms >= $test['initial']) ) {
            $path = "$videoPath/{$frame['file']}";
            if( $ms < $test['video']['start'] )
              $test['video']['start'] = $ms;
            if( $ms > $test['video']['end'] )
              $test['video']['end'] = $ms;
            // figure out the dimensions of the source image
            if( !array_key_exists('width', $test['video']) ||
                !$test['video']['width'] ||
                !array_key_exists('height', $test['video']) ||
                !$test['video']['height'] ) {
              $size = getimagesize($path);
              $test['video']['width'] = $size[0];
              $test['video']['height'] = $size[1];
            }
            $test['video']['frames'][$ms] = $frame['file'];
            $test['video']['frame_progress'][$ms] = $frame['progress'];
          }
        }
        if ($test['end'] == -1)
          $test['end'] = $test['video']['end'];
        elseif ($test['end'])
          $test['video']['end'] = $test['end'];
      }
      if( !isset($test['video']['frames'][0]) ) {
        $test['video']['frames'][0] = $test['video']['frames'][$test['video']['start']]['file'];
        $test['video']['frame_progress'][0] = $test['video']['frames'][$test['video']['start']]['progress'];
      }
    }
  }
}
?>
