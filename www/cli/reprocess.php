<?php
if (php_sapi_name() != 'cli')
  exit(1);
chdir('..');
include 'common_lib.inc';
require_once('archive.inc');
require_once('page_data.inc');
require_once('breakdown.inc');
require_once('video/avi2frames.inc.php');
set_time_limit(0);

if (count($argv) > 1 && strlen($argv[1])) {
  $benchmark = trim($argv[1]);
  echo "Reprocessing benchmark '$benchmark'\r\n";
  if ($lock = Lock("reprocess-$benchmark")) {
    if (is_file("./log/reprocess-$benchmark.log"))
      unlink("./log/reprocess-$benchmark.log");
    $files = LoadStatus();
    foreach ($files as &$entry) {
      if (!$entry['processed']) {
        ProcessFile($entry['file']);
        $entry['processed'] = true;
        SaveStatus($files);
      }
    }
    echo "Done\n";
    logMsg("Done", "./log/reprocess-$benchmark.log", true);
    Unlock($lock);
  }
} else {
  echo "Usage: php reprocess.php <benchmark ID>\r\n\r\n";
}

function LoadStatus() {
  global $benchmark;
  if (is_file("./results/benchmarks/$benchmark/reprocess.json")) {
    $status = json_decode(file_get_contents("./results/benchmarks/$benchmark/reprocess.json"), true);
  } else {
    $status = array();
    $files = glob("./results/benchmarks/$benchmark/data/*.json.gz");
    $files = array_reverse($files);
    foreach ($files as $file) {
      $status[] = array('processed' => false, 'file' => $file);
    }
  }
  return $status;
}

function SaveStatus(&$status) {
  global $benchmark;
  file_put_contents("./results/benchmarks/$benchmark/reprocess.json", json_encode($status));
}

function ProcessFile($file) {
  global $benchmark;
  echo "Reprocessing $file\n";
  logMsg("Reprocessing $file", "./log/reprocess-$benchmark.log", true);
  $tests = array();
  $entries = json_decode(gz_file_get_contents($file), true);
  if (isset($entries) && is_array($entries) && count($entries)) {
    echo 'Loaded ' . count($entries) . " results\n";
    foreach ($entries as $entry) {
      if (!array_key_exists($entry['id'], $tests)) {
        $tests[$entry['id']] = array('url' => $entry['url'],
                                     'label' => $entry['label'],
                                     'location' => $entry['location'],
                                     'config' => $entry['config'],
                                     'id' => $entry['id']);;
      }
    }
    unset($entries);
  }
  if (count($tests)) {
    $results = array();
    foreach($tests as &$test) {
      CollectTestResult($test, $results);
    }
    echo 'Writing ' . count($results) . " results\n";
    rename($file, "$file.reprocessed");
    gz_file_put_contents(str_replace('.json.gz', '.json', $file), json_encode($results));
  }
  return $ok;
}

function CollectTestResult($test, &$data) {
  global $benchmark;
  $id = $test['id'];
  $count = 0;
  echo "Reprocessing Test $id...";
  logMsg("Reprocessing Test $id", "./log/reprocess-$benchmark.log", true);
  RestoreTest($id);
  ReprocessVideo($id);
  $testPath = './' . GetTestPath($id);
  $page_data = loadAllPageData($testPath);
  if (count($page_data)) {
    foreach ($page_data as $run => &$page_run) {
      foreach ($page_run as $cached => &$test_data) {
        $data_row = $test_data;
        unset($data_row['URL']);
        // figure out the per-type request info (todo: measure how expensive this is and see if we have a better way)
        $breakdown = getBreakdown($test['id'], $testPath, $run, $cached, $requests);
        foreach ($breakdown as $mime => &$values) {
          $data_row["{$mime}_requests"] = $values['requests'];
          $data_row["{$mime}_bytes"] = $values['bytes'];
        }
        // capture the page speed score
        if ($cached)
          $data_row['page_speed'] = GetPageSpeedScore("$testPath/{$run}_Cached_pagespeed.txt");
        else
          $data_row['page_speed'] = GetPageSpeedScore("$testPath/{$run}_pagespeed.txt");
        $data_row['url'] = $test['url'];
        $data_row['label'] = $test['label'];
        $data_row['location'] = $test['location'];
        $data_row['config'] = $test['config'];
        $data_row['cached'] = $cached;
        $data_row['run'] = $run;
        $data_row['id'] = $test['id'];
        $data[] = $data_row;
        $count++;
      }
    }
  } else {
    $data_row = array();
    $data_row['url'] = $test['url'];
    $data_row['label'] = $test['label'];
    $data_row['location'] = $test['location'];
    $data_row['config'] = $test['config'];
    $data_row['id'] = $test['id'];
    $data[] = $data_row;
  }
  // If the test was already archived, re-archive it.
  $testInfo = GetTestInfo($id);
  if (array_key_exists('archived', $testInfo) && $testInfo['archived']) {
    $lock = LockTest($id);
    if (isset($lock)) {
      $testInfo = GetTestInfo($id);
      $testInfo['archived'] = false;
      SaveTestInfo($id, $testInfo);
      UnlockTest($lock);
    }
    ArchiveTest($id);
  }
  echo "$count results\n";
}
?>
