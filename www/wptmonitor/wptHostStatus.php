<?php
  require("login/login.php");
  include_once 'monitor.inc';
  include_once 'ec2_functions.inc';
  include_once 'utils.inc';
  $testers = getTestersInformation();
  $locations = getLocationInformation();
  $runRateInfo = getCurrentRunRateInfo();
  $cache = true;

  if ( isset($_REQUEST['cache'])){
    $cache = $_REQUEST['cache'];
    if ( $cache == "false" ){
      $cache = false;
    }
  }
  $ec2TesterStatus = getEC2TesterStatus($cache);

  foreach($testers as &$tester){
    foreach($tester['Agents'] as $key=>&$agent){
      $ec2 = (String) $agent['ec2'];
      if ( isset($ec2TesterStatus[$ec2])){
        $agent['ec2Status'] = $ec2TesterStatus[$ec2];
      }
    }
  }
  $lastEc2StatusCheck = getEC2TesterStatusLastCheckTime();

  $smarty->assign('lastEc2StatusCheck',$lastEc2StatusCheck);
  $smarty->assign('locations',$locations);
  $smarty->assign('testers',$testers);
  $smarty->assign('runRateInfo',$runRateInfo);
  $smarty->display('host/wptHostStatus.tpl');
?>