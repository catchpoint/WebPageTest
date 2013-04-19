<?php
  require("login/login.php");
  include 'monitor.inc';

  $user_id = $_REQUEST['id'];
  if ($_REQUEST['password'] && ($_REQUEST['password']!=$_REQUEST['passwordRepeat'])){
    $_SESSION['ErrorMessagePopUp'] = "Passwords do not match.";
    header("Location: editUser.php?user_id=".$user_id);
    exit;
  }
  try
  {
    date_default_timezone_set($_REQUEST['timezone']);
    if ( $user_id ){
      $userTable = Doctrine_Core::getTable('User');
      $user = $userTable->find($user_id);
    }
    if ( !$user ){
      $user = new User();
      $user['Username']=$_REQUEST['username'];
    }
    $user['FirstName']    =$_REQUEST['firstname'];
    $user['LastName']     =$_REQUEST['lastname'];;
    $user['EmailAddress'] =$_REQUEST['emailaddress'];
    $user['TimeZone']     =$_REQUEST['timezone'];
    if ($_REQUEST['password'] && ($_REQUEST['password'] == $_REQUEST['passwordRepeat'])){
      $user['Password']=sha1($_REQUEST['password']);
    }
    if ( $_SESSION['ls_admin']){
      $type = $_REQUEST['type'];
      if ( !$isactive = $_REQUEST['isactive'] ){
        $isactive = 0;
      }
      if ( !$issuperadmin= $_REQUEST['issuperadmin'] ){
        $issuperadmin= 0;
      }

      $user['IsActive'] = $isactive;
      $user['IsSuperAdmin'] = $issuperadmin;
      $user['Type'] = $type;
      $user['MaxJobsPerMonth'] = $_REQUEST['maxjobspermonth'];
    }
    $user->save();

  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while updating user: ".$id. " message: " . $e->getMessage());
  }
  if ($_SESSION['ls_admin']){
    header("Location: listUsers.php");
  } else{
    header("Location: index.php");
  }
  exit;
?>
