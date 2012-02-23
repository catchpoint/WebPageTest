<?php
  require("login/login.php");
  include 'monitor.inc';

  $user_id=getCurrentUserId();
  displayErrorIfNotAdmin();

  $id = $_REQUEST['id'];
  $hosturl = $_REQUEST['hosturl'];
  $label = $_REQUEST['label'];
  $description  = $_REQUEST['description'];
  $contact = $_REQUEST['contact'];
  $contactemail = $_REQUEST['contactemail'];
  if ( !$active= $_REQUEST['active'] ){
    $active = 0;
  }
  try
  {
    if ( $id ){
      $q = Doctrine_Query::create()->from('WPTHost h')->where('h.Id= ?', $id);
      $result = $q->fetchOne();
      $q->free(true);
      if ( $result ){
        $wptHost = $result;
      } else {
        //TODO: Passed in an Id, but didn't find it. Add error here.
      }
    }else {
      $wptHost = new WPTHost();
    }
    $wptHost['Active'] = $active;
    $wptHost['Label'] = $label;
    $wptHost['Description'] = $description;
    $wptHost['HostURL'] = $hosturl;
    $wptHost['Contact'] = $contact;
    $wptHost['ContactEmailAddress'] = $contactemail;
    $wptHost->save();

  } catch (Exception $e) {
    error_log("[WPTMonitor] Failed while updating host" . $e->getMessage());
  }
  header("Location: listHosts.php");
  exit;
?>