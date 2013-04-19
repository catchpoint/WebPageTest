<?php
  require("login/login.php");
  include 'monitor.inc';

  displayErrorIfNotAdmin();

  $id = $_REQUEST['id'];
  $location = $_REQUEST['location'];
  $label = $_REQUEST['label'];
  $browser  = $_REQUEST['browser'];
  $host  = $_REQUEST['host'];
  $activeagents = $_REQUEST['activeagents'];
  $queuethreshold = $_REQUEST['queuethreshold'];
  $queuethresholdgreenlimit = $_REQUEST['queuethresholdgreenlimit'];
  $queuethresholdyellowlimit = $_REQUEST['queuethresholdyellowlimit'];
  $queuethresholdredlimit = $_REQUEST['queuethresholdredlimit'];
  if ( !$active= $_REQUEST['active'] ){
    $active = 0;
  }
  try
  {
    if ( $id ){
      $q = Doctrine_Query::create()->from('WPTLocation l')->where('l.Id= ?', $id);
      $result = $q->fetchOne();
      $q->free(true);
      if ( $result ){
        $wptLocation = $result;
      } else {
        //TODO: Passed in an Id, but didn't find it. Add error here.
      }
    }else {
      $wptLocation = new WPTLocation();
    }
    $wptLocation['Active'] = $active;
//    $wptLocation['WPTHostId']=$host;
//    $wptLocation['Label'] = $label;
//    $wptLocation['Browser'] = $browser;
    $wptLocation['ActiveAgents'] = $activeagents;
    $wptLocation['QueueThreshold'] = $queuethreshold;
    $wptLocation['QueueThresholdGreenLimit'] = $queuethresholdgreenlimit;
    $wptLocation['QueueThresholdYellowLimit'] = $queuethresholdyellowlimit;
    $wptLocation['QueueThresholdRedLimit'] = $queuethresholdredlimit;
//    $wptLocation['Location'] = $location;
    $wptLocation->save();

  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while updating location" . $e->getMessage());
  }
  header("Location: listLocations.php");
  exit;
?>
