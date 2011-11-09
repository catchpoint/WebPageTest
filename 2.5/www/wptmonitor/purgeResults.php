<?php
  require("login/login.php");
  include 'monitor.inc';

$jobId = $_REQUEST['job_id'];
$userId = getCurrentUserId();

$q = Doctrine_Query::create()->delete('WPTResult r');
$results = $q->execute();
$q->free(true);
echo "Deleted row count: ".$results;
?>