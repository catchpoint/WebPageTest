<?php
// Jobs that need to run every 15 minutes
chdir('..');
include 'common.inc';
ignore_user_abort(true);
set_time_limit(1200);
error_reporting(E_ALL);

$lock = Lock("cron-15", false, 1200);
if (!isset($lock))
  exit(0);

// Update the safe browsing black list
SBL_Update();

// update the feeds
require_once('updateFeeds.php');
UpdateFeeds();
?>
