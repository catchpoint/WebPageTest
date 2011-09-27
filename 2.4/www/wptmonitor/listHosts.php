<?php
require("login/login.php");
include 'monitor.inc';
displayErrorIfNotAdmin();
try
{
    $q = Doctrine_Query::create()->from('WPTHost h')->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    $hosts = $q->fetchArray();
    $q->free(true);
    $smarty->assign('result',$hosts);
}
catch (Exception $e)
{
  error_log("[WPTMonitor] Failed while Listing Hosts: " . $e->getMessage());
}
$smarty->display('host/listHosts.tpl');
?>
 
