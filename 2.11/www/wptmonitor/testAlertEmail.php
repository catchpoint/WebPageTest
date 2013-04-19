<?php
  require("login/login.php");
    include 'monitor.inc';
    include 'alert_functions.inc';
    $message = "\n--------------------------------------------\n";
    $message .= "Test  alert for location: " . $status['id'] . "\n";
    $message .= "In Queue:\n";
    $message .= "Testers:\n";
    $message .= "Timestamp:\n";
    $message .= "\n--------------------------------------------\n";
    $message .= "TEST -- Queue count continues to grow. Please provision more testers or decrease the runrate for this location.";
    if (sendEmailAlert($_REQUEST['emailAddress'], $message)) {
        $_SESSION['ErrorMessagePopUp'] = "Email Alert successfully Sent.";
    } else {
        $_SESSION['ErrorMessagePopUp'] = "Email Alert Failed.";
    }
    header("Location: listAlerts.php");
?>
 
