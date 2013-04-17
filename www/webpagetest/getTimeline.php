<?php
include 'common.inc';
$ok = false;
if (gz_is_file("$testPath/$run{$cachedText}_timeline.json")) {
  $ok = true;
  header("Content-disposition: attachment; filename=timeline.json");
  header ("Content-type: application/json");
  gz_readfile_chunked("$testPath/$run{$cachedText}_timeline.json");
} elseif (gz_is_file("$testPath/$run{$cachedText}_devtools.json")) {
  $devTools = json_decode(gz_file_get_contents("$testPath/$run{$cachedText}_devtools.json"), true);
  if (isset($devTools) && is_array($devTools) && count($devTools)) {
    $timeline = array();
    foreach ($devTools as &$entry) {
      if (isset($entry) &&
          is_array($entry) &&
          array_key_exists('method', $entry) &&
          $entry['method'] == 'Timeline.eventRecorded' &&
          array_key_exists('params', $entry) &&
          is_array($entry['params']) &&
          array_key_exists('record', $entry['params']) &&
          is_array($entry['params']['record']) &&
          count($entry['params']['record'])) {
        if (!$ok) {
          $ok = true;
          header("Content-disposition: attachment; filename=timeline.json");
          header ("Content-type: application/json");
          echo '[';
        } else
          echo ',';
        echo json_encode($entry['params']['record']);
      }
    }
    if ($ok)
      echo ']';
  }
}
if (!$ok)
  header("HTTP/1.0 404 Not Found");
?>
