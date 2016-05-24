<?php
/* Based on prunearchive.php (which relies on archive2.php being run)
 * This takes a simpler approach: just delete the day folders in archive_dir,
 * if they are older than a month.
 */

chdir('..');

include 'common.inc';
ignore_user_abort(true);
set_time_limit(86400);   // only allow it to run for 1 day

// bail if we are already running
$lock = Lock("purgearchive");
if (!isset($lock)) {
  echo "purgearchive process is already running\n";
  exit(0);
}

$archive_dir = null;
if (array_key_exists('archive_dir', $settings)) {
    $archive_dir = $settings['archive_dir'];
}
$MIN_DAYS = 30; // keep the last month's worth of tests regardless

$UTC = new DateTimeZone('UTC');
$now = time();

// Delete each day of archives if it's older than MIN_DAYS
if (isset($archive_dir) && strlen($archive_dir)) {
    echo "Checking $archive_dir\n";
    $years = scandir("{$archive_dir}results");
    foreach( $years as $year ) {
        $yearDir = "{$archive_dir}results/$year";
        if( is_numeric($year) && is_dir($yearDir) && $year != '.' && $year != '..' ) {
            echo "Checking $yearDir\n";
            $months = scandir($yearDir);
            foreach( $months as $month ) {
                $monthDir = "$yearDir/$month";
                if( is_dir($monthDir) && $month != '.' && $month != '..' ) {
                    echo "Checking $monthDir\n";
                    $days = scandir($monthDir);
                    foreach( $days as $day ) {
                        $dayDir = "$monthDir/$day";
                        if( is_dir($dayDir) && $day != '.' && $day != '..' ) {
                            echo "Checking $dayDir\n";
                            if (ElapsedDays($year, $month, $day) > $MIN_DAYS) {
                                // Removing directory
                                delTree($dayDir);
                            } else {
                                echo "Not enough time has elapsed\n";
                            }
                        }
                    }
                    if (count(glob("{$monthDir}/*")) === 0 ) {
                      // Removing empty month directory
                      rmdir($monthDir);
                    }
                }
            }
            if (count(glob("{$yearDir}/*")) === 0 ) {
              // Removing empty year directory
              rmdir($yearDir);
            }
        }
    }
}

echo "\nDone\n\n";
Unlock($lock);

/**
* Calculate how many days have passed since the given day
*/
function ElapsedDays($year, $month, $day) {
    global $now;
    global $UTC;
    $date = DateTime::createFromFormat('ymd', "$year$month$day", $UTC);
    $daytime = $date->getTimestamp();
    $elapsed = max($now - $daytime, 0) / 86400;
    return $elapsed;
}

?>
