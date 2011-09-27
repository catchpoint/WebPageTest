<?php
  require("login/login.php");
  include 'monitor.inc';
  include 'db_utils.inc';

  $id = $_REQUEST['id'];

  deleteRecord("Share","Id",$id);

  header("Location: listShares.php?folderId=".$_REQUEST['folderId']."&tableName=".$_REQUEST['tableName']);

?>