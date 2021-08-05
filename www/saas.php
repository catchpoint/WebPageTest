<?php
include 'common.inc';
require_once __DIR__ . '/include/JsonResultGenerator.php';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestResults.php';

$id = '210730_ZiDcAS_42fe0937de7cb7892c6175d1821c8d10';
$testPath = './' . GetTestPath($id);
$testInfo = TestInfo::fromFiles($testPath);
$testResults = TestResults::fromFiles($testInfo);
$infoFlags = array(JsonResultGenerator::WITHOUT_AVERAGE, JsonResultGenerator::WITHOUT_STDDEV, JsonResultGenerator::WITHOUT_MEDIAN, JsonResultGenerator::WITHOUT_REPEAT_VIEW);
$jsonResultGenerator = new JsonResultGenerator($testInfo, $urlStart, new FileHandler(), $infoFlags, FRIENDLY_URLS);
$test_json = $jsonResultGenerator->resultDataArray($testResults, $median_metric);
if (isset($test_json) && is_array($test_json)) {
    $txt = json_encode($test_json);
    ReportSaaSTest($test_json, '1182');
}