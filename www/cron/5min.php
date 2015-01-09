<?php
// Jobs that need to run every 5 minutes
chdir('..');
include 'common.inc';
ignore_user_abort(true);
set_time_limit(1200);
error_reporting(E_ALL);

$lock = Lock("cron-5", false, 1200);
if (!isset($lock))
  exit(0);

if (GetSetting('ec2'))
  CleanGetWork();

require_once('./ec2/ec2.inc.php');
if (GetSetting('ec2_key')) {
  EC2_TerminateIdleInstances();
  EC2_StartNeededInstances();
  EC2_DeleteOrphanedVolumes();
}

if (GetSetting('sbl_api_key'))
  SBL_Update();
  
/**
* Clean up extraneous getwork.php.xxx files that may be left behind
* from using wget in a cron job.  The server AMI was supposed to run wget
* silently but there have been reports of the files getting created
* 
*/
function CleanGetWork() {
  $files = glob('/var/www/getwork.php.*');
  foreach($files as $file) {
    if (is_file($file))
      unlink($file);
  }
}
?>
