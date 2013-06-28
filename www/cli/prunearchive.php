<?php
chdir('..');
$MIN_DAYS = 7;

// bail if we are already running
$lock = fopen('./tmp/prunearchive.lock', 'w');
if ($lock) {
    if (flock($lock, LOCK_EX | LOCK_NB) == false) {
        fclose($lock);
        echo "prunearchive process is already running\n";
        exit(0);
    }
}

include 'common.inc';
ignore_user_abort(true);
set_time_limit(604800);   // only allow it to run for 7 days

$archive_dir = null;
if (array_key_exists('archive_dir', $settings)) {
    $archive_dir = $settings['archive_dir'];
}
$MIN_DAYS = 30; // keep the last month's worth of tests regardless

$UTC = new DateTimeZone('UTC');
$now = time();

// Archive each day of archives to long-term storage
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
                                $info_file = "$dayDir/archive.dat";
                                if (is_file($info_file))
                                    $info = json_decode(file_get_contents($info_file), true);
                                if (isset($info) || array_key_exists('archived', $info) && $info['archived']) {
                                    PruneArchives($dayDir);
                                } else {
                                    echo "Not archived\n";
                                }
                            } else {
                                echo "Not enough time has elapsed\n";
                            }
                        }
                    }
                }
            }
        }
    }
}
echo "\nDone\n\n";

if ($lock) {
    fclose($lock);
}

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
function PruneArchives($dir) {
    global $now;
    global $MIN_DAYS;
    $dir = realpath($dir);
    $files = scandir($dir);
    foreach( $files as $fileName ) {
        if($fileName != '.' && $fileName != '..' && $fileName != 'archive.dat' ) {
            $file = "$dir/$fileName";
            if (is_dir($file))
                PruneArchives($file);
            else {
                $elapsed = max($now - filemtime($file), 0)/ 86400;
                if ($elapsed > $MIN_DAYS) {
/*                    $delete = false;
                    $zip = new ZipArchive;
                    if ($zip->open($file) === TRUE) {
                        $delete = true;
                        // extractTo wasn't working so fall back to loading the file
                        $test = $zip->getFromName("testinfo.json.gz");
                        if ($test === FALSE)
                            $test = $zip->getFromName("testinfo.json");
                        else {
                            file_put_contents("./tmp/prune.gz", $test);
                            $test = gz_file_get_contents("./tmp/prune.gz");
                        }
                        $zip->close();
                        if ($test !== FALSE) {
                            $test = json_decode($test, true);
                            if (isset($test) && is_array($test)) {
                                // for now, only delete tests that were not priority 0 or that used an api key
                                if (array_key_exists('priority', $test) && $test['priority'] == 0) {
                                    if (!array_key_exists('key', $test) || !strlen(trim($test['key'])))
                                        $delete = false;
                                }
                            }
                        }
                    }
                    if ($delete) {
                        unlink($file);
                    }
*/
                  unlink($file);
                }
            }
        }
    }
}
?>
