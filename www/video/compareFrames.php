<?php
// Compare the end-state frames across multiple tests and report how similar they are.
// Only JSON responses are supported.
chdir('..');
include 'common_lib.inc';
require_once('video/visualProgress.inc.php');
$result = array('statusCode' => 200, 'data' => array());
if (isset($_REQUEST['tests'])) {
  $tests = explode(',', $_REQUEST['tests']);
  $blank = array('r' => array(), 'g' => array(), 'b' => array());
  foreach($blank as &$channel) {
    for($i = 0; $i < 256; $i++)
      $channel[$i] = 0;
  }
  $histograms = array();
  foreach($tests as $params) {
    if (preg_match('/(?P<id>[0-9a-zA-Z_]+)-r\:(?P<run>[0-9]+)/', $params, $matches)) {
      $test = $matches['id'];
      $run = $matches['run'];
      if (ValidateTestId($test)) {
        RestoreTest($test);
        $result['data'][$test] = -1;
        $histograms[$test] = GetLastFrameHistogram($test, $run);
      }
    }
  }
  if (count($histograms)) {
    // find the histogram with the most pixels and use that as the baseline
    $baseline = null;
    $baseline_pixels = 0;
    foreach($histograms as $test => &$histogram) {
      $count = array_sum($histogram['r']) + array_sum($histogram['g']) + array_sum($histogram['b']);
      if (!isset($baseline) || $count > $baseline_pixels)
        $baseline = $test;
    }
    if (isset($baseline)) {
      foreach($histograms as $test => &$histogram) {
        if ($test == $baseline)
          $result['data'][$test] = 100;
        else
          $result['data'][$test] = CalculateFrameProgress($histogram, $blank, $histograms[$baseline], 5);
      }
    }
  }
}
json_response($result);

function GetLastFrameHistogram($test, $run) {
  $histogram = null;
  $videoPath = './' . GetTestPath($test) . "/video_$run";
  $files = glob("$videoPath/*.jpg");
  if ($files) {
    rsort($files);
    $lastFrame = $files[0];
    $histogram = GetImageHistogram($lastFrame);
  }
  return $histogram;
}
?>
