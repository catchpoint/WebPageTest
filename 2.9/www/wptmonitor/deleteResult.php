<?php
  require("login/login.php");
  include 'monitor.inc';
  include 'db_utils.inc';
  $forwardTo = $_REQUEST['forward_to'];
  $result_id = $_REQUEST['result_id'];
  $result_ids = array();

  if ( !is_array($result_id) ){
    $result_ids[] = $result_id;
  } else {
    $result_ids = $result_id;
  }
  try
  {
    foreach( $result_ids as $id){
      if ( $id ){
        deleteRecord("WPTResult","Id",$id);
      }
    }
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while deleting result for ".$userId. " message: " . $e->getMessage());
  }
  unset($rows);
  header("Location: ".$forwardTo);
?>