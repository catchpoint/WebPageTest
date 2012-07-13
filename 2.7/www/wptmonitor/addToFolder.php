<?php
  require("login/login.php");
  include 'monitor.inc';
  $user_id = getCurrentUserId();
  try
  {
    $forwardTo = $_REQUEST['forwardTo'];
    $folderId = $_REQUEST['folderId'];
    $ids = $_REQUEST['id'];
    $folder = $_REQUEST['folder'];
    if ($folder != 'Alert' && $folder != 'ChangeNote'){
      $folderName = 'WPT';
    }
    $folderName .= $folder;
    $itemTableName = $folderName;
    $folderTableName = $folderName.'Folder';
    $folderTable = Doctrine_Core::getTable($folderTableName);

    if (!$folderTable->find($folderId)) {
      echo 'no such folder';
      exit;
    }
    $itemTable = Doctrine_Core::getTable($itemTableName);
    foreach ($ids as $id) {
      $item = $itemTable->find($id);
      if (!$item) {
        echo 'item not found';
        exit;
      }
      $item[$folderTableName . 'Id'] = $folderId;
      $item->save();
    }
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while adding item to folder. message: " . $e->getMessage());
    print 'Exception : ' . $e->getMessage();
  }

  header("Location: ".$forwardTo);
  exit;
?>