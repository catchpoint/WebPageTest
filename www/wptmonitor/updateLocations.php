<?php
  require("login/login.php");
  include 'monitor.inc';
  $id = $_REQUEST['id'];

  displayErrorIfNotAdmin();
  if ( !$forwardTo = $_REQUEST['forwardTo']){
    $forwardTo ="listLocations.php";
  }
  updateLocations($id);
  header("Location: ".$forwardTo);
  exit;
?>