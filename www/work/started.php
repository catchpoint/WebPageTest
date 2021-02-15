<?php
chdir('..');
require_once('common.inc');

header('Content-type: text/plain');
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

$testId   = isset($_REQUEST['id']) ? $_REQUEST['id'] : null;
if (ValidateTestId($testId)) {
    $testPath = './' . GetTestPath($testId);
    if (!file_exists("$testPath/test.running")) {
        touch("$testPath/test.running");
        logTestMsg($testId, "Starting test");
    }
    @unlink("$testPath/test.waiting");
    if (file_exists("$testPath/test.scheduled")) {
        @unlink("$testPath/test.scheduled");
    }
}
