<?php
require("login/login.php");
include 'monitor.inc';
include_once 'graph_functions.inc';
date_default_timezone_set($_SESSION['ls_timezone']);

$jobIds = $_REQUEST['job_id'];
$smarty->assign('job_ids',$jobIds);
global $wptResultStatusCodes;
$startDateTime = time() - 86400;
$endDateTime = time()+3600;
$user_id = getCurrentUserId();
if ( !$percentile= $_REQUEST['percentile']){
  $percentile=1;
}
$trimAbove = $_REQUEST['trimAbove'];
$trimBelow = $_REQUEST['trimBelow'];
$smarty->assign('percentile',$percentile);
$smarty->assign('trimAbove',$trimAbove);
$smarty->assign('trimBelow',$trimBelow);

$resolution = $_REQUEST['resolution'];
$adjustUsing = $_REQUEST['adjustUsing'];
$useRepeatView = $_REQUEST['useRepeatView'];
if (!$showInactiveJobs = $_REQUEST['showInactiveJobs']){
  $showInactiveJobs = true;
}
$smarty->assign('showInactiveJobs',$showInactiveJobs);
$smarty->assign('useRepeatView',$useRepeatView);
$smarty->assign('adjustUsing',$adjustUsing);
if (!$ttfb = $_REQUEST['ttfb']) {  $ttfb = false; }
if (!$startRender = $_REQUEST['startRender']) {  $startRender = false;}
if (!$docLoaded = $_REQUEST['docLoaded']) {  $docLoaded = false;}
if (!$domTime = $_REQUEST['domTime']) {  $domTime = false;}
if (!$fullyTime = $_REQUEST['fullyTime']) {  $fullyTime = false;}
if (!$domTimeAdjusted = $_REQUEST['domTimeAdjusted']) {  $domTimeAdjusted = false;}

$options = array();
$options['ttfb'] = $ttfb;
$options['startRender'] = $startRender;
$options['docLoaded'] = $docLoaded;
$options['domTime'] = $domTime;
$options['fullyTime'] = $fullyTime;
$options['domTimeAdjusted'] = $domTimeAdjusted;

$startDT = gmmktime() - 86400;
$endDT= gmmktime();

if ($_REQUEST['startMonth']) {
  $startMonth = $_REQUEST['startMonth'];
  $startDay   = $_REQUEST['startDay'];
  $startYear  = $_REQUEST['startYear'];
  $startHour  = $_REQUEST['startHour'];
  $startDateTime = mktime($startHour, 0, 0, $startMonth, $startDay, $startYear);
  $startDT = $startDateTime;
}
//if ($endTime = $_REQUEST['endTime']){
//  $endDateTime = $endTime;
//} else
if ($_REQUEST['endMonth']) {
  $endMonth = $_REQUEST['endMonth'];
  $endDay   = $_REQUEST['endDay'];
  $endYear  = $_REQUEST['endYear'];
  $endHour  = $_REQUEST['endHour'];
  $endDateTime = mktime($endHour, 0, 0, $endMonth, $endDay, $endYear);
  $endDT = $endDateTime;
}
$smarty->assign('startTime', $startDT);
$smarty->assign('endTime', $endDT);
$smarty->assign('startDateTime', $startDateTime);
$smarty->assign('endDateTime', $endDateTime);

// Auto set resolution
if ( $resolution == 0 ){
  $resolution = ($endDateTime - $startDateTime)/80;
  $resval = $resolution/60;
  $inc = 'Minutes';
  if ($resolution > 86400){
    $resval = $resolution/86400;
    $inc = "Days";
  } else  if ( $resolution > 3600){
    $resval = $resolution/3600;
    $inc = "Hours";
  }
  $smarty->assign('resolutionAuto',($resval).' '.$inc);
}
$smarty->assign('resolution',$resolution);

try
{
  if ($showInactiveJobs){
    $q = Doctrine_Query::create()->select('j.Id, j.Label')
        ->from('WPTJob j')
        ->where('j.UserId = ?', $user_id)
        ->orderBy('j.Label');;
  } else{
    $q = Doctrine_Query::create()->select('j.Id, j.Label')
        ->from('WPTJob j')
        ->where('j.Active = true')
        ->andWhere('j.UserId = ?', $user_id)
        ->orderBy('j.Label');;
  }
  $jobs = $q->fetchArray();
  $q->free(true);
  $jobArray = array();

  foreach ($jobs as $j) {
    $i = $j['Id'];
    $l = $j['Label'];
    $jobArray[$i] = $l;
  }
  $smarty->assign('options', $options);
  $smarty->assign('jobs', $jobArray);
  $smarty->assign('wptResultURL', $wptResult);

  $job_results = array();
    // Add change note information
    $q = Doctrine_Query::create()->from('ChangeNote c')
        ->where('c.Public')
        ->andWhere('c.Date <= ?',$endDT)
        ->andWhere('c.Date >= ?', $startDT);
    $notes = $q->fetchArray();
    $q->free(true);
    $job_results['Change Notes']=$notes;

  if ( $jobIds ){
    foreach ($jobIds as $job_id){
      $q = Doctrine_Query::create()->from('WPTJob j')->where('j.UserId = ?', $user_id)->andWhere('j.Id = ?', $job_id);
      $job = $q->fetchOne();
      $q->free(true);
      $label = $job['Label'];
      $result = getGraphData($user_id, $job_id, $startDT, $endDT, $percentile, $trimAbove,$adjustUsing, $trimBelow);
      $job_results[$label]=$result;
    }

    $smarty->assign('job_results', $job_results);
  }
//    print_r($job_results);exit;
}
catch (Exception $e)
{
  error_log("[WPTMonitor] Failed while generating graph message: " . $e->getMessage());
}
$smarty->display('report/graphResults.tpl');


?>