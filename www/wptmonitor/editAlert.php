<?php
  require("login/login.php");
  include 'monitor.inc';
  $alert_id = $_REQUEST['id'];
  $user_id = getCurrentUserId();
  $folderId = $_REQUEST['folderId'];
  
  if (!hasPermission('Alert',$folderId,PERMISSION_UPDATE)){
    echo "Invalid Permission";exit;
  }
  global $wptResultStatusCodes;

  if ( $alert_id ){
    $alertTable = Doctrine_Core::getTable('Alert');
    $result = $alertTable->find($alert_id);
   } else {
    $result = new Alert();
  }

  $folderTree = getFolderTree($user_id,'Alert');
  $shares = getFolderShares($user_id,'Alert');
  $smarty->assign('folderTree',$folderTree);
  $smarty->assign('shares',$shares);

  $smarty->assign('folderId',$folderId);
  $smarty->assign('alert',$result);
  $smarty->assign('wptResultStatusCodes',$wptResultStatusCodes);
  $smarty->display('alert/addAlert.tpl');
?>