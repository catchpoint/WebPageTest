<?php
require("login/login.php");
include 'monitor.inc';
global $tableNameLabel;

if (isset($_REQUEST['tableName'])){
  $tableName = $_REQUEST['tableName'];
}else{
  $tableName="WPTJob";
}
$tableLabel = $tableNameLabel[$tableName];
//$folder = $_REQUEST['folder'];
if (isset($_REQUEST['folderId'])){
  $folderId = $_REQUEST['folderId'];
}else{
  $folderId=getRootFolderForUser(getCurrentUserId(),$tableName);
}
$folderTree = getFolderTree(getCurrentUserId(),$tableName);
$folderTable= Doctrine_Core::getTable($tableName.'Folder');
$folder = $folderTable->find($folderId);

$smarty->assign('folderTree',$folderTree);
$smarty->assign('tableNameLabel',$tableLabel);
$smarty->assign('tableName',$tableName);
$smarty->assign('folderId',$folderId);
$smarty->assign('folderName',$folder['Label']);
//echo $tableName.'<br>'.$folderId;exit;
try
{
  $userId = getCurrentUserId();
  $q = Doctrine_Query::create()->from('Share s')
      ->where('s.UserId = ?',$userId)
      ->andWhere('s.TheTableName =?', $tableName)
      ->andWhere('s.TableItemId = ?', $folderId);
  $result = $q->execute();
  $q->free(true);

  $smarty->assign('result', $result);
}
catch (Exception $e)
{
  error_log("[WPTMonitor] Failed while Listing Shares: " . $wptResultId . " message: " . $e->getMessage());
  echo $e->getMessage();
  exit;
}
$smarty->display('user/listShares.tpl');
?>

