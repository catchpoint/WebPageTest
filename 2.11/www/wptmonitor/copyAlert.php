<?php
  require("login/login.php");
  include 'monitor.inc';
  $alertId = $_REQUEST['id'];

  $t = Doctrine_Core::getTable('Alert');
  $record = $t->find($alertId);

  $folderId = $record['AlertFolderId'];

  if (!hasPermission('Alert',$folderId,PERMISSION_CREATE_DELETE)){
    echo 'Invalid permission';exit;
  }


  if ($alertId) {
    $q = Doctrine_Query::create()->from('Alert a')->where('a.Id= ?', $alertId);
    $alert = $q->fetchOne();
    $q->free(true);
    if ( $alert ){
      $newAlert = $alert->copy(false);
      $newAlert['Label'] = $newAlert['Label']." ( COPY )";
      $newAlert['Active']=false;
      $newAlert->save();
    }
  }
  header("Location: editAlert.php?id=".$newAlert['Id']."&folderId=".$newAlert['AlertFolderId']);
  /* Make sure that code below does not get executed when we redirect. */
  exit;

?>