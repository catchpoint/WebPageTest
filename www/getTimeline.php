<?php
include 'common.inc'; 
$ok = false;
if (gz_is_file("$testPath/$run{$cachedText}_trace.json")) {
  $ok = true;
  header("Content-disposition: attachment; filename=timeline.json");
  header ("Content-type: application/json");
  
  // Trim off the beginning "traceEvents" object and the trailing }
  // and reduce the trace to just an array which is what the timeline
  // viewer expects
  $filename = "$testPath/$run{$cachedText}_trace.json";
  $buffer = '';
  $handle = gzopen("$filename.gz", 'rb');
  if ($handle === false)
      $handle = gzopen($filename, 'rb');
  if ($handle !== false) {
    $started = false;
    while (!gzeof($handle)) {
      echo $buffer;
      $buffer = gzread($handle, 1024 * 1024);  // 1MB at a time
      if (!$started) {
        $started = true;
        $pos = strpos($buffer, '[');
        if ($pos !== false)
          $buffer = substr($buffer, $pos);
      }
      ob_flush();
      flush();
    }
    echo rtrim($buffer, "\r\n}");
    gzclose($handle);
  }
} elseif (gz_is_file("$testPath/$run{$cachedText}_timeline.json")) {
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
