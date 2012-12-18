<?php
  require("login/login.php");
  include 'monitor.inc';
  $configTable = Doctrine_Core::getTable('WPTMonitorConfig');
  $config = $configTable->find(1);

  $smarty->assign('contactName',$config['SiteContact']);
  $smarty->assign('siteName',$config['SiteName']);
  $smarty->assign('contactEmail',$config['SiteContactEmailAddress']);
  $smarty->assign('message',$config['SiteHomePageMessage']);

  $smarty->display('index.tpl');
?>
 
