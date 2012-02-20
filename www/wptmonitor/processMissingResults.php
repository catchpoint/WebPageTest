<?php
//  require("login/login.php");
  include 'monitor.inc';  
  include 'wpt_functions.inc';

//  $force = false;
//  $runLabel = "On Demand";
//  $priority = "1";
//
//  if (isset($_REQUEST['job_id']))
//    $jobId = $_REQUEST['job_id'];
//
//  if (isset($_REQUEST['result_id']))
//    $resultId= $_REQUEST['result_id'];
//
//  if (isset($_REQUEST['forward_to']))
//    $forwardTo = $_REQUEST['forward_to'];
//
//  if (isset($_REQUEST['force']))
//    $force = $_REQUEST['force'];
//
//  if (isset($_REQUEST['priority']))
//    $priority = $_REQUEST['priority'];
//
//  if ( !isset($_REQUEST['numberofruns'] )){
//    $numberOfRuns = 1;
//  } else {
//    $numberOfRuns = $_REQUEST['numberofruns'];
//  }
//
//  $userId = getCurrentUserId();
//
//if (isset($_REQUEST['runLabel']))
//    $runLabel=$_REQUEST['runLabel'];
//
//  if ( isset($resultId) && isset($userId) ){
//   processResultsForAll($resultId);
//  } else {
    $twoWeeksAgo = current_seconds() - 1209600;
//    // Try to reprocess all reslults with missing data
    $q = Doctrine_Query::create()->select('r.WPTResultId')->from( 'WPTResult r' )->where('AvgFirstViewFirstByte = ?',0)->andWhere('Date > ?', $twoWeeksAgo);
    $resultIds = $q->fetchArray();
    $q->free(true);
    foreach( $resultIds as $resultId){
      echo 'Processing: '.$resultId['WPTResultId'].'\n';
      processResultsForAll($resultId['WPTResultId']);
    }
    echo 'Completed';
//  }
//  header("Location: ".$forwardTo);

/* Make sure that code below does not get executed when we redirect. */
  exit;

?>