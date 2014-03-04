<?php
include 'common.inc'; 
$ok = false;
if (gz_is_file("$testPath/$run{$cachedText}_devtools.json")) {
  require_once('devtools.inc.php');
  $devTools = array();
  $startOffset = null;
  GetTimeline($testPath, $run, $cached, $devTools, $startOffset);
  if (isset($devTools) && is_array($devTools) && count($devTools)) {
    // do a quick pass to see if we have non-timeline entries and
    // to get the timestamp of the first non-timeline entry
    foreach ($devTools as &$entry) {
      if (isset($entry) &&
          is_array($entry) &&
          array_key_exists('method', $entry) &&
          $entry['method'] != 'Timeline.eventRecorded') {
        if (!$ok) {
          $ok = true;
          header ("Content-type: application/json");
          echo "[\n";
        } else
          echo ",\n";
        echo json_encode($entry);
      }
    }
    if ($ok)
      echo "\n]";
  }
}
if (!$ok)
  header("HTTP/1.0 404 Not Found");
?>
