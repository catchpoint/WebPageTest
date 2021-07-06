<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once('common.inc');

if (!$privateInstall && !$admin) {
  header("HTTP/1.1 403 Unauthorized");
  exit;
}
error_reporting(E_ALL);
$days = 0;
if( isset($_GET["days"]) )
    $days = (int)$_GET["days"];

$whitelist = array();
if (file_exists('./settings/server/whitelist.txt')) {
  $wl = file('./settings/server/whitelist.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
} elseif (file_exists('./settings/common/whitelist.txt')) {
  $wl = file('./settings/common/whitelist.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
} else {
  $wl = file('./settings/whitelist.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
}
if (file_exists('./settings/server/blockip.txt')) {
  $blockIps = file('./settings/server/blockip.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
} elseif (file_exists('./settings/common/blockip.txt')) {
  $blockIps = file('./settings/common/blockip.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
} else {
  $blockIps = file('./settings/blockip.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
}
foreach ($wl as &$w) {
  $parts = explode(" ", $w);
  $ip = trim($parts[0]);
  $comment = trim($parts[1]);
  $whitelist[$ip] = $comment;
}

$counts = array();
$dayCounts = array();
$users = array();
$keys = array();

// load the API keys
$keys_file = __DIR__ . '/settings/keys.ini';
if (file_exists(__DIR__ . '/settings/common/keys.ini'))
  $keys_file = __DIR__ . '/settings/common/keys.ini';
if (file_exists(__DIR__ . '/settings/server/keys.ini'))
  $keys_file = __DIR__ . '/settings/server/keys.ini';
$keys = parse_ini_file($keys_file, true);

$redis = null;
if ($redis_server = GetSetting('redis_api_keys')) {
  $redis = new Redis();
  if (!$redis->connect($redis_server, 6379, 30)) {
    $redis = null;
  }
}

$targetDate = new DateTime('now', new DateTimeZone('GMT'));
for ($offset = 0; $offset <= $days; $offset++) {
  $dayCount = array();
  $fileName = './logs/' . $targetDate->format("Ymd") . '.log';
  $lines = file($fileName, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if ($lines) {
    foreach ($lines as $line) {
      $parseLine = str_replace("\t", "\t ", $line);
      $parts = explode("\t", $parseLine);
      if (isset($parts[1])) {
        $ip = trim($parts[1]);
        if (strlen($ip)) {
          $key = @trim($parts[13]);
          if (isset($_REQUEST['api']) || !strlen($key)) {
            $count = 1;
            if (array_key_exists(14, $parts))
              $count = intval(trim($parts[14]));
            $count = max(1, $count);
            if( ($admin) && strlen($key) && $key != $keys['server']['key'] ) {
              if (!isset($users[$ip]))
                $users[$ip] = array();
              if (!in_array($key, $users[$ip]))
                $users[$ip][] = $key;
            }
            if( isset($counts[$ip]) )
              $counts[$ip] += $count;
            else
              $counts[$ip] = $count;

            if( isset($dayCount[$ip]) )
              $dayCount[$ip] += $count;
            else
              $dayCount[$ip] = $count;
          }
        }
      }
    }
  }

  $dayCounts[] = $dayCount;

  // on to the previous day
  $targetDate->modify('-1 day');
}

// sort the counts descending
arsort($counts);

$title = 'WebPageTest - Check IPs';
include 'admin_header.inc';

echo '<table class="table"><tr><th>Total</th>';

if ($days < 15) {
  foreach( $dayCounts as $index => &$dayCount ) {
    echo "<th>Day $index</th>";
  }
}
echo '<th>IP Address (API Keys)</th></tr>';

foreach($counts as $ip => $count) {
  if ($count > 500) {
    echo "<tr><td>$count</td>";
    if ($days < 15) {
      foreach ($dayCounts as $index => &$dayCount) {
        $c = 0;
        if( isset($dayCount[$ip]) )
          $c = $dayCount[$ip];
        echo "<td>$c</td>";
      }
    }
    $names = '';
    if (isset($users[$ip])) {
      $names = ' (';
      $separator = '';
      foreach ($users[$ip] as $key) {
        if (!isset($keys[$key])) {
          // See if we have API key info in redis
          $keys[$key] = GetKeyInfo($key);
        }
        if (isset($keys[$key]) && isset($keys[$key]['contact'])) {
          $names .= $separator;
          $names .= $keys[$key]['contact'];
          if (isset($keys[$key]['limit'])) {
            $names .= ':';
            $names .= $keys[$key]['limit'];
          }
          $separator = ', ';
        }
      }
      $names .= ')';
    }
    $blocked = IPBlocked($ip) ? ' (Blocked)' : '';
    echo "<td>$ip$names$blocked</td></tr>\n";
  } else {
    break;
  }
}
echo "</table>";

include 'admin_footer.inc';

function IPBlocked($ip) {
  $blocked = false;
  global $blockIps;
  if (isset($blockIps) && is_array($blockIps) && count($blockIps)) {
    foreach( $blockIps as $block ) {
      $block = trim($block);
      if (strlen($block) && preg_match("/$block/", $ip)) {
        $blocked = true;
        break;
      }
    }
  }
  return $blocked;
}

function GetKeyInfo($key) {
  global $redis;
  $info = array();
  $account = CacheFetch("APIkey_$key");
  if (!isset($account)) {
    $response = $redis->get("API_$key");
    if ($response && strlen($response)) {
      $account = json_decode($response, true);
      if (isset($account) && is_array($account)) {
        CacheStore("APIkey_$key", $account, 60);
      }
    }
  }
  if (isset($account) && is_array($account) && isset($account['email'])) {
    $info['contact'] = $account['email'];
  }

  return $info;
}
?>
