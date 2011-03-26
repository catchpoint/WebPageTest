<?php
  require("login/login.php");
  include_once 'monitor.inc';
  include_once 'utils.inc';

  $locations = getLocationInformation();
  $runRateInfo = getCurrentRunRateInfo();

  $smarty->assign('locations',$locations);
  $smarty->assign('runRateInfo',$runRateInfo);
  $smarty->display('host/wptHostStatus.tpl');
?>