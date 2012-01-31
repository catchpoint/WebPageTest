<?php
require_once('bootstrap.php');
include_once 'db_utils.inc';
try{
// Get list of users
echo 'Fetching Jobs<br>';
$jobTable= Doctrine_Core::getTable('WPTJob');
$jobLocationTable= Doctrine_Core::getTable('WPTJob_WPTLocation');

$jobs = $jobTable->findAll();

foreach ($jobs as $job){
  echo 'Updating location settings for job: '.$job['Label'].' with location: '.$job['Location'].' hosted at: '. $job['Host'];
  echo "<br>";
  $location_q = Doctrine_Query::create()->from('WPTLocation l')->where('l.Location = ?', $job['Location'])->andWhere('l.WPTHost.HostURL = ?',$job['Host']);
  if ($location_q->count() < 1){
    echo '<H1>FAILED TO FIND Location for job: '.$job['Id']. ' : '. $job['Label'].'</h1>';
    echo '<br/>';
    continue;
  }
  $location = $location_q->fetchOne();
  echo 'LOCATION: '.$location['Location'];
  echo "<br>";
  echo 'HOST: '.$location->WPTHost['HostURL'];
  echo "<hr>";
  $location_q->free(true);

  $x = new WPTJob_WPTLocation();
  $x['WPTLocationId'] = $location['Id'];
  $x['WPTJobId'] = $job['Id'];
  $x->save();
}
echo 'Complete<br>';
} catch (Exception $ex){
  echo 'Failed with exception '.$ex->getMessage();
}
?>