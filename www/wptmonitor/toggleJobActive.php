<?php
require("login/login.php");
include 'monitor.inc';

$jobId = $_REQUEST['job_id'];
$userId = getCurrentUserId();
try
{
  foreach ($jobId as $id) {
    $q = Doctrine_Query::create()->from('WPTJob j')->where('j.Id = ?', $id);
    $job = $q->fetchOne();
    $q->free(true);

    if ($job == null) {
      throw new Exception("Toggle Active Update Failed");
    }
    if (!$job['Active'] && (getUserJobCount($userId) + ($job['Runs'] * (43200 / $job['Frequency'])) > getMaxJobsPerMonth($userId))) {
      $_SESSION['ErrorMessagePopUp'] = "Activating this job would exceed the maximum allowed job runs per month";
    } else {
      $job['Active'] = !$job['Active'];
      $job->save();
    }
  }
} catch (Exception $e) {
  error_log("[WPTMonitor] Failed while toggling job active for " . $userId . " message: " . $e->getMessage());
}
header("Location: listJobs.php");
/* Make sure that code below does not get executed when we redirect. */
exit;
?>