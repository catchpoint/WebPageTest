<?php
  include_once "googleopenid.inc";

  //fetch an association handle
  $association_handle = GoogleOpenID::getAssociationHandle();

  setcookie("google_association_handle", $association_handle, time()+60*60*24*7*2, "/");
  setcookie("page_before_google_oauth", $_SERVER['HTTP_REFERER'], time()+60*10, "/");
  $googleLogin = GoogleOpenID::createRequest('/oauth/return.php', $association_handle, true);
  $googleLogin->redirect();
?>

