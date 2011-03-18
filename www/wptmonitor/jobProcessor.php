<?php
/**
 * The job processor scans the jobs db to find any job that is active and due to be run.
 * It also scans the results directory to see if any results are pending and will poll the wpt server
 * to see if the results are ready. If they are the results are downloaded. The xmlResult file is downloaded and
 * optionally the additional assets can be downloaded if the job was configured to do so.
 */
include 'monitor.inc';
include 'alert_functions.inc';
  include 'wpt_functions.inc';
  require_once('bootstrap.php');
  $key = $_REQUEST['key'];
  $configKey = getWptConfigFor('jobProcessorKey');
  if ( $configKey != $key ){
    print "Invalid Key";
    exit;
  }

  try
  {
    $users = Doctrine_Core::getTable('User')->findAll();
    foreach ($users as $user) {
      if ($user->IsActive) {
        processJobsForUser($user['Id'],null,null,"Scheduled");
      }
    }
    // Process results for all
    processResultsForAll();

    $jobs = Doctrine_Core::getTable('WPTJob')->findAll();
    foreach($jobs as $job){
      processAlertsForJob($job['Id']);
    }

  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while Listing Users: " . $wptResultId . " message: " . $e->getMessage());
    logOutput('[ERROR] [jobProcessor] Exception : ' . $e->getMessage());
  }
?>
 
