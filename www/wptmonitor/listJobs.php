<?php
  require("login/login.php");
  include 'monitor.inc';
  include_once 'utils.inc';
  include_once 'db_utils.inc';
  $user_id = getCurrentUserId();

  try
  {
    // Handle filter settings
    if ( $_REQUEST['clearFilter'] ){
      unset($_SESSION['jobsFilterField']);
      unset($_SESSION['jobsFilterValue']);
      unset($_SESSION['jobsFolderId']);
    } else {
      if ( $jobsFilterField = $_REQUEST['filterField'] ){
       $_SESSION['jobsFilterField']=$jobsFilterField;
      }
      if ( $jobsFilterValue = $_REQUEST['filterValue'] ){
        $_SESSION['jobsFilterValue'] = $jobsFilterValue;
      }
    }
    $jobsFilterField = $_SESSION['jobsFilterField'];
    $jobsFilterValue = $_SESSION['jobsFilterValue'];

    // Handle pager settings
    if (($_REQUEST['currentPage'])) {
      $_SESSION['jobsCurrentPage'] = $_REQUEST['currentPage'];
    }
    if (!$_SESSION['jobsCurrentPage']){
      $_SESSION['jobsCurrentPage'] = 1;
    }
    $jobsCurrentPage = $_SESSION['jobsCurrentPage'];
    // Show inactive jobs
    if ( $_REQUEST['showInactiveJobs'] ) {
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
    if ( ($folderId = $_REQUEST['folderId']) ){
      $_SESSION['jobsFolderId'] = $folderId;
    }
    if (!$_SESSION['jobsFolderId']){
      $_SESSION['jobsFolderId'] = getRootFolderForUser($user_id,'WPTJob');
    }
    $folderId = $_SESSION['jobsFolderId'];
    $smarty->assign('folderId',$_SESSION['jobsFolderId']);


    // Order by direction
    if ( ($orderByDir = $_REQUEST['orderByDir'] ) ){
      $_SESSION['orderJobsByDirection'] = $orderByDir;
    }
    if (!$_SESSION['orderJobsByDirection']){
      $_SESSION['orderJobsByDirection'] = "ASC";
    }

    if ($_SESSION['orderJobsByDirection'] == "ASC"){
      $orderByDirInv = "DESC";
    } else {
      $orderByDirInv = "ASC";
    }

    // Order by
    if ( ($orderBy = $_REQUEST['orderBy'] ) )
    {
      $_SESSION['orderJobsBy'] = $orderBy;
    }
    if (!$_SESSION['orderJobsBy'] ){
      $_SESSION['orderJobsBy'] = "Id";
    }
    // Upgrade path fix
    // ALL JOBS MUST AT LEAST BE IN ROOT FOLDER
//    fixRootFolder('WPTJob',$user_id);

    $smarty->assign('orderJobsByDirection',$_SESSION['orderJobsByDirection']);
    $smarty->assign('orderJobsByDirectionInv',$orderByDirInv);
    $smarty->assign('orderJobsBy',$_SESSION['orderJobsBy']);

    $orderJobsBy = "j.".$_SESSION['orderJobsBy'].' '.$_SESSION['orderJobsByDirection'];

    $selectFields = 'j.Active, j.Id, j.Label, j.Host, j.Location, j.Frequency, j.LastRun, a.Id, COUNT(r.Id) AS ResultCount, f.Label';

    $q = Doctrine_Query::create()->select($selectFields)->from('WPTJob j, j.WPTResult r, j.WPTJob_Alert a, j.WPTJobFolder f')
                                ->orderBy($orderJobsBy)
                                ->groupBy('j.Id');

    if ( !$showInactiveJobs ){
      $q->andWhere('j.Active = ?', true);
    }
    if ( $jobsFilterField && $jobsFilterValue ){
      $q->andWhere('j.'.$jobsFilterField.' LIKE ?', '%'.$jobsFilterValue.'%');
    }

    if ( $folderId > -1 && hasPermission('WPTJob',$folderId,PERMISSION_READ)){
      $q->andWhere('j.WPTJobFolderId = ?', $folderId);
    } else {
      $q->andWhere('j.UserId = ?',$user_id);
    }

      $pager = new Doctrine_Pager($q, $jobsCurrentPage, $resultsPerPage);
      $result = $pager->execute();
      $alertTable = Doctrine_Core::getTable('WPTJob_Alert');
      $alertCount = array();

      $folderTree = getFolderTree($user_id,'WPTJob');
      $shares = getFolderShares($user_id,'WPTJob');
      $smarty->assign('folderTree',$folderTree);
      $smarty->assign('shares',$shares);

      $smarty->assign('alertCount',$alertCount);
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
  $smarty->display('job/listJobs.tpl');

?>