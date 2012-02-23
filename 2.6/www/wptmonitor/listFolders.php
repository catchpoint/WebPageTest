<?php
  require("login/login.php");
  include 'monitor.inc';
  $user_id = getCurrentUserId();
  try
  {
    if (isset($_REQUEST['folder'])) {
      $folderName = $_REQUEST['folder'];
    }else{
      $folderName = "Job";
    }
    $jumpUrl = 'list' . $folderName . 's.php';
    $smarty->assign('jumpUrl', $jumpUrl);
    $itemTableName="";
    if ($folderName != "Alert" && $folderName != "ChangeNote") {
      $itemTableName = 'WPT';
    }

    $itemTableName .= $folderName;
    $smarty->assign('itemTableName', $itemTableName);

    $folderTableName = $itemTableName . 'Folder';
    $folderTable = Doctrine_Core::getTable($folderTableName);
    $action = "list";
    if (isset($_REQUEST['action'])){
      $action = $_REQUEST['action'];
    }
    if ( isset($_REQUEST['folderId'])){
      $folderId = $_REQUEST['folderId'];
    }

    $q = Doctrine_Query::create()
        ->select('f.Label, j.Label')
        ->from($folderTableName . ' f')
        ->leftJoin('f.' . $itemTableName . ' j');

    $treeObject = $folderTable->getTree();
    $treeObject->setBaseQuery($q);

    if ($action == 'delete') {
      $folder = $folderTable->find($folderId);
      // Check for items, can only delete empty folders
      if (sizeof($folder[$itemTableName]) > 0) {
        $_SESSION['ErrorMessagePopUp'] = "Can not delete folders that contain jobs. Please move or delete the items first";
      } else {
        $folder->getNode()->delete();
      }
    }
    $folderTree = $treeObject->fetchTree(array('root_id' => $user_id));

    $treeObject->resetBaseQuery();


    /**
     * Get the number shares associated with this folder
     */
    $shareCount = array();
    if ($folderTree) {
      foreach ($folderTree as $f) {
        $q = Doctrine_Query::create()->from('Share s')
            ->where('s.TheTableName = ?', $itemTableName)
            ->andWhere('s.TableItemId = ?', $f['id']);
        $shareCount[$f['id']] = $q->count();
      }
      $smarty->assign('shareCount', $shareCount);
      $smarty->assign('folderTree', $folderTree);
      $smarty->assign('folderName', $folderName);
    }
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while Listing job folders message: " . $e->getMessage());
    print 'Exception : ' . $e->getMessage();
  }
  $smarty->display('listFolders.tpl');
?>