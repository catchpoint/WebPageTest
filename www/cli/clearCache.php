<?php

// Copyright 2023 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
chdir('..');
$MIN_DAYS = 2;

require_once('common.inc');
ignore_user_abort(true);
set_time_limit(3300);   // only allow it to run for 55 minutes
error_reporting(E_ALL);
$is_cli = php_sapi_name() == "cli";
if ($is_cli && function_exists('proc_nice')) {
    proc_nice(19);
}

// bail if we are already running
$lock = Lock("ClearLocalResults", false, 3600);
if (!isset($lock)) {
    if ($is_cli) {
        echo "Clear local results process is already running\n";
    }
    exit(0);
}

$days_results_kept = null;
if (GetSetting('days_results_kept')) {
    $days_results_kept = GetSetting('days_results_kept');
}

$kept = 0;
$deleted = 0;
$log = fopen('./cli/clearedLocalResults.log', 'w');

$MIN_DAYS = max($days_results_kept, 0.1);
$UTC = new DateTimeZone('UTC');
$now = time();

// Delete the local results
if (isset($days_results_kept)) {
    $years = scandir('./results');
    foreach ($years as $year) {
        $yearDir = "./results/$year";
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
                            DeleteExpiredTests($dayDir, "$year$month$day", $elapsedDays);
                        }
                    }
                    @rmdir($monthDir);
                }
            }
            @rmdir($yearDir);
        }
    }
}

if ($is_cli) {
    echo "\nDone\n\n";
}

if ($log) {
    fwrite($log, "Deleted: $deleted\nKept: $kept\n" . gmdate('r') . "\n");
    fclose($log);
}

Unlock($lock);

/**
 * Recursively check within a given day
 *
 * @param mixed $dir
 * @param mixed $baseID
 */
function DeleteExpiredTests($dir, $baseID, $elapsedDays)
{
    if (is_dir($dir)) {
        $tests = scandir($dir);
        if (isset($tests) && is_array($tests) && count($tests)) {
            foreach ($tests as $test) {
                if ($test != '.' && $test != '..') {
                    // see if it is a test or a higher-level directory
                    if (
                        is_file("$dir/$test/testinfo.ini") ||
                        is_file("$dir/$test/testinfo.json.gz") ||
                        is_file("$dir/$test/testinfo.json") ||
                        is_dir("$dir/$test/video_1")
                    ) {
                        DeleteTest("$dir/$test", "{$baseID}_$test", $elapsedDays);
                    } else {
                        // We're likely looking at a shared directory, loop through the actual tests
                        DeleteExpiredTests("$dir/$test", "{$baseID}_$test", $elapsedDays);
                    }
                }
            }
        }
        @rmdir($dir);
    }
}

/**
 * Check the given logfile for all matching tests
 *
 * @param mixed $logFile
 * @param mixed $match
 */
function DeleteTest($testPath, $id, $elapsedDays)
{
    global $deleted;
    global $kept;
    global $log;
    global $MIN_DAYS;
    global $is_cli;
    $logLine = "$id ($elapsedDays): ";

    if ($is_cli) {
        echo "\rDeleted:$deleted, Kept:$kept, Checking:" . str_pad($id, 45);
    }

    $delete = false;
    if (is_file("$testPath/test.waiting")) {
        // Skip tests that are still queued
        $logLine .= " queued.";
    } elseif (is_file("$testPath/test.running")) {
        // Skip tests that are still running
        $logLine .= " waiting.";
    } elseif (is_file("$testPath/archive.me")) {
        $logLine .= " to be archived.";
    } else {
        $elapsed = TestLastAccessed($id);
        if (isset($elapsed)) {
            $logLine .= "Last Accessed $elapsed days";
            if ($elapsed >= $MIN_DAYS) {
                $delete = true;
                $logLine .= " Deleting";
            }
        }
    }

    if ($delete) {
        delTree("$testPath/");
        $deleted++;
        $logLine .= " Deleted";
    } else {
        $kept++;
        $logLine .= " Kept";
    }

    if ($log) {
        $logLine .= "\n";
        fwrite($log, $logLine);
    }
}

/**
 * Calculate how many days have passed since the given day
 */
function ElapsedDays($year, $month, $day)
{
    global $now;
    global $UTC;
    $date = DateTime::createFromFormat('ymd', "$year$month$day", $UTC);
    $daytime = $date->getTimestamp();
    $elapsed = max($now - $daytime, 0) / 86400;
    return $elapsed;
}
