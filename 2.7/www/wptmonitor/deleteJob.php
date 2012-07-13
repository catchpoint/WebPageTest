<?php
  require("login/login.php");
  include 'monitor.inc';
  include 'db_utils.inc';

  $id = $_REQUEST['id'];

  deleteRecord("WPTJob","Id",$id);

  header("Location: listJobs.php");
?>