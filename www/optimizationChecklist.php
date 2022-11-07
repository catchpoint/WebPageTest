<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
header("Content-type: image/png");
include __DIR__ . '/common.inc';
require_once INCLUDES_PATH . '/optimizationChecklist.inc';
require_once INCLUDES_PATH . '/include/TestInfo.php';
require_once INCLUDES_PATH . '/include/TestStepResult.php';

// not functional, but to declare what to expect from common.inc
global $testPath, $run, $cached, $step, $id, $url, $test;

$testInfo = TestInfo::fromFiles($testPath);
$testStepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);
$requests = $testStepResult->getRequests();

$im = drawChecklist($testStepResult->readableIdentifier($url), $requests, $testStepResult->getRawResults());

// spit the image out to the browser
imagepng($im);
imagedestroy($im);
