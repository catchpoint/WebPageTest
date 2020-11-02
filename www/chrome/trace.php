<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
chdir('..');
include 'common.inc';
RestoreTest($id);
$token = GetSetting('trace_viewer_token', '');
if (strlen($token)) {
  header("Origin-Trial: $token");
}
if ($_REQUEST['run'] == 'lighthouse')
  $fileBase = 'lighthouse';
else{
  $stepSuffix = $step > 1 ? ("_" . $step) : "";
  $fileBase = "$run{$cachedText}{$stepSuffix}";
  $url = "../getgzip.php?test={$id}&file={$fileBase}_trace.json";
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
  if (isset($traceFile) && $traceFile !== false) {
    echo "<script>var url='{$url}';</script>"; 
  }
  readfile($conclusion);
} else {
  header("HTTP/1.0 404 Not Found");
}
?>
