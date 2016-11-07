<?php
require_once('./common_lib.inc');
require_once('./lib/aws/aws-autoloader.php');

if(extension_loaded('newrelic')) {
    newrelic_add_custom_tracer('EC2_StartInstanceIfNeeded');
    newrelic_add_custom_tracer('EC2_StartInstance');
    newrelic_add_custom_tracer('EC2_TerminateIdleInstances');
    newrelic_add_custom_tracer('EC2_GetRunningInstances');
    newrelic_add_custom_tracer('EC2_SendInstancesOffline');
    newrelic_add_custom_tracer('EC2_StartNeededInstances');
    newrelic_add_custom_tracer('EC2_TerminateInstance');
    newrelic_add_custom_tracer('EC2_LaunchInstance');
}


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
  } else {
    EC2LogError("Acquiring lock for ec2-instances"); 
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
  $size = GetSetting('ec2_instance_size');
  if ($locations && is_array($locations)) {
    foreach($locations as $location => $config) {
      if (isset($config['ami']) && $config['ami'] == $ami) {
        if (isset($config['region']))
          $region = trim($config['region']);
        if (isset($config['size']))
          $size = trim($config['size']);
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
    if (!$size)
      $size = 'm3.medium';
    $started = EC2_LaunchInstance($region, $ami, $size, $user_data, $loc);
  } else {
    EC2LogError("Region ($region) or Location ($loc) invalid in EC2_StartInstance");
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
  EC2_SendInstancesOffline();
  $instances = EC2_GetRunningInstances();
  if (count($instances)) {
    $instanceCounts = array();
    $agentCounts = array();
    $locations = EC2_GetTesters();
    
    // Do a first pass to count the number of instances at each location/ami
    foreach($instances as $instance) {
      if (isset($instance['ami'])) {
        if (!isset($instanceCounts[$instance['ami']]))
          $instanceCounts[$instance['ami']] = array('count' => 0);
        if ($instance['running'])
          $instanceCounts[$instance['ami']]['count']++;
      }
      foreach ($instance['locations'] as $location) {
        if (!isset($agentCounts[$location])) {
          $agentCounts[$location] = array('min' => 0, 'count' => 0);
          $min = GetSetting("EC2.min");
          if ($min)
            $agentCounts[$location]['min'] = $min;
          $min = GetSetting("EC2.$location.min");
          if ($min)
            $agentCounts[$location]['min'] = $min;
        }
        $agentCounts[$location]['count']++;
      }
    }

    foreach($instances as $instance) {
      $minutes = $instance['runningTime'] / 60.0;
      if ($minutes > 15 && $minutes % 60 >= 50) {
        $terminate = true;
        $lastWork = null;   // last job assigned from this location
        $lastCheck = null;  // time since this instance connected (if ever)
        
        foreach ($instance['locations'] as $location) {
          if ($agentCounts[$location]['count'] <= $agentCounts[$location]['min']) {
            $terminate = false;
          } elseif (isset($locations[$location]['testers'])) {
            foreach ($locations[$location]['testers'] as $tester) {
              if (isset($tester['ec2']) && $tester['ec2'] == $instance['id']) {
                if (isset($tester['last']) && (!isset($lastWork) || $tester['last'] < $lastWork))
                  $lastWork = $tester['last'];
                $lastCheck = $tester['elapsed'];
              }
            }
          }
        }
        
        // Keep the instance if the location had work in the last 15 minutes
        // and if this instance has checked in recently
        if (isset($lastWork) && isset($lastCheck) && $lastWork < 15 && $lastCheck < 15)
          $terminate = false;
        
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
* Any excess instances should be marked as offline so that they can go idle and eventually terminate
* 
*/
function EC2_SendInstancesOffline() {
  // Mark excess instances as offline so they can go idle
  $locations = EC2_GetAMILocations();
  $scaleFactor = GetSetting('EC2.ScaleFactor');
  if (!$scaleFactor)
    $scaleFactor = 100;

  // Figure out how many tests are pending for the given AMI across all of the locations it supports
  foreach ($locations as $ami => $info) {
    $tests = 0;
    foreach($info['locations'] as $location) {
      $queues = GetQueueLengths($location);
      if (isset($queues) && is_array($queues)) {
        foreach($queues as $priority => $count)
          $tests += $count;
      }
    }
    $locations[$ami]['tests'] = $tests;
  }
  
  foreach ($locations as $ami => $info) {
    // See if we have any offline testers that we need to bring online
    $online_target = max(1, intval($locations[$ami]['tests'] / ($scaleFactor / 2)));
    foreach ($info['locations'] as $location) {
      $testers = GetTesters($location);
      if (isset($testers) && is_array($testers) && isset($testers['testers']) && count($testers['testers'])) {
        $online = 0;
        foreach ($testers['testers'] as $tester) {
          if (!isset($tester['offline']) || !$tester['offline'])
            $online++;
        }
        if ($online > $online_target) {
          $changed = false;
          foreach ($testers['testers'] as &$tester) {
            if ($online > $online_target && (!isset($tester['offline']) || !$tester['offline'])) {
              $tester['offline'] = true;
              $online--;
              UpdateTester($location, $tester['id'], $tester);
            }
          }
        }
      }
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
        $locMin = GetSetting("EC2.min");
        if ($locMin !== false)
          $min = max(0, intval($locMin));
        $locMin = GetSetting("EC2.$location.min");
        if ($locMin !== false)
          $min = max(0, intval($locMin));
        $locMax = GetSetting("EC2.max");
        if ($locMax !== false)
          $max = max(1, intval($locMax));
        $locMax = GetSetting("EC2.$location.max");
        if ($locMax !== false)
          $max = max(1, intval($locMax));
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
      
      // See if we have any offline testers that we need to bring online
      $online_target = intval($locations[$ami]['tests'] / ($scaleFactor / 2));
      foreach ($info['locations'] as $location) {
        $testers = GetTesters($location);
        if (isset($testers) && is_array($testers) && isset($testers['testers']) && count($testers['testers'])) {
          $online = 0;
          foreach ($testers['testers'] as $tester) {
            if (!isset($tester['offline']) || !$tester['offline'])
              $online++;
          }
          if ($online < $online_target) {
            $changed = false;
            foreach ($testers['testers'] as $tester) {
              if ($online < $online_target && isset($tester['offline']) && $tester['offline']) {
                $tester['offline'] = false;
                $online++;
                UpdateTester($location, $tester['id'], $tester);
              }
            }
          }
        }
      }
      
      // Start new instances as needed
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
/*
  $key = GetSetting('ec2_key');
  $secret = GetSetting('ec2_secret');
  if ($key && $secret && GetSetting('ec2_prune_volumes')) {
    try {
      $ec2 = \Aws\Ec2\Ec2Client::factory(array('key' => $key, 'secret' => $secret, 'region' => 'us-east-1'));
      $regions = array();
      $response = $ec2->describeRegions();
      if (isset($response['Regions'])) {
        foreach ($response['Regions'] as $region)
          $regions[] = $region['RegionName'];
      }
      foreach ($regions as $region) {
        $ec2 = \Aws\Ec2\Ec2Client::factory(array('key' => $key, 'secret' => $secret, 'region' => $region));
        $response = $ec2->describeVolumes();
        if (isset($response['Volumes'])) {
          foreach ($response['Volumes'] as $volume) {
            if ($volume['State'] == 'available') {
              $ec2->deleteVolume(array('VolumeId' => $volume['VolumeId']));
            }
          }
        }
      }
    } catch (\Aws\Ec2\Exception\Ec2Exception $e) {
      $error = $e->getMessage();
      EC2LogError("Pruning EC2 volumes: $error");
    }
  }
*/
}

function EC2_GetRunningInstances() {
  $now = time();
  $instances = array();
  $key = GetSetting('ec2_key');
  $secret = GetSetting('ec2_secret');
  if ($key && $secret) {
    $locations = EC2_GetAMILocations();
    try {
      $ec2 = \Aws\Ec2\Ec2Client::factory(array('key' => $key, 'secret' => $secret, 'region' => 'us-east-1'));
      $regions = array();
      $response = $ec2->describeRegions();
      if (isset($response['Regions'])) {
        foreach ($response['Regions'] as $region)
          $regions[] = $region['RegionName'];
      }
    } catch (\Aws\Ec2\Exception\Ec2Exception $e) {
      $error = $e->getMessage();
      EC2LogError("Listing running EC2 instances: $error");
    }
    if (isset($regions) && is_array($regions) && count($regions)) {
      foreach ($regions as $region) {
        try {
          $ec2 = \Aws\Ec2\Ec2Client::factory(array('key' => $key, 'secret' => $secret, 'region' => $region));
          $response = $ec2->describeInstances();
          if (isset($response['Reservations'])) {
            foreach ($response['Reservations'] as $reservation) {
              foreach ($reservation['Instances'] as $instance ) {
                $wptLocations = null;
                // See what locations are associated with the AMI
                if (isset($instance['ImageId']) && isset($locations[$instance['ImageId']]['locations'])) {
                  $wptLocations = $locations[$instance['ImageId']]['locations'];
                } elseif (isset($instance['Tags'])) {
                  // fall back to using tags to identify locations if they were set
                  foreach ($instance['Tags'] as $tag) {
                    if ($tag['Key'] == 'WPTLocations') {
                      $wptLocations = explode(',', $tag['Value']);
                      break;
                    }
                  }
                }
                if (isset($wptLocations)) {
                  $launchTime = strtotime($instance['LaunchTime']);
                  $elapsed = $now - $launchTime;
                  $state = $instance['State']['Code'];
                  $running = false;
                  if (is_numeric($state) && $state <= 16)
                    $running = true;
                  $instances[] = array('region' => $region,
                                       'id' => $instance['InstanceId'],
                                       'ami' => $instance['ImageId'],
                                       'state' => $state,
                                       'launchTime' => $instance['LaunchTime'],
                                       'launched' => $launchTime,
                                       'runningTime' => $elapsed,
                                       'locations' => $wptLocations,
                                       'running' => $running);
                }
              }
            }
          }
        } catch (\Aws\Ec2\Exception\Ec2Exception $e) {
          $error = $e->getMessage();
          EC2LogError("Listing running EC2 instances: $error");
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
    try {
      $ec2 = \Aws\Ec2\Ec2Client::factory(array('key' => $key, 'secret' => $secret, 'region' => $region));
      $ec2->terminateInstances(array('InstanceIds' => array($id)));
      EC2Log("Terminated instance $id in $region");
    } catch (\Aws\Ec2\Exception\Ec2Exception $e) {
      $error = $e->getMessage();
      EC2LogError("Terminating EC2 instance. Region: $region, ID: $id, error: $error");
    }
  } else {
    EC2LogError("Missing key or secret - Terminating instance $id in $region");
  }
}

function EC2_LaunchInstance($region, $ami, $size, $user_data, $loc) {
  EC2Log("Launching $size ami $ami in $region for $loc with user data: $user_data");
  $ret = false;
  $key = GetSetting('ec2_key');
  $secret = GetSetting('ec2_secret');
  if ($key && $secret) {
    try {
      $ec2 = \Aws\Ec2\Ec2Client::factory(array('key' => $key, 'secret' => $secret, 'region' => $region));
      $ec2_options = array (
        'ImageId' => $ami,
        'MinCount' => 1,
        'MaxCount' => 1,
        'InstanceType' => $size,
        'UserData' => base64_encode ( $user_data )
      );

      //add/modify the SecurityGroupIds if present in config
      $secGroups = GetSetting("EC2.$region.securityGroup");
      if ($secGroups) {
        $securityGroupIds = explode(",", $secGroups);
        if (isset($securityGroupIds)) {
          $ec2_options['SecurityGroupIds'] = $securityGroupIds;
        }
      }

      //add/modify the SubnetId if present in config
      $subnetId = GetSetting("EC2.$region.subnetId");
      if ($subnetId) {
        $ec2_options['SubnetId'] = $subnetId;
      }

      $response = $ec2->runInstances ( $ec2_options );
      $ret = true;
      if (isset($loc) && strlen($loc) && isset($response['Instances'][0]['InstanceId'])) {
        $instance_id = $response['Instances'][0]['InstanceId'];
        EC2Log("Instance $instance_id started: $size ami $ami in $region for $loc with user data: $user_data");
        $tags = "Name=>WebPagetest Agent|WPTLocations=>$loc";
        $static_tags = GetSetting("EC2.tags");
        if ($static_tags) {
          $tags = $tags . '|' . $static_tags;
        }
        $ec2->createTags(array(
          'Resources' => array($instance_id),
          'Tags' => EC2_CreateTagArray($tags)
        ));
      }
    } catch (\Aws\Ec2\Exception\Ec2Exception $e) {
      $error = $e->getMessage();
      EC2LogError("Launching EC2 instance. Region: $region, AMI: $ami, error: $error");
    }
  } else {
      EC2LogError("Launching EC2 instance. Missing key or secret");
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
      $locations[$group[$j]] = GetTesters($group[$j], true);
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

/**
* Write out log messages about EC2 scaling
*
* @param mixed $msg
*/
function EC2Log($msg) {
  $dir = __DIR__ . '/log';
  if (!is_dir($dir))
    mkdir($dir, 0777, true);
  if (is_dir($dir)) {
    // Delete any error logs that are more than a week old
    $files = glob("$dir/ec2.log.*");
    $UTC = new DateTimeZone('UTC');
    $now = time();
    foreach ($files as $file) {
      if (preg_match('/ec2\.log\.([0-9]{8})$/', $file, $matches)) {
        $date = DateTime::createFromFormat('Ymd', $matches[1], $UTC);
        $time = $date->getTimestamp();
        if ($time < $now && $now - $time > 604800)
          unlink($file);
      }
    }
    $date = gmdate('Ymd');
    error_log(gmdate('H:i:s - ') . $msg . "\n", 3, "$dir/ec2.log.$date");
  }
}

/**
* Log an error to both the EC2 log and the error log
*
* @param mixed $msg
*/
function EC2LogError($msg) {
  EC2Log('Error: ' . $msg);
  logError('EC2:' . $msg);
}

/**
 * A tag delimited string looks as follows:
 *   'k1=>v1|k2=>v2|k3=>v3'
 * And this function will return the following:
 *  Array (
 *     [0] => Array (
 *       [Key] => k1
 *       [Value] => v1
 *     )
 *
 *     [1] => Array (
 *       [Key] => k2
 *       [Value] => v2
 *     )
 *
 *     [2] => Array (
 *       [Key] => k3
 *       [Value] => v3
 *     )
 *   )
 *
 * We use hash rockets and pipes to build our string because
 * they are much less likely to be used in a tag than other characters.
 * @param string $tagstring A tag delimited string.
 * @return array An array of array tag key-value pairs
 */
function EC2_CreateTagArray($tagstring) {
  $kvpairs = explode('|', $tagstring);
  $final_array = array();

  foreach ($kvpairs as $kvpair) {
    $pair = explode('=>', $kvpair);
    $final_array[] = array('Key' => $pair[0], 'Value' => $pair[1]);
  }
  return $final_array;
}
?>
