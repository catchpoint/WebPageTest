<?php
  require("login/login.php");
  include 'monitor.inc';

  $alert_id = $_REQUEST['alert_id'];
  try
  {
    foreach ($alert_id as $alertId){
      $q = Doctrine_Query::create()->from('Alert a')->where('a.Id = ?', $alertId);
      $alert = $q->fetchOne();
      $q->free(true);

      if ( $alert == null ){
        throw new Exception("Toggle Active Update Failed");
      }
      $alert['Active']=!$alert['Active'];
      $alert->save();
    }
  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while toggling alert active for ".$userId. " message: " . $e->getMessage());
  }

  header("Location: listAlerts.php");
/* Make sure that code below does not get executed when we redirect. */
  exit;
?>