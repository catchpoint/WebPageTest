<?php
// Compare the end-state frames across multiple tests and report how similar they are.
// Only JSON responses are supported.
chdir('..');
include 'common.inc';
require_once('video/visualProgress.inc.php');
$result = array('statusCode' => 200, 'data' => array());
if (isset($_REQUEST['tests'])) {
  $tests = explode(',', $_REQUEST['tests']);
  $baseline = null;
  foreach($tests as $params) {
    if (preg_match('/(?P<id>[0-9a-zA-Z_]+)-r\:(?P<run>[0-9]+)/', $params, $matches)) {
      $test = $matches['id'];
      $run = $matches['run'];
      if (ValidateTestId($test)) {
        RestoreTest($test);
        $result['data'][$test] = -1;
        $histogram = GetLastFrameHistogram($test, $run);
        if (isset($histogram)) {
          if (isset($baseline)) {
            $result['data'][$test] = CompareHistograms($histogram, $baseline);
          } else {
            $result['data'][$test] = 100;
            $baseline = $histogram;
          }
        }
      }
    }
  }
}
json_response($result);

function GetLastFrameHistogram($test, $run) {
  $histogram = null;
  $testPath = GetTestPath($test);
  $videoPath = "./$testPath/video_$run";
  $files = glob("$videoPath/*.jpg");
  if ($files) {
    rsort($files);
    $lastFrame = $files[0];
    if (gz_is_file("$testPath/$run.0.histograms.json"))
      $histograms = json_decode(gz_file_get_contents("$testPath/$run.0.histograms.json"), true);
    $histogram = GetImageHistogram($lastFrame, null, $histograms);
  }
  return $histogram;
}

// Run a comparison similar to the Speed Index histograms but including all absolute differences
function CompareHistograms($hist1, $hist2) {
  $total = max(array_sum($hist1['r']) +
               array_sum($hist1['g']) +
               array_sum($hist1['b']), 
               array_sum($hist2['r']) +
               array_sum($hist2['g']) +
               array_sum($hist2['b']));

  // go through the histograms eliminating matches so all we have left are deltas
  $slop = 5;
  foreach($hist1 as $channel => &$counts) {
    for($bucket = 0; $bucket < 256; $bucket++) {
      $min = max(0, $bucket - $slop);
      $max = min(255, $bucket + $slop);
      for ($i = $min; $i <= $max; $i++) {
        $have = min($counts[$bucket], $hist2[$channel][$i]);
        $counts[$bucket] -= $have;
        $hist2[$channel][$i] -= $have;
      }
    }
  }

  $unmatched = min($total, (array_sum($hist1['r']) +
                            array_sum($hist1['g']) +
                            array_sum($hist1['b']) +
                            array_sum($hist2['r']) +
                            array_sum($hist2['g']) +
                            array_sum($hist2['b'])));
  $similarity = intval((($total - $unmatched) / $total) * 100);
  return $similarity;
}
?>
