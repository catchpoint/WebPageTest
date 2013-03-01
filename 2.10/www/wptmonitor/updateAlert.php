<?php
  require("login/login.php");
  include 'monitor.inc';

  $folderId = $_REQUEST['folderId'];
  //  $user_id=getCurrentUserId();
  $user_id=getUserIdForFolder('Alert',$folderId);
  $id = $_REQUEST['id'];
  if ( !$active = $_REQUEST['active'] ){
    $active = 0;
  };
  $label = $_REQUEST['label'];
  $description = $_REQUEST['description'];
  $emailaddresses= $_REQUEST['emailaddresses'];
  $alerton = $_REQUEST['alerton'];
  $alertontype = $_REQUEST['alertOnType'];
  $alertoncomparator = $_REQUEST['alertOnComparator'];
  $alertonvalue = $_REQUEST['alertOnValue'];
  $alertthreshold = $_REQUEST['alertThreshold'];
  if ( $alertontype == "Response Code"){
    $alerton = $_REQUEST['alertOnResponseCode'];
  } else if ( $alertontype == "Response Time"){
    $alerton = $_REQUEST['alertOnResponseTime'];
  } else if ( $alertontype == "Validation Code"){
    $alerton = $_REQUEST['alertOnValidationCode'];
  }
  try
  {
    if ( $id ){
      $alertTable = Doctrine_Core::getTable('Alert');
      $result = $alertTable->find($id);

      if ( $result ){
        echo "Found alert ".$result['Id'];
        $alert = $result;
        $alert['Active']=$active;
      } else {
        //TODO: Passed in an Id, but didn't find it. Add error here.
      }
    }else {
      $alert = new Alert();
      $alert['Active']= 0;
    }
    $alert['AlertFolderId'] = $folderId;
    $alert['UserId'] = $user_id;
    $alert['Label'] = $label;
    $alert['Description'] = $description;
    $alert['EmailAddresses'] = $emailaddresses;
    $alert['AlertOn'] = $alerton;
    $alert['AlertOnType']=$alertontype;
    $alert['AlertOnComparator']=$alertoncomparator;
    $alert['AlertOnValue']=$alertonvalue;
    $alert['AlertThreshold']=$alertthreshold;
    $alert->save();
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while updating alert: for ".$user_id. " message: " . $e->getMessage());
  }
  header("Location: listAlerts.php");
  exit;
?>