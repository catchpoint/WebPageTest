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

// IE9 and IE9_wptdriver handle IE9, Chrome, and Firefox. Ignore duplicate entries
// As IE9 and IE9_wptdriver are reported separately.
$locs = array();
foreach( $locations as $key=>$loc){
  if ( stripos($key,"_wptdriver") ){
    $key = substr($key,0,stripos($key,"_wptdriver"))."'";
  }

  if (array_key_exists($key,$locs)){
    continue;
//    $locs[$key]["PendingTests"][0] += $loc["PendingTests"][0];
//    $locs[$key]["PendingTestsHighPriority"][0] += $loc["PendingTestsHighPriority"][0];
//    $locs[$key]["PendingTestsLowPriority"][0] += $loc["PendingTestsLowPriority"][0];
//    $locs[$key]["AgentCount"] += $loc["AgentCount"];

  } else {
    $locs[$key] = $loc;
  }
}

  $smarty->assign('lastEc2StatusCheck',$lastEc2StatusCheck);
  $smarty->assign('locations',$locs);
  $smarty->assign('testers',$testers);
  $smarty->assign('runRateInfo',$runRateInfo);
  $smarty->display('host/wptHostStatus.tpl');
?>