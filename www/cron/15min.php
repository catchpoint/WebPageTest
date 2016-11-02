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

header("Content-type: text/plain");
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

// Update the safe browsing black list
echo "Updating SBL\n";
SBL_Update();

// update the feeds
echo "Updating Feeds\n";
require_once('updateFeeds.php');
UpdateFeeds();
?>
