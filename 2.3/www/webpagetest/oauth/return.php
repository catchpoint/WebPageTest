<html>
<?php
  #include "GoogleOpenID.php";
  include_once "googleopenid.inc";
  $googleLogin = GoogleOpenID::getResponse();
  if( $googleLogin->success() ){
    if( $googleLogin->assoc_handle() == $_COOKIE['google_association_handle'] ) {
      $user_id = $googleLogin->identity();
      $user_email = $googleLogin->email();
      setcookie("google_id", md5($user_id), time()+60*60*24*7*2, "/");
      setcookie("google_email", $user_email, time()+60*60*24*7*2, "/");
    }
  }
  else
  {
    // Don't do anything.
  }
$page_before_google_oauth = $_COOKIE['page_before_google_oauth'];
// Clear the cookie.
setcookie('page_before_google_oauth', '', time()-3600);
header('Location: ' . $page_before_google_oauth);
?>

