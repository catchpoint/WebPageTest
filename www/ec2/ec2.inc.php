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
      if (EC2_StartInstance($ami)) {
        $instances[$ami]['count']++;
        file_put_contents('./tmp/ec2-instances.dat', json_encode($instances));
      }
    }
    Unlock($lock);
  }
}

/**
* Start an EC2 Agent instance given the AMI
* 
* @param mixed $ami
*/
function EC2_StartInstance($ami) {
  $started = false;
  
  // figure out the user data string to use for the instance
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
    $host = GetSetting('host');
    if (!$host && isset($_SERVER['HTTP_HOST']) && strlen($_SERVER['HTTP_HOST']))
      $host = $_SERVER['HTTP_HOST'];
    if ((!$host || $host == '127.0.0.1' || $host == 'localhost') && GetSetting('ec2')) {
      $host = file_get_contents('http://169.254.169.254/latest/meta-data/public-ipv4');
      if (!isset($host) || !strlen($host))
        $host = file_get_contents('http://169.254.169.254/latest/meta-data/public-hostname');
      if (!isset($host) || !strlen($host))
        $host = file_get_contents('http://169.254.169.254/latest/meta-data/hostname');
    }
    $user_data = "wpt_server=$host";
    if (strlen($urlblast))
      $user_data .= " wpt_location=$urlblast";
    if (strlen($wptdriver))
      $user_data .= " wpt_loc=$wptdriver";
    if (isset($key) && strlen($key))
      $user_data .= " wpt_key=$key";
    $size = GetSetting('ec2_instance_size');
    if (!$size)
      $size = 'm3.medium';
    $started = EC2_LaunchInstance($region, $ami, $size, $user_data, $loc);
  }
  
  return $started;
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
    $instanceCounts = array();
    $agentCounts = array();
    $locations = EC2_GetTesters();
    foreach($instances as $instance) {
      // Keep track of the number of running instances of each AMI
      if (isset($instance['ami'])) {
        if (!isset($instanceCounts[$instance['ami']]))
          $instanceCounts[$instance['ami']] = array('count' => 0);
        if ($instance['running'])
          $instanceCounts[$instance['ami']]['count']++;
      }
      
      $minutes = $instance['runningTime'] / 60.0;
      if ($minutes > 15 && $minutes % 60 >= 50) {
        $terminate = true;
        $lastWork = null;   // last job assigned from this location
        $lastCheck = null;  // time since this instance connected (if ever)
        
        foreach ($instance['locations'] as $location) {
          if (!isset($agentCounts[$location])) {
            $agentCounts[$location] = array('min' => 0, 'count' => 0);
            $min = GetSetting("EC2.$location.min");
            if ($min)
              $agentCounts[$location]['min'] = $min;
          }
          $agentCounts[$location]['count']++;
          if ($agentCounts[$location]['count'] <= $agentCounts[$location]['min']) {
            $terminate = false;
          } elseif (isset($locations[$location]['testers'])) {
            foreach ($locations[$location]['testers'] as $tester) {
              if (isset($tester['last']) && (!isset($lastWork) || $tester['last'] < $lastWork))
                $lastWork = $tester['last'];
              if (isset($tester['ec2']) && $tester['ec2'] == $instance['id'])
                $lastCheck = $tester['elapsed'];
            }
          }
        }
        
        // Keep the instance if the location had work in the last 15 minutes
        // and if this instance has checked in recently
        if (isset($lastWork) && isset($lastCheck)) {
          if ($lastWork < 15 && $lastCheck < 15)
            $terminate = false;
        }
        
        if ($terminate) {
          if (isset($instance['ami']) && $instance['running'])
            $instanceCounts[$instance['ami']]['count']--;
          EC2_TerminateInstance($instance['region'], $instance['id']);
        }
      }
    }
    
    // update the running instance counts
    $lock = Lock('ec2-instances', true, 120);
    if ($lock) {
      $counts = json_decode(file_get_contents('./tmp/ec2-instances.dat'), true);
      if (!isset($counts) || !is_array($counts))
        $counts = array();
      foreach ($counts as $ami => $count) {
        if (!isset($counts[$ami]))
          $counts[$ami] = array('count' => 0);
        $counts[$ami]['count'] = isset($instanceCounts[$ami]['count']) ? $instanceCounts[$ami]['count'] : 0;
      }
      foreach ($instanceCounts as $ami => $count) {
        if (!isset($counts[$ami]))
          $counts[$ami] = array('count' => 0);
        $counts[$ami]['count'] = $count['count'];
      }
      file_put_contents('./tmp/ec2-instances.dat', json_encode($counts));
      Unlock($lock);
    }
  }
}

/**
* Start any instances that may be needed to handle large batches or
* to keep the minimum instance count for a given location
* 
*/
function EC2_StartNeededInstances() {
  $lock = Lock('ec2-instances', true, 120);
  if ($lock) {
    $instances = json_decode(file_get_contents('./tmp/ec2-instances.dat'), true);
    if (!$instances || !is_array($instances))
      $instances = array();
    $locations = EC2_GetAMILocations();
    $scaleFactor = GetSetting('EC2.ScaleFactor');
    if (!$scaleFactor)
      $scaleFactor = 100;
    
    // see how long the work queues are for each location in each AMI
    foreach ($locations as $ami => $info) {
      $tests = 0;
      $min = 0;
      $max = 1;
      foreach($info['locations'] as $location) {
        $queues = GetQueueLengths($location);
        if (isset($queues) && is_array($queues)) {
          foreach($queues as $priority => $count)
            $tests += $count;
        }
        $locMin = GetSetting("EC2.$location.min");
        if ($locMin !== false)
          $min = max($min, intval($locMin));
        $locMax = GetSetting("EC2.$location.max");
        if ($locMax !== false)
          $max = max($max, intval($locMax));
      }
      $locations[$ami]['tests'] = $tests;
      $locations[$ami]['min'] = $min;
      $locations[$ami]['max'] = $max;
    }
    
    foreach ($locations as $ami => $info) {
      $count = isset($instances[$ami]['count']) ? $instances[$ami]['count'] : 0;
      $target = $locations[$ami]['tests'] / $scaleFactor;
      $target = min($target, $locations[$ami]['max']);
      $target = max($target, $locations[$ami]['min']);
      $needed = 0;
      if ($count < $target) {
        $needed = $target - $count;
        for ($i = 0; $i < $needed; $i++) {
          if (EC2_StartInstance($ami)) {
            if (!isset($instances[$ami]))
              $instances[$ami] = array('count' => 0);
            if (!isset($instances[$ami]['count']))
              $instances[$ami]['count'] = 0;
            $instances[$ami]['count']++;
          } else {
            break;
          }
        }
      }
    }

    file_put_contents('./tmp/ec2-instances.dat', json_encode($instances));
    Unlock($lock);
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
              $state = (int)$instance->instanceState->code;
              $running = false;
              if (is_numeric($state) && $state <= 16)
                $running = true;
              $instances[] = array('region' => $region,
                                   'id' => (string)$instance->instanceId,
                                   'ami' => (string)$instance->imageId,
                                   'state' => $state,
                                   'launchTime' => (string)$instance->launchTime,
                                   'launched' => $launchTime,
                                   'runningTime' => $elapsed,
                                   'locations' => $wptLocations,
                                   'running' => $running);
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
            $instance['running']) {
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

/**
* Get a list of locations supported by the given AMI
* 
*/
function EC2_GetAMILocations() {
  $locations = array();
  $loc = LoadLocationsIni();
  foreach($loc as $location => $locInfo) {
    if (isset($locInfo['ami']) && isset($locInfo['region'])) {
      if (!isset($locations[$locInfo['ami']]))
        $locations[$locInfo['ami']] = array('ami' => $locInfo['ami'], 'region' => $locInfo['region'], 'locations' => array());
      $locations[$locInfo['ami']]['locations'][] = $location;
    }
  }
  return $locations;
}
?>