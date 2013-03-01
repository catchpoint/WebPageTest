<?php
  require("login/login.php");
  include 'monitor.inc';

  displayErrorIfNotAdmin();

  if ( !$enableregistration = $_REQUEST['enableregistration'] ){
    $enableregistration = 0;
  }
  $key = $_REQUEST['jobprocessorkey'];
  $defaultJobsPerMonth = $_REQUEST['defaultjobspermonth'];

  try
  {
    $configTable = Doctrine_Core::getTable('WPTMonitorConfig');
    $config = $configTable->find(1);
    $config['EnableRegistration'] = $enableregistration;
    $config['JobProcessorAuthenticationKey'] = $key;
    $config['DefaultJobsPerMonth'] = $defaultJobsPerMonth;
    $config['SiteName'] = $_REQUEST['siteName'];
    $config['SiteContact'] = $_REQUEST['siteContact'];
    $config['SiteContactEmailAddress'] = $_REQUEST['siteContactEmailAddress'];
    $config['SiteHomePageMessage'] = $_REQUEST['siteHomePageMessage'];
    $config['SiteAlertFromName'] = $_REQUEST['siteAlertFromName'];
    $config['SiteAlertFromEmailAddress'] = $_REQUEST['siteAlertFromEmailAddress'];
    $config['SiteAlertMessage'] = $_REQUEST['siteAlertMessage'];
    $config->save();
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while updating user: ".$id. " message: " . $e->getMessage());
  }
  header("Location: editConfig.php");
  exit;
?>