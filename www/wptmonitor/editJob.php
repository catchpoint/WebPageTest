<?php
  require("login/login.php");
  include 'monitor.inc';

  $userId = getCurrentUserId();
  if ( isset($_REQUEST['id']) ){
    $jobId = $_REQUEST['id'];
    $ownerId = getOwnerIdFor($jobId, 'WPTJob');
    $currentJobCount = getUserJobCount($userId);
    $maxJobsPerMonth = getMaxJobsPerMonth($userId);
    $folderId = getFolderIdFor($jobId, 'WPTJob');
  } else {
    if ( isset($_REQUEST['folderId'])){
      $folderId = $_REQUEST['folderId'];
    } else {
      $folderId = getRootFolderForUser($userId,'WPTJob');
    }
  }

  if (!hasPermission('WPTJob', $folderId, PERMISSION_UPDATE)) {
    echo "Invalid Permission";
    exit;
  }
  // Folder shares for the Alerts
  $folderShares = getFolderShares($userId, 'Alert');
  $alertFolderIds = array();
  foreach ($folderShares as $key => $folderShare) {
    foreach ($folderShare as $k => $share) {
      $alertFolderIds[] = $k;
    }
  }
  // Scripts
  $folderShares = getFolderShares($userId, 'WPTScript');
  $scriptFolderIds = array();
  foreach ($folderShares as $key => $folderShare) {
    foreach ($folderShare as $k => $share) {
      $scriptFolderIds [] = $k;
    }
  }

  $wptLocations = getWptLocations();
  $wptLocs = array();
  foreach ($wptLocations as $loc) {
    $key = $loc['Location'];
    $wptLocs[$loc->WPTHost['HostURL'] . ' ' . $key] = $loc->WPTHost['HostURL'] . ' ' . $key;
  }

  if (isset($jobId)) {
    $q = Doctrine_Query::create()->from('WPTJob j')->where('j.Id= ?', $jobId);
    $result = $q->fetchOne();
    $q->free(true);
    $scriptId = $result['WPTScript']['Id'];
    $smarty->assign('selectedLocation', $result['Host'] . ' ' . $result['Location']);
  } else {
    $result = new WPTJob();
    $result['Frequency'] = 60;
    $smarty->assign('selectedLocation', '');
  }
  if (isset($scriptId)){
  $scriptFolderId  = getFolderIdFor($scriptId,'WPTScript');

  $canChangeScript = hasPermission('WPTScript',$scriptFolderId, PERMISSION_UPDATE);
  } else {
    $canChangeScript = true;
  }
  $smarty->assign('canChangeScript',$canChangeScript);

  if (!$result['WPTBandwidthDown'])
    $result['WPTBandwidthDown'] = 1500;
  if (!$result['WPTBandwidthUp'])
    $result['WPTBandwidthUp'] = 384;
  if (!$result['WPTBandwidthLatency'])
    $result['WPTBandwidthLatency'] = 50;
  if (!$result['WPTBandwidthPacketLoss'])
    $result['WPTBandwidthPacketLoss'] = 0;

  $q = Doctrine_Query::create()->from('WPTScript s')->orderBy('s.Label');
  if ($folderId > -1 && hasPermission('WPTScript', $folderId, PERMISSION_UPDATE)) {
    $q->andWhereIn('s.WPTScriptFolderId', $scriptFolderIds);
  } else {
    $q->andWhere('s.UserId = ?', $userId);
  }

  $scripts = $q->fetchArray();
  $q->free(true);
  $scriptArray = array();
  foreach ($scripts as $script) {
    $id = $script['Id'];
    $scriptArray[$id] = $script['Label'];
  }
  $q = Doctrine_Query::create()->from('Alert a')->orderBy('a.Label');

  if (!empty($alertFolderIds) && $folderId > -1 && hasPermission('Alert', $folderId, PERMISSION_UPDATE)) {
    $q->andWhereIn('a.AlertFolderId', $alertFolderIds);
  } else {
    $q->andWhere('a.UserId = ?', $userId);
  }
  $alerts = $q->fetchArray();
  $q->free(true);
  $alertArray = array();
  $alert = array();
  foreach ($alerts as $a) {
    $idx = $a['Id'];
    $alert['Id'] = $a['Id'];
    $alert['Label'] = $a['Label'];
    $alert['Active'] = $a['Active'];
    $alert['Selected'] = 0;
    $alertArray[$idx] = $alert;
  }

  $q = Doctrine_Query::create()->from('WPTJob_Alert a');
  if (isset($jobId)){
    $q->where('a.WPTJobId= ?', $jobId);
  }
  $selectedAlerts = $q->fetchArray();
  $q->free(true);
  foreach ($selectedAlerts as $selected) {
    $aid = $selected['AlertId'];
    if ($a = $alertArray[$aid]['Id']) {
      $alertArray[$aid]['Selected'] = 1;
    }
  }

  // Set vars for smarty
  if(!isset($maxJobsPerMonth)){
    $maxJobsPerMonth="";
  }
  if(!isset($currentJobCount)){
    $currentJobCount="";
  }
  if(!isset($ownerId)){
    $ownerId="";
  }
  $folderTree = getFolderTree($userId, 'WPTJob');
  $shares = getFolderShares($userId, 'WPTJob');
  $smarty->assign('folderTree', $folderTree);
  $smarty->assign('shares', $shares);
  $smarty->assign('folderId', $folderId);
  $smarty->assign('alerts', $alertArray);
  $smarty->assign('maxJobsPerMonth', $maxJobsPerMonth);
  $smarty->assign('currentJobCount', $currentJobCount);
  $smarty->assign('job', $result);
  $smarty->assign('ownerId', $ownerId);
  $smarty->assign('scripts', $scriptArray);
  $smarty->assign('wptLocations', $wptLocs);
  $smarty->display('job/addJob.tpl');
?>