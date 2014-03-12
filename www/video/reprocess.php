<?php
chdir('..');
include 'common.inc';
require_once('video/avi2frames.inc.php');
set_time_limit(1200);
header ("Content-type: text/plain");

if (ValidateTestId($id)) {
  RestoreTest($id);
  $testPath = './' . GetTestPath($id);
  if (is_dir($testPath)) {
    $videoFiles = glob("$testPath/*.mp4");
    if ($videoFiles && is_array($videoFiles) && count($videoFiles)) {
      foreach($videoFiles as $video) {
        if (preg_match('/^.*\/(?P<run>[0-9])+(?P<cached>_Cached)?_video\.mp4$/i', $video, $matches)) {
          echo "Reprocessing $video...\n";
          $run = $matches['run'];
          $cached = array_key_exists('cached', $matches) ? 1 : 0;
          $videoDir = "$testPath/video_$run";
          if ($cached)
            $videoDir .= '_cached';
          delTree($videoDir, false);
          ProcessAVIVideo($id, $testPath, $run, $cached);
        }
      }
    } else {
      echo "No video files found";
    }
  } else {
    echo "Test not found";
  }
} else {
  echo "Invalid Test ID";
}
?>
