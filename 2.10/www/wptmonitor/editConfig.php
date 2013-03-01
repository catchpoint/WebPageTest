<?php
  require("login/login.php");
  include 'monitor.inc';
  displayErrorIfNotAdmin();
  $configTable = Doctrine_Core::getTable('WPTMonitorConfig');
  $config = $configTable->find(1);
  $smarty->assign('config',$config);
  $smarty->display('editConfig.tpl');
?>