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
            if(is_float($value))
              $value=intval($value);
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
              if(is_float($value))
                $value=intval($value);
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
 
    if (array_key_exists('tsview_configs', $test) ){
      $configs = explode(",",$test['tsview_configs']);   
    } else {
      $configs = array();
    }
    $results_host  = $test['tsview_results_host'];
 
    $spof="";
    if ($test['label'] == 'SPOF'){
      $spof="-SPOF";
    }
    $datasource="{$tsview_name}{$spof}";
  
    TSViewCreate($server, $datasource, $metrics);
    TSViewPost($id, $server, $datasource, $fv,$results_host);
    if (isset($rv)){
      TSViewCreate($server, "{$datasource}-repeat-view", $metrics);
      TSViewPost($id, $server, "{$datasource}-repeat-view", $rv,$results_host);
    }
  
  }
}

function TSViewCreate($server, $tsview_name, &$metrics) {
  $needs_update = false;
  if (!is_dir('./dat'))
    mkdir('./dat', 0777, true);
  $def = './dat/tsview-' . sha1($tsview_name) . '.json';
  $lock = Lock("TSView $tsview_name");
  if (isset($lock)) {
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
        $data['names'][] = str_replace('.','_',$metric);
      $body = json_encode($data);
      if (http_put_raw("$server$tsview_name", $body))
        file_put_contents($def, json_encode($current));
    }
    Unlock($lock);
  }
}

function TSViewPost($id, $server, $tsview_name, &$stats,$results_host) {
  $result_url = "$results_host/results.php?test=$id";
  $data = array('recordTimestamp' => round(microtime(true) * 1000),
                'points' => array(),
                'pointsDataType' => 'INT64',
                'configPairs' => array());
  foreach ($stats as $metric => $values) {
    $entry = array('name' => str_replace('.','_',$metric), 'data' => array());
    foreach ($values as $value)
      $entry['data'][] = $value;
    $data['points'][] = $entry;
  }

  $pairs = array();
  $pairs['result_url'] = $result_url;
  foreach($configs as $config){
    $pair = explode('>',$config);
    $pairs[$pair[0]] = $pair[1];
  }
  $data['configPairs'] = $pairs;

  $body = json_encode($data);
  http_post_raw("$server$tsview_name", $body);
}
?>
