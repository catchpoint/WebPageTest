<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
chdir('..');
$MIN_DAYS = 2;
$MAX_DAYS = null;

require_once('common.inc');
require_once('archive.inc');
ignore_user_abort(true);
set_time_limit(3300);   // only allow it to run for 55 minutes
error_reporting(E_ALL);
$is_cli = php_sapi_name() == "cli";
if ($is_cli && function_exists('proc_nice'))
  proc_nice(19);

// bail if we are already running
$lock = Lock("Archive", false, 3600);
if (!isset($lock)) {
  if ($is_cli)
    echo "Archive process is already running\n";
  exit(0);
}

$archive_kept_days = null;
if (GetSetting('archive_kept_days')) {
  $archive_kept_days = GetSetting('archive_kept_days');
}

if (GetSetting('archive_days')) {
  $MIN_DAYS = GetSetting('archive_days');
}
$MIN_DAYS = max($MIN_DAYS,0.1);

if (GetSetting('max_days_before_archive')) {
  $MAX_DAYS = GetSetting('max_days_before_archive');
}

$archive_dir = null;
if (GetSetting('archive_dir')) {
    $archive_dir = GetSetting('archive_dir');
}

$kept = 0;
$archiveCount = 0;
$archivesDeletedCount = 0;
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

if ((isset($archive_dir) && strlen($archive_dir)) ||
    GetSetting('archive_url') ||
    GetSetting('archive_s3_server')) {
  CheckRelay();
  CheckOldDir('./results/old');

  // Archive the actual tests
  $years = scandir('./results');
  foreach ($years as $year) {
    $yearDir = "./results/$year";
    if (is_numeric($year) && is_dir($yearDir) && $year != '.' && $year != '..') {
      $months = scandir($yearDir);
      foreach ($months as $month) {
        $monthDir = "$yearDir/$month";
        if (is_dir($monthDir) && $month != '.' && $month != '..') {
          $days = scandir($monthDir);
          foreach( $days as $day ) {
            $dayDir = "$monthDir/$day";
            if (is_dir($dayDir) && $day != '.' && $day != '..') {
              $elapsedDays = ElapsedDays($year, $month, $day);
              $forced_only = $elapsedDays < ($MIN_DAYS - 1);
              CheckDay($dayDir, "$year$month$day", $elapsedDays, $forced_only);
            }
          }
          @rmdir($monthDir);
        }
      }
      @rmdir($yearDir);
    }
  }
}

if (isset($archive_kept_days) && isset($archive_dir) && strlen($archive_dir)) {
  $years = scandir($archive_dir . 'results/');
  foreach ($years as $year) {
    $yearDir = $archive_dir . "results/$year";
    if (is_numeric($year) && is_dir($yearDir) && ElapsedDays($year, '01', '01') > $archive_kept_days) {
      $months = scandir($yearDir);
      foreach ($months as $month) {
        $monthDir = "$yearDir/$month";
        if (is_numeric($month) && is_dir($monthDir) && ElapsedDays($year, $month, '01') > $archive_kept_days) {
          $days = scandir($monthDir);
          foreach ($days as $day) {
            $dayDir = "$monthDir/$day";
            if (is_numeric($day) && is_dir($dayDir) && ElapsedDays($year, $month, $day) > $archive_kept_days) {
              DeleteArchivedFiles($dayDir);
              @rmdir($dayDir);
            }
          }
          @rmdir($monthDir);
        }
      }
      @rmDir($yearDir);
    }
  }
}

if ($is_cli)
  echo "\nDone\n\n";

if( $log ) {
    fwrite($log, "Archived: $archiveCount\nDeleted: $deleted\nKept: $kept\nArchives deleted: $archivesDeletedCount\n" . gmdate('r') . "\n");;
    fclose($log);
}
Unlock($lock);

function DeleteArchivedFiles($dir) {
  global $archivesDeletedCount;
  $paths = scandir($dir);
  if (isset($paths) && is_array($paths) && count($paths)) {
    foreach ($paths as $path) {
      if ($path != '.' && $path != '..') {
        $absoulutePath = "$dir/$path";
        if (preg_match('/.*.zip$/', $path)) {
          unlink($absoulutePath);
          $archivesDeletedCount++;
        } else {
          DeleteArchivedFiles($absoulutePath);
          @rmdir($absoulutePath);
        }
      }
    }
  }
}

/**
* Clean up the relay directory of old tests
*
*/
function CheckRelay() {
  global $is_cli;
  $dirs = scandir('./results/relay');
  $keys_file = __DIR__ . '/settings/keys.ini';
  if (file_exists(__DIR__ . '/settings/common/keys.ini'))
    $keys_file = __DIR__ . '/settings/common/keys.ini';
  if (file_exists(__DIR__ . '/settings/server/keys.ini'))
    $keys_file = __DIR__ . '/settings/server/keys.ini';
  $keys = parse_ini_file($keys_file);
  foreach($dirs as $key) {
    if ($key != '.' && $key != '..') {
      $keydir = "./results/relay/$key";
      if (is_dir($keydir)) {
        if (array_key_exists($key, $keys)) {
          if ($is_cli)
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
                              if (!is_numeric($day))
                                delTree($dayDir);
                              @rmdir($dayDir);
                            }
                          }
                        } else {
                          // More than 10 days old
                          delTree($monthDir);
                        }
                      } else {
                        // Not Numeric
                        delTree($monthDir);
                      }
                      @rmdir($monthDir);
                    }
                  }
                } else {
                  // More than 10 days old
                  delTree($yearDir);
                }
              } else {
                // Not Numeric
                delTree($yearDir);
              }
              @rmdir($yearDir);
            }
          }
        } else {
          // Invalid key
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
  if (is_dir($path)) {
    $oldDirs = scandir($path);
    foreach( $oldDirs as $oldDir ) {
      if( $oldDir != '.' && $oldDir != '..' ) {
        // see if it is a test or a higher-level directory
        if( is_file("$path/$oldDir/testinfo.ini") )
          CheckTest("$path/$oldDir", $oldDir, 1000, FALSE);
        else
          CheckOldDir("$path/$oldDir");
      }
    }
    @rmdir($path);
  }
}

/**
* Recursively check within a given day
*
* @param mixed $dir
* @param mixed $baseID
* @param mixed $archived
*/
function CheckDay($dir, $baseID, $elapsedDays, $forced_only) {
  if (is_dir($dir)) {
    $tests = scandir($dir);
    if (isset($tests) && is_array($tests) && count($tests)) {
      foreach( $tests as $test ) {
        if( $test != '.' && $test != '..' ) {
          // see if it is a test or a higher-level directory
          if( is_file("$dir/$test/testinfo.ini") ||
              is_file("$dir/$test/testinfo.json.gz") ||
              is_file("$dir/$test/testinfo.json") ||
              is_dir("$dir/$test/video_1")) {
            CheckTest("$dir/$test", "{$baseID}_$test", $elapsedDays, $forced_only);
          } else {
            // We're likely looking at a shard directory, loop through the actual tests
            CheckDay("$dir/$test", "{$baseID}_$test", $elapsedDays, $forced_only);
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
function CheckTest($testPath, $id, $elapsedDays, $forced_only) {
  global $archiveCount;
  global $deleted;
  global $kept;
  global $log;
  global $MIN_DAYS;
  global $MAX_DAYS;
  global $is_cli;
  $logLine = "$id ($elapsedDays): ";

  if ($is_cli)
    echo "\rArc:$archiveCount, Del:$deleted, Kept:$kept, Checking:" . str_pad($id,45);

  $delete = false;
  
  if (isset($MAX_DAYS) && ($elapsedDays > $MAX_DAYS)) {
    if (!is_file("$testPath/testinfo.ini") &&
       !is_file("$testPath/testinfo.json.gz") &&
       !is_file("$testPath/testinfo.json")) {
     $delete = true;
     $logLine .= " Invalid old test";
    } else {
     $needs_archive = true;
     $logLine .= " Archiving old test";
    }
  } elseif (is_file("$testPath/test.waiting")) {
    // Skip tests that are still queued
  } elseif (is_file("$testPath/test.running")) {
    // Skip tests that are still running
  } elseif (!is_file("$testPath/testinfo.ini") &&
      !is_file("$testPath/testinfo.json.gz") &&
      !is_file("$testPath/testinfo.json")) {
    $logLine .= "Invalid test";
    $delete = true;
  } else {
    $needs_archive = is_file("$testPath/archive.me");
    if ($needs_archive) {
      $logLine .= "Forced ";
    } elseif (!$forced_only) {
      $elapsed = TestLastAccessed($id);
      if (isset($elapsed)) {
        $logLine .= "Last Accessed $elapsed days";
        if ($elapsed >= $MIN_DAYS) {
          $needs_archive = true;
          $logLine .= " Archiving";
        }
      }
    }
  }

  if ($needs_archive) {
    if (ArchiveTest($id) ) {
      $archiveCount++;
      $logLine .= " Archived";
      $delete = true;
    } else {
      $logLine .= " Failed to archive";
    }
  }

  if ($delete) {
    if (VerifyArchive($id) && is_file("$testPath/.archived")) {
      delTree("$testPath/");
      $deleted++;
      $logLine .= " Deleted";
    } else {
      $logLine .= " Verification Failed";
    }
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
?>