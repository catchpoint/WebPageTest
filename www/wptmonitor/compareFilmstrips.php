<?php
  require("login/login.php");
  include 'monitor.inc';
  $jobIds = $_REQUEST['job_id'];
  $tests = "";
  foreach($jobIds as $job_id){
    if (!empty($tests)){
      $tests .=",";
    }
    $q = Doctrine_Query::create()->select('r.WPTResultId')
                                 ->from('WPTResult r')
                                 ->where('r.WPTJobId = ?', $job_id)
                                 ->whereIn('r.Status', array('200','99999'))
                                 ->orderBy('r.Date DESC')
                                 ->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY)
                                 ->limit(1);
    $job = $q->fetchOne();
    $tests .= $job['WPTResultId']."-r:1-c:0";
  }
  $location = "http://wpt.mtvly.com/video/compare.php?tests=".$tests;
  header("Location: ".$location);
  ?>