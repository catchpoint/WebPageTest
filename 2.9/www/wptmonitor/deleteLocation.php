<?php
  require("login/login.php");
  include 'monitor.inc';
  include 'db_utils.inc';
  displayErrorIfNotAdmin();
  $id = $_REQUEST['id'];

  deleteRecord("WPTLocation","Id",$id);

  header("Location: listLocations.php");
?>