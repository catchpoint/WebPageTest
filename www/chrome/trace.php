<?php
chdir('..');
include 'common.inc';
RestoreTest($id);
if ($_REQUEST['run'] == 'lighthouse')
  $fileBase = 'lighthouse';
else{
  $stepSuffix = $step > 1 ? ("_" . $step) : "";
  $fileBase = "$run{$cachedText}{$stepSuffix}";
}
$traceFile = "$testPath/{$fileBase}_trace.json.gz";
if (!is_file($traceFile) && is_file("$testPath/{$fileBase}_trace.json")) {
  if (gz_compress("$testPath/{$fileBase}_trace.json")) {
    unlink("$testPath/{$fileBase}_trace.json");
  }
}
$preamble = __DIR__ . "/trace-viewer/preamble.html";
$conclusion = __DIR__ . "/trace-viewer/conclusion.html";
if (is_file($traceFile) && is_file($preamble) && is_file($conclusion)) {
  readfile($preamble);
  $trace = file_get_contents($traceFile);
  if (isset($trace) && $trace !== false) {
    $encoded = base64_encode($trace);
    unset($trace);
    echo $encoded;
  }
  readfile($conclusion);
} else {
  header("HTTP/1.0 404 Not Found");
}
?>
