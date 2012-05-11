<?php
chdir('..');
$MIN_DAYS = 2;

// bail if we are already running
$lock = fopen('./tmp/archive.lock', 'w');
if ($lock) {
    if (flock($lock, LOCK_EX | LOCK_NB) == false) {
        fclose($lock);
        echo "Archive process is already running\n";
        exit(0);
    }
}

include 'common.inc';
require_once('archive.inc');
ignore_user_abort(true);
set_time_limit(0);

$kept = 0;
$archiveCount = 0;
$deleted = 0;
$log = fopen('./cli/archive.log', 'w');

// check the old tests first
CheckOldDir('./results/old');
$now = time();

/*
*   Archive any tests that have not already been archived
*   We will also keep track of all of the tests that are 
*   known to have been archived separately so we don't thrash
*/  
$UTC = new DateTimeZone('UTC');
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
                        $date = DateTime::createFromFormat('ymd', "$year$month$day", $UTC);
                        $daytime = $date->getTimestamp();
                        $elapsed = max($now - $daytime, 0) / 86400;
                        if ($elapsed >= $MIN_DAYS) {
                            CheckDay($dayDir, "$year$month$day");
                        }
                    }
                }
                rmdir($monthDir);
            }
        }
        rmdir($yearDir);
    }
}
echo "\nDone\n\n";

if( $log ) {
    fwrite($log, "Archived: $archiveCount\nDeleted: $deleted\nKept: $kept\n" . gmdate('r') . "\n");;
    fclose($log);
}

if ($lock) {
    fclose($lock);
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
                CheckTest("$path/$oldDir", $oldDir);
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
function CheckDay($dir, $baseID) {
    $tests = scandir($dir);
    foreach( $tests as $test ) {
        if( $test != '.' && $test != '..' ) {
            // see if it is a test or a higher-level directory
            if( is_file("$dir/$test/testinfo.ini") )
                CheckTest("$dir/$test", "{$baseID}_$test");
            else
                CheckDay("$dir/$test", "{$baseID}_$test");
        }
    }
    rmdir($dir);
}

/**
* Check the given log file for all tests that match
* 
* @param mixed $logFile
* @param mixed $match
*/
function CheckTest($testPath, $id) {
    global $archiveCount;
    global $deleted;
    global $kept;
    global $log;
    global $MIN_DAYS;
    $logLine = "$id : ";

    $elapsed = TestLastAccessed($id);
    if( $elapsed >= $MIN_DAYS && ArchiveTest($id) ) {
        $archiveCount++;
        $logLine .= "Archived";

        if (VerifyArchive($id)) {
            delTree("$testPath/");
            $deleted++;
            $logLine .= " Deleted";
        }
    } else
        $kept++;
        
    if( $log ) {
        $logLine .= "\n";
        fwrite($log, $logLine);
    }

    echo "\rArc:$archiveCount, Del:$deleted, Kept:$kept, Checking:" . str_pad($id,45);
}

?>
