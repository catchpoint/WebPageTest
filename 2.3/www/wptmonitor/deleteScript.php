<?php
  require("login/login.php");
  include 'monitor.inc';
  include 'db_utils.inc';

  $id = $_REQUEST['id'];

  try
  {
    if ( $id ){
      // Check to see if any jobs are using this script and disallow delete
      $q = Doctrine_Query::create()->from('WPTJob j')->where('j.WPTScriptId= ?', $id);
      $jobs = $q->fetchOne();
      $q->free(true);

      if ( $jobs ){
        $smarty->assign('errorMessage',"Can not delete script while in use by a monitoring job.");
        $smarty->display('error.tpl');
        exit;
      } else {
        deleteRecord("WPTScript","Id",$id);
      }
    }
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while deleting script for ". $id." message: " . $e->getMessage());
  }
  unset($jobs);
  header("Location: listScripts.php");
?>