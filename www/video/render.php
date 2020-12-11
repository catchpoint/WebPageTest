<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
chdir('..');
$settings = null;
require_once('video/render.inc.php');
ignore_user_abort(true);
set_time_limit(3600);
error_reporting(E_ERROR | E_PARSE);

if(extension_loaded('newrelic')) { 
  newrelic_background_job(true);
}

$max_load = GetSetting('render_max_load');
if ($max_load !== false && $max_load > 0)
  WaitForSystemLoad($max_load, 3600);

// Load the information about the video that needs rendering
$tests = null;
if (isset($_REQUEST['id'])) {
  $videoId = trim($_REQUEST['id']);
  $videoPath = './' . GetVideoPath($_REQUEST['id']);
  $videoFile = realpath($videoPath) . '/render.mp4';
  if (is_file($videoFile))
      unlink($videoFile);
  if (!is_file("$videoPath/video.ini")) {
    $optionsFile = "$videoPath/testinfo.json";
    if (gz_is_file($optionsFile)) {
      $tests = json_decode(gz_file_get_contents($optionsFile), true);
      if (isset($tests) && !is_array($tests))
        unset($tests);
    }
  }
}

// Render the video
if (isset($tests) && count($tests)) {
  $lock = Lock("video-$videoId", false, 600);
  if ($lock) {
    RenderVideo($tests, $videoFile);
    if (is_file($videoFile))
      rename($videoFile, "$videoPath/video.mp4");
    $ini = 'completed=' . gmdate('c') . "\r\n";
    file_put_contents("$videoPath/video.ini", $ini);
    Unlock($lock);
  }
  //ArchiveVideo($videoId);
}
?>
