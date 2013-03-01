<?php
  require("login/login.php");
  include 'monitor.inc';

  $jobIds = $_REQUEST['job_id'];
  $smarty->assign('jobIds',$jobIds);
  $smarty->display('job/runJobs.tpl');
?>
 
