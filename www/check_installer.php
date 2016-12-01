<?php
if(extension_loaded('newrelic')) {
    newrelic_add_custom_tracer('ApcCheckIp');
    newrelic_add_custom_tracer('CheckIp');
}
include 'common_lib.inc';
error_reporting(E_ERROR | E_PARSE);

$has_apcu = function_exists('apcu_fetch') && function_exists('apcu_store');
$has_apc = function_exists('apc_fetch') && function_exists('apc_store');

$ok = false;
$ip = $_SERVER["REMOTE_ADDR"];
if (isset($_SERVER["HTTP_X_FORWARDED_FOR"])) {
  $forwarded = explode(',',$_SERVER["HTTP_X_FORWARDED_FOR"]);
  if (isset($forwarded) && is_array($forwarded) && count($forwarded)) {
    $forwarded_ip = trim(end($forwarded));
    if (strlen($forwarded_ip) && $forwarded_ip != "127.0.0.1")
        $ip = $forwarded_ip;
  }
}
if (isset($_SERVER["HTTP_FASTLY_CLIENT_IP"]))
  $ip = $_SERVER["HTTP_FASTLY_CLIENT_IP"];

// See if the IP comes from an EC2 region
$url_replace = null;
$region = null;
$s3_settings_file = __DIR__ . '/settings/s3installers.ini';
if (is_file($s3_settings_file)) {
  $s3settings = parse_ini_file($s3_settings_file, true);
  $region = GetEC2Region($ip);
  if (isset($region) && isset($s3settings['buckets'][$region])) {
    $bucket = trim($s3settings['buckets'][$region]);
    $url_replace = "http://$bucket.s3.amazonaws.com/";
  }
}

if (isset($_REQUEST['installer']) && isset($ip)) {
  $installer = $_REQUEST['installer'];
  $installer_postfix = GetSetting('installerPostfix');
  if ($installer_postfix) {
    $installer .= $installer_postfix;
    $ok = true;
  } elseif ($ip == '72.66.115.14' ||  // Public WebPageTest
            $ip == '216.239.44.25' || // Gtech_ATL
            $ip == '149.20.63.13') {  // HTTP Archive
    $ok = true;
  } elseif (isset($url_replace)) {
    $ok = true;
  } elseif (preg_match('/^(software|browsers\/[-_a-zA-Z0-9]+)\.dat$/', $installer)) {
    $ok = IsValidIp($ip, $installer);
  }
}

if ($ok) {
  $file = __DIR__ . '/installers/' . $installer;
  if ($has_apcu)
    $data = apcu_fetch("installer-$installer");
  elseif ($has_apc)
    $data = apc_fetch("installer-$installer");
  else
    $data = null;
  if (!$data && is_file($file)) {
    $data = file_get_contents($file);
    ModifyInstaller($data);
    if ($has_apcu)
      apcu_store("installer-$installer", $data, 600);
    elseif ($has_apc)
      apc_store("installer-$installer", $data, 600);
  }
  if (isset($data) && strlen($data)) {
    header("Content-type: text/plain");
    header("Cache-Control: no-cache, must-revalidate");
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
    if (isset($url_replace)) {
      $data = str_replace('http://cdn.webpagetest.org/', $url_replace, $data);
    }
    echo $data;
  } else {
    header('HTTP/1.0 404 Not Found');
  }
} else {
  header('HTTP/1.0 403 Forbidden');
}

function IsValidIp($ip, $installer) {
  global $has_apc;
  global $has_apcu;
  $ok = true;
  
  // Make sure it isn't on our banned IP list
  $filename = __DIR__ . '/settings/block_installer_ip.txt';
  if (is_file($filename)) {
    $blocked_addresses = file($filename, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (in_array($ip, $blocked_addresses)) {
      $ok = false;
    }
  }

  if ($ok ) {
    $ok = ($has_apc || $has_apcu) ? ApcCheckIp($ip, $installer) : CheckIp($ip, $installer);
    if (!$ok) {
      logMsg("BLOCKED - $ip : {$_REQUEST['installer']}", "log/software.log", true);
    }
  }
  return $ok;
}

function ApcCheckIp($ip, $installer) {
  global $has_apcu;
  $ok = true;
  if (isset($ip) && strlen($ip)) {
    $ver = '';
    if (isset($_REQUEST['wptdriverVer']))
      $ver = $_REQUEST['wptdriverVer'];
    $now = time();
    $key = "inst-ip-$ip-$ver-$installer";
    $history = $has_apcu ? apcu_fetch($key) : apc_fetch($key);
    if (!$history) {
      $history = array();
    } elseif (!is_array($history)) {
      $history = json_decode($history, true);
      if (!$history) {
        $history = array();
      }
    }
    $history[] = $now;
    // Use 1KB blocks to prevent fragmentation
    if ($has_apcu)
      apcu_store($key, $history, 604800);
    else
      apc_store($key, $history, 604800);
    if (count($history) > 10)
      array_shift($history);
    $count = 0;
    foreach ($history as $time) {
      if ($now - $time < 3600)
        $count++;
    }
    if ($count > 4) {
      $ok = false;
    }
  }
  return $ok;
}

/**
* For each IP/Installer pair, keep track of the last 4 checks and if they
* were within the last hour fail the request.
* 
* @param mixed $installer
*/
function CheckIp($ip, $installer) {
  $ok = true;
  if (isset($ip) && strlen($ip)) {
    $lock = Lock("Installers", true, 5);
    if ($lock) {
      $now = time();
      $file = "./tmp/installers.dat";
      if (gz_is_file($file))
        $history = json_decode(gz_file_get_contents($file), true);
      if (!isset($history) || !is_array($history))
        $history = array();
      
      if (isset($history[$ip])) {
        if (isset($history[$ip][$installer])) {
          $history[$ip][$installer][] = $now;
          if (count($history[$ip][$installer]) > 10)
            array_shift($history[$ip][$installer]);
          if (isset($history[$ip]["last-$installer"]) &&
              $now - $history[$ip]["last-$installer"] < 3600) {
            $count = 0;
            foreach ($history[$ip][$installer] as $time) {
              if ($now - $time < 3600)
                $count++;
            }
            if ($count > 4) {
              $ok = false;
            }
          }
        } else {
          $history[$ip][$installer] = array($now);
        }
      } else {
        $history[$ip] = array($installer => array($now));
      }
      $history[$ip]['last'] = $now;
      if ($ok) {
        $history[$ip]["last-$installer"] = $now;
      }
      
      // prune any agents that haven't connected in 7 days
      foreach ($history as $agent => $info) {
        if ($now - $info['last'] > 604800) {
          unset($history[$agent]);
        }
      }
      
      gz_file_put_contents($file, json_encode($history));
      Unlock($lock);
    }
  }
  return $ok;
}

/**
* Override installer options from settings
* 
* @param mixed $data
*/
function ModifyInstaller(&$data) {
  $always_update = GetSetting('installer-always-update');
  if ($always_update)
    $data = str_replace('update=0', 'update=1', $data);
  $base_url = GetSetting('installer-base-url');
  if ($base_url && strlen($base_url))
    $data = str_replace('http://cdn.webpagetest.org/', $base_url, $data);
}

function GetEC2Region($ip) {
  $region = null;
  $json = null;
  
  if (isset($_REQUEST['ec2zone'])) {
    $region = substr($_REQUEST['ec2zone'], 0, strlen($_REQUEST['ec2zone']) - 1);
  } else {
    $lock = Lock('EC2Regions');
    if (isset($lock)) {
      $region_file = __DIR__ . '/dat/ec2addresses.json';
      $needs_update = false;
      if (is_file($region_file)) {
        $now = time();
        $updated = filemtime($region_file);
        if ($now > $updated && $now - $updated >= 86400)
          $needs_update = true;
      }
      
      if (!is_file($region_file) || $needs_update) {
        $json = file_get_contents('https://ip-ranges.amazonaws.com/ip-ranges.json');
        if (isset($json) && $json !== FALSE && strlen($json))
          file_put_contents($region_file, $json);
      }

      if (!isset($json) && is_file($region_file)) {
        $json = file_get_contents($region_file);
      }
      Unlock($lock);
    }

    if (isset($json)) {
      $regions = json_decode($json, true);
      if (isset($regions['prefixes']) && is_array($regions['prefixes'])) {
        $ip = ip2long($ip);
        foreach($regions['prefixes'] as $prefix) {
          if (isset($prefix['ip_prefix']) && isset($prefix['region'])) {
            list ($subnet, $bits) = explode('/', $prefix['ip_prefix']);
            $subnet = ip2long($subnet);
            $mask = -1 << (32 - $bits);
            $subnet &= $mask;
            if (($ip & $mask) == $subnet) {
              $region = $prefix['region'];
              break;
            }
          }
        }
      }
    }
  }
  
  return $region;
}
?>
