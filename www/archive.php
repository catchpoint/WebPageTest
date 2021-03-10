<?php
include 'common.inc';
include 'archive.inc';
header ("Content-type: text/plain");

$testId = $_REQUEST['test'];
if (ValidateTestId($testId)) {
    if (ArchiveTest($testId, true, true)) {
        echo "Test Archived";
    } else {
        echo "Failed to archive test";
    }
}