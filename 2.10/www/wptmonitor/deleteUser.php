<?php
  require("login/login.php");
  include 'monitor.inc';
  include 'db_utils.inc';

  $id = $_REQUEST['id'];

  deleteRecord("User","Id",$id);

  header("Location: listUsers.php");
?>