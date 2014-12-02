<?php
/**
 * Send test result to a Statsd instance
 */
require_once('./lib/statsd-php/Domnikl/Statsd/Connection.php');
require_once('./lib/statsd-php/Domnikl/Statsd/Connection/Socket.php');
require_once('./lib/statsd-php/Domnikl/Statsd/Client.php');

function StatsdPostResult(&$test, $testPath) {
  require_once ('page_data.inc');

  $runs = $test['runs'];
  if (array_key_exists('discard', $test) &&
    $test['discard'] > 0 &&
    $test['discard'] <= $runs) {
    $runs -= $test['discard'];
  }

  if ($runs) {
    $pageData = loadAllPageData($testPath);
    $medians = array(GetMedianRun($pageData, 0), GetMedianRun($pageData, 1));
    if (isset($pageData) && is_array($pageData)) {
      foreach ($pageData as $run => &$pageRun) {
        foreach ($pageRun as $cached => &$testData) {
          if (GetSetting('statsdPattern') && !preg_match('/' . GetSetting('statsdPattern') . '/', $test['label'])) {
            continue;
          }
          if (GetSetting('statsdMedianOnly') && !($medians[$cached] == $run)) {
            continue;
          }
          $graphData = array();
          foreach ($testData as $metric => $value) {
            if (is_float($value)) {
              $value = intval($value);
            }

            if (is_int($value) && $metric != 'result') {
              $graphData[$metric] = $value;
            }
          }
          StatsdPost($test['location'], $test['browser'], $test['label'], $cached, $graphData);
        }
      }
    }
  }
}

function StatsdPost($location, $browser, $label, $cached, &$metrics) {
  $connection = new \Domnikl\Statsd\Connection\Socket(GetSetting('statsdHost'), (GetSetting('statsdPort') ?: 8125));
  $statsd = new \Domnikl\Statsd\Client($connection, (GetSetting('statsdPrefix') ?: ''));

  $base_key = graphite_key($location, $browser, $label, $cached);

  foreach ($metrics as $metric => $value) {
    $statsd->gauge($base_key . $metric, $value);
  }
}

function graphite_key($location, $browser, $label, $cached, $metric) {
  if (GetSetting('statsdCleanPattern')) {
    $label = preg_replace('/' . GetSetting('statsdPattern') . '/', '', $label);
  }
  $fvrv = $cached ? 'repeat' : 'first';
  $locationParts = explode('_', $location);
  $location = $locationParts[0];
  return "{$location}.{$browser}.{$label}.{$fvrv}.";
}

?>
