<?php
chdir('..');
$MIN_DAYS = 7;

include 'common.inc';
require_once('archive.inc');
ignore_user_abort(true);
set_time_limit(86400);   // only allow it to run for 1 day

// bail if we are already running
$lock = Lock("Archive 2", false, 86400);
if (!isset($lock)) {
  echo "Archive2 process is already running\n";
  exit(0);
}

$archive_dir = null;
if (array_key_exists('archive_dir', $settings)) {
    $archive_dir = $settings['archive_dir'];
}
$archive2_dir = null;
if (array_key_exists('archive2_dir', $settings)) {
    $archive2_dir = $settings['archive2_dir'];
}
if (array_key_exists('archive2_days', $settings)) {
    $MIN_DAYS = $settings['archive2_days'];
}
$MIN_DAYS = max($MIN_DAYS,1);

$UTC = new DateTimeZone('UTC');
$now = time();

// Archive each day of archives to long-term storage
if (isset($archive_dir) && strlen($archive_dir) && 
    isset($archive2_dir) && strlen($archive2_dir) ) {
    $years = scandir("{$archive_dir}results");
    foreach( $years as $year ) {
        $yearDir = "{$archive_dir}results/$year";
        if( is_numeric($year) && is_dir($yearDir) && $year != '.' && $year != '..' ) {
            $months = scandir($yearDir);
            foreach( $months as $month ) {
                $monthDir = "$yearDir/$month";
                if( is_dir($monthDir) && $month != '.' && $month != '..' ) {
                    $days = scandir($monthDir);
                    foreach( $days as $day ) {
                        $dayDir = "$monthDir/$day";
                        if( is_dir($dayDir) && $day != '.' && $day != '..' ) {
                            if (ElapsedDays($year, $month, $day) > $MIN_DAYS) {
                                LongTermArchive($dayDir, $year, $month, $day);
                            }
                        }
                    }
                }
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

/**
* Store the given tests in our long-term storage
* 
* @param mixed $dayDir
*/
function LongTermArchive($dir, $year, $month, $day) {
    global $archive2_dir;
    $target_dir = "{$archive2_dir}results/$year";
    $dir = realpath($dir);

    $info_file = "$dir/archive.dat";
    if (is_file($info_file))
        $info = json_decode(file_get_contents($info_file), true);
    if (!isset($info) || !is_array($info)) {
        $info = array('archived' => false, 'pruned' => false);
    }
    $dirty = false;
    
    if (!$info['archived']) {
        if (!is_dir($target_dir))
            mkdir($target_dir, 0777, true);
        $target_dir = realpath($target_dir);
        $zip_file = "$target_dir/$year$month$day.zip";
        if (isset($target_dir) && strlen($target_dir) &&
            isset($zip_file) && strlen($zip_file)) {
            if (is_file($zip_file))
                unlink($zip_file);
            echo "Archiving $dir to $zip_file...\n";
            chdir($dir);
            system("zip -rqD0 $zip_file *", $zipResult);
            if ($zipResult == 0) {
                if (is_file($zip_file)) {
                    $info['archived'] = true;
                    $dirty = true;
                }
            }
        }
    }
    
    if ($dirty) {
        file_put_contents($info_file, json_encode($info));
    }
}
?>
