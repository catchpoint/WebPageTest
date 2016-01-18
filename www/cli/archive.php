<?php
chdir('..');
$archive_days = 2;
$MAX_RUN_TIME = 25200;  // script runs for only 25200s = 7h
$media_file_patterns = array(".mp4", ".avs", ".png", "video"); // files which contain one of these strings in filename get deleted if before media_days in past

include 'common.inc';
require_once('archive.inc');
ignore_user_abort(true);
set_time_limit(3300);   // only allow it to run for 55 minutes - this is the time acting in THIS script, not for any system- or db-calls http://php.net/manual/en/function.set-time-limit.php
if (function_exists('proc_nice'))
    proc_nice(19);

$startTime = microtime(true);

// bail if we are already running
$lock = Lock("Archive", false, 3600);
if (!isset($lock)) {
    echo "Archive process is already running\n";
    exit(0);
}

$archive_days = null;
if (array_key_exists('archive_days', $settings)) {
    $archive_days = $settings['archive_days'];
    $archive_days = max($archive_days,0.1);
}

$archive_dir = null;
if (array_key_exists('archive_dir', $settings)) {
    $archive_dir = $settings['archive_dir'];
}

$media_days = null;
if (array_key_exists('media_days', $settings)) {
    $media_days = $settings['media_days'];
    $media_days = max($media_days,0.1);
}

$min_days = min($media_days,$archive_days);

$clear_archive_days = null;
if (array_key_exists('clear_archive_days', $settings)) {
    $clear_archive_days = $settings['clear_archive_days'];
    $clear_archive_days = max($clear_archive_days,0.1);
}

$kept = 0;
$archiveCount = 0;
$deleted = 0;
$log = fopen('./cli/archive.log', 'w');

// check the old tests first
/*
*   Archive any tests that have not already been archived
*   We will also keep track of all of the tests that are
*   known to have been archived separately so we don't thrash
*/
$UTC = new DateTimeZone('UTC');

$now = time();

if ( isset($media_days) || (isset($archive_dir) && strlen($archive_dir)) ||
    (array_key_exists('archive_s3_server', $settings) && strlen($settings['archive_s3_server']))) {
    //CheckRelay();
    CheckOldDir('./results/old');

    // Archive the actual tests
    $years = scandir('./results');
    foreach( $years as $year ) {
        mkdir('./logs/archived', 0777, true);
        $yearDir = "./results/$year";
        if( is_numeric($year) && is_dir($yearDir) && $year != '.' && $year != '..' ) {
            $months = scandir($yearDir);
            foreach( $months as $month ) {
                $monthDir = "$yearDir/$month";
                if( is_dir($monthDir) && $month != '.' && $month != '..' ) {
                    $days = scandir($monthDir);
                    foreach( $days as $day ) {
                        $dayDir = "$monthDir/$day";
                        if( is_dir($dayDir) && $day != '.' && $day != '..' ) {
                            $elapsedDays = ElapsedDays($year, $month, $day);
                            if ($elapsedDays >= ($min_days)) {
                                CheckDay($dayDir, "$year$month$day", $elapsedDays);
                            }
                            if ((microtime(true) - $startTime) > $MAX_RUN_TIME) { //check if maximal allowed runtime reached
                                exit(0); //if yes, end the archiving immediately
                            }
                        }
                    }
                    rmdir($monthDir);
                }
            }
            rmdir($yearDir);
        }
    }

    // Clear the archive-directory
    if (isset($archive_dir) && isset($clear_archive_days)) {
        $years = scandir($archive_dir . "results");
        foreach ($years as $year) {
            mkdir("$archive_dir/logs/archived", 0777, true);
            $yearDir = $archive_dir . "results/$year";
            if (is_numeric($year) && is_dir($yearDir) && $year != '.' && $year != '..') {
                $months = scandir($yearDir);
                foreach ($months as $month) {
                    $monthDir = "$yearDir/$month";
                    if (is_dir($monthDir) && $month != '.' && $month != '..') {
                        $days = scandir($monthDir);
                        foreach ($days as $day) {
                            $dayDir = "$monthDir/$day";
                            if (is_dir($dayDir) && $day != '.' && $day != '..') {
                                $elapsedDays = ElapsedDays($year, $month, $day);
                                if ($elapsedDays >= ($clear_archive_days)) {
                                    delTree($dayDir);
                                    fwrite($log, "Archives in $dayDir removed \n");
                                    }
                                if ((microtime(true) - $startTime) > $MAX_RUN_TIME) { //check if maximal allowed runtime reached
                                    exit(0); //if yes, end the archiving immediately
                                }
                            }
                        }
                        rmdir($monthDir);
                    }
                }
                rmdir($yearDir);
            }
        }
    }
}
CheckLocations();
echo "\nDone\n\n";

if( $log ) {
    fwrite($log, "Archived: $archiveCount\nDeleted: $deleted\nKept: $kept\n" . gmdate('r') . "\n");;
    fclose($log);
}
Unlock($lock);

/**
 * Clean up the relay directory of old tests
 *
 */
function CheckRelay() {
    $dirs = scandir('./results/relay');
    $keys = parse_ini_file('./settings/keys.ini');
    foreach($dirs as $key) {
        if ($key != '.' && $key != '..') {
            $keydir = "./results/relay/$key";
            if (is_dir($keydir)) {
                if (array_key_exists($key, $keys)) {
                    echo "\rChecking relay tests for $key";
                    $years = scandir($keydir);
                    foreach( $years as $year ) {
                        if ($year != '.' && $year != '..') {
                            $yearDir = "$keydir/$year";
                            if (is_numeric($year)) {
                                if (ElapsedDays($year, '01', '01') < 10) {
                                    $months = scandir($yearDir);
                                    foreach( $months as $month ) {
                                        if ($month != '.' && $month != '..') {
                                            $monthDir = "$yearDir/$month";
                                            if (is_numeric($month)) {
                                                if (ElapsedDays($year, $month, '01') < 10) {
                                                    $days = scandir($monthDir);
                                                    foreach( $days as $day ) {
                                                        if ($day != '.' && $day != '..') {
                                                            $dayDir = "$monthDir/$day";
                                                            if (is_numeric($day)) {
                                                                if (ElapsedDays($year, $month, $day) >= 10) {
                                                                    delTree($dayDir);
                                                                }
                                                            } else {
                                                                if (is_file($dayDir)) {
                                                                    unlink($dayDir);
                                                                } else {
                                                                    delTree($dayDir);
                                                                }
                                                            }
                                                            @rmdir($dayDir);
                                                        }
                                                    }
                                                } else {
                                                    delTree($monthDir);
                                                }
                                            } else {
                                                if (is_file($monthDir)) {
                                                    unlink($monthDir);
                                                } else {
                                                    delTree($monthDir);
                                                }
                                            }
                                            @rmdir($monthDir);
                                        }
                                    }
                                } else {
                                    delTree($yearDir);
                                }
                            } else {
                                if (is_file($yearDir)) {
                                    unlink($yearDir);
                                } else {
                                    delTree($yearDir);
                                }
                            }
                            @rmdir($yearDir);
                        }
                    }
                } else {
                    delTree($keydir);
                }
                @rmdir($keydir);
            } else {
                unlink($keydir);
            }
        }
    }
}

/**
 * Recursively scan the old directory for tests
 *
 * @param mixed $path
 */
function CheckOldDir($path) {
    $oldDirs = scandir($path);
    foreach( $oldDirs as $oldDir ) {
        if( $oldDir != '.' && $oldDir != '..' ) {
            // see if it is a test or a higher-level directory
            if( is_file("$path/$oldDir/testinfo.ini") )
                CheckTest("$path/$oldDir", $oldDir, 1000);
            else
                CheckOldDir("$path/$oldDir");
        }
    }
    rmdir($path);
}

/**
 * Recursively check within a given day
 *
 * @param mixed $dir
 * @param mixed $baseID
 * @param mixed $archived
 */
function CheckDay($dir, $baseID, $elapsedDays) {
    $tests = scandir($dir);
    foreach( $tests as $test ) {
        if( $test != '.' && $test != '..' ) {
            // see if it is a test or a higher-level directory
            if( is_file("$dir/$test/testinfo.ini") ||
                is_file("$dir/$test/testinfo.json.gz") ||
                is_file("$dir/$test/testinfo.json"))
                CheckTest("$dir/$test", "{$baseID}_$test", $elapsedDays);
            else
                CheckDay("$dir/$test", "{$baseID}_$test", $elapsedDays);
        }
    }
    @rmdir($dir);
}

/**
 * Check the given log file for all tests that match
 *
 * @param mixed $logFile
 * @param mixed $match
 */
function CheckTest($testPath, $id, $elapsedDays) {
    global $archiveCount;
    global $deleted;
    global $kept;
    global $log;
    global $archive_dir;
    global $archive_days;
    global $media_days;
    global $media_file_patterns;
    global $settings;
    $logLine = date("Y-m-d-h:i:sa")."  -  ".realpath($testPath)." : ";

    echo "\rArc:$archiveCount, Del:$deleted, Kept:$kept, Checking:" . str_pad($id,45);

    $delete = false;
    if (isset($elapsedDays)) {
        if( isset($media_days) && $elapsedDays >= $media_days ) {
            echo $testPath;
            delFilesByFileNameRecursive("$testPath/",$media_file_patterns);
            $logLine .= "Last Accessed $elapsedDays days, media-files were been deleted ";
        } else {
            $logLine .= "Last Accessed $elapsedDays days, media-files were not deleted ";
            }
      if( isset($archive_days) && $elapsedDays >= $archive_days && ((isset($archive_dir) && strlen($archive_dir)) ||
                (array_key_exists('archive_s3_server', $settings) && strlen($settings['archive_s3_server'])))) {
            if (ArchiveTest($id) ) {
                $archiveCount++;
                $logLine .= "and job results are archived";

                if (VerifyArchive($id) || $elapsedDays >= 30)
                    $delete = true;
            } else if ($elapsedDays < 60) {
                $status = GetTestStatus($id, false);
                $logLine .= "and job result are maybe archived ";
                if ($status['statusCode'] >= 400 ||
                    ($status['statusCode'] == 102 &&
                        $status['remote'] &&
                        $elapsedDays > 1)) {
                    $delete = true;
                }
            } else {
                $logLine .= "Failed to archive";
            }
        } else {
            $logLine .= "and job result get not archived ";
        }
    } else {
        $logLine .= "Testfolder $testPath couldn't get deleted, because elapsed days couldn't get determined: $elapsedDays";
    }

    if ($delete) {
        delTree("$testPath/");
        $deleted++;
        $logLine .= " Deleted";
    } else {
        $kept++;
    }

    if( $log ) {
        $logLine .= "\n";
        fwrite($log, $logLine);
    }
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
 * For any locations that haven't connected in at least 2 hours, go through and delete any tests in the work queue
 *
 */
function CheckLocations() {
    $locations = LoadLocationsIni();
    BuildLocations($locations);
    $deleted = false;
    echo "\n";
    for ($i = 1; array_key_exists($i, $locations['locations']); $i++) {
        $group = &$locations[$locations['locations'][$i]];
        for ($j = 1; array_key_exists($j, $group); $j++) {
            if (!array_key_exists('relayServer', $loc[$group[$j]])) {
                $name = $locations[$group[$j]]['location'];
                $location = GetTesters($name);
                $workdir = $locations[$name]['localDir'];
                $elapsed = -1;
                if (isset($location) &&  array_key_exists('elapsed', $location))
                    $elapsed = $location['elapsed'];
                if ($elapsed < 0 || $elapsed > 120) {
                    if (strlen($workdir)){
                        if (is_dir($workdir)) {
                            echo "$elapsed minutes : $name - $workdir\n";
                            delTree($workdir);
                            rmdir($workdir);
                            $deleted = true;
                        }
                    }
                }
            }
        }
    }

    // nuke all of the queue files if we had to delete something
    if ($deleted) {
        $files = scandir('./tmp');
        foreach ($files as $file) {
            if (stripos($file, '.queue') !== false) {
                unlink("./tmp/$file");
            }
        }
    }
}
?>
