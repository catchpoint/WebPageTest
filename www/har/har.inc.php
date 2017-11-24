<?php

require_once __DIR__ . '/../page_data.inc';
require_once __DIR__ . '/../object_detail.inc';
require_once __DIR__ . '/../lib/json.php';
require_once __DIR__ . '/HttpArchiveGenerator.php';

/**
* Generate a HAR file for the given test
* 
* @param mixed $testPath
*/
function GenerateHAR($id, $testPath, $options) {

  global $median_metric;
  $json = '{}';

  if( isset($testPath) ) {
    $pageData = null;
    if (isset($options["run"]) && $options["run"]) {
      if (!strcasecmp($options["run"],'median')) {
        $raw = loadAllPageData($testPath);
        $run = GetMedianRun($raw, $options['cached'], $median_metric);
        unset($raw);
      } else {
        $run = intval($options["run"]);
      }
      if (!$run)
        $run = 1;
      $pageData[$run] = array();
      $testInfo = GetTestInfo($testPath);
      if( isset($options['cached']) ) {
        $pageData[$run][$options['cached']] = loadPageRunData($testPath, $run, $options['cached'], null, $testInfo);
        if (!isset($pageData[$run][$options['cached']]))
          unset($pageData);
      } else {
        $pageData[$run][0] = loadPageRunData($testPath, $run, 0, null, $testInfo);
        if (!isset($pageData[$run][0]))
          unset($pageData);
        $pageData[$run][1] = loadPageRunData($testPath, $run, 1, null, $testInfo);
      }
    }
    
    if (!isset($pageData))
      $pageData = loadAllPageData($testPath);

    // build up the array
    $archiveGenerator = new HttpArchiveGenerator($pageData, $id, $testPath, $options);
    $json = $archiveGenerator->generate();

  }
  
  return $json;
}

/**
 * Time intervals can be UNKNOWN_TIME or a non-negative number of milliseconds.
 * Intervals that are set to UNKNOWN_TIME represent events that did not happen,
 * so their duration is 0ms.
 *
 * @param type $value
 * @return int The duration of $value
 */
function durationOfInterval($value) {
  if ($value == UNKNOWN_TIME) {
    return 0;
  }
  return (int)$value;
}

  $lighthouse_log = "$testPath/lighthouse.log";
  if (gz_is_file($lighthouse_log)) {
    $log = gz_file_get_contents($lighthouse_log);
    if (isset($log) && strlen($log))
      $result['_lighthouse_log'] = $log;
  }  
?>
