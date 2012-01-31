<?php
  require("login/login.php");
  include 'monitor.inc';
  include_once 'utils.inc';
  include_once 'db_utils.inc';
  $user_id = getCurrentUserId();

  try
  {
    // Handle filter settings
    if ( isset($_REQUEST['clearFilter'] )){
      unset($_SESSION['jobsFilterField']);
      unset($_SESSION['jobsFilterValue']);
//      unset($_SESSION['jobsFolderId']);
    } else {
      if (isset($_REQUEST['filterField']) && $jobsFilterField = $_REQUEST['filterField'] ){
       $_SESSION['jobsFilterField']=$jobsFilterField;
      }
      if ( isset($_REQUEST['filterValue']) && $jobsFilterValue = $_REQUEST['filterValue'] ){
        $_SESSION['jobsFilterValue'] = $jobsFilterValue;
      }
    }
    if ( isset($_SESSION['jobsFilterField']) && isset($_SESSION['jobsFilterValue'])){
      $jobsFilterField = $_SESSION['jobsFilterField'];
      $jobsFilterValue = $_SESSION['jobsFilterValue'];
    }

    // Handle pager settings
    if (isset($_REQUEST['currentPage'])) {
      $_SESSION['jobsCurrentPage'] = $_REQUEST['currentPage'];
    }
    if (!isset($_SESSION['jobsCurrentPage'])){
      $_SESSION['jobsCurrentPage'] = 1;
    }
    $jobsCurrentPage = $_SESSION['jobsCurrentPage'];
    // Show inactive jobs
    if ( isset($_REQUEST['showInactiveJobs']) ) {
      if ( $_REQUEST['showInactiveJobs'] == 1 || $_REQUEST['showInactiveJobs'] == "true"){
        $_SESSION['showInactiveJobs'] = true;
      } else {
        $_SESSION['showInactiveJobs'] = false;
      }
     } else if ( !isset($_SESSION['showInactiveJobs'] ) ){
      $_SESSION['showInactiveJobs'] = true;
    }
    $showInactiveJobs = $_SESSION['showInactiveJobs'];
    // Folder
    if ( isset($_REQUEST['folderId']) && ($folderId = $_REQUEST['folderId']) ){
      $_SESSION['jobsFolderId'] = $folderId;
    }
    if (!isset($_SESSION['jobsFolderId'])){
      $_SESSION['jobsFolderId'] = getRootFolderForUser($user_id,'WPTJob');
    }
    $folderId = $_SESSION['jobsFolderId'];
    $smarty->assign('folderId',$_SESSION['jobsFolderId']);


    // Order by direction
    if ( isset($_REQUEST['orderByDir'] ) && ($orderByDir = $_REQUEST['orderByDir'] ) ){
      $_SESSION['orderJobsByDirection'] = $orderByDir;
    }
    if (!isset($_SESSION['orderJobsByDirection'])){
      $_SESSION['orderJobsByDirection'] = "ASC";
    }

    if ($_SESSION['orderJobsByDirection'] == "ASC"){
      $orderByDirInv = "DESC";
    } else {
      $orderByDirInv = "ASC";
    }

    // Order by
    if ( isset($_REQUEST['orderBy']) && ($orderBy = $_REQUEST['orderBy'] ) )
    {
      $_SESSION['orderJobsBy'] = $orderBy;
    }
    if (!isset($_SESSION['orderJobsBy'])){
      $_SESSION['orderJobsBy'] = "Id";
    }
    // Upgrade path fix
    // ALL JOBS MUST AT LEAST BE IN ROOT FOLDER
//    fixRootFolder('WPTJob',$user_id);

    $smarty->assign('orderJobsByDirection',$_SESSION['orderJobsByDirection']);
    $smarty->assign('orderJobsByDirectionInv',$orderByDirInv);
    $smarty->assign('orderJobsBy',$_SESSION['orderJobsBy']);

    $orderJobsBy = "j.".$_SESSION['orderJobsBy'].' '.$_SESSION['orderJobsByDirection'];

    $selectFields = 'j.Active, j.Id, j.Label, x.Label j.Frequency, j.LastRun, a.Id, COUNT(r.Id) AS ResultCount, f.Label';

    $q = Doctrine_Query::create()->select($selectFields)->from('WPTJob j, j.WPTResult r, j.WPTJob_WPTLocation l, l.WPTLocation x')
                                ->orderBy($orderJobsBy)
                                ->groupBy('j.Id');


    if ( !$showInactiveJobs ){
      $q->andWhere('j.Active = ?', true);
    }
    if ( isset($jobsFilterField) && isset($jobsFilterValue) ){
      $q->andWhere('j.'.$jobsFilterField.' LIKE ?', '%'.$jobsFilterValue.'%');
    }

    if ( $folderId > -1 && hasPermission('WPTJob',$folderId,PERMISSION_READ)){
      $q->andWhere('j.WPTJobFolderId = ?', $folderId);
    } else {
      $q->andWhere('j.UserId = ?',$user_id);
    }

      $pager = new Doctrine_Pager($q, $jobsCurrentPage, $resultsPerPage);
      $result = $pager->execute();

      $folderTree = getFolderTree($user_id,'WPTJob');
      $shares = getFolderShares($user_id,'WPTJob');
      $smarty->assign('folderTree',$folderTree);
      $smarty->assign('shares',$shares);
      // Pass empty values for smarty use
      if ( !isset($jobsFilterField)){
        $jobsFilterField="";
      }
      if ( !isset($jobsFilterValue)){
        $jobsFilterValue="";
      }
      $smarty->assign('jobsFilterField',$jobsFilterField);
      $smarty->assign('jobsFilterValue',$jobsFilterValue);
      $smarty->assign('currentPage', $jobsCurrentPage);
      $smarty->assign('maxpages', $pager->getLastPage());
      $smarty->assign('showInactiveJobs',$_SESSION['showInactiveJobs']);
      $smarty->assign('result', $result);
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while Listing jobs: " . $wptResultId . " message: " . $e->getMessage());
    print 'Exception : ' . $e->getMessage();
  }

  $q->free(true);
  unset($result);
  unset($pager);
  unset($share);
  $hasReadPermission = false;
  $hasUpdatePermission = false;
  $hasCreateDeletePermission = false;
  $hasExecutePermission = false;
  $hasOwnerPermission = false;

  $folderPermissionLevel = getPermissionLevel('WPTJob',$folderId);
  if ($folderPermissionLevel >= 0)
      $hasReadPermission = true;
  if ($folderPermissionLevel >= 1)
      $hasUpdatePermission = true;
  if ($folderPermissionLevel >= 2)
      $hasCreateDeletePermission = true;
  if ($folderPermissionLevel >= 4)
      $hasExecutePermission = true;
  if ($folderPermissionLevel >= -9)
      $hasOwnerPermission = true;

//  $smarty->assign('hasReadPermission',$hasReadPermission);
//  $smarty->assign('hasUpdatePermission',$hasUpdatePermission);
//  $smarty->assign('hasCreateDeletePermission',$hasCreateDeletePermission);
//  $smarty->assign('hasExecutePermission',$hasExecutePermission);
//  $smarty->assign('hasOwnerPermission',$hasOwnerPermission);

  $smarty->display('job/listJobs.tpl');
?>