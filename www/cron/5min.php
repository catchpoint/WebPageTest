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

  // Clear the user cache if we drop below 20% or 5MB available
if (function_exists("apcu_sma_info") && function_exists("apcu_clear_cache")) {
  $info = apcu_sma_info(true);
  if (isset($info['num_seg']) && isset($info['seg_size']) && isset($info['avail_mem'])) {
    $total = $info['seg_size'] * $info['num_seg'];
    $avail = $info['avail_mem'];
    if ($total > 0) {
      $pct = $avail / $total;
      if ($avail < 5000000 || $pct < 0.20) {
        apcu_clear_cache();
      }
    }
  }
} elseif (function_exists("apc_sma_info") && function_exists("apc_clear_cache")) {
  $info = apc_sma_info(true);
  if (isset($info['num_seg']) && isset($info['seg_size']) && isset($info['avail_mem'])) {
    $total = $info['seg_size'] * $info['num_seg'];
    $avail = $info['avail_mem'];
    if ($total > 0) {
      $pct = $avail / $total;
      if ($avail < 5000000 || $pct < 0.20) {
        apc_clear_cache("user");
        apc_clear_cache();
      }
    }
  }
}

if (GetSetting('ec2'))
  CleanGetWork();

require_once('./ec2/ec2.inc.php');
if (GetSetting('ec2_key')) {
  EC2_TerminateIdleInstances();
  EC2_StartNeededInstances();
}

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
