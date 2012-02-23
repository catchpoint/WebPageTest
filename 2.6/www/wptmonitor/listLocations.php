<?php
require("login/login.php");
include 'monitor.inc';
displayErrorIfNotAdmin();
try
{
    $q = Doctrine_Query::create()->from('WPTLocation l, l.WPTHost h')->setHydrationMode(Doctrine_Core::HYDRATE_ARRAY);
    $locations = $q->execute();
    $q->free(true);
    $smarty->assign('result',$locations);
}

catch (Exception $e)
{
  error_log("[WPTMonitor] Failed while Listing Locations: " . $e->getMessage());
}
unset($locations);
$smarty->display('host/listLocations.tpl');
?>
 
