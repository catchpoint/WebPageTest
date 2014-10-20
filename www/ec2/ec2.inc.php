<?php
require_once('./ec2/sdk.class.php');
require_once('./common_lib.inc');

/**
* Tests are pending for the given location, start instances as necessary
* 
* @param mixed $location
*/
function EC2_StartInstanceIfNeeded($ami) {
  $target = 1;  // just support 1 instance at a time for now
  $needed = false;
  $lock = Lock('ec2-instances', true, 120);
  if ($lock) {
    $instances = json_decode(file_get_contents('./tmp/ec2-instances.dat'), true);
    if (!$instances || !is_array($instances))
      $instances = array();
    if (!isset($instances[$ami]))
      $instances[$ami] = array();
    if (!isset($instances[$ami]['count']) || !is_numeric($instances[$ami]['count']))
      $instances[$ami]['count'] = 0;
    if ($instances[$ami]['count'] < $target)
      $needed = true;
    if ($needed) {
      // figure out the user data string to use for the instance
      $host = GetSetting('host');
      if (!$host && isset($_SERVER['HTTP_HOST']) && strlen($_SERVER['HTTP_HOST']))
        $host = $_SERVER['HTTP_HOST'];
      if (!$host && GetSetting('ec2'))
        $host = file_get_contents('http://169.254.169.254/latest/meta-data/hostname');
      $key = GetSetting('location_key');
      $locations = LoadLocationsIni();
      $urlblast = '';
      $wptdriver = '';
      $loc = '';
      $region = null;
      if ($locations && is_array($locations)) {
        foreach($locations as $location => $config) {
          if (isset($config['ami']) && $config['ami'] == $ami) {
            if (isset($config['region']))
              $region = trim($config['region']);
            if (isset($config['key']) && strlen($config['key']))
              $key = trim($config['key']);
            if (strlen($loc))
              $loc .= ',';
            $loc .= $location;
            if (isset($config['urlblast'])) {
              if (strlen($urlblast))
                $urlblast .= ',';
              $urlblast .= $location;
            } else {
              if (strlen($wptdriver))
                $wptdriver .= ',';
              $wptdriver .= $location;
            }
          }
        }
      }
      if (strlen($loc) && isset($region)) {
        $user_data = "wpt_server=$host";
        if (strlen($urlblast))
          $user_data .= " wpt_location=$urlblast";
        if (strlen($wptdriver))
          $user_data .= " wpt_loc=$wptdriver";
        if (isset($key) && strlen($key))
          $user_data .= " wpt_key=$key";
        $size = GetSetting('ec2_instance_size');
        if (!$size)
          $size = 'm1.medium';
        if (EC2_LaunchInstance($region, $ami, $size, $user_data, $loc)) {
          $instances[$ami]['count']++;
          file_put_contents('./tmp/ec2-instances.dat', json_encode($instances));
        }
      }
    }
    Unlock($lock);
  }
}

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
        
        if ($terminate) {
          if (isset($instance['ami'])) {
            $lock = Lock('ec2-instances', true, 120);
            if ($lock) {
              $counts = json_decode(file_get_contents('./tmp/ec2-instances.dat'), true);
              if ($counts && is_array($counts) && isset($counts[$instance['ami']])) {
                unset($counts[$instance['ami']]);
                file_put_contents('./tmp/ec2-instances.dat', json_encode($instances));
              }
              Unlock($lock);
            }
          }
          EC2_TerminateInstance($instance['region'], $instance['id']);
        }
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
  // update the AMI counts we are tracking locally
  if (count($instances)) {
    $lock = Lock('ec2-instances', true, 120);
    if ($lock) {
      $amis = array();
      foreach($instances as $instance) {
        if (isset($instance['ami']) &&
            strlen($instance['ami']) &&
            is_numeric($instance['state']) &&
            $instance['state'] <= 16) {
          if (!isset($amis[$instance['ami']]))
            $amis[$instance['ami']] = array('count' => 0);
          $amis[$instance['ami']]['count']++;
        }
      }
      file_put_contents('./tmp/ec2-instances.dat', json_encode($amis));
      Unlock($lock);
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

function EC2_LaunchInstance($region, $ami, $size, $user_data, $loc) {
  $ret = false;
  $key = GetSetting('ec2_key');
  $secret = GetSetting('ec2_secret');
  if ($key && $secret) {
    $ec2 = new AmazonEC2($key, $secret);
    $ec2->set_region($region);
    $response = $ec2->run_instances($ami, 1, 1, array(
                                  'InstanceType' => $size,
                                  'UserData' => base64_encode($user_data)));
    if ($response->isOK()) {
      $ret = true;
      if (isset($loc) && strlen($loc) && isset($response->body->instancesSet->item->instanceId)) {
        $instance_id = (string)$response->body->instancesSet->item->instanceId;
        $ec2->create_tags($instance_id, array(
                          array('Key' => 'Name', 'Value' => 'WebPagetest Agent'),
                          array('Key' => 'WPTLocations', 'Value' => $loc)));
      }
    }
  }
  return $ret;
}

function EC2_GetTesters() {
  $locations = array();
  $loc = LoadLocationsIni();
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