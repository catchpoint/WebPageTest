<?php
require_once('bootstrap.php');
include_once 'db_utils.inc';
try{
// Get list of users
echo 'Fetching users<br>';
$userTable= Doctrine_Core::getTable('User');
$users = $userTable->findAll();

foreach ($users as $user){
  echo 'Updating none filed folder items for user: '.$user['Username'].'<br>';
  $user_id = $user['Id'];

  fixRootFolder('Alert',$user_id);
  echo "<br>";
  fixRootFolder('ChangeNote',$user_id);
  echo "<br>";
  fixRootFolder('WPTJob',$user_id);
  echo "<br>";
  fixRootFolder('WPTScript',$user_id);
  echo "<br>";
}
echo 'Complete<br>';
} catch (Exception $ex){
  echo 'Failed with exception '.$ex->getMessage();
}
?>