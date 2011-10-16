<?php
  require("login/login.php");
  include_once 'monitor.inc';


  if ( isset($_REQUEST['id']) ){
    $shareId = $_REQUEST['id'];
    $shareTable = Doctrine_Core::getTable('Share');
    $share = $shareTable->find($shareId);
   } else {

    $share = new Share();
    $share['TheTableName']=$_REQUEST['tableName'];
    $share['TableItemId']=$_REQUEST['folderId'];
  }
  $userTable= Doctrine_Core::getTable('User');
  $users = $userTable->findAll();
  foreach($users as $user){
    if ($user['Id'] == getCurrentUserId()){
      continue;
    }
    $u = $user['Id'];
    $userName[$u] = $user['Username'];
  }

  $folderTable= Doctrine_Core::getTable($share['TheTableName'].'Folder');
  $folder = $folderTable->find($share['TableItemId']);

  $smarty->assign('folderName',$folder['Label']);
  $smarty->assign('userName',$userName);
  $smarty->assign('share',$share);
  $smarty->display('user/addShare.tpl');
?>