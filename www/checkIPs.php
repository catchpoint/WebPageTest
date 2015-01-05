<?php
require_once('common.inc');
error_reporting(0);
$days = 0;
if( isset($_GET["days"]) )
    $days = (int)$_GET["days"];

$whitelist = array();
$wl = file('./settings/whitelist.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach( $wl as &$w )
{
    $parts = explode(" ", $w);
    $ip = trim($parts[0]);
    $comment = trim($parts[1]);
    $whitelist[$ip] = $comment;
}

$counts = array();
$dayCounts = array();
$keys = array();

// load the API keys
$keys = parse_ini_file('./settings/keys.ini', true);

$targetDate = new DateTime($from, new DateTimeZone('GMT'));
for($offset = 0; $offset <= $days; $offset++)
{
    $dayCount = array();

    // figure out the name of the log file
    $fileName = './logs/' . $targetDate->format("Ymd") . '.log';

    // load the log file into an array of lines
    $lines = file($fileName, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if( $lines)
    {
        foreach($lines as &$line)
        {
            $parseLine = str_replace("\t", "\t ", $line);
            $parts = explode("\t", $parseLine);
            if( isset($parts[1]) )
            {
                $ip = trim($parts[1]);
                if( strlen($ip)) {
                    $key = trim($parts[13]);
                    $count = 1;
                    if (array_key_exists(14, $parts))
                        $count = intval(trim($parts[14]));
                    $count = max(1, $count);
                    if( ($privateInstall || $admin) && strlen($key) && array_key_exists($key, $keys) )
                      $keys[$ip] = $keys[$key]['contact'];
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

    $dayCounts[] = $dayCount;

    // on to the previous day
    $targetDate->modify('-1 day');
}

// aggregate the different IP's for any given key
foreach ($counts as $ip => $count) {
  if (array_key_exists($ip, $keys)) {
    if (array_key_exists($keys[$ip], $counts))
      $counts[$keys[$ip]] += $count;
    else
      $counts[$keys[$ip]] = $count;
    unset($counts[$ip]);
  }
}

foreach ($dayCounts as &$dayCount) {
  foreach ($dayCount as $ip => $count) {
    if (array_key_exists($ip, $keys)) {
      if (array_key_exists($keys[$ip], $dayCount))
        $dayCount[$keys[$ip]] += $count;
      else
        $dayCount[$keys[$ip]] = $count;
      unset($dayCount[$ip]);
    }
  }
}

// sort the counts descending
arsort($counts);

$title = 'WebPagetest - Check IPs';
include 'admin_header.inc';

echo '<table class="table"><tr><th>Total</th>';

foreach( $dayCounts as $index => &$dayCount ) {
    echo "<th>Day $index</th>";
}
echo '<th>IP Address/API Key</th></tr>';

foreach($counts as $ip => $count)
{
    if( $count > 500 )
    {
        echo "<tr><td>$count</td>";
        foreach( $dayCounts as $index => &$dayCount )
        {
            $c = 0;
            if( isset($dayCount[$ip]) )
                $c = $dayCount[$ip];
            echo "<td>$c</td>";
        }
        echo "<td>$ip</td></tr>\n";
    }
    else
        break;
}
echo "</table>";

include 'admin_footer.inc';
?>
