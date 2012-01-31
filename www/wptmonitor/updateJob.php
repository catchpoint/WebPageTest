<?php
  require("login/login.php");
  include 'monitor.inc';

  $userId = getCurrentUserId();
  $id = $_REQUEST['id'];
  if ($id){
    $folderId = getFolderIdFor($id, 'WPTJob');
  } else {
    $folderId = $_REQUEST['folderId'];  
  }

  if ($_REQUEST['active']) {
    $active = 1;
  } else {
    $active = 0;
  }
  $label = $_REQUEST['label'];
  $description = $_REQUEST['description'];
  $location = $_REQUEST['location'];
  $script = $_REQUEST['script'];
  $alerts = $_REQUEST['alerts'];
  $locations = $_REQUEST['locations'];
  // Extract host and location from $location field
  $hostloc = explode(" ", $location);

  $host = $hostloc[0];
  $location = $hostloc[1];

  $frequency = $_REQUEST['frequency'];
  $maxDownloadAttempts = $_REQUEST['maxdownloadattempts'];
  $numberOfRuns = $_REQUEST['numberofruns'];
  $runToUserForAverage = $_REQUEST['runtouseforaverage'];

  if ($runToUserForAverage > $numberOfRuns) {
    $smarty->assign('errorMessage', "Run to use for average must be equal to or less than number of runs.");
    $smarty->display('error.tpl');
    exit;
  }

  $video = $_REQUEST['video'];
  $firstviewonly = $_REQUEST['firstviewonly'];
  $downloadresultxml = $_REQUEST['downloadresultxml'];
  $downloaddetails = $_REQUEST['downloaddetails'];

  try
  {
    if ($id) {
      $q = Doctrine_Query::create()->from('WPTJob j')->where('j.Id= ?', $id);
      $wptJob = $q->fetchOne();
      $q->free(true);
    } else {
      $wptJob = new WPTJob();
      $wptJob['UserId'] = $userId;
      $wptJob->save();
      $id = $wptJob['Id'];
    }
    $wptJob['Active'] = $active;
    $wptJob['WPTJobFolderId'] = $folderId;
    $wptJob['Label'] = $label;
    $wptJob['Host'] = $host;
    $wptJob['Location'] = $location;
    $wptJob['Description'] = $description;
    $wptJob['WPTScriptId'] = $script;
    $wptJob['FirstViewOnly'] = $firstviewonly;
    $wptJob['Video'] = $video;
    $wptJob['DownloadResultXml'] = $downloadresultxml;
    $wptJob['DownloadDetails'] = $downloaddetails;
    $wptJob['MaxDownloadAttempts'] = $maxDownloadAttempts;
    $wptJob['Runs'] = $numberOfRuns;
    $wptJob['RunToUseForAverage'] = $runToUserForAverage;
    $wptJob['Frequency'] = $frequency;
    $wptJob['WPTBandwidthDown'] = $_REQUEST['bandwidthDown'];
    $wptJob['WPTBandwidthUp'] = $_REQUEST['bandwidthUp'];
    $wptJob['WPTBandwidthLatency'] = $_REQUEST['bandwidthLatency'];
    $wptJob['WPTBandwidthPacketLoss'] = $_REQUEST['bandwidthPacketLoss'];

    $wptJob->save();
    // Update Alerts
    // Remove old links
    $q = Doctrine_Query::create()->delete('WPTJob_Alert a')->where('a.WPTJobId= ?', $id);
    $jobAlerts = $q->execute();
    $q->free(true);
    // Add update links
    if ($alerts) {
      foreach ($alerts as $alert) {
        $link = new WPTJob_Alert();
        $link['WPTJobId'] = $id;
        $link['AlertId'] = $alert;
        $link->save();
      }
    }

    // Update Locations
    // Remove old links
    $q = Doctrine_Query::create()->delete('WPTJob_WPTLocation l')->where('l.WPTJobId= ?', $id);
    $jobLocations = $q->execute();
    $q->free(true);
    // Add update links
    if ($locations) {
      foreach ($locations as $loc) {
        $link = new WPTJob_WPTLocation();
        $link['WPTJobId'] = $id;
        $link['WPTLocationId'] = $loc;
        $link->save();
      }
    }
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while updating job: for " . $userId . " message: " . $e->getMessage());
  }
  header("Location: listJobs.php");
  exit;
?>