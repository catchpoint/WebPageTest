<?php
include 'common.inc';
$found = false;
if (ValidateTestId($id)) {
  $testPath = './' . GetTestPath($id);
  if (is_file("$testPath/test.log")) {
    header ("Content-type: text/plain");
    readfile("$testPath/test.log");
  }
}
if (!$found) {
  header("HTTP/1.0 404 Not Found");
}
?>
