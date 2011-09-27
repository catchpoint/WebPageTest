<?php
  require("login/login.php");
  include_once 'monitor.inc';
  $tzone="GMT";
  if ($_SESSION['ls_admin']){
    $user_id = $_REQUEST['user_id'];
  } else {
    $user_id = $_SESSION['ls_id'];
  }

  if ( $user_id ){
    $userTable = Doctrine_Core::getTable('User');
    $user = $userTable->find($user_id);
    $tzone = $user['TimeZone'];
   } else {
    $user = new User();
  }
  $smarty->assign('tzselect',get_tz_options($tzone,'timezone'));
  $smarty->assign('user',$user);
  $smarty->display('user/addUser.tpl');
?>