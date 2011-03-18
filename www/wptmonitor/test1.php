<?php
include 'monitor.inc';
//$folder = new WPTJobFolder();
//$folder['Label'] = 'Root';
//$folder->save();
//$folder = new WPTJobFolder();
//$folder['Label'] = 'Zuji';
//$folder['ParentFolderId'] = 1;
//$folder->save();
//$folder = new WPTJobFolder();
//$folder['Label'] = 'Strangeloop Testing';
//$folder['ParentFolderId'] = 2;
//$folder->save();
  $wptJobFolderTable = Doctrine_Core::getTable('WPTJobFolder');
  $wptJobFolders= $wptJobFolderTable->find(1);

  print_r( $wptJobFolders);

?>