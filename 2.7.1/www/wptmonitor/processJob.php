<?php
  require("login/login.php");
  include 'monitor.inc';  

  $force = false;
  $runLabel = "On Demand";
  $priority = "1";

  if (isset($_REQUEST['job_id']))
    $jobId = $_REQUEST['job_id'];

  if (isset($_REQUEST['result_id']))
    $resultId= $_REQUEST['result_id'];

  if (isset($_REQUEST['forward_to']))
    $forwardTo = $_REQUEST['forward_to'];

  if (isset($_REQUEST['force']))
    $force = $_REQUEST['force'];

  if (isset($_REQUEST['priority']))
    $priority = $_REQUEST['priority'];

  if ( !isset($_REQUEST['numberofruns'] )){
    $numberOfRuns = 1;
  } else {
    $numberOfRuns = $_REQUEST['numberofruns'];
  }

  $userId = getCurrentUserId();

if (isset($_REQUEST['runLabel']))
    $runLabel=$_REQUEST['runLabel'];

  if ( $jobId && $userId ){
    foreach($jobId as $jid){
      $runs = $numberOfRuns;
      while ( $runs > 0 ){
        processJobsForUser($userId,$jid,$force,$runLabel,$priority);
        $runs--;
      }
    }
  } else   if ( $resultId && $userId ){
   processResultsForAll($resultId);
  }
  header("Location: ".$forwardTo);

/* Make sure that code below does not get executed when we redirect. */
  exit;

?>