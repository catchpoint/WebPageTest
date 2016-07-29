<?php
include './settings.inc';

$results = array();
$errors = array();
$urlErrors = array();

$statsVer = 6;
$statusCounts = array();

// see if there is an existing test we are working with
if (LoadResults($results)) {
    // count the number of tests that don't have status yet
    $testCount = 0;
    foreach ($results as &$result) {
        if (array_key_exists('id', $result) && 
            strlen($result['id']) && 
            (!array_key_exists('statsVer', $result) ||
              $result['statsVer'] != $statsVer ||
             !array_key_exists('result', $result) ||
             !strlen($result['result'])))
            $testCount++;
    }
            
    if ($testCount) {
        echo "Updating the status for $testCount tests...\r\n";
        UpdateResults($results, $testCount);
    }
        
    // go through and provide a summary of the results
    $testCount = count($results);
    $failedSubmit = 0;
    $complete = 0;
    $stillTesting = 0;
    $failed = 0;
    $minRuns = ceil($runs / 2);
    foreach ($results as &$result) {
        if (array_key_exists('id', $result) && strlen($result['id'])) {
            if (array_key_exists('result', $result) && strlen($result['result'])) {
                $complete++;
                $result['resubmit'] = false;
                $stddev = 0;
                if (array_key_exists('docTime', $result) &&
                    array_key_exists('docTime.stddev', $result) &&
                    $result['docTime'] > 0)
                    $stddev = ($result['docTime.stddev'] / $result['docTime']) * 100;
                if (($result['result'] != 0 && $result['result'] != 99999 ) ||
                    !$result['bytesInDoc'] ||
                    !$result['docTime'] ||
                    !$result['TTFB'] ||
                    ($includeDCL && !$result['domContentLoadedEventStart']) ||
                    $result['successfulRuns'] < $minRuns ||
                    $result['TTFB'] > $result['docTime'] ||
                    $stddev > $maxVariancePct || // > 10% variation in results
                    (isset($maxBandwidth) && $maxBandwidth && (($result['bytesInDoc'] * 8) / $result['docTime']) > $maxBandwidth) ||
                    ($video && (!$result['SpeedIndex'] || !$result['render'] || !$result['visualComplete']))) {
                    if (!array_key_exists($result['label'], $errors))
                        $errors[$result['label']] = 1;
                    else
                        $errors[$result['label']]++;
                    if (!array_key_exists($result['url'], $urlErrors))
                        $urlErrors[$result['url']] = 1;
                    else
                        $urlErrors[$result['url']]++;
                    $failed++;
                    $result['resubmit'] = true;
                }
            } else {
                $stillTesting++;
            }
        } else {
            $failedSubmit++;
        }
    }
    
    if( $failed ) {
        echo "\r\n\r\nErrors by URL:\r\n";
        foreach ($urlErrors as $url => $count)
            echo "  $url: $count\r\n";
        echo "Errors by location:\r\n";
        foreach ($errors as $label => $count)
            echo "  $label: $count\r\n";
    }
    if (count($statusCounts)) {
      echo "\r\n\r\nTest Status Codes:\r\n";
      foreach ($statusCounts as $code => $count)
        echo "  $code: $count\r\n";
    }
    echo "\r\nUpdate complete (and the results are in results.txt):\r\n";
    echo "\t$testCount tests in total (each url across all locations)\r\n";
    echo "\t$complete tests have completed\r\n";
    if( $failedSubmit )
        echo "\t$failedSubmit were not submitted successfully and need to be re-submitted\r\n";
    if( $stillTesting )
        echo "\t$stillTesting are still waiting to be tested\r\n";
    if( $failed )
        echo "\t$failed returned an error while testing (page timeot, test error, etc)\r\n\r\n";

    StoreResults($results);
} else {
    echo "No tests found in results.txt\r\n";  
}

function IncrementStatus($code) {
  global $statusCounts;
  if (array_key_exists($code, $statusCounts))
    $statusCounts[$code]++;
  else
    $statusCounts[$code] = 1;
}

/**
* Go through and update the status of all of the tests
* 
* @param mixed $results
*/
function UpdateResults(&$results, $testCount) {
    global $server;
    global $statsVer;
    global $video;

    $count = 0;
    $changed = false;
    foreach ($results as &$result) {
        if (array_key_exists('id', $result) && 
            strlen($result['id']) && 
            (!array_key_exists('statsVer', $result) ||
             $result['statsVer'] != $statsVer ||
             !array_key_exists('result', $result) ||
             !strlen($result['result']))) {
            $count++;
            echo "\rUpdating the status of test $count of $testCount...                  ";

            //$url = "{$server}jsonResult.php?test={$result['id']}&medianRun=fastest";
            $url = "{$server}jsonResult.php?test={$result['id']}";
            if ($video)
              $url .= "&medianMetric=SpeedIndex";
            $response = http_fetch($url);
            if (strlen($response)) {
              $data = json_decode($response, true);
              unset($response);
              if (isset($data) &&
                  is_array($data) &&
                  array_key_exists('statusCode', $data)) {
                if (array_key_exists('data', $data) &&
                    is_array($data['data']) &&
                    $data['statusCode'] == 200) {
                  $changed = true;
                  GetTestResult($data['data'], $result);
                  $result['statsVer'] = $statsVer;
                } elseif ($data['statusCode'] >= 400) {
                  $changed = true;
                  $result['statsVer'] = $statsVer;
                  $result['result'] = -1;
                }
                IncrementStatus($data['statusCode']);
              } else
                IncrementStatus(-2);
              unset($data);
            } else
              IncrementStatus(-1);
        } else
          IncrementStatus(0);
    }

    // clear the progress text
    echo "\r                                                     \r";
}

/**
* Parse the results for the given test
* 
* @param mixed $result
*/
function GetTestResult(&$data, &$result) {
    global $metrics;
    if (array_key_exists('median', $data) && array_key_exists('firstView', $data['median'])) {
        $result['result'] = (int)$data['median']['firstView']['result'];
        $result['successfulRuns'] =(int)$data['successfulFVRuns'];
        if (array_key_exists('run', $data['median']['firstView']))
          $result['run'] = (int)$data['median']['firstView']['run'];
        foreach ($metrics as $metric) {
            if (array_key_exists($metric, $data['median']['firstView']))
              $result[$metric] = (int)$data['median']['firstView'][$metric];
            if (array_key_exists('standardDeviation', $data) &&
                is_array($data['standardDeviation']) &&
                array_key_exists('firstView', $data['standardDeviation']) &&
                is_array($data['standardDeviation']['firstView']) &&
                array_key_exists($metric, $data['standardDeviation']['firstView']))
                $result["$metric.stddev"] = (int)$data['standardDeviation']['firstView'][$metric];
            if ($metric == 'fontBytes' && isset($data['median']['firstView']['breakdown']['font']['bytes']))
                $result[$metric] = $data['median']['firstView']['breakdown']['font']['bytes'];
            if ($metric == 'fontRequests' && isset($data['median']['firstView']['breakdown']['font']['requests']))
                $result[$metric] = $data['median']['firstView']['breakdown']['font']['requests'];
        }
        
        if (array_key_exists('repeatView', $data['median'])) {
            $result['rv_result'] = (int)$data['median']['repeatView']['result'];
            if (array_key_exists('run', $data['median']['repeatView']))
              $result['rv_run'] = (int)$data['median']['repeatView']['run'];
            foreach ($metrics as $metric) {
                if (array_key_exists($metric, $data['median']['repeatView']))
                  $result["rv_$metric"] = (int)$data['median']['repeatView'][$metric];
                if (array_key_exists('standardDeviation', $data) &&
                    is_array($data['standardDeviation']) &&
                    array_key_exists('repeatView', $data['standardDeviation']) &&
                    is_array($data['standardDeviation']['repeatView']) &&
                    array_key_exists($metric, $data['standardDeviation']['repeatView']))
                    $result["rv_$metric.stddev"] = (int)$data['standardDeviation']['repeatView'][$metric];
                if ($metric == 'fontBytes' && isset($data['median']['repeatView']['breakdown']['font']['bytes']))
                    $result["rv_$metric"] = $data['median']['repeatView']['breakdown']['font']['bytes'];
                if ($metric == 'fontRequests' && isset($data['median']['repeatView']['breakdown']['font']['requests']))
                    $result["rv_$metric"] = $data['median']['repeatView']['breakdown']['font']['requests'];
            }
            $result['rv_successfulRuns'] =(int)$data['successfulRVRuns'];
        }
    } else
      $result['result'] = -1;
}

?>

