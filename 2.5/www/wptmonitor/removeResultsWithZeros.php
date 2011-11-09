<?php
  require("login/login.php");
include 'monitor.inc';

$jobId = $_REQUEST['job_id'];
$userId = getCurrentUserId();

// For one job?
if ($jobId) {
  $q = Doctrine_Query::create()->from('WPTResult r')->where('r.WPTJobId= ?', $jobId);
  $results = $q->fetchArray();
  $q->free(true);
  processResults($results);
} else {
  // Loop through all jobs and clean up everything
  $q = Doctrine_Query::create()->from('WPTJob j');
  $jobs = $q->fetchArray();
  $q->free(true);
  foreach ($jobs as $job) {
    $q = Doctrine_Query::create()->from('WPTResult r')->where('r.WPTJobId= ?', $job['Id']);
    $results = $q->fetchArray();
    $q->free(true);
    processResults($results);
  }
}


function processResults($results) {
  // TODO: Restrict user to their own cleanup

  foreach ($results as $result) {
    if ($result['AvgFirstViewLoadTime'] == 0
        && $result['AvgFirstViewFirstByte'] == 0
        && $result['AvgFirstViewStartRender'] == 0
        && $result['AvgFirstViewDocCompleteTime'] == 0
        && $result['AvgFirstViewDocCompleteRequests'] == 0
        && $result['AvgFirstViewDocCompleteBytesIn'] == 0
        && $result['AvgFirstViewDomTime'] == 0
        && $result['AvgFirstViewFullyLoadedTime'] == 0
        && $result['AvgFirstViewFullyLoadedRequests'] == 0
        && $result['AvgFirstViewFullyLoadedBytesIn'] == 0)
      {
        removeResult($result['Id']);
      }
  }
}

function removeResult($id) {
  $q = Doctrine_Query::create()->delete('WPTResult r')->where('r.Id= ?', $id);
  $rows = $q->execute();
  $q->free(true);
  if ($rows > 0) {
    logOutput("[RemoveResultsWithZeros] Removing result Id: " . $id);
  }
}

?>
<!---->
<!--  $this->hasColumn('AvgFirstViewLoadTime', 'integer', 12);-->
<!--    $this->hasColumn('AvgFirstViewFirstByte', 'integer', 12);-->
<!--    $this->hasColumn('AvgFirstViewStartRender', 'integer', 12);-->
<!--    $this->hasColumn('AvgFirstViewDocCompleteTime', 'integer', 12);-->
<!--    $this->hasColumn('AvgFirstViewDocCompleteRequests', 'integer', 4);-->
<!--    $this->hasColumn('AvgFirstViewDocCompleteBytesIn', 'integer', 12);-->
<!--    $this->hasColumn('AvgFirstViewDomTime', 'integer', 12);-->
<!--    $this->hasColumn('AvgFirstViewFullyLoadedTime', 'integer', 12);-->
<!--    $this->hasColumn('AvgFirstViewFullyLoadedRequests', 'integer', 4);-->
<!--    $this->hasColumn('AvgFirstViewFullyLoadedBytesIn', 'integer', 12);-->