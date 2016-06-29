<?php
require_once('common.inc');
require_once('page_data.inc');
require_once('testStatus.inc');
require_once('video/visualProgress.inc.php');
require_once('domains.inc');
require_once('breakdown.inc');
require_once('devtools.inc.php');
require_once('archive.inc');

require_once __DIR__ . '/include/JsonResultGenerator.php';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestResults.php';

if (array_key_exists('batch', $test['test']) && $test['test']['batch']) {
  $_REQUEST['f'] = 'json';
  include 'resultBatch.inc';
} else {
    $ret = array('data' => GetTestStatus($id));
    $ret['statusCode'] = $ret['data']['statusCode'];
    $ret['statusText'] = $ret['data']['statusText'];

    if ($ret['statusCode'] == 200) {
      $urlStart = "";
      $testInfo = TestInfo::fromValues($id, $testPath, $test);
      $testResults = TestResults::fromFiles($testInfo);

      $jsonResultGenerator = new JsonResultGenerator($testInfo, $urlStart);
      $ret['data'] = $jsonResultGenerator->resultDataArray($testResults, $median_metric);
    }

    json_response($ret);
}

?>
