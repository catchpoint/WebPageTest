<?php
  require("login/login.php");
  include 'monitor.inc';
  include 'db_utils.inc';

  $id = $_REQUEST['id'];
  $forwardTo = "listAlerts.php";

  deleteRecord("Alert","Id",$id);

  header("Location: ".$forwardTo);
?>