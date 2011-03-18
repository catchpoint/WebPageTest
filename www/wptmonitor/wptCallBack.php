<?php
  include 'monitor.inc';
  include 'wpt_functions.inc';
  $resultId= $_REQUEST['id'];
  logOutput("[INFO] [wptCallBack] WPT Callback called for result id ".$resultId);
  processResultsForAll($resultId);

  // Process alerts

  // Get the job id
  $q = Doctrine_Query::create()->select('r.Id')
                               ->from('WPTResult r')
                               ->where('r.WPTResultId = ?',$resultId)->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
  $job = $q->fetchOne();
  $q->free(true);

  if ($job ){
    processAlertsForJob($job['Id']);
  }
?>