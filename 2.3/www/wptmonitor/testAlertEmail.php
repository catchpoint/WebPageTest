<?php
  require("login/login.php");
  include 'monitor.inc';
  include 'alert_functions.inc';
  if (sendEmailAlert($_REQUEST['emailAddress'],"Alert Email Test")){
    $_SESSION['ErrorMessagePopUp'] = "Email Alert successfully Sent.";
  }else{
    $_SESSION['ErrorMessagePopUp'] = "Email Alert Failed.";
  }
  header("Location: listAlerts.php");

?>
 
