<?php
include 'common.inc'; 
$ok = false;
if (gz_is_file("$testPath/$run{$cachedText}_timeline.json")) {
  $ok = true;
  header("Content-disposition: attachment; filename=timeline.json");
  header ("Content-type: application/json");
  gz_readfile_chunked("$testPath/$run{$cachedText}_timeline.json");
} elseif (gz_is_file("$testPath/$run{$cachedText}_devtools.json")) {
  require_once('devtools.inc.php');
  $devTools = array();
  $startOffset = null;
  GetTimeline($testPath, $run, $cached, $devTools, $startOffset);
  if (isset($devTools) && is_array($devTools) && count($devTools)) {
    $timeline = array();
    // do a quick pass to see if we have non-timeline entries and
    // to get the timestamp of the first non-timeline entry
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
          echo "[\"WebPagetest\",\n";
        } else
          echo ",\n";
        echo json_encode($entry['params']['record']);
      }
    }
    if ($ok)
      echo "\n]";
  }
}
if (!$ok)
  header("HTTP/1.0 404 Not Found");
?>
