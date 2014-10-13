<?php
require_once('./ec2/sdk.class.php');

/**
* Terminate any EC2 Instances that are configured for auto-scaling
* if they have not had work in the last 15 minutes and are close
* to an hourly increment of running (since EC2 bills hourly)
* 
*/
function EC2_TerminateIdleInstances() {
  $instances = EC2_GetRunningInstances();
  if (count($instances)) {
    $locations = EC2_GetTesters();
    foreach($instances as $instance) {
      $minutes = $instance['runningTime'] / 60.0;
      if ($minutes > 15 && $minutes % 60 >= 50) {
        $terminate = true;
        $lastWork = null;   // last job assigned from this location
        $lastCheck = null;  // time since this instance connected (if ever)
        
        foreach ($instance['locations'] as $location) {
          if (isset($locations[$location]['testers'])) {
            foreach ($locations[$location]['testers'] as $tester) {
              if (isset($tester['last']) && (!isset($lastWork) || $tester['last'] < $lastWork))
                $lastWork = $tester['last'];
              if (isset($tester['ec2']) && $tester['ec2'] == $instance['id'])
                $lastCheck = $tester['elapsed'];
            }
          }
        }
        
        if (isset($lastWork) && isset($lastCheck)) {
          // Keep the instance if the location had work in the last 15 minutes
          // and if this instance has checked in recently
          if ($lastWork < 15 && $lastCheck < 15)
            $terminate = false;
        }
        
        if ($terminate)
          EC2_TerminateInstance($instance['region'], $instance['id']);
      }
    }
  }
}

function EC2_DeleteOrphanedVolumes() {
  $key = GetSetting('ec2_key');
  $secret = GetSetting('ec2_secret');
  if ($key && $secret && GetSetting('ec2_prune_volumes')) {
    $ec2 = new AmazonEC2($key, $secret);
    $regions = array();
    $response = $ec2->describe_regions();
    if (isset($response) && $response->isOK()) {
      foreach ($response->body->regionInfo->item as $region){
        $regions[] = (string)$region->regionName;
      }
    }
    foreach ($regions as $region) {
      $ec2->set_region($region);
      $volumes = $ec2->describe_volumes();
      if (isset($volumes)) {
        foreach ($volumes->body->volumeSet->item as $item) {
          if ($item->status == 'available') {
            $id = strval($item->volumeId);
            $ec2->delete_volume($id);
          }
        }
      }
    }
  }
}

function EC2_GetRunningInstances() {
  $now = time();
  $instances = array();
  $key = GetSetting('ec2_key');
  $secret = GetSetting('ec2_secret');
  if ($key && $secret) {
    $ec2 = new AmazonEC2($key, $secret);
    $regions = array();
    $response = $ec2->describe_regions();
    if (isset($response) && $response->isOK()) {
      foreach ($response->body->regionInfo->item as $region){
        $regions[] = (string)$region->regionName;
      }
    }
    foreach ($regions as $region) {
      $ec2->set_region($region);
      $response = $ec2->describe_instances();
      if (isset($response) && $response->isOK()) {
        foreach( $response->body->reservationSet->item as $item ) {
          foreach( $item->instancesSet->item as $instance ) {
            $wptLocations = null;
            if (isset($instance->tagSet)) {
              foreach ($instance->tagSet->item as $tag) {
                if ($tag->key == 'WPTLocations') {
                  $wptLocations = explode(',', $tag->value);
                  break;
                }
              }
            }
            if (isset($wptLocations)) {
              $launchTime = strtotime((string)$instance->launchTime);
              $elapsed = $now - $launchTime;
              $instances[] = array('region' => $region,
                                   'id' => (string)$instance->instanceId,
                                   'ami' => (string)$instance->imageId,
                                   'state' => (int)$instance->instanceState->code,
                                   'launchTime' => (string)$instance->launchTime,
                                   'launched' => $launchTime,
                                   'runningTime' => $elapsed,
                                   'locations' => $wptLocations);
            }
          }
        }
      }
    }
  }
  return $instances;
}

function EC2_TerminateInstance($region, $id) {
  $key = GetSetting('ec2_key');
  $secret = GetSetting('ec2_secret');
  if ($key && $secret) {
    $ec2 = new AmazonEC2($key, $secret);
    $ec2->set_region($region);
    $ec2->terminate_instances(array($id));
  }
}

function EC2_GetTesters() {
  $locations = array();
  $loc = parse_ini_file('./settings/locations.ini', true);
  $i = 1;
  while (isset($loc['locations'][$i])) {
    $group = &$loc[$loc['locations'][$i]];
    $j = 1;
    while (isset($group[$j])) {
      $locations[$group[$j]] = GetTesters($group[$j]);
      $j++;
    }
    $i++;
  }
  return $locations;
}
?>