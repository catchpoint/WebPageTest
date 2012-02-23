<?php
require_once( 'bootstrap.php' );
include_once 'db_utils.inc';
try {
  // Set up location array
  $locationTable = Doctrine_Core::getTable( 'WPTLocation' );
  $locations = $locationTable->findAll();
  $locationArray = Array();
  echo 'Processing Results: ';

  foreach ( $locations as $location ) {
    $host = $location->WPTHost[ 'HostURL' ];
    $loc = $location[ 'Location' ];
    $id = $location['Id'];
    $q = Doctrine_Query::create()->from( 'WPTResult r, r.WPTJob j' )->select('r.Id')->where('j.Location = ?',$loc)->andWhere('j.Host like ?',$host);
    if ( $q->count() < 1){
      continue;
    }
    $results = $q->fetchArray();
    $tmpArray = array();
    foreach ($results as $result){
      $tmpArray[] = $result['Id'];
    }
    $q = Doctrine_Query::create()->update('WPTResult r')->set('WPTLocationId','?',$id)->where('r.Id IN ?',array($tmpArray));
    $update = $q->execute();
    echo $update.' --- ';
  }

  echo 'Complete<br>';
} catch ( Exception $ex ) {
  echo 'Failed with exception ' . $ex->getMessage();
}
?>