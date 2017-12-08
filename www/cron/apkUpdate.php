<?php
header("Content-type: text/plain");
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
$old_dir = getcwd();
chdir(__DIR__);
chdir('..');
$docroot = getcwd();
require_once('common.inc');
$package_list = GetSetting('apkPackages');
$packages = explode(',', $package_list);
if (!is_dir("$docroot/work/update"))
  mkdir("$docroot/work/update", 0777, true);
$update_path = "$docroot/work/update";
$data_file = "$update_path/apk.dat";
if (is_file($data_file))
  $apk_data = json_decode(file_get_contents($data_file), true);
if (!isset($apk_data) || !is_array($apk_data))
  $apk_data = array('packages' => array());
foreach ($packages as $package)
  UpdateApk($update_path, $package, $apk_data);
$apk_data['last_update'] = time();
file_put_contents($data_file, json_encode($apk_data));
chdir($old_dir);

function  UpdateApk($update_path, $package, &$apk_data) {
  echo "Checking for update for $package...\n";
  if (!isset($apk_data['packages'][$package]))
    $apk_data['packages'][$package] = array('device_path' => '', 'size' => 0, 'date' => '', 'time' => '', 'md5' => '');
  $path = GetApkDevicePath($package);
  if (isset($path)) {
    if (GetApkFileInfo($path, $size, $date, $time)) {
      if ($path != $apk_data['packages'][$package]['device_path'] ||
          $size != $apk_data['packages'][$package]['size'] ||
          $date != $apk_data['packages'][$package]['date'] ||
          $time != $apk_data['packages'][$package]['time']) {
        $temp_file = "$update_path/tmp.apk";
        echo "$package updated, downloading\n";
        $md5 = FetchDeviceApk($path, $temp_file, $size);
        if (isset($md5)) {
          $file_name = "$package.apk";
          $local_file = "$update_path/$file_name";
          if (is_file($local_file))
            unlink($local_file);
          if (rename($temp_file, $local_file)) {
            chmod($local_file, 0666);
            $apk_data['packages'][$package] = array(
              'device_path' => $path,
              'file_name' => $file_name,
              'size' => $size,
              'date' => $date,
              'time' => $time,
              'md5' => $md5
            );
          }
        }
      } else {
        echo "$package not updated\n";
      }
    }
  }
}

function GetApkDevicePath($package) {
  $path = null;
  exec("adb shell pm path $package", $output, $result);
  if (!$result && isset($output) && is_array($output)) {
    $last = end($output);
    if (substr($last, 0, 8) == 'package:') {
      $path = trim(substr($last, 8));
      echo "$package apk path is $path\n";
    }
  } else {
    echo "Error fetching path for $package\n";
  }
  return $path;
}

function GetApkFileInfo($path, &$size, &$date, &$time) {
  $ok = false;
  $command = "adb shell ls -l " . escapeshellarg($path);
  echo "$command\n";
  exec($command, $output, $result);
  if (!$result && isset($output) && is_array($output)) {
    $last = end($output);
    $parts = preg_split('/\s+/', $last);
    if (count($parts) >= 8) {
      $size = intval($parts[4]);
      $date = trim($parts[5]);
      $time = trim($parts[6]);
      echo "Size: $size, Date: $date, Time: $time\n";
      if ($size > 0 && strlen($date) && strlen($time))
        $ok = true;
    } elseif (count($parts) >= 7) {
      $size = intval($parts[3]);
      $date = trim($parts[4]);
      $time = trim($parts[5]);
      echo "Size: $size, Date: $date, Time: $time\n";
      if ($size > 0 && strlen($date) && strlen($time))
        $ok = true;
    }
  } else {
    echo "Error listing APK info";
  }
  return $ok;
}

function FetchDeviceApk($path, $local_file, $size) {
  $md5 = null;
  if (is_file($local_file))
    unlink($local_file);
  if (!is_file($local_file)) {
    $command = "adb pull " . escapeshellarg($path) . ' ' . escapeshellarg($local_file);
    echo "$command\n";
    exec($command, $output, $result);
    if (!$result && is_file($local_file)) {
      $pulled_size = filesize($local_file);
      if ($pulled_size == $size) {
        $md5 = md5_file($local_file);
        echo "Pulled $path to $local_file - md5: $md5\n";
      } else {
        echo "Wrong file size downloading $path ($size) to $local_file ($pulled_size)\n";
      }
    } else {
      echo "Failed to pull $path to $local_file\n";
    }
  }
  return $md5;
}
?>
