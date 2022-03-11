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
        if( isset($parts[6]) )
        {
          $location = trim(explode("-", $parts[6])[0]);
          if (strlen($location)) {
            $key = @trim($parts[13]);
            if (isset($_REQUEST['api']) || !strlen($key)) {
              $count = 1;
              if (array_key_exists(14, $parts))
                $count = intval(trim($parts[14]));
              $count = max(1, $count);
              if( isset($counts[$location]) )
                $counts[$location] += $count;
              else
                $counts[$location] = $count;

              if( isset($dayCount[$location]) )
                $dayCount[$location] += $count;
              else
                $dayCount[$location] = $count;
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
if ($days <= 30) {
  foreach( $dayCounts as $index => &$dayCount ) {
      echo "<th>{$dates[$index]}</th>";
  }
}
echo '<th>Location</th></tr>';
foreach($counts as $location => $count) {
    if( $count > 0 ) {
        echo "<tr><td>$count</td>";
        if ($days <= 30) {
          foreach( $dayCounts as $index => &$dayCount ) {
              $c = 0;
              if( isset($dayCount[$location]) )
                  $c = $dayCount[$location];
              echo "<td>$c</td>";
          }
        }
        echo "<td>$location</td></tr>\n";
    } else {
        break;
    }
}
echo "</table>";

include 'admin_footer.inc';

?>
