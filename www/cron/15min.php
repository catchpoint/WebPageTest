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

// update the appurify devices if we have an API key configured
$locations = LoadLocationsIni();
foreach ($locations as $configuration) {
  if (is_array($configuration) &&
      array_key_exists('type', $configuration) &&
      stripos($configuration['type'], 'Appurify') !== false &&
      array_key_exists('key', $configuration) &&
      strlen($configuration['key']) &&
      array_key_exists('secret', $configuration) &&
      strlen($configuration['secret'])) {
    require_once('./lib/appurify.inc.php');
    $appurify = new Appurify($configuration['key'], $configuration['secret']);
    $appurify->GetDevices(true);
    $appurify->GetConnections(true);
    unset($appurify);
  }
}

// update the feeds
require_once('updateFeeds.php');
UpdateFeeds();
?>
