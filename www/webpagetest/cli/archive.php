<?php
chdir('..');
include 'common.inc';
require_once('archive.inc');
set_time_limit(0);

$kept = 0;
$archiveCount = 0;
$deleted = 0;
$log = fopen('./cli/archive.log', 'w');

// check the old tests first
CheckOldDir('./results/old');

/*
*   Archive any tests that have not already been archived
*   We will also keep track of all of the tests that are 
*   known to have been archived separately so we don't thrash
*/  
$endDate = (int)date('ymd');
$years = scandir('./results');
foreach( $years as $year )
{
    mkdir('./logs/archived', 0777, true);
    $yearDir = "./results/$year";
    if( is_dir($yearDir) && $year != '.' && $year != '..'  && $year != 'video' )
    {
        if( $year != 'old' )
        {
            $months = scandir($yearDir);
            foreach( $months as $month )
            {
                $monthDir = "$yearDir/$month";
                if( is_dir($monthDir) && $month != '.' && $month != '..' )
                {
                    $days = scandir($monthDir);
                    foreach( $days as $day )
                    {
                        $dayDir = "$monthDir/$day";
                        if( is_dir($dayDir) && $day != '.' && $day != '..' )
                            CheckDay($dayDir, "$year$month$day");
                    }
                    rmdir($monthDir);
                }
            }
            rmdir($yearDir);
        }
    }
}
echo "\nDone\n\n";

if( $log )
{
    fwrite($log, "Archived: $archiveCount\nDeleted: $deleted\nKept: $kept\n" . date('r') . "\n");;
    fclose($log);
}

/**
* Recursively scan the old directory for tests
* 
* @param mixed $path
*/
function CheckOldDir($path)
{
    $oldDirs = scandir($path);
    foreach( $oldDirs as $oldDir )
    {
        if( $oldDir != '.' && $oldDir != '..' )
        {
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
function CheckDay($dir, $baseID)
{
    $tests = scandir($dir);
    foreach( $tests as $test )
    {
        if( $test != '.' && $test != '..' )
        {
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
function CheckTest($testPath, $id)
{
    global $archiveCount;
    global $deleted;
    global $kept;
    global $log;
    $logLine = "$id : ";

    if( ArchiveTest($id) )
    {
        $archiveCount++;
        $logLine .= "Archived";

        // Delete tests after 3 days of no access
        $delete = false;
        $elapsed = TestLastAccessed($id);
        if( $elapsed > 3 )
            $delete = true;

        if( $delete )
        {
            if (VerifyArchive($id)) {
                delTree("$testPath/");
                $deleted++;
                $logLine .= " Deleted";
            }
        }
        else
            $kept++;
    }
        
    if( $log )
    {
        $logLine .= "\n";
        fwrite($log, $logLine);
    }

    echo "\rArc:$archiveCount, Del:$deleted, Kept:$kept, Checking:" . str_pad($id,45);
}

?>
