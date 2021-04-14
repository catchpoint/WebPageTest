<?php
include 'common.inc';
require_once('archive.inc');
header ("Content-type: text/plain");

$testId = $_REQUEST['test'];
if (ValidateTestId($testId)) {
    if (ArchiveTest($testId, true)) {
        echo "Test Archived";
    } else {
        echo "Failed to archive test";
    }
}