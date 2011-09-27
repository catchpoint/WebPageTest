<?php
  require("login/login.php");
  include 'monitor.inc';
  $id = $_REQUEST['id'];

  displayErrorIfNotAdmin();
  if ( !$forwardTo = $_REQUEST['forwardTo']){
    $forwardTo ="listLocations.php";
  }
  try {

    $q = Doctrine_Query::create()->from('WPTHost h')->where('h.Id= ?', $id);
    $host = $q->fetchOne();
    $q->free(true);

    if ( $host ){
      $locationsArray = getLocationInformation($host['HostURL']);
    }

    // Update information from getLocations call
    foreach($locationsArray as $key=>$loc){
      $locationId = $loc['id'];
      $q = Doctrine_Query::create()->from('WPTLocation l')
          ->where('l.Location= ?', $locationId)
          ->andWhere('l.WPTHostId = ?',$id);
      $wptLocation = $q->fetchOne();
      $q->free(true);
      if ( !$wptLocation ){
        $wptLocation = new WPTLocation();
      }
      $wptLocation['Label'] = $loc['Label'];
      $wptLocation['Location'] = $loc['id'];
      $wptLocation['WPTHostId'] = $id;
      $wptLocation['Active'] = true;
      $wptLocation['Valid'] = true;
      $wptLocation['Browser']= $loc['Browser'];
      $wptLocation->save();
    }
    // Check for invalid locations
    $q = Doctrine_Query::create()->from('WPTLocation l')->where('l.WPTHostId= ?', $id);
    $locations = $q->execute();
    $q->free(true);
    foreach( $locations as $key=>$location ){
      $id = $location['Location'];
      foreach( $locationsArray as $locArray ){
        if ( $locArray['id'] == $id ){
          $location['Valid'] = true;
          break;
        }
        $location['Valid'] = false;
      }
      $location->save();      
    }
  unset($locations);
 } catch (Exception $e){
    print $e;
    exit;
  }
  header("Location: ".$forwardTo);
  exit;
?>