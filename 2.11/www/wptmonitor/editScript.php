<?php
  require("login/login.php");
  include 'monitor.inc';
  if (isset($_REQUEST['id'])){
    $script_id = $_REQUEST['id'];
  }
  $user_id = getCurrentUserId();
  if (isset($script_id)){
    $folderId = getFolderIdFor($script_id,'WPTScript');
  } else {
    $folderId = $_REQUEST['folderId'];
  }

  if (!hasPermission('WPTScript',$folderId,PERMISSION_UPDATE)){
    echo "Invalid Permission";exit;
  }
  if ( isset($script_id) ){
    $q = Doctrine_Query::create()->from('WPTScript s')
        ->andWhere('s.Id= ?', $script_id);
    $script = $q->fetchOne();
    $q->free(true);
   } else {
    $script = new WPTScript();
  }
  $folderTree = getFolderTree($user_id,'WPTScript');
  $shares = getFolderShares($user_id,'WPTScript');
  $smarty->assign('folderTree',$folderTree);
  $smarty->assign('shares',$shares);

  $smarty->assign('folderId',$folderId);
  $smarty->assign('script',$script);
  $smarty->display('script/addScript.tpl');
?>