<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
// Jobs that need to run every hour
chdir('..');
require_once('common.inc');
require_once(__DIR__ . '/../include/CrUX.php');
ignore_user_abort(true);
set_time_limit(3600);
error_reporting(E_ALL);

$cron_lock = Lock("cron-60", false, 3600);
if (!isset($cron_lock))
  exit(0);

header("Content-type: text/plain");
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
  
echo "Running hourly cron...\n";

require_once('./ec2/ec2.inc.php');
if (GetSetting('ec2_key')) {
  EC2_DeleteOrphanedVolumes();
}

PruneCruxCache();
PruneVideos();
ApkUpdate();

Unlock($cron_lock);

if (GetSetting('cron_archive')) {
  chdir('./cli');
  include 'archive.php';
}

echo "Done\n";

function ApkUpdate() {
  if (GetSetting('apkPackages')) {
    echo "Updating APKs from attached device...\n";
    include __DIR__ . '/apkUpdate.php';
  }
}

function PruneVideos() {
  // Delete any rendered videos that are older than a day (they will re-render automatically on access)
  $video_dir = realpath(__DIR__ . '/../work/video/');
  if (isset($video_dir) && strlen($video_dir)) {
    $files = glob("$video_dir/*.mp4*");
    $now = time();
    $seconds_in_a_day = 60 * 60 * 24;
    foreach ($files as $file) {
      $elapsed = $now - filemtime($file);
      if ($elapsed > $seconds_in_a_day) {
        unlink($file);
      }
    }
  }
}
?>
