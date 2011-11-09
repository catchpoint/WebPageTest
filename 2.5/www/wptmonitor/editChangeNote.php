<?php
  require("login/login.php");
  include 'monitor.inc';

  $folderId = $_REQUEST['folderId'];

  if (!hasPermission('ChangeNote', $folderId, PERMISSION_UPDATE)) {
    echo "Invalid Permission";
    exit;
  }
  if (isset($_REQUEST['id'])) {
    $id = $_REQUEST['id'];
    $changeNoteTable = Doctrine_Core::getTable('ChangeNote');
    $changeNote = $changeNoteTable->find($id);
  } else {
    $changeNote = new ChangeNote();
  }

  $folderTree = getFolderTree(getCurrentUserId(), 'ChangeNote');
  $shares = getFolderShares(getCurrentUserId(), 'ChangeNote');
  $smarty->assign('folderTree', $folderTree);
  $smarty->assign('shares', $shares);

  $smarty->assign('folderId', $folderId);
  $smarty->assign('result', $changeNote);
  $smarty->display('changenote/addChangeNote.tpl');
?>