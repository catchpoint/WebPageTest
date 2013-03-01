<?php
// Jobs that need to run every 15 minutes (expected that this will be called from cron)
chdir('..');
include 'common.inc';
set_time_limit(600);

// update the feeds
include('updateFeeds.php');
UpdateFeeds();
?>
