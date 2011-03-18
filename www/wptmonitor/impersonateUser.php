<?php
  include 'bootstrap.php';
  if ( !$_SESSION['ls_admin']){
    exit;
  }
//  if ($_REQUEST['impId']){
//    $_SESSION['ls_impersonate_id'] = $_REQUEST['impId'];
//    header("Location: index.php");
//    exit;
//  }
  $q = Doctrine_Query::create()->from('User u')->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
  $result = $q->fetchArray();
  echo "<form action=\"\" name=impUser><select name=impId onChange=document.impUser.submit()>";
  foreach($result as $user){
    if($user['Id'] == $_SESSION['ls_impersonate_id']){
      $selected='selected';
    } else {
      $selected='';
    }
    echo "<option value=".$user['Id']." ".$selected.">".$user['Username']."</option>";
  }
  echo "</select></form>";
  $q->free(true);
?>
