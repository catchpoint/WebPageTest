<?php
// Jobs that need to run every hour
chdir('..');
include 'common.inc';
ignore_user_abort(true);
set_time_limit(3600);
error_reporting(E_ALL);

$lock = Lock("cron-60", false, 3600);
if (!isset($lock))
  exit(0);

GitUpdate();
AgentUpdate();

/**
* Automatically update from the git master (if configured)
* 
*/
function GitUpdate() {
  if (GetSetting('gitUpdate'))
    shell_exec('git pull origin master');
}

/**
* Automatically update the agent binaries from the public agents (if configured)
* 
*/
function AgentUpdate() {
  $updateServer = GetSetting('agentUpdate');
  if ($updateServer && strlen($updateServer)) {
    if (!is_dir('./work/update'))
      mkdir('./work/update', 0777, true); 
    $url = $updateServer . 'work/getupdates.php';
    $updates = json_decode(http_fetch($url), true);
    if ($updates && is_array($updates) && count($updates)) {
      foreach($updates as $update) {
        $needsUpdate = true;
        $ini = "./work/update/{$update['name']}.ini";
        $zip = "./work/update/{$update['name']}.zip";
        if (is_file($ini) && is_file($zip)) {
          $current = parse_ini_file($ini);
          if ($current['ver'] == $update['ver'])
            $needsUpdate = false;
        }
        if ($needsUpdate && isset($update['md5'])) {
          $tmp = "./work/update/{$update['name']}.tmp";
          if (is_file($tmp))
            unlink($tmp);
          $url = $updateServer . str_replace(" ","%20","work/update/{$update['name']}.zip?v={$update['ver']}");
          if (http_fetch_file($url, $tmp)) {
            $md5 = md5_file($tmp);
            if ($md5 == $update['md5']) {
              if (is_file("$ini.bak"))
                unlink("$ini.bak");
              if (is_file($ini))
                rename($ini, "$ini.bak");
              if (is_file("$zip.bak"))
                unlink("$zip.bak");
              if (is_file($zip))
                rename($zip, "$zip.bak");
              rename($tmp, $zip);
              $z = new ZipArchive;
              if ($z->open($zip) === TRUE) {
                $z->extractTo('./work/update', "{$update['name']}.ini");
                $z->close();
              }
            }
          }
        }
      }
    }
  }
}

?>
