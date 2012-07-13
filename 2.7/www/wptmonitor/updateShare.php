<?php
  require("login/login.php");
  include 'monitor.inc';

  $folderId = $_REQUEST['tableItemId'];
  $tableName = $_REQUEST['tableName'];

  $shareId = $_REQUEST['id'];

  if ( !$_REQUEST['active'] ){
    $active = false;
  } else {
    $active = true;
  }

  try
  {
    if ( $shareId ){
      $shareTable = Doctrine_Core::getTable('Share');
      $share = $shareTable->find($shareId);
    }
    if ( !$share ){
      $share = new Share();
    }
    $share['Active']          =$active;
    $share['UserId']          =getCurrentUserId();
    $share['ShareWithUserId'] =$_REQUEST['shareWithUserId'];
    $share['TheTableName']       =$_REQUEST['tableName'];
    $share['TableItemId']     =$_REQUEST['tableItemId'];
    $share['Permissions']      =$_REQUEST['permissions'];

    $share->save();
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while updating share: ".$id. " message: " . $e->getMessage());
    echo $e->getMessage();
    exit;
  }
  header("Location: listShares.php?folderId=".$folderId."&folder=".$folder."&tableName=".$tableName);
  exit;
?>
