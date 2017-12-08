<?php
include 'common.inc';
$found = false;
if (ValidateTestId($id)) {
  $testPath = './' . GetTestPath($id);
  if (isset($_REQUEST['lighthouse']) && $_REQUEST['lighthouse']) {
    if (is_file("$testPath/lighthouse.log.gz")) {
      $found = true;
      header ("Content-type: text/plain");
      gz_readfile_chunked("$testPath/lighthouse.log.gz");
    }
  } elseif (is_file("$testPath/test.log")) {
    $found = true;
    header ("Content-type: text/plain");
    readfile("$testPath/test.log");
  }
}
if (!$found) {
  header("HTTP/1.0 404 Not Found");
}
?>
