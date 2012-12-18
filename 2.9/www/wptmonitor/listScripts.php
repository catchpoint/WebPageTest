<?php
  require("login/login.php");
  include 'monitor.inc';
  include 'db_utils.inc';
  $user_id = getCurrentUserId();

  try
  {
    // Folder
    if (isset($_REQUEST['folderId'])){
      $folderId = $_REQUEST['folderId'];
      $_SESSION['scriptsFolderId'] = $folderId;
    }
    if (!isset($_SESSION['scriptsFolderId'])) {
      $_SESSION['scriptsFolderId'] = getRootFolderForUser($user_id, 'WPTScript');
    }
    $folderId = $_SESSION['scriptsFolderId'];

    $smarty->assign('folderId', $_SESSION['scriptsFolderId']);

    $folderTree = getFolderTree($user_id,'WPTScript');
    $smarty->assign('folderTree', $folderTree);

    // Handle scriptsFilter settings
    if (isset($_REQUEST['clearScriptsFilter'])) {
      unset($_SESSION['scriptsFilterField']);
      unset($_SESSION['scriptsFilterValue']);
    } else {
      if (isset($_REQUEST['scriptsFilterField']) && $scriptsFilterField = $_REQUEST['scriptsFilterField']) {
        $_SESSION['scriptsFilterField'] = $scriptsFilterField;
      }
      if (isset($_REQUEST['scriptsFilterValue']) && $scriptsFilterValue = $_REQUEST['scriptsFilterValue']) {
        $_SESSION['scriptsFilterValue'] = $scriptsFilterValue;
      }
    }
    if ( isset($_SESSION['scriptsFilterField']) ){
      $scriptsFilterField = $_SESSION['scriptsFilterField'];
      $scriptsFilterValue = $_SESSION['scriptsFilterValue'];
    } else {
      $scriptsFilterField = '';
      $scriptsFilterValue = '';
    }

    // Handle pager settings
    if (isset($_REQUEST['currentPage'])) {
      $_SESSION['scriptsCurrentPage'] = $_REQUEST['currentPage'];
    }
    if (!isset($_SESSION['scriptsCurrentPage'])) {
      $_SESSION['scriptsCurrentPage'] = 1;
    }
    $scriptsCurrentPage = $_SESSION['scriptsCurrentPage'];
//    fixRootFolder('WPTScript',$user_id);

    // Order by
    if (isset($_REQUEST['orderBy']) && ($orderBy = $_REQUEST['orderBy'])) {
      $_SESSION['orderScriptsBy'] = $orderBy;
    }
    if ( isset($_SESSION['orderScriptsBy'])){
      $orderBy = $_SESSION['orderScriptsBy'];
    } else {
      $orderBy = "s.Id";
    }
//    $orderBy = "s." . $orderBy;
    $smarty->assign('orderScriptsBy', $orderBy);

    $q = Doctrine_Query::create()->from('WPTScript s, s.WPTScriptFolder f')
//        ->where('s.UserId = ?', $user_id)
        ->orderBy($orderBy);

    if ($scriptsFilterField && $scriptsFilterValue) {
      $q->andWhere('s.' . $scriptsFilterField . ' LIKE ?', '%' . $scriptsFilterValue . '%');
    }
    if ($folderId > -1 && hasPermission('WPTScript',$folderId,PERMISSION_READ)) {
      $q->andWhere('s.WPTScriptFolderId = ?', $folderId);
    } else {
      $q->andWhere('s.UserId = ?', $user_id);
    }
    $pager = new Doctrine_Pager($q, $scriptsCurrentPage, $resultsPerPage);
    $result = $pager->execute();

    $shares = getFolderShares($user_id,'WPTScript');
    $smarty->assign('shares',$shares);

    $smarty->assign('scriptsFilterField', $scriptsFilterField);
    $smarty->assign('scriptsFilterValue', $scriptsFilterValue);
    $smarty->assign('scriptsCurrentPage', $scriptsCurrentPage);
    $smarty->assign('currentPage', $scriptsCurrentPage);
    $smarty->assign('maxpages', $pager->getLastPage());
    $smarty->assign('result', $result);
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while Listing scripts message: " . $e->getMessage());
    print 'Exception : ' . $e->getMessage();
  }
  unset($pager);
  unset($result);
  $smarty->display('script/listScripts.tpl');
?>

