<?php
if (php_sapi_name() != 'cli')
  exit(1);
set_time_limit(0);
$dir = getcwd();
chdir(__DIR__);
chdir('..');

// Startup routine for web servers running on EC2 (launched from cli)
// Gets additional settings from user data and overrides current settings
if (!Initialized()) {
  if ($argc < 2 || $argv[1] !== 'updated') {
    // wait until we have connectivity
    echo "waiting for network...\n";
    while (!GetUserData())
      sleep(5);
    echo "updating";
    // Update from git and re-run
    shell_exec('git pull origin master');
    echo "Re-launching for update\n";
    shell_exec('php "' . __FILE__ .'" updated');
  } else {
    echo "initializing\n";
    $api_key = null;
    UpdateSettings();
    SetupAPIKeys();
  }
}

// go back to whatever working directory was being used before running the script
chdir($dir);

function UpdateSettings() {
  global $api_key;
  echo "Updating Settings\n";
  $user = GetUserData();
  if (is_array($user) && count($user)) {
    // load the current settings
    copy("./settings/settings.ini", "./settings/settings.ini.bak");
    $current = file_get_contents("./settings/settings.ini");
    if ($current && strlen($current)) {
      $settings = "";
      $lines = explode("\n", $current);
      foreach ($lines as $line) {
        $line = trim($line);
        if (!preg_match('/^(?P<key>[^=]+)=(?P<value>.*)$/', $line, $matches) ||
            !array_key_exists($matches['key'], $user)) {
            $settings .= $line;
        }
        $settings .= "\n";
      }
      $settings .= "\n;\n;Settings from user data\n;\n\n";
      foreach($user as $key => $value) {
        if ($key == 'api_key')
          $api_key = trim($value);
        else
          $settings .= "$key=$value\n";
      }
      $location_key = sha1(uniqid(mt_rand(), true));
      $settings .= "\n";
      $settings .= "location_key=$location_key\n";
      $settings .= "ec2_initialized=1\n";
      file_put_contents("./settings/settings.ini", $settings);
    }
  }
}

function SetupAPIKeys() {
  global $api_key;
  if (!isset($api_key))
    $api_key = sha1(uniqid(mt_rand(), true));
  $secret = sha1(uniqid(mt_rand(), true));
  $server_key = sha1(uniqid(mt_rand(), true));

  $keys = "[server]\n";
  $keys .= "secret=$secret\n";
  $keys .= "key=$server_key\n";
  $keys .= "\n";
  $keys .= "[$server_key]\n";
  $keys .= "description=Server Key for internal use\n";
  $keys .= "limit=0\n";
  $keys .= "\n";
  $keys .= "[$api_key]\n";
  $keys .= "description=API Key\n";
  $keys .= "limit=0\n";
  $keys .= "\n";
  
  file_put_contents('./settings/keys.ini', $keys);
}

function GetUserData() {
  $ret = false;
  $data = file_get_contents("http://169.254.169.254/latest/user-data");
  if ($data !== false && strlen($data)) {
    $ret = array();
    $lines = explode("\n", $data);
    foreach ($lines as $line) {
      $line = trim($line);
      if (preg_match('/^(?P<key>[^=]+)=(?P<value>.*)$/', $line, $matches))
        $ret[$matches['key']] = $matches['value'];
    }
  }
  return $ret;
}

function Initialized() {
  $ret = false;
  $settings = parse_ini_file('./settings/settings.ini');
  if ($settings && is_array($settings) && isset($settings['ec2_initialized']) && $settings['ec2_initialized'])
    $ret = true;
  return $ret;
}
?>
