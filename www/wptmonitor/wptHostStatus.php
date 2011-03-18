<?php
  require("login/login.php");
  include_once 'monitor.inc';
  include_once 'utils.inc';

  $locations = getLocationInformation();
  $smarty->assign('locations',$locations);
  $smarty->display('host/wptHostStatus.tpl');
?>