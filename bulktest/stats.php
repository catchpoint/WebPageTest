<?php
include './settings.inc';

$results = array();

// Load the existing results
if (LoadResults($results)) {
    // split them up by URL and location
    $data = array();
    $stats = array();
    $invalid = 0;
    $total = 0;
    $minRuns = ceil($runs / 2);
    foreach($results as &$result) {
        $valid = true;
        $validVisual = true;
        $total++;
        if ((@$result['result'] != 0 && @$result['result'] != 99999 ) ||
            !@$result['bytesInDoc'] ||
            !@$result['docTime'] ||
            !@$result['TTFB'] ||
            $result['successfulRuns'] < $minRuns ||
            @$result['TTFB'] > @$result['docTime'] ||
            (isset($maxBandwidth) && $maxBandwidth && (($result['bytesInDoc'] * 8) / $result['docTime']) > $maxBandwidth) ||
            ($video && (!$result['SpeedIndex'] || !$result['render'] || !$result['visualComplete']))) {
            $valid = false;
            $invalid++;
        }
        if ($valid && $video && (!$result['SpeedIndex'] || !$result['render'] || !$result['visualComplete'])) {
          $validVisual = false;
        }
        $url = $result['url'];
        $label = $result['label'];
        $index = 1;
        $key = $url;
        while (array_key_exists($key, $data) && array_key_exists($label, $data[$key])) {
          $index++;
          $key = "$url ($index)";
        }
        if( !array_key_exists($key, $data) )
            $data[$key] = array();
        $data[$key]['url'] = $url;
        $data[$key][$label] = array();
        $data[$key][$label]['id'] = $result['id'];
        $data[$key][$label]['result'] = $result['result'];
        if (array_key_exists('run', $result))
          $data[$key][$label]['run'] = $result['run'];
        $data[$key][$label]['valid'] = $valid;
        $data[$key][$label]['validVisual'] = $validVisual;
        if( $valid ) {
            if (!array_key_exists($label, $stats)) {
                $stats[$label] = array();
                foreach ($metrics as $metric)
                    $stats[$label][$metric] = array();
            }
            foreach ($metrics as $metric) {
              if (array_key_exists($metric, $result) && IsMetricValid($metric, $valid, $validVisual)) {
                $data[$key][$label][$metric] = $result[$metric];
                if (array_key_exists("$metric.stddev", $result))
                  $data[$key][$label]["$metric.stddev"] = $result["$metric.stddev"];
                $stats[$label][$metric][] = $result[$metric];
              }
            }
        }
    }
    echo "$invalid of $total\n";
    ksort($data);
    $file = fopen("./tests.csv", 'w');
    if ($file) {
      fwrite($file, 'URL');
      foreach($permutations as $label => &$permutation)
          fwrite($file, ",$label");
      fwrite($file, "\r\n");
      foreach($data as $key => &$urlData) {
        fwrite($file, "\"{$urlData['url']}\"");
        foreach($permutations as $label => &$permutation) {
          $test = '';
          if (array_key_exists($label, $urlData) &&
              is_array($urlData[$label]) &&
              array_key_exists('id', $urlData[$label]))
              $test = "{$server}result/{$urlData[$label]['id']}/";
          fwrite($file, ",\"$test\"");
        }
        fwrite($file, "\r\n");
      }
      fclose($file);
    }
    foreach ($metrics as $metric) {
        $file = fopen("./$metric.csv", 'w+');
        if ($file) {
            fwrite($file, 'URL,');
            $metricData = array();
            $first = true;
            foreach($permutations as $label => &$permutation) {
                fwrite($file, "$label,");
                fwrite($file, "$label stddev,");
                if (!$first)
                    fwrite($file, "$label Delta,");
                $metricData[$label] = array();
                $first = false;
            }
            fwrite($file, "Test Comparison\r\n");
            foreach($data as $key => &$urlData) {
                fwrite($file, "\"{$urlData['url']}\",");
                // check and make sure we have data for all of the configurations for this url
                $valid = true;
                foreach($permutations as $label => &$permutation) {
                    if (!array_key_exists($label, $urlData) || !array_key_exists($metric, $urlData[$label]))
                        $valid = false;
                }
                $compare = "\"http://www.webpagetest.org/video/compare.php?ival=100&end=full&tests=";
                $first = true;
                $baseline = null;
                foreach($permutations as $label => &$permutation) {
                    $value = '';
                    if ($valid && array_key_exists($label, $urlData) && array_key_exists($metric, $urlData[$label]))
                        $value = $urlData[$label][$metric];
                    fwrite($file, "$value,");
                    $stddev = '';
                    if ($valid && array_key_exists($label, $urlData) && array_key_exists("$metric.stddev", $urlData[$label]))
                        $stddev = $urlData[$label]["$metric.stddev"];
                    fwrite($file, "$stddev,");
                    if ($first)
                        $baseline = $value;
                    else {
                        $delta = '';
                        if ($valid && strlen($value) && strlen($baseline))
                            $delta = $value - $baseline;
                        fwrite($file, "$delta,");
                    }
                    if (strlen($value))
                        $metricData[$label][] = $value;
                    if (array_key_exists($label, $urlData) && array_key_exists('id', $urlData[$label])) {
                      $run = '';
                      if (array_key_exists('run', $urlData[$label]))
                        $run = "-r:{$urlData[$label]['run']}";
                      $compare .= $urlData[$label]['id'] . $run . '-l:' . urlencode($label) . ',';
                    }
                    $first = false;
                }
                $compare .= "\"\r\n";
                fwrite($file, $compare);
            }
            fclose($file);
            $summary = fopen("./{$metric}_Summary.csv", 'w+');
            if ($summary) {
                fwrite($summary, ',');
                $first = true;
                foreach($permutations as $label => &$permutation) {
                    sort($metricData[$label]);
                    fwrite($summary, "$label,");
                    if (!$first)
                        fwrite($summary, "$label Delta,");
                    $first = false;
                }
                fwrite($summary, "\r\n");
                fwrite($summary, 'Average,');
                $first = true;
                $baseline = null;
                $testCount = 0;
                foreach($permutations as $label => &$permutation) {
                    $value = '';
                    if (array_key_exists($label, $metricData))
                        $value = Avg($metricData[$label]);
                    fwrite($summary, "$value,");
                    if ($first) {
                        $testCount = count($metricData[$label]);
                        $baseline = $value;
                    } else {
                        $delta = '';
                        if (strlen($value) && strlen($baseline)) {
                            $delta = $value - $baseline;
                            if ($baseline) {
                                $deltaPct = number_format(($delta / $baseline) * 100, 2);
                                $delta .= " ($deltaPct%)";
                            }
                        }
                        fwrite($summary, "$delta,");
                    }
                    $first = false;
                }
                fwrite($summary, "\r\n");
                $percentiles = array(25,50,75,95,99);
                foreach($percentiles as $percentile) {
                    fwrite($summary, "{$percentile}th Percentile,");
                    $first = true;
                    $baseline = null;
                    foreach($permutations as $label => &$permutation) {
                        $value = '';
                        if (array_key_exists($label, $metricData))
                            $value = Percentile($metricData[$label], $percentile);
                        fwrite($summary, "$value,");
                        if ($first)
                            $baseline = $value;
                        else {
                            $delta = '';
                            if (strlen($value) && strlen($baseline)) {
                                $delta = $value - $baseline;
                                if ($baseline) {
                                    $deltaPct = number_format(($delta / $baseline) * 100, 2);
                                    $delta .= " ($deltaPct%)";
                                }
                            }
                            fwrite($summary, "$delta,");
                        }
                        $first = false;
                    }
                    fwrite($summary, "\r\n");
                }
                fwrite($summary, "\r\n");
                fwrite($summary, "Test Count,$testCount\r\n");
                fclose($summary);
            }
        }
    }
}

function IsMetricValid($metric, $valid, $validVisual) {
  if ($valid && !$validVisual && ($metric == 'SpeedIndex' || $metric == 'render' || $metric == 'visualComplete'))
    $valid = false;
  return $valid;
}

function Avg(&$data) {
    $avg = '';
    $count = count($data);
    if ($count) {
        $total = 0;
        foreach($data as $value) {
            $total += $value;
        }
        $avg = round($total / $count);
    }
    return $avg;
}

function Percentile(&$data, $percentile) {
    $val = '';
    $count = count($data);
    if ($count) {
        $pos = min($count - 1, max(0,floor((($count - 1) * $percentile) / 100)));
        $val = $data[$pos];
    }
    return $val;
}

/**
* Calculate the average and standard deviation for the supplied data set
* 
* @param mixed $data
* @param mixed $avg
* @param mixed $stddev
* @param mixed $ratio
*/
function CalculateStats(&$data, &$avg, &$stddev, &$ratio)
{
    $avg = 0;
    $stddev = 0;
    $ratio = 0;
    
    // pass 1 - average
    $total = 0;
    $count = 0;
    foreach($data as $value){
        $total += $value;
        $count++;
    }
    if( $count ){
        $avg = $total / $count;
        
        // pass 2 - stddev
        $total = 0;
        foreach($data as $value){
            $total += pow($value - $avg, 2);
        }
        $stddev = sqrt($total / $count);
        if ($avg)
            $ratio = $stddev / $avg;
    }
}
?>
