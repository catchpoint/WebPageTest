<?php
  require("login/login.php");
  include 'monitor.inc';
  $scriptId = $_REQUEST['id'];

  $t = Doctrine_Core::getTable('WPTScript');
  $record = $t->find($scriptId);

  $folderId = $record['WPTScriptFolderId'];

  if (!hasPermission('WPTScript',$folderId,PERMISSION_CREATE_DELETE)){
    echo 'Invalid permission';exit;
  }

  if ($scriptId) {
    $q = Doctrine_Query::create()->from('WPTScript s')
        ->andWhere('s.Id= ?', $scriptId);
    $script = $q->fetchOne();
    $q->free(true);
    if ( $script ){
      $newScript = $script->copy(false);
      $newScript['Label'] = $newScript['Label']." ( COPY )";
      $newScript->save();
    }
  }
  header("Location: editScript.php?id=".$newScript['Id']."&folderId=".$newScript['WPTScriptFolderId']);
  exit;
?>