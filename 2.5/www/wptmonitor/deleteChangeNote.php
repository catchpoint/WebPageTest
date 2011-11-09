<?php
  require("login/login.php");
  include 'monitor.inc';
  include 'db_utils.inc';

  $id = $_REQUEST['id'];
  $forwardTo = "listChangeNotes.php";

  deleteRecord("ChangeNote","Id",$id);

  header("Location: ".$forwardTo);
?>