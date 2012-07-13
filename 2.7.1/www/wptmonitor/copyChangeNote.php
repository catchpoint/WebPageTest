<?php
  require("login/login.php");
  include 'monitor.inc';
  $id = $_REQUEST['id'];

  $t = Doctrine_Core::getTable('ChangeNote');
  $record = $t->find($id);

  $folderId = $record['ChangeNoteFolderId'];

  if (!hasPermission('ChangeNote',$folderId,PERMISSION_CREATE_DELETE)){
    echo 'Invalid permission';exit;
  }

  if ($id) {
    $changeNoteTable = Doctrine_Core::getTable('ChangeNote');
    $changeNote = $changeNoteTable->find($id);

    if ( $changeNote ){
      $newChangeNote = $changeNote->copy(false);
      $newChangeNote['Label'] = $newChangeNote['Label']." ( COPY )";
      $newChangeNote->save();
    }
  }
  header("Location: editChangeNote.php?id=".$newChangeNote['Id']."&folderId=".$newChangeNote['ChangeNoteFolderId']);
  /* Make sure that code below does not get executed when we redirect. */
  exit;

?>