<?php
include 'common.inc';
header ("Content-type: application/json");
if (gz_is_file("$testPath/$run{$cachedText}_timeline.json")) {
  header("Content-disposition: attachment; filename=timeline.json");
  header ("Content-type: application/json");
  gz_readfile_chunked("$testPath/$run{$cachedText}_timeline.json");
} elseif (gz_is_file("$testPath/$run{$cachedText}_devtools.json")) {
  $devTools = json_decode(gz_file_get_contents("$testPath/$run{$cachedText}_devtools.json"), true);
  if (isset($devTools) && is_array($devTools) && count($devTools)) {
    $timeline = array();
    foreach ($devTools as $entry) {
      if (isset($entry) &&
          is_array($entry) &&
          array_key_exists('method', $entry) &&
          $entry['method'] == 'Timeline.eventRecorded' &&
          array_key_exists('params', $entry) &&
          is_array($entry['params']) &&
          array_key_exists('record', $entry['params']))
      $timeline[] = $entry['params']['record'];
    }
    if (count($timeline)) {
      header("Content-disposition: attachment; filename=timeline.json");
      header ("Content-type: application/json");
      echo json_encode($timeline);
    } else {
      header("HTTP/1.0 404 Not Found");
    }
  } else {
    header("HTTP/1.0 404 Not Found");
  }
} else {
  header("HTTP/1.0 404 Not Found");
}
?>
