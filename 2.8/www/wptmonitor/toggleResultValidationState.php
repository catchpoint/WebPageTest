<?php
  require("login/login.php");
  include 'monitor.inc';

  $result_id = $_REQUEST['result_id'];
  $state = $_REQUEST['state'];

  try
  {
    foreach ($result_id as $resultId){
      $q = Doctrine_Query::create()->from('WPTResult r')->where('r.Id = ?', $resultId);
      $res = $q->fetchOne();
      $q->free(true);

      if ( $res == null ){
        throw new Exception("Toggle result validation state Failed");
      }
      $res['ValidationState']=$state;
      $res->save();
    }
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while toggling result validation state for ".$resultId. " message: " . $e->getMessage());
  }

  header("Location: listResults.php");
/* Make sure that code below does not get executed when we redirect. */
  exit;
?>