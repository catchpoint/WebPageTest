<?php
// Disable the update logic as it has long-since been deprecated
header('HTTP/1.0 403 Forbidden');
exit();

// Return the version, size and md5 hash of all of the agent updates currently available
header("Cache-Control: no-cache, must-revalidate");
header("Pragma: no-cache");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
$updates = array();
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

if (!isset($ip) || IsValidIp($ip)) {
  $files = glob('./update/*.ini');
  if ($files && is_array($files) && count($files)) {
    foreach ($files as $file) {
      $name = basename($file,'.ini');
      $data = parse_ini_file($file);
      if (isset($data['ver'])) {
        $ver = $data['ver'];
        $md5 = false;
        $key = "update.$name.zip.$ver.md5";

        if (function_exists('apcu_fetch'))
          $md5 = apcu_fetch($key);
        elseif (function_exists('apc_fetch'))
          $md5 = apc_fetch($key);
        if (!$md5) {
          $md5 = md5_file("./update/$name.zip");
          
          if ($md5 && function_exists('apcu_store'))
            apcu_store($key, $md5);
          elseif ($md5 && function_exists('apc_store'))
            apc_store($key, $md5);
        }
        if ($md5)
          $updates[] = array('name' => $name, 'ver' => $ver, 'md5' => $md5);
      }
    }
  }
  echo json_encode($updates);
} else {
  header('HTTP/1.0 403 Forbidden');
}

function IsValidIp($ip) {
  $ok = true;
  
  // Make sure it isn't on our banned IP list
  $filename = __DIR__ . '/settings/block_installer_ip.txt';
  if (is_file($filename)) {
    $blocked_addresses = file($filename, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($blocked_addresses as $address) {
      if (strpos($ip, $address) === 0) {
        $ok = false;
      }
    }
  }
  return $ok;
}
?>
