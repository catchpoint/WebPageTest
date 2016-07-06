<?php
header ("Content-type: image/png");
include __DIR__ . '/common.inc';
require_once __DIR__ . '/optimizationChecklist.inc';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestStepResult.php';

// not functional, but to declare what to expect from common.inc
global $testPath, $run, $cached, $step, $id, $url, $test;

$testInfo = TestInfo::fromFiles($testPath);
$testStepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);
$requests = $testStepResult->getRequests();

$im = drawChecklist($testStepResult->readableIdentifier($url), $requests, $testStepResult->getRawResults());

// spit the image out to the browser
imagepng($im);
imagedestroy($im);
?>
