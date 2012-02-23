<?php
  require("login/login.php");
  include 'monitor.inc';
  try
  {
    // Handle filter settings
    if ( $_REQUEST['clearFilter'] ){
      unset($_SESSION['jobsFilterField']);
      unset($_SESSION['jobsFilterValue']);
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
     }
    $showInactiveJobs = $_SESSION['showInactiveJobs'];

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

    $smarty->assign('orderJobsByDirection',$_SESSION['orderJobsByDirection']);
    $smarty->assign('orderJobsByDirectionInv',$orderByDirInv);
    $smarty->assign('orderJobsBy',$_SESSION['orderJobsBy']);

    $orderJobsBy = "j.".$_SESSION['orderJobsBy'].' '.$_SESSION['orderJobsByDirection'];

    $user_id = getCurrentUserId();
    $q = Doctrine_Query::create()->from('User u')->where('u.Id = ?', $user_id)->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    $user = $q->fetchOne();
    $q->free(true);

    
    $selectFields = 'j.Active, j.Id, j.Label, j.Host, j.Location, j.Frequency, j.LastRun, COUNT(r.Id) AS ResultCount';

    if ($user) {
      if ( $showInactiveJobs ){
        if ( $jobsFilterField && $jobsFilterValue ){
          $pager = new Doctrine_Pager(
            Doctrine_Query::create()->select($selectFields)->from('WPTJob j, j.WPTResult r')
                ->where('j.UserId = ?',$user_id)
                ->andWhere( 'j.'.$jobsFilterField.' LIKE ?', '%'.$jobsFilterValue.'%' )
                ->orderBy($orderJobsBy)
                ->groupBy('j.Id'), $jobsCurrentPage, $resultsPerPage);
        } else {
          $pager = new Doctrine_Pager(
            Doctrine_Query::create()->select($selectFields)->from('WPTJob j, j.WPTResult r')
                ->where('j.UserId = ?', $user_id)
                ->orderBy($orderJobsBy)
                ->groupBy('j.Id'), $jobsCurrentPage, $resultsPerPage);
        }

      } else {
        if ( $jobsFilterField && $jobsFilterValue ){
          $q = Doctrine_Query::create()->select($selectFields)->from('WPTJob j, j.WPTResult r')
              ->where('j.Active = ?', true)
              ->andWhere('j.UserId = ?',$user_id)
              ->andWhere( 'j.'.$jobsFilterField.' LIKE ?', '%'.$jobsFilterValue.'%' )
              ->orderBy($orderJobsBy)
              ->groupBy('j.Id');
          $pager = new Doctrine_Pager($q, $jobsCurrentPage, $resultsPerPage);
        } else {
          $q = Doctrine_Query::create()->select($selectFields)->from('WPTJob j, j.WPTResult r')
                ->where('j.Active = ?', true)
                ->andWhere('j.UserId = ?', $user_id)
                ->orderBy($orderJobsBy)->groupBy('j.Id');
          $pager = new Doctrine_Pager($q, $jobsCurrentPage, $resultsPerPage);
        }
      }
      $result = $pager->execute();
      $alertTable = Doctrine_Core::getTable('WPTJob_Alert');
      $alertCount = array();
      foreach($result as $r){
        $id = $r['Id'];
        $alerts = $alertTable->findByWPTJobId($id);
        $alertCount[$id] = $alerts->count();
      }
      
      $smarty->assign('alertCount',$alertCount);
      $smarty->assign('jobsFilterField',$jobsFilterField);
      $smarty->assign('jobsFilterValue',$jobsFilterValue);
      $smarty->assign('currentPage', $jobsCurrentPage);
      $smarty->assign('maxpages', $pager->getLastPage());
      $smarty->assign('showInactiveJobs',$_SESSION['showInactiveJobs']);
      $smarty->assign('result', $result);
      $smarty->assign('resultCount', $resultCount);
      $smarty->assign('current_seconds', $current_Seconds);
    }
  }
  catch (Exception $e)
  {
    error_log("[WPTMonitor] Failed while Listing jobs: " . $wptResultId . " message: " . $e->getMessage());
    print 'Exception : ' . $e->getMessage();
  }
  $q->free(true);
  unset($result);
  unset($pager);
  unset($user);
  $smarty->display('listJobs.tpl');

?>
 
