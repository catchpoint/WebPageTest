<?php
  require("login/login.php");
  include_once 'monitor.inc';
  include_once 'ec2_functions.inc';
  include_once 'utils.inc';
  $testers = getTestersInformation();
  $locations = getLocationInformation();
  $runRateInfo = getCurrentRunRateInfo();
//  $ec2TesterStatus = getEC2TesterStatus();

  $smarty->assign('locations',$locations);
  $smarty->assign('testers',$testers);
  $smarty->assign('runRateInfo',$runRateInfo);
  $smarty->display('host/wptHostStatus.tpl');
?>