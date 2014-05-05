<?php
chdir('..');
include 'common.inc';
require_once('video/avi2frames.inc.php');
require_once('archive.inc');
set_time_limit(1200);
header ("Content-type: text/plain");

if (ValidateTestId($id)) {
  RestoreTest($id);
  ReprocessVideo($id);
  // If the test was already archived, re-archive it.
  $testInfo = GetTestInfo($id);
  if (array_key_exists('archived', $testInfo) && $testInfo['archived']) {
    $lock = LockTest($id);
    if (isset($lock)) {
      $testInfo = GetTestInfo($id);
      $testInfo['archived'] = false;
      SaveTestInfo($id, $testInfo);
      UnlockTest($lock);
    }
    ArchiveTest($id);
  }
  echo "Done";
} else {
  echo "Invalid Test ID";
}
?>
