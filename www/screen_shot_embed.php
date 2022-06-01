<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once __DIR__ . '/common.inc';
require_once __DIR__ . '/page_data.inc';
require_once __DIR__ . '/include/FileHandler.php';
require_once __DIR__ . '/include/TestPaths.php';
require_once __DIR__ . '/include/UrlGenerator.php';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestRunResults.php';

$fileHandler = new FileHandler();
$thisTestRunResults = TestRunResults::fromFiles($testInfo, ( isset($run) ? $run : 1), $cached, $fileHandler);

$userImages = true;

$testStepResult = $thisTestRunResults->getStepResult(1);
$localPaths = $testStepResult->createTestPaths();
$urlPaths = $testStepResult->createTestPaths(substr($testInfo->getRootDirectory(), 0));

$screenShotUrl = null;
if ($fileHandler->fileExists($localPaths->screenShotPngFile())) {
    $screenShotUrl = $urlPaths->screenShotPngFile();
} else if ($fileHandler->fileExists($localPaths->screenShotFile())) {
    $screenShotUrl = $urlPaths->screenShotFile();
}

if ($screenShotUrl) {
    echo '<img class="center result_screenshot" alt="Screenshot" src="/' . $screenShotUrl .'">';
}
?>
