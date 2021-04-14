<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
if(extension_loaded('newrelic')) { 
  newrelic_add_custom_tracer('GetUpdate');
  newrelic_add_custom_tracer('GetJob');
  newrelic_add_custom_tracer('GetTestJob');
  newrelic_add_custom_tracer('CheckCron');
  newrelic_add_custom_tracer('GetTesters');
  newrelic_add_custom_tracer('LockLocation');
  newrelic_add_custom_tracer('GetLocationInfo');
  newrelic_add_custom_tracer('LockTest');
  newrelic_add_custom_tracer('UpdateTester');
  newrelic_add_custom_tracer('GetTesterIndex');
  newrelic_add_custom_tracer('StartTest');
  newrelic_add_custom_tracer('TestToJSON');
  newrelic_add_custom_tracer('logTestMsg');
}

chdir('..');
include 'common.inc';
error_reporting(0);
set_time_limit(600);
$locations = explode(',', $_GET['location']);
$key = array_key_exists('key', $_GET) ? $_GET['key'] : '';
$recover = array_key_exists('recover', $_GET) ? $_GET['recover'] : '';
$pc = array_key_exists('pc', $_GET) ? $_GET['pc'] : '';
$ec2 = array_key_exists('ec2', $_GET) ? $_GET['ec2'] : '';
$screenwidth = array_key_exists('screenwidth', $_GET) ? $_GET['screenwidth'] : '';
$screenheight = array_key_exists('screenheight', $_GET) ? $_GET['screenheight'] : '';
$winver = isset($_GET['winver']) ? $_GET['winver'] : '';
$isWinServer = isset($_GET['winserver']) ? $_GET['winserver'] : '';
$isWin64 = isset($_GET['is64bit']) ? $_GET['is64bit'] : '';
$browsers = isset($_GET['browsers']) ? ParseBrowserInfo($_GET['browsers']) : '';
$key_valid = false;
$tester = null;
$scheduler_node = null;
if (strlen($ec2))
  $tester = $ec2;
elseif (strlen($pc))
  $tester = $pc . '-' . trim($_SERVER['REMOTE_ADDR']);
else
  $tester = trim($_SERVER['REMOTE_ADDR']);

$block_list = GetSetting('block_pc');
if ($block_list && strlen($block_list) && strlen($pc)) {
  $block = explode(',', $block_list);
  if (in_array($pc, $block)) {
    header("HTTP/1.1 403 Unauthorized");
  }
}
  
$dnsServers = '';
if (array_key_exists('dns', $_REQUEST))
  $dnsServers = str_replace('-', ',', $_REQUEST['dns']);

$is_done = false;
$work_servers = GetSetting('work_servers');
if (isset($locations) && is_array($locations) && count($locations) &&
    (!array_key_exists('freedisk', $_GET) || (float)$_GET['freedisk'] > 0.1)) {
  shuffle($locations);
  $location = trim($locations[0]);
  if (!$is_done && array_key_exists('reboot', $_GET) && GetSetting('allowReboot'))
    $is_done = GetReboot();

  foreach ($locations as $loc) {
    $location = trim($loc);
    if (!$is_done && strlen($location)) {
      $is_done = GetJob();
    }
    // see if there are fallbacks specified for the given location (for idle)
    if (!$is_done) {
      $fallbacks = GetLocationFallbacks($location);
      if (is_array($fallbacks) && count($fallbacks)) {
        foreach($fallbacks as $fallback) {
          $location = trim($fallback);
          if (!$is_done && strlen($location))
            $is_done = GetJob();
        }
      }
    }
  }
} elseif (isset($_GET['freedisk']) && (float)$_GET['freedisk'] <= 0.1) {
  if (isset($_GET['reboot']) && GetSetting("lowDiskReboot")) {
    header('Content-type: text/plain');
    header("Cache-Control: no-cache, must-revalidate");
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
    echo "Reboot";
    $is_done = true;
  }
}

// Dynamic config information
if (!$is_done) {
  $response = '';
  if (isset($scheduler_node)) {
    $scheduler = GetSetting('cp_scheduler');
    $scheduler_salt = GetSetting('cp_scheduler_salt');
    if ($scheduler && $scheduler_salt) {
      $response .= "Scheduler:$scheduler $scheduler_salt $scheduler_node\n";
    }
  }
  if (!$is_done && isset($_GET['servers']) && $_GET['servers'] && is_string($work_servers) && strlen($work_servers)) {
    $response .= "Servers:$work_servers\n";
  }
  if (strlen($response)) {
    header('Content-type: text/plain');
    header("Cache-Control: no-cache, must-revalidate");
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
    echo $response;
    $is_done = true;
  }
}

// kick off any cron work we need to do asynchronously
CheckCron();

// Send back a blank result if we didn't have anything.
if (!$is_done) {
  header('Content-type: text/plain');
  header("Cache-Control: no-cache, must-revalidate");
  header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
}

function GetTesterIndex($locInfo, &$testerIndex, &$testerCount, &$offline) {
  global $pc;
  global $ec2;
  global $tester;
  global $location;
  $now = time();

  // get the count of testers for this lication and the index of the current tester for affinity checking
  $testerIndex = null;
  if (function_exists('apcu_fetch') || function_exists('apc_fetch')) {
    $testers = CacheFetch("testers_$location");
    if (!isset($testers) || !is_array($testers))
      $testers = array();
    $testers[$pc] = $now;
    $max_tester_time = min(max(GetSetting('max_tester_minutes', 60), 5), 120) * 60;
    $earliest = $now - $max_tester_time;
    $index = 0;
    foreach($testers as $name => $last_check) {
      if ($name == $pc)
        $testerIndex = $index;
      if ($last_check < $earliest) {
        unset($testers[$name]);
      } else {
        $index++;
      }
    }
    $testerCount = count($testers);
    CacheStore("testers_$location", $testers);
  }

  // If it is an EC2 auto-scaling location, make sure the agent isn't marked as offline      
  $offline = false;
  if (GetSetting('ec2_key') && !isset($testerIndex) || isset($locInfo['ami'])) {
    $testers = GetTesters($location, true);

    // make sure the tester isn't marked as offline (usually when shutting down EC2 instances)                
    $testerCount = isset($testers['testers']) ? count($testers['testers']) : 0;
    if ($testerCount) {
      if (strlen($ec2)) {
        foreach($testers['testers'] as $index => $testerInfo) {
          if (isset($testerInfo['ec2']) && $testerInfo['ec2'] == $ec2 &&
              isset($testerInfo['offline']) && $testerInfo['offline'])
            $offline = true;
            break;
        }
      }
      foreach($testers['testers'] as $index => $testerInfo)
        if ($testerInfo['id'] == $tester) {
          $testerIndex = $index;
          break;
        }
    }
  }
}

function StartTest($testId, $time) {
  $testPath = './' . GetTestPath($testId);
  if (!file_exists("$testPath/test.running")) {
    touch("$testPath/test.running");
  }
  @unlink("$testPath/test.waiting");

  // flag the test with the start time
  $ini = file_get_contents("$testPath/testinfo.ini");
  if (stripos($ini, 'startTime=') === false) {
    $start = "[test]\r\nstartTime=" . gmdate("m/d/y G:i:s", $time);
    $out = str_replace('[test]', $start, $ini);
    file_put_contents("$testPath/testinfo.ini", $out);
  }
}

function TestToJSON($testInfo) {
  $testJson = array();
  $script = '';
  $isScript = false;
  $lines = explode("\r\n", $testInfo);
  foreach($lines as $line) {
    if( strlen(trim($line)) ) {
      if( $isScript ) {
        if( strlen($script) )
          $script .= "\r\n";
        $script .= $line;
      } elseif( !strcasecmp($line, '[Script]') ) {
        $isScript = true;
      } else {
        $pos = strpos($line, '=');
        if( $pos !== false ) {
          $key = trim(substr($line, 0, $pos));
          $value = trim(substr($line, $pos + 1));
          if( strlen($key) && strlen($value) ) {
            if ($key == 'customMetric') {
              $pos = strpos($value, ':');
              if ($pos !== false) {
                $metric = trim(substr($value, 0, $pos));
                $code = base64_decode(substr($value, $pos+1));
                if ($code !== false && strlen($metric) && strlen($code)) {
                  if (!isset($testJson['customMetrics']))
                    $testJson['customMetrics'] = array();
                  $testJson['customMetrics'][$metric] = $code;
                }
              }
            } elseif ($key == 'injectScript') {
              $testJson['injectScript'] = base64_decode($value);
            } elseif ($key == 'lighthouseConfig') {
              $testJson['lighthouseConfig'] = base64_decode($value);
            } elseif( filter_var($value, FILTER_VALIDATE_INT) !== false ) {
              $testJson[$key] = intval($value);
            } elseif( filter_var($value, FILTER_VALIDATE_FLOAT) !== false ) {
              $testJson[$key] = floatval($value);
            } else {
              $testJson[$key] = $value;
            }
          }
        }
      }
    }
  }
  if( strlen($script) )
      $testJson['script'] = $script;
  return $testJson;
}

/**
* Get an actual task to complete
* 
*/
function GetJob() {
  $is_done = false;

  global $location;
  global $key;
  global $key_valid;
  global $pc;
  global $ec2;
  global $tester;
  global $recover;
  global $dnsServers;
  global $screenwidth;
  global $screenheight;
  global $winver;
  global $isWinServer;
  global $isWin64;
  global $browsers;
  global $scheduler_node;

  $workDir = "./work/jobs/$location";
  $locInfo = GetLocationInfo($location);
  $locKey = GetSetting('location_key', '');
  if (isset($locInfo) && is_array($locInfo) && isset($locInfo['key']))
    $locKey = $locInfo['key'];
  if (strpos($location, '..') == false &&
      strpos($location, '\\') == false &&
      strpos($location, '/') == false &&
      (!strlen($locKey) || $key_valid || !strcmp($key, $locKey))) {
    if (isset($locInfo) && is_array($locInfo) && isset($locInfo['scheduler_node'])) {
      $scheduler_node = $locInfo['scheduler_node'];
    }
    $key_valid = true;
    GetTesterIndex($locInfo, $testerIndex, $testerCount, $offline);
    
    if (!$offline) {
      if (!isset($testerIndex))
        $testerIndex = 0;
      if (!$testerCount)
        $testerCount = 1;
      $testInfo = GetTestJob($location, $fileName, $workDir, $priority, $pc, $testerIndex, $testerCount);
      if (isset($testInfo)) {
        $is_done = true;
        $testJson = null;
        $testId = null;
        
        header ("Content-type: application/json");
        header("Cache-Control: no-cache, must-revalidate");
        header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

        if (substr($testInfo, 0, 1) == '{') {
          $testJson = json_decode($testInfo, true);
          if (isset($testJson['Test ID'])) {
            $testId = $testJson['Test ID'];
          }
        } else {
          // extract the test ID from the job file
          if( preg_match('/Test ID=([^\r\n]+)\r/i', $testInfo, $matches) )
            $testId = trim($matches[1]);
        }

        if( isset($testId) ) {
          $dotPos = stripos($testId, ".");
          $realTestId = $dotPos === false ? $testId : substr($testId, $dotPos + 1);
          $time = time();
          StartTest($testId, $time);
          if (!isset($_REQUEST['testinfo'])) {
            $lock = LockTest($testId);
            if ($lock) {
              if (isset($testJson) && isset($testJson['testinfo'])) {
                $testInfoJson = &$testJson['testinfo'];
              } else {
                $testInfoJson = GetTestInfo($testId);
              }
              if ($testInfoJson) {
                if (!array_key_exists('tester', $testInfoJson) || !strlen($testInfoJson['tester']))
                  $testInfoJson['tester'] = $tester;
                if (isset($dnsServers) && strlen($dnsServers))
                  $testInfoJson['testerDNS'] = $dnsServers;
                if (!array_key_exists('started', $testInfoJson) || !$testInfoJson['started']) {
                  $testInfoJson['started'] = $time;
                  logTestMsg($testId, "Starting test (initiated by tester $tester)");
                }
                $testInfoJson['id'] = $realTestId;
                SaveTestInfo($testId, $testInfoJson);
              }
              UnlockTest($lock);
            }
          } elseif(isset($testJson['testinfo'])) {
            $testJson['testinfo']['id'] = $realTestId;
            $testJson['testinfo']['tester'] = $tester;
          }
        }

        if (isset($fileName)) {
          @unlink("$workDir/$fileName");
        }
        
        if (!isset($testJson)) {
          $testJson = TestToJSON($testInfo);
        }
        if (isset($testJson)) {
          // See if we need to include apk information
          if (isset($_REQUEST['apk']) && is_file(__DIR__ . '/update/apk.dat')) {
            $apk_info = json_decode(file_get_contents(__DIR__ . '/update/apk.dat'), true);
            if (isset($apk_info) && is_array($apk_info) && isset($apk_info['packages']) && is_array($apk_info['packages'])) {
              $protocol = getUrlProtocol();
              $update_path = dirname($_SERVER['PHP_SELF']) . '/update/';
              $base_uri = "$protocol://{$_SERVER['HTTP_HOST']}$update_path";
              foreach ($apk_info['packages'] as $package => $info)
                $apk_info['packages'][$package]['apk_url'] = "$base_uri{$apk_info['packages'][$package]['file_name']}?md5={$apk_info['packages'][$package]['md5']}";
              $testJson['apk_info'] = $apk_info;
            }
          }
          if (is_string($work_servers) && strlen($work_servers)) {
            $testJson['work_servers'] = $work_servers;
          }
          $profile_data = GetSetting('profile_data');
          if (is_string($profile_data) && strlen($profile_data)) {
            $testJson['profile_data'] = $profile_data;
          }
          echo json_encode($testJson);
          $ok = true;
        }
      }

      // keep track of the last time this location reported in
      $testerInfo = array();
      $testerInfo['ip'] = $_SERVER['REMOTE_ADDR'];
      $testerInfo['pc'] = $pc;
      $testerInfo['ec2'] = $ec2;
      $testerInfo['ver'] = array_key_exists('version', $_GET) ? $_GET['version'] : $_GET['ver'];
      $testerInfo['freedisk'] = @$_GET['freedisk'];
      $testerInfo['upminutes'] = @$_GET['upminutes'];
      $testerInfo['ie'] = @$_GET['ie'];
      $testerInfo['dns'] = $dnsServers;
      $testerInfo['video'] = @$_GET['video'];
      $testerInfo['GPU'] = @$_GET['GPU'];
      $testerInfo['screenwidth'] = $screenwidth;
      $testerInfo['screenheight'] = $screenheight;
      $testerInfo['winver'] = $winver;
      $testerInfo['isWinServer'] = $isWinServer;
      $testerInfo['isWin64'] = $isWin64;
      $testerInfo['test'] = '';
      if (isset($browsers) && count(array_filter($browsers, 'strlen')))
        $testerInfo['browsers'] = $browsers;
      if (isset($testId))
        $testerInfo['test'] = $testId;
      UpdateTester($location, $tester, $testerInfo);
    }
  }
  
  return $is_done;
}

/**
* See if there is a software update
* 
*/
function GetUpdate() {
  global $location;
  global $tester;
  $ret = false;

  // see if the client sent a version number
  if ($_GET['ver']) {
    $fileBase = '';
    if( isset($_GET['software']) && strlen($_GET['software']) )
      $fileBase = trim($_GET['software']);
    
    $update = CacheFetch("update-$fileBase");
    
    $updateDir = './work/update';
    if (is_dir("$updateDir/$location"))
      $updateDir = "$updateDir/$location";

    if (!isset($update)) {
      // see if we have any software updates
      if (is_file("$updateDir/{$fileBase}update.ini") && is_file("$updateDir/{$fileBase}update.zip")) {
        $update = parse_ini_file("$updateDir/{$fileBase}update.ini");
      }
      CacheStore("update-$fileBase", $update, 60);
    }
    
    if (isset($update)) {
      // Check for inequality allows both upgrade and quick downgrade
      if ($update['ver'] && intval($update['ver']) !== intval($_GET['ver'])) {
        header('Content-Type: application/zip');
        header("Cache-Control: no-cache, must-revalidate");
        header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

        readfile_chunked("$updateDir/{$fileBase}update.zip");
        $ret = true;
      }
    }
  }
  
  return $ret;
}

/**
* See if we need to reboot this tester
* 
*/
function GetReboot() {
  global $location;
  global $pc;
  global $ec2;
  global $tester;
  $reboot = false;
  $name = @strlen($ec2) ? $ec2 : $pc;
  if (isset($name) && strlen($name) && isset($location) && strlen($location)) {
    $rebootFile = "./work/jobs/$location/$name.reboot";
    if (is_file($rebootFile)) {
      unlink($rebootFile);
      $reboot = true;
    }
  }
  // If we have a 100% error rate for the current PC, send it a reboot
  if (!$reboot) {
    $testers = GetTesters($location);
    foreach ($testers as $t) {
      if ($t['id'] == $tester && !$rebooted) {
        if ($t['errors'] >= 100) {
          UpdateTester($location, $tester, null, null, null, true);
          $reboot = true;
        }
        break;
      }
    }
  }

  if ($reboot) {
    header('Content-type: text/plain');
    header("Cache-Control: no-cache, must-revalidate");
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
    echo "Reboot";
  }
  return $reboot;
}

/**
* Parse browser and version info
* 
*/
function ParseBrowserInfo($browerString){
  $browserInfo = array();
  if($browerString){
      foreach(explode(",", $browerString) as $info){
          $data = explode(':', $info);
          if($data[0] && $data[1]){
              $browserInfo[$data[0]] = $data[1];
          }
      }
  }

  return $browserInfo;
}
?>
