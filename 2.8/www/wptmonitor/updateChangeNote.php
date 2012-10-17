<?php
  require("login/login.php");
  include 'monitor.inc';
    

  $folderId = $_REQUEST['folderId'];
  //  $user_id=getCurrentUserId();
  $user_id=getUserIdForFolder('Changenote',$folderId);
  //print_r($_REQUEST);exit;
  $startMonth = $_REQUEST['startMonth'];
  $startDay = $_REQUEST['startDay'];
  $startYear = $_REQUEST['startYear'];
  $startHour = $_REQUEST['startHour'];
  $startMinute = $_REQUEST['startMinute'];
  $dateTime = mktime($startHour, $startMinute, 0, $startMonth, $startDay, $startYear);

  $id = $_REQUEST['id'];
  if ( isset($_REQUEST['public'])){
    $public = true;
  }
  $label = $_REQUEST['label'];
  $description = $_REQUEST['description'];
  $releaseInfo= $_REQUEST['releaseInfo'];
  try
  {
    if ( $id ){
      $changeNoteTable = Doctrine_Core::getTable('ChangeNote');
      $result = $changeNoteTable->find($id);
      if ( $result ){
        $changeNote = $result;
      } else {
        //TODO: Passed in an Id, but didn't find it. Add error here.
      }
    }else {
      $changeNote = new ChangeNote();
    }
    $changeNote['Public']=$public;
    $changeNote['ChangeNoteFolderId'] = $folderId;
    $changeNote['UserId'] = $user_id;
    $changeNote['Date'] = $dateTime;
    $changeNote['Label'] = $label;
    $changeNote['Description'] = $description;
    $changeNote['ReleaseInfo'] = $releaseInfo;
    $changeNote->save();
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while updating change note: for ".$user_id. " message: " . $e->getMessage());
  }
  header("Location: listChangeNotes.php");
  exit;
?>