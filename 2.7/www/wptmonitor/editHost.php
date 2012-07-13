<?php
  require("login/login.php");
  include 'monitor.inc';
  displayErrorIfNotAdmin();
  $host_id = $_REQUEST['id'];
  $user_id = getCurrentUserId();

  if ( $host_id ){
    $q = Doctrine_Query::create()->from('WPTHost h')->where('h.Id= ?', $host_id);
    $host = $q->fetchOne();
    $q->free(true);
   } else {
    $host = new WPTHost();
  }

  $smarty->assign('host',$host);
  $smarty->display('host/addHost.tpl');
?>