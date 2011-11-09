<?php
  require("login/login.php");
  include 'monitor.inc';
  include 'db_utils.inc';
  $user_id = getCurrentUserId();
  try
  {
    // Folder
    if (isset($_REQUEST['folderId']) && ($folderId = $_REQUEST['folderId'])) {
      $_SESSION['alertFolderId'] = $folderId;
    }
    if (!isset($_SESSION['alertFolderId'])) {
      $_SESSION['alertFolderId'] = getRootFolderForUser($user_id, 'Alert');
    }
    $folderId = $_SESSION['alertFolderId'];
    $smarty->assign('folderId', $_SESSION['alertFolderId']);

    $folderTree = getFolderTree($user_id,'Alert');
    $smarty->assign('folderTree', $folderTree);

    // Handle filter settings
    if (isset($_REQUEST['clearFilter'])) {
      unset($_SESSION['alertsFilterField']);
      unset($_SESSION['alertsFilterValue']);
    } else {
      if (isset($_REQUEST['filterField']) && $alertsFilterField = $_REQUEST['filterField']) {
        $_SESSION['alertsFilterField'] = $alertsFilterField;
      }
      if (isset($_REQUEST['filterValue']) && $alertsFilterValue = $_REQUEST['filterValue']) {
        $_SESSION['alertsFilterValue'] = $alertsFilterValue;
      }
    }
    if ( isset($_SESSION['alertsFilterField'] ) ){
      $alertsFilterField = $_SESSION['alertsFilterField'];
      $alertsFilterValue = $_SESSION['alertsFilterValue'];
    }

    // Handle pager settings
    if (isset($_REQUEST['currentPage'])) {
      $_SESSION['alertsCurrentPage'] = $_REQUEST['currentPage'];
    }
    if (!$_SESSION['alertsCurrentPage']) {
      $_SESSION['alertsCurrentPage'] = 1;
    }
    $alertsCurrentPage = $_SESSION['alertsCurrentPage'];

    // Show inactive alerts
    if (isset($_REQUEST['showInactiveAlerts'])) {
      if ($_REQUEST['showInactiveAlerts'] == 1 || $_REQUEST['showInactiveAlerts'] == "true") {
        $_SESSION['showInactiveAlerts'] = true;
      } else {
        $_SESSION['showInactiveAlerts'] = false;
      }
    } else if ( !isset($_SESSION['showInactiveAlerts'])){
      $_SESSION['showInactiveAlerts'] = true;
    }
    $showInactiveAlerts = $_SESSION['showInactiveAlerts'];

    // Order by direction
    if (isset($_REQUEST['orderByDir']) && ($orderByDir = $_REQUEST['orderByDir'])) {
      $_SESSION['orderAlertsByDirection'] = $orderByDir;
    }
    if (!isset($_SESSION['orderAlertsByDirection'])) {
      $_SESSION['orderAlertsByDirection'] = "ASC";
    }

    if ($_SESSION['orderAlertsByDirection'] == "ASC") {
      $orderByDirInv = "DESC";
    } else {
      $orderByDirInv = "ASC";
    }
  
    // Order by
    if (isset($_REQUEST['orderBy']) && ($orderBy = $_REQUEST['orderBy'])) {
      $_SESSION['orderAlertsBy'] = $orderBy;
    }
    if (!isset($_SESSION['orderAlertsBy'])) {
      $_SESSION['orderAlertsBy'] = "Id";
    }

//    fixRootFolder('Alert',$user_id);

    $smarty->assign('orderAlertsByDirection', $_SESSION['orderAlertsByDirection']);
    $smarty->assign('orderAlertsByDirectionInv', $orderByDirInv);
    $smarty->assign('orderAlertsBy', $_SESSION['orderAlertsBy']);

    $orderAlertsBy = "a." . $_SESSION['orderAlertsBy'] . ' ' . $_SESSION['orderAlertsByDirection'];
    $selectFields = 'a.Active, a.Id, a.Label, a.Description, a.AlertOnType COUNT(a.Id) AS ResultCount';

    $q = Doctrine_Query::create()->select($selectFields)
        ->from('Alert a, a.AlertFolder f')
        ->orderBy($orderAlertsBy)
        ->groupBy('a.Id');

    if (!$showInactiveAlerts) {
      $q->andWhere('a.Active = ?', true);
    }
    if (isset($alertsFilterField) && isset($alertsFilterValue)) {
      $q->andWhere('a.' . $alertsFilterField . ' LIKE ?', '%' . $alertsFilterValue . '%');
    } else {
      // set for smarty
      $alertsFilterField='';
      $alertsFilterValue='';
    }
    if ($folderId > -1 && hasPermission('Alert',$folderId,PERMISSION_READ)) {
      $q->andWhere('a.AlertFolderId = ?', $folderId);
    } else {
      $q->andWhere('a.UserId = ?', $user_id);
    }
    $pager = new Doctrine_Pager($q, $alertsCurrentPage, $resultsPerPage);
    $result = $pager->execute();

    global $wptResultStatusCodes;
    $smarty->assign('wptResultStatusCodes', $wptResultStatusCodes);

    global $wptValidationStateCodes;
    $smarty->assign('wptValidationStateCodes', $wptValidationStateCodes);

    $smarty->assign('alertsFilterField', $alertsFilterField);
    $smarty->assign('alertsFilterValue', $alertsFilterValue);
    $smarty->assign('currentPage', $alertsCurrentPage);
    $smarty->assign('maxpages', $pager->getLastPage());
    $smarty->assign('showInactiveAlerts', $_SESSION['showInactiveAlerts']);
    $smarty->assign('result', $result);
//    $smarty->assign('resultCount', $resultCount);
//    $smarty->assign('current_seconds', $current_Seconds);

    $shares = getFolderShares($user_id,'Alert');
    $smarty->assign('shares',$shares);

  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while Listing alerts: " . $wptResultId . " message: " . $e->getMessage());
    print 'Exception : ' . $e->getMessage();
  }
  unset($share);
  //  unset($pager);
  //  unset($results);
  $smarty->display('alert/listAlerts.tpl');
?>