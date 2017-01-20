<?php
include 'common.inc';
require_once('page_data.inc');
require_once('breakdown.inc');
require_once('object_detail.inc');
require_once('./video/visualProgress.inc.php');
set_time_limit(3600);

$sentHeader = false;
$hasCSV = null;

// make sure the test has finished, otherwise return a 404
if( isset($test['test']) && (isset($test['test']['completeTime']) || $test['test']['batch']) )
{
  $fileType = 'IEWPG.txt';
  $filename = "{$id}_summary.csv";
  $header = '"Date","Time","Event Name","URL","Load Time (ms)","Time to First Byte (ms)","unused","Bytes Out","Bytes In","DNS Lookups","Connections","Requests","OK Responses","Redirects","Not Modified","Not Found","Other Responses","Error Code","Time to Start Render (ms)","Segments Transmitted","Segments Retransmitted","Packet Loss (out)","Activity Time(ms)","Descriptor","Lab ID","Dialer ID","Connection Type","Cached","Event URL","Pagetest Build","Measurement Type","Experimental","Doc Complete Time (ms)","Event GUID","Time to DOM Element (ms)","Includes Object Data","Cache Score","Static CDN Score","One CDN Score","GZIP Score","Cookie Score","Keep-Alive Score","DOCTYPE Score","Minify Score","Combine Score","Bytes Out (Doc)","Bytes In (Doc)","DNS Lookups (Doc)","Connections (Doc)","Requests (Doc)","OK Responses (Doc)","Redirects (Doc)","Not Modified (Doc)","Not Found (Doc)","Other Responses (Doc)","Compression Score","Host","IP Address","ETag Score","Flagged Requests","Flagged Connections","Max Simultaneous Flagged Connections","Time to Base Page Complete (ms)","Base Page Result","Gzip Total Bytes","Gzip Savings","Minify Total Bytes","Minify Savings","Image Total Bytes","Image Savings","Base Page Redirects","Optimization Checked","AFT (ms)","DOM Elements","PageSpeed Version","Page Title","Time to Title","Load Event Start","Load Event End","DOM Content Ready Start","DOM Content Ready End","Visually Complete (ms)","Browser Name","Browser Version","Base Page Server Count","Base Page Server RTT","Base Page CDN","Adult Site"';
  $column_count = 88;
  $is_requests = false;
  if( $_GET['requests'] )
  {
      $fileType = 'IEWTR.txt';
      $header = '"Date","Time","Event Name","IP Address","Action","Host","URL","Response Code","Time to Load (ms)","Time to First Byte (ms)","Start Time (ms)","Bytes Out","Bytes In","Object Size","Cookie Size (out)","Cookie Count(out)","Expires","Cache Control","Content Type","Content Encoding","Transaction Type","Socket ID","Document ID","End Time (ms)","Descriptor","Lab ID","Dialer ID","Connection Type","Cached","Event URL","Pagetest Build","Measurement Type","Experimental","Event GUID","Sequence Number","Cache Score","Static CDN Score","GZIP Score","Cookie Score","Keep-Alive Score","DOCTYPE Score","Minify Score","Combine Score","Compression Score","ETag Score","Flagged","Secure","DNS Time","Connect Time","SSL Time","Gzip Total Bytes","Gzip Savings","Minify Total Bytes","Minify Savings","Image Total Bytes","Image Savings","Cache Time (sec)","Real Start Time (ms)","Full Time to Load (ms)","Optimization Checked","CDN Provider","DNS Start","DNS End","Connect Start","Connect End","SSL Negotiation Start","SSL Negotiation End","Initiator","Initiator Line","Initiator Column","Server Count","Server RTT"';
      $column_count = 72;
      $filename = "{$id}_details.csv";
      $is_requests = true;
  }
  header("Content-disposition: attachment; filename=$filename");
  header ("Content-type: text/csv");
  header("Cache-Control: no-cache, must-revalidate");
  header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

  if ($test['test']['batch']) {
    $tests = null;
    if (gz_is_file("$testPath/tests.json") ) {
      $legacyData = json_decode(gz_file_get_contents("$testPath/tests.json"), true);
      $tests = array();
      $tests['variations'] = array();
      $tests['urls'] = array();
      foreach( $legacyData as &$legacyTest )
        $tests['urls'][] = array('u' => $legacyTest['url'], 'id' => $legacyTest['id']);
    } elseif( gz_is_file("$testPath/bulk.json") ) {
      $tests = json_decode(gz_file_get_contents("$testPath/bulk.json"), true);
    }
    if( isset($tests) ) {
      foreach( $tests['urls'] as &$testData ) {
        RestoreTest($testData['id']);
        $path = './' . GetTestPath($testData['id']);
        if (!isset($hasCSV)) {
          $files = glob("$path/*$fileType");
          if ($files && is_array($files) && count($files))
            $hasCSV = true;
          else
            $hasCSV = false;
        }
        $label = $testData['l'];
        if( !strlen($label) )
          $label = htmlspecialchars(ShortenUrl($testData['u']));
        if ($hasCSV) {
          if (!$sentHeader) {
            echo "\"Test\",$header,\"Run\",\"Cached\"";
            if (!$is_requests) {
                echo ',"Speed Index"';
            }
            echo "\r\n";
            $sentHeader = true;
          }
          $testInfo = GetTestInfo($path);
          for( $i = 1; $i <= $test['test']['runs']; $i++ ) {
            $additional = array($i, 0, SpeedIndex($path, $i, 0, $testInfo));
            csvFile("$path/{$i}_$fileType", $label, $column_count, $additional);
            $additional = array($i, 1, SpeedIndex($path, $i, 1, $testInfo));
            csvFile("$path/{$i}_Cached_$fileType", $label, $column_count, $additional);
          }
        } else {
          csvPageData($testData['id'], $path, $test['test']['runs']);
        }
        
        foreach( $testData['v'] as $variationIndex => $variationId ) {
          $path = './' . GetTestPath($variationId);
          $testInfo = GetTestInfo($path);
          if ($hasCSV) {
            for( $i = 1; $i <= $test['test']['runs']; $i++ ) {
              $additional = array($i, 0, SpeedIndex($path, $i, 0, $testInfo));
              csvFile("$path/{$i}_$fileType", "$label - {$tests['variations'][$variationIndex]['l']}", $column_count, $additional);
              $additional = array($i, 1, SpeedIndex($path, $i, 1, $testInfo));
              csvFile("$path/{$i}_Cached_$fileType", "$label - {$tests['variations'][$variationIndex]['l']}", $column_count, $additional);
            }
          } else {
            csvPageData($variationId, $path, $test['test']['runs']);
          }
        }
      }
    }
  } else {
    $files = glob("$testPath/*$fileType.*");
    if ($files && is_array($files) && count($files))
      $hasCSV = true;
    else
      $hasCSV = false;
    // loop through all  of the results files (one per run) - both cached and uncached
    if ($hasCSV) {
      echo "$header,\"Run\",\"Cached\"";
      if (!$is_requests)
        echo ',"Speed Index"';
      echo "\r\n";
      $testInfo = GetTestInfo($testPath);
      for( $i = 1; $i <= $test['test']['runs']; $i++ ) {
        $additional = array($i, 0);
        if (!$is_requests)
          $additional[] = SpeedIndex($testPath, $i, 0, $testInfo);
        csvFile("$testPath/{$i}_$fileType", null, $column_count, $additional);
        $additional = array($i, 1);
        if (!$is_requests)
          $additional[] = SpeedIndex($testPath, $i, 1, $testInfo);
        csvFile("$testPath/{$i}_Cached_$fileType", null, $column_count, $additional);
      }
    } else {
      csvPageData($id, $testPath, $test['test']['runs']);
    }
  }
  printResult();
} else {
    header("HTTP/1.0 404 Not Found");
}

function csvPageData($id, $testPath, $runs) {
  if( $_GET['requests'] ) {
    for( $i = 1; $i <= $runs; $i++ ) {
      for ($cached = 0; $cached <= 1; $cached++) {
        $requests = getRequests($id, $testPath, $i, $cached, $secure);
        if (isset($requests) && is_array($requests) && count($requests))
          foreach ($requests as &$row)
            csvArray($row, $id, $i, $cached);
      }
    }
  } else {
    $pageData = loadAllPageData($testPath);
    if ($pageData && is_array($pageData) && count($pageData)) {
      for( $i = 1; $i <= $runs; $i++ ) {
        if (array_key_exists($i, $pageData)) {
          for ($cached = 0; $cached <= 1; $cached++) {
            if (array_key_exists($cached, $pageData[$i])) {
              $breakdown = getBreakdown($id, $testPath, $i, $cached, $requests);
              if (isset($breakdown) && is_array($breakdown) && count($breakdown)) {
                foreach($breakdown as $mime_type => $b) {
                  $pageData[$i][$cached]["bytes.$mime_type"] = $b['bytes'];
                  $pageData[$i][$cached]["requests.$mime_type"] = $b['requests'];
                  if (isset($b['bytesUncompressed']))
                    $pageData[$i][$cached]["bytesUncompressed.$mime_type"] = $b['bytesUncompressed'];
                }
              }
              csvArray($pageData[$i][$cached], $id, $i, $cached);
            }
          }
        }
      }
    }
  }
}

$fields = null;
$rows = array();
function csvArray(&$array, $id, $run, $cached) {
  global $fields;
  global $rows;
  if (isset($array) && is_array($array) && count($array)) {
    $array['id'] = $id;
    $array['run'] = $run;
    $array['cached'] = $cached;
    
    if (!isset($fields)) {
      $fields = array();
    }
    // Collect a superset of all fields across all tests
    foreach ($array as $fieldName => $value) {
      if (!is_array($value)) {
        $exists = false;
        foreach ($fields as $field) {
          if ($field == $fieldName) {
            $exists = true;
            break;
          }
        }
        if (!$exists) {
          $fields[] = $fieldName;
        }
      }
    }

    $row = array();
    foreach ($fields as $field) {
      if (isset($array[$field])) {
        $row[$field] = $array[$field];
      }
    }
    if (count($row)) {
      $rows[] = $row;
    }
  }
}

function printResult() {
  global $fields;
  global $rows;
  if (isset($fields) && isset($rows) && count($rows)) {
    foreach ($fields as $field) {
      echo '"' . str_replace('"', '""', $field) . '",';
    }
    echo "\r\n";
    foreach ($rows as $row) {
      foreach ($fields as $field) {
        $value = array_key_exists($field, $row) ? $row[$field] : '';
        echo '"' . str_replace('"', '""', $value) . '",';
      }
      echo "\r\n";
    }
  }
}

function SpeedIndex($testPath, $run, $cached, $testInfo) {
  $speed_index = '';
  $pageData = loadPageRunData($testPath, $run, $cached, null, $testInfo);
  $startOffset = array_key_exists('testStartOffset', $pageData) ? intval(round($pageData['testStartOffset'])) : 0;
  $progress = GetVisualProgress($testPath, $run, $cached, null, null, $startOffset);
  if (isset($progress) && is_array($progress) && array_key_exists('SpeedIndex', $progress)) {
    $speed_index = $progress['SpeedIndex'];
  }
  return $speed_index;
}

/**
* Take a tab-separated file, convert it to csv and spit it out
* 
* @param mixed $fileName
* @param mixed $includeHeader
*/
function csvFile($fileName, $label, $column_count, &$additional_columns) {
  $lines = gz_file($fileName);
  if( $lines) {
    // loop through each line in the file
    foreach($lines as $linenum => $line)  {
      if( $linenum > 0 || strncasecmp($line,'Date', 4) ) {
        $line = trim($line, "\r\n");
        if( strlen($line) ) {
          $parseLine = str_replace("\t", "\t ", $line);
          $fields = explode("\t", $parseLine);
          if (count($fields)) {
            if( isset($label) ) {
              $label = str_replace('"', '', $label);
              echo "\"$label\",";
            }
            for ($i = 0; $i < $column_count; $i++) {
              $value = '';
              if (array_key_exists($i, $fields)) {
                $value = str_replace('"', '""', trim($fields[$i]));
              }
              echo "\"$value\",";
            }
            if (isset($additional_columns) && count($additional_columns)) {
              foreach ($additional_columns as $value) {
                $value = str_replace('"', '""', trim($value));
                echo "\"$value\",";
              }
            }
            echo "\r\n";
          }
        }
      }
    }
  }
}
?>
