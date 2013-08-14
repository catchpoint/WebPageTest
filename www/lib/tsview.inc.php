<?php
/**
* Upload a test result to a TSView instance
*/
function TSViewPostResult(&$test, $id, $testPath, $server, $tsview_name) {
  require_once('page_data.inc');

  $runs = $test['runs'];
  if (array_key_exists('discard', $test) &&
      $test['discard'] > 0 &&
      $test['discard'] <= $runs)
    $runs -= $test['discard'];
  if ($runs) {
    $pageData = loadAllPageData($testPath);
    $metrics = array('availability' => 1);
    $fv = array('availability' => array());
    if (!$test['fvonly'])
      $rv = array('availability' => array());
    for ($run = 1; $run <= $runs; $run++) {
      if (array_key_exists($run, $pageData)) {
        
        // collect the first-view data
        if (array_key_exists(0, $pageData[$run]) &&
            array_key_exists('result', $pageData[$run][0]) &&
            ($pageData[$run][0]['result'] == 0 ||
             $pageData[$run][0]['result'] == 99999)) {
          $fv['availability'][] = 1;
          foreach ($pageData[$run][0] as $metric => $value) {
            if (is_int($value) && $metric != 'result') {
              if (!array_key_exists($metric, $metrics))
                $metrics[$metric] = 1;
              if (!array_key_exists($metric, $fv))
                $fv[$metric] = array();
              $fv[$metric][] = $value;
            }
          }
        } else
          $fv['availability'][] = 0;
          
        // collect the repeat view data
        if (isset($rv)) {
          if (array_key_exists(1, $pageData[$run]) &&
              array_key_exists('result', $pageData[$run][1]) &&
              ($pageData[$run][1]['result'] == 0 ||
               $pageData[$run][1]['result'] == 99999)) {
            $rv['availability'][] = 1;
            foreach ($pageData[$run][1] as $metric => $value) {
              if (is_int($value) && $metric != 'result') {
                if (!array_key_exists($metric, $metrics))
                  $metrics[$metric] = 1;
                if (!array_key_exists($metric, $rv))
                  $rv[$metric] = array();
                $rv[$metric][] = $value;
              }
            }
          } else
            $rv['availability'][] = 0;
        }
      } else {
        $fv['availability'][] = 0;
        if (isset($rv))
          $rv['availability'][] = 0;
      }
    }
    
    TSViewCreate($server, $tsview_name, $metrics);
    TSViewPost($id, $server, $tsview_name, $fv);
    if (isset($rv))
      TSViewPost($id, $server, "{$tsview_name}-repeat-view", $rv);
  }
}

function TSViewCreate($server, $tsview_name, &$metrics) {
  $needs_update = false;
  if (!is_dir('./dat'))
    mkdir('./dat', 0777, true);
  $def = './dat/tsview-' . sha1($tsview_name) . '.json';
  if ($lock = fopen("$def.lock", 'w')) {
    if (flock($lock, LOCK_EX)) {
      if (is_file($def))
        $current = json_decode(file_get_contents($def), true);
      if (!isset($current) || !is_array($current))
        $current = array();
      foreach ($metrics as $metric => $x) {
        if (!array_key_exists($metric, $current)) {
          $needs_update = true;
          $current[$metric] = 1;
        }
      }
      if ($needs_update) {
        $data = array('names' => array());
        foreach ($current as $metric => $x)
          $data['names'][] = $metric;
        $body = json_encode($data);
        if (http_put_raw("$server$tsview_name", $body))
          file_put_contents($def, json_encode($current));
      }
      flock($lock, LOCK_UN);
    }
    fclose($lock);
  }
}

function TSViewPost($id, $server, $tsview_name, &$stats) {
  $host  = $_SERVER['HTTP_HOST'];
  $result_url = "http://$host/results.php?test=$id";
  $data = array('recordTimestamp' => time(),
                'points' => array(),
                'pointsDataType' => 'INT64',
                'configPairs' => array('result_url' => $result_url));
  foreach ($stats as $metric => $values) {
    $entry = array('name' => $metric, 'data' => array());
    foreach ($values as $value)
      $entry['data'][] = $value;
    $data['points'][] = $entry;
  }
  $body = json_encode($data);
  http_post_raw("$server$tsview_name", $body);
}
?>
