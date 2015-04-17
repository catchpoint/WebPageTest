<?php
include './settings.inc';

$results = array();
$urls = array();
$counts = array('total' => 0, 'complete' => 0, 'similar' => 0, 'different' => 0);
$testCount = 0;

// Group the results by URL
if (LoadResults($results)) {
  foreach($results as $result) {
    if (isset($result['id']) && isset($result['url'])) {
      if (!isset($urls[$result['url']]))
        $urls[$result['url']] = array();
      $urls[$result['url']][$result['id']] = $result;
    }
  }
}

$testCount = count($urls);
echo "Validating the results for $testCount comparisons...\r\n";

// Loop through the URLs and make sure all of the tests are comprable
// (result, TTFB, requests and last video frames are all similar)
foreach($urls as &$url) {
  $counts['total']++;
  echo "\rValidating the results of comparison {$counts['total']} of $testCount...                  ";
  if (AllTestsComplete($url)) {
    $counts['complete']++;
    if (MetricsSimilar($url) && ImagesSimilar($url)) {
      $counts['similar']++;
    } else {
      $counts['different']++;

      // mark all of the configurations to be resubmitted
      foreach($url as $url_result) {
        if (isset($url_result['id'])) {
          foreach($results as &$original_result) {
            if (isset($original_result['id']) && $original_result['id'] == $url_result['id']) {
              $original_result['resubmit'] = true;
              break;
            }
          }
        }
      }
    }
    
    // update the similarity values for the raw results
    foreach($url as $url_result) {
      if (isset($url_result['id']) && isset($url_result['sim'])) {
        foreach($results as &$original_result) {
          if (isset($original_result['id']) && $original_result['id'] == $url_result['id']) {
            $original_result['sim'] = $url_result['sim'];
            break;
          }
        }
      }
    }
  }
}
// clear the progress text
echo "\r                                                                          \r";

StoreResults($results);

foreach($counts as $label => $count) {
  echo "$label: $count\r\n";
}

function AllTestsComplete(&$url) {
  $all_complete = true;
  foreach($url as $result) {
    //if (!isset($result['result']) || (isset($result['resubmit']) && $result['resubmit'])) {
    if (!isset($result['result'])) {
      $all_complete = false;
      break;
    }
  }
  return $all_complete;
}

function MetricsSimilar(&$url) {
  $similar = true;
  
  // make sure the result codes are the same
  $baseline = null;
  foreach($url as $result) {
    if (isset($baseline)) {
      if ($result['result'] !== $baseline) {
        $similar = false;
        break;
      }
    } else {
      $baseline = $result['result'];
    }
  }
  
  // make sure the TTFB is within 100ms
  if ($similar) {
    $baseline = null;
    foreach($url as $result) {
      if (isset($baseline)) {
        if (abs($result['TTFB'] - $baseline) > 100) {
          $similar = false;
          break;
        }
      } else {
        $baseline = $result['TTFB'];
      }
    }
  }

  // make sure the request count is within 5
  if ($similar) {
    $baseline = null;
    foreach($url as $result) {
      if (isset($baseline)) {
        if (abs($result['requestsDoc'] - $baseline) > 5) {
          $similar = false;
          break;
        }
      } else {
        $baseline = $result['requestsDoc'];
      }
    }
  }

  return $similar;
}

function ImagesSimilar(&$url) {
  global $video;
  global $server;
  $similar = true;
  
  if ($video) {
    // ask the server to visually compare the last frames (if we don't already have similarity numbers)
    $needSimilarity = false;
    foreach($url as $result) {
      if (!isset($result['sim']) || $result['sim'] < 0) {
        $needSimilarity = true;
        break;
      }
    }
    
    if ($needSimilarity) {
      // build up the similarity request
      $api = "{$server}video/compareFrames.php?tests=";
      foreach($url as $result) {
        if (isset($result['id']) && isset($result['run']))
          $api .= "{$result['id']}-r:{$result['run']},";
      }
      $raw = file_get_contents($api);
      $compare = json_decode($raw, true);
      if (isset($compare['data']) && is_array($compare['data'])) {
        foreach($compare['data'] as $test => $similarity)
          $url[$test]['sim'] = $similarity;
      }
    }

    // if the similarity is < 85% for any of them it fails
    foreach($url as $result) {
      if (!isset($result['sim']) || $result['sim'] < 85) {
        $similar = false;
        break;
      }
    }
  }

  return $similar;
}
?>
