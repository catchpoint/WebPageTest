<?php
  require("login/login.php");
  include 'monitor.inc';  

  $jobId = $_REQUEST['job_id'];
  $resultId= $_REQUEST['result_id'];
  $forwardTo = $_REQUEST['forward_to'];
  $force = $_REQUEST['force'];
  $priority = $_REQUEST['priority'];
  if ( ! ($numberOfRuns = $_REQUEST['numberofruns'] ) ){
    $numberOfRuns = 1;
  }

  $userId = getCurrentUserId();
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