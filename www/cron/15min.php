<?php
// Jobs that need to run every 15 minutes (expected that this will be called from cron)
chdir('..');
include 'common.inc';
set_time_limit(1200);
error_reporting(E_ALL);

// update the appurify devices if we have an API key configured
$locations = parse_ini_file('./settings/locations.ini', true);
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
