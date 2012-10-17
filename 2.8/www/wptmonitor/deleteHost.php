<?php
  require("login/login.php");
  include 'monitor.inc';
  include 'db_utils.inc';
  $id = $_REQUEST['id'];
  displayErrorIfNotAdmin();

  try
  {
    if ( $id ){
      // Check to see if any jobs are using this script and disallow delete
      $q = Doctrine_Query::create()->from('WPTLocation l')->where('l.WPTHostId= ?', $id);
      $location = $q->fetchOne();
      $q->free(true);

      if ( $location ){
        $smarty->assign('errorMessage',"Can not delete host while in use by a wpt location.");
        $smarty->display('error.tpl');
        exit;
      } else {
        deleteRecord("WPTHost","Id",$id);
      }
    }
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while deleting host for ". $id." message: " . $e->getMessage());
  }
  unset($location);
  header("Location: listHosts.php");
?>