<?php
// Jobs that need to run every hour
chdir('..');
require_once('common.inc');
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

GitUpdate();
ApkUpdate();

Unlock($cron_lock);

if (GetSetting('cron_archive')) {
  chdir('./cli');
  include 'archive.php';
}

echo "Done\n";

/**
* Automatically update from the git master (if configured)
* 
*/
function GitUpdate() {
  if (GetSetting('gitUpdate')) {
    echo "Updating from GitHub...\n";
    echo shell_exec('git pull origin release');
  }
}

function ApkUpdate() {
  if (GetSetting('apkPackages')) {
    echo "Updating APKs from attached device...\n";
    include __DIR__ . '/apkUpdate.php';
  }
}

?>
