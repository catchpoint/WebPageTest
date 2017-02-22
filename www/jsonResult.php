<?php
// Do a really quick check for a pending test to significantly reduce overhead
if (isset($_REQUEST['noposition']) &&
    $_REQUEST['noposition'] &&
    isset($_REQUEST['test']) &&
    strpos($_REQUEST['test'], '_') == 6) {
  $base = __DIR__ . '/results';
  $parts = explode('_', $_REQUEST['test']);
  $dir = $parts[1];
  if( count($parts) > 2 && strlen($parts[2]))
    $dir .= '/' . $parts[2];
  $y = substr($parts[0], 0, 2);
  $m = substr($parts[0], 2, 2);
  $d = substr($parts[0], 4, 2);
  $pendingFile = "$base/$y/$m/$d/$dir/test.waiting";
  if (is_file($pendingFile)) {
    header("Content-type: application/json; charset=utf-8");
    header("Cache-Control: no-cache, must-revalidate");
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

    if( array_key_exists('callback', $_REQUEST) && strlen($_REQUEST['callback']) )
        echo "{$_REQUEST['callback']}(";
    echo "{\"statusCode\":101,\"statusText\":\"Test pending\",\"id\":\"{$_REQUEST['test']}\"";
    if (isset($_REQUEST['r']))
      echo ",\"requestId\":\"{$_REQUEST['r']}\"";
    echo "}";
    if( isset($_REQUEST['callback']) && strlen($_REQUEST['callback']) )
        echo ");";
    exit;
  }
}

require_once('common.inc');
require_once('page_data.inc');
require_once('testStatus.inc');
require_once('video/visualProgress.inc.php');
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
      $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
      $host  = $_SERVER['HTTP_HOST'];
      $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
      $urlStart = "$protocol://$host$uri";

      $testInfo = TestInfo::fromValues($id, $testPath, $test);
      $testResults = TestResults::fromFiles($testInfo);

      $infoFlags = getRequestInfoFlags();

      $jsonResultGenerator = new JsonResultGenerator($testInfo, $urlStart, new FileHandler(), $infoFlags, FRIENDLY_URLS);

      if (!empty($_REQUEST["multistepFormat"])) {
        $jsonResultGenerator->forceMultistepFormat(true);
      }

      if (defined("VER_WEBPAGETEST")) {
        $ret["webPagetestVersion"] = VER_WEBPAGETEST;
      }

      $ret['data'] = $jsonResultGenerator->resultDataArray($testResults, $median_metric);

      ArchiveApi($id);
    }

    json_response($ret);
}

function getRequestInfoFlags() {
  $getFlags = array(
    "average" => JsonResultGenerator::WITHOUT_AVERAGE,
    "standard" => JsonResultGenerator::WITHOUT_STDDEV,
    "median" => JsonResultGenerator::WITHOUT_MEDIAN,
    "runs" => JsonResultGenerator::WITHOUT_RUNS,
    "requests" => JsonResultGenerator::WITHOUT_REQUESTS,
    "console" => JsonResultGenerator::WITHOUT_CONSOLE
  );

  $infoFlags = array();
  foreach ($getFlags as $key => $flag) {
    if (isset($_GET[$key]) && $_GET[$key] == 0) {
      $infoFlags[] = $flag;
    }
  }
  if (!empty($_REQUEST["basic"])) {
    $infoFlags[] = JsonResultGenerator::BASIC_INFO_ONLY;
  }
  return $infoFlags;
}

?>
