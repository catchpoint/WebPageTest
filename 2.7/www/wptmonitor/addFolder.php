<?php
  require("login/login.php");
  include 'monitor.inc';
  $folderName = $_REQUEST['folder'];
  if ( $folderName != "Alert" && $folderName != "ChangeNote" ){
    $itemTableName = 'WPT';
  }
  $itemTableName .= $folderName;
  $folderTableName = $itemTableName. 'Folder';


  $folderId = $_REQUEST['id'];
  $editFolderId = $_REQUEST['editId'];
  $userId = getCurrentUserId();
  $folderLabel = $_REQUEST['label'];

  $folderTable=Doctrine_Core::getTable($folderTableName);
  $parentFolder = $folderTable->find($folderId);

  if ($editFolderId){
    $folder = $folderTable->find($editFolderId);
    if ($folder){
      $folder->Label = $folderLabel;
      $folder->save();
    }
  }else{
    // Check for duplicate name first
    $folder = $folderTable->findByLabel($folderLabel);
    if ($folderName == "Job"){
      $folder = new WPTJobFolder();
    } else if ($folderName == "Script" ){
      $folder = new WPTScriptFolder();
    } else if ($folderName == "Alert" ){
      $folder = new AlertFolder();
    }if ($folderName == "ChangeNote" ){
      $folder = new ChangeNoteFolder();
    }
    $folder->Label = $folderLabel;
    $folder->save();
    $folder->getNode()->insertAsLastChildOf($parentFolder);
  }
  header("Location: listFolders.php?folder=".$folderName);
?>