<?php
include_once 'bootstrap.php';
include_once 'utils.inc';
function deleteRecord($table, $column, $id) {

  $t = Doctrine_Core::getTable($table);
  $record = $t->find($id);

  // Results are not contained in folders
  if ( $table != "WPTResult"
          && $table != "Share"
          && $table != "User"){
    $folderId = $record[$table . 'FolderId'];
    if (!hasPermission($table, $folderId, PERMISSION_CREATE_DELETE)) {
      echo 'Invalid Permission';
      exit;
    }
  }

  try
  {
    if ($id) {
      $q = Doctrine_Query::create()->delete($table . ' t')
          ->where('t.' . $column . ' = ?', $id);

      $rows = $q->execute();
      $q->free(true);
    }
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while deleting from " . $table . " for Id=" . $id . " message: " . $e->getMessage());
  }

  unset($rows);
}

function fixRootFolder($table, $userId) {
  $q = Doctrine_Query::create()->select('t.'.$table.'FolderId')->from($table . ' t')
      ->where('t.UserId = ?', $userId);
  $rootFolderId = getRootFolderForUser($userId, $table);

  $results = $q->execute();
  $count = 0;

  foreach ($results as $result){
    if ($result[$table.'FolderId'] < 1 ){
      $count++;
      $result[$table . 'FolderId'] = $rootFolderId;
      $result->save();
    }
  }
  echo "Updated ".$count." folder IDs on table ".$table."<BR>";
  $q->free(true);
}

?>