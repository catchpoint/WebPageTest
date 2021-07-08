<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

require_once('common.inc');
if (!$privateInstall && !$admin) {
  header("HTTP/1.1 403 Unauthorized");
  exit;
}

error_reporting(0);
if (file_exists('./settings/server/blockurl.txt')) {
  $blockUrls = file('./settings/server/blockurl.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
} elseif (file_exists('./settings/common/blockurl.txt')) {
  $blockUrls = file('./settings/common/blockurl.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
} else {
  $blockUrls = file('./settings/blockurl.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
}
if (file_exists('./settings/server/blockdomains.txt')) {
  $blockHosts = file('./settings/server/blockdomains.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
} elseif (file_exists('./settings/common/blockdomains.txt')) {
  $blockHosts = file('./settings/common/blockdomains.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
} else {
  $blockHosts = file('./settings/blockdomains.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
}

$days = 0;
if( isset($_GET["days"]) )
    $days = (int)$_GET["days"];

$counts = array();
$dayCounts = array();
$dates = array();

$targetDate = new DateTime($from, new DateTimeZone('GMT'));
for($offset = 0; $offset <= $days; $offset++)
{
    $dayCount = array();

    // figure out the name of the logfile
    $fileName = './logs/' . $targetDate->format("Ymd") . '.log';
    $dates[] = $targetDate->format("M j");

    // load the logfile into an array of lines
    $lines = file($fileName, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if( $lines) {
      foreach($lines as &$line) {
        $parseLine = str_replace("\t", "\t ", $line);
        $parts = explode("\t", $parseLine);
        if( isset($parts[5]) )
        {
          $url = trim($parts[5]);
          if (strlen($url)) {
            $key = @trim($parts[13]);
            if (isset($_REQUEST['api']) || !strlen($key)) {
              $urlParts = parse_url($url);
              $host = trim($urlParts['host']);
              if (!strlen($host))
                $host = $url;
              $count = 1;
              if (array_key_exists(14, $parts))
                $count = intval(trim($parts[14]));
              $count = max(1, $count);
              if( isset($counts[$host]) )
                $counts[$host] += $count;
              else
                $counts[$host] = $count;

              if( isset($dayCount[$host]) )
                $dayCount[$host] += $count;
              else
                $dayCount[$host] = $count;
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


$title = 'WebPageTest - Check URLs';
include 'admin_header.inc';

echo '<table class="table"><tr><th>Total</th>';
if ($days < 15) {
  foreach( $dayCounts as $index => &$dayCount ) {
      echo "<th>{$dates[$index]}</th>";
  }
}
echo '<th>URL Host</th></tr>';

foreach($counts as $url => $count) {
    if( $count > 50 ) {
        echo "<tr><td>$count</td>";
        if ($days < 15) {
          foreach( $dayCounts as $index => &$dayCount ) {
              $c = 0;
              if( isset($dayCount[$url]) )
                  $c = $dayCount[$url];
              echo "<td>$c</td>";
          }
        }
        $blocked = FQDNBlocked($url) ? ' (Blocked)' : '';
        echo "<td>$url$blocked</td></tr>\n";
    } else {
        break;
    }
}
echo "</table>";

include 'admin_footer.inc';

function FQDNBlocked($fqdn) {
  $blocked = false;
  global $blockUrls, $blockHosts;
  if ($blockUrls !== false && count($blockUrls) ||
    $blockHosts !== false && count($blockHosts)) {
    foreach( $blockUrls as $block ) {
      $block = trim($block);
      if( strlen($block) && preg_match("/$block/i", $fqdn)) {
        $blocked = true;
        break;
      }
    }
    if (!$blocked) {
      foreach ($blockHosts as $block ) {
        $block = trim($block);
        if (strlen($block) &&
            (!strcasecmp($fqdn, $block) ||
            !strcasecmp($fqdn, "www.$block"))) {
          $blocked = true;
          break;
        }
      }
    }
  }
  return $blocked;
}
?>
