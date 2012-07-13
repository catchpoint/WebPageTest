<?php
  require("login/login.php");
  include 'monitor.inc';
  $id = $_REQUEST['id'];
  displayErrorIfNotAdmin();

  if ( $id ){
    $q = Doctrine_Query::create()->from('WPTLocation l')->where('l.Id= ?', $id);
    $location = $q->fetchOne();
    $q->free(true);
   } else {
    $location = new WPTLocation();
  }
  $q = Doctrine_Query::create()->from('WPTHost h');
  $wpthosts = $q->fetchArray();
  $q->free(true);
  foreach($wpthosts as $host){
    $id = $host['Id'];
    $hosts[$id] = $host['Label'];
  }
  $smarty->assign('hosts',$hosts);
  $smarty->assign('location',$location);
  $smarty->display('host/addLocation.tpl');
?>