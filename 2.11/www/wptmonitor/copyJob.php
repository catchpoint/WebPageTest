<?php
  require("login/login.php");
  include 'monitor.inc';
  $jobId = $_REQUEST['id'];

  $t = Doctrine_Core::getTable('WPTJob');
  $record = $t->find($jobId);

  $folderId = $record['WPTJobFolderId'];

  if (!hasPermission('WPTJob',$folderId,PERMISSION_CREATE_DELETE)){
    echo 'Invalid permission';exit;
  }

  if ($jobId) {
    $q = Doctrine_Query::create()->from('WPTJob j')->where('j.Id= ?', $jobId);
    $job = $q->fetchOne();
    $q->free(true);
    if ( $job ){
      $newJob = $job->copy(false);
      $newJob['Label'] = $newJob['Label']." ( COPY )";
      $newJob['Active']=false;
      $newJob->save();
    }
  }
  header("Location: editJob.php?id=".$newJob['Id']."&folderId=".$newJob['WPTJobFolderId']);
  /* Make sure that code below does not get executed when we redirect. */
  exit;

?>