<?php
require("login/login.php");
include 'monitor.inc';
displayErrorIfNotAdmin();

try
{
  $q = Doctrine_Query::create()->from('User u')->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
  $result = $q->fetchArray();
  $q->free(true);

  $smarty->assign('result', $result);
}
catch (Exception $e)
{
  error_log("[WPTMonitor] Failed while Listing Users: " . $wptResultId . " message: " . $e->getMessage());
}
$smarty->display('user/listUsers.tpl');
?>
 
