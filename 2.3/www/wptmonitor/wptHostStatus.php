<?php
  require("login/login.php");
  include_once 'monitor.inc';
  include_once 'utils.inc';
  $testers = getTestersInformation();
  $locations = getLocationInformation();
  $runRateInfo = getCurrentRunRateInfo();

  $smarty->assign('locations',$locations);
  $smarty->assign('testers',$testers);
  $smarty->assign('runRateInfo',$runRateInfo);
  $smarty->display('host/wptHostStatus.tpl');
?>