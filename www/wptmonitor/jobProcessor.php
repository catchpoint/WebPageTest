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
  checkTesterRatioAndEmailAlert();
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

  function checkTesterRatioAndEmailAlert(){
    logOutput('[INFO] [checkTesterRatioAndEmailAlert] ' );
    $configTable = Doctrine_Core::getTable('WPTMonitorConfig');
    $config = $configTable->find(1);
    $siteContactEmailAddress = $config['SiteContactEmailAddress'];
    // Check runrate to test ration and alert if necessary
    // Currently hard coded to alert if ration exceeds 40:1
    // TODO: Make configurable, or improve method of determining optimum run rate
    $locations = getLocationInformation();
    $message = "";
    foreach ($locations as $location){
      $runRate = $location['runRate'];
      $agentCount = $location['AgentCount'];
      $requiredAdditionalTesters = ($runRate / 40) - $agentCount;
      if ( $location['runRate'] ){
        if ( $location['AgentCount'] < 1 || ($location['runRate']/40 < $location['AgentCount'])){
            $message = "--------------------------------------------\n";
            $message .= "Runrate ratio insufficient for location: ".$location['id']."\n";
            $message .= "Runrate: ".$runRate."\n";
            $message .= "Testers: ".$agentCount."\n";
            if ($agentCount){
              $message .= "Ratio: ".$runRate/$agentCount."\n";
            } else {
              $message .= "Ratio: NO TESTERS SERVING THIS REGION\n";
            }
            $message .= "Target Ratio: 40\n";
            $message .= "Please add ".number_format($requiredAdditionalTesters,0)." additional agents for this location.";
        }
      }
    }
    if ($message){
      sendEmailAlert($siteContactEmailAddress, $message);
      logOutput('[ERROR] [checkTesterRatioAndEmailAlert] ' . $message );
      echo $message;
    }

  }
?>
 
