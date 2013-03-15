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
    foreach($results as &$result) {
        $valid = true;
        $total++;
        if (($result['result'] != 0 && $result['result'] != 99999 ) ||
            !$result['bytesInDoc'] ||
            !$result['docTime'] ||
            !$result['TTFB'] ||
            $result['TTFB'] > $result['docTime'] ||
            (isset($maxBandwidth) && $maxBandwidth && (($result['bytesInDoc'] * 8) / $result['docTime']) > $maxBandwidth)) {
            $valid = false;
            $invalid++;
        }
        if ($valid) {
            $url = $result['url'];
            $location = $locations[$result['location']];
            if( !array_key_exists($url, $data) ) {
                $data[$url] = array();
            }
            $data[$url][$location] = array();
            $data[$url][$location]['id'] = $result['id'];
            $data[$url][$location]['result'] = $result['result'];
            if( $result['result'] == 0 || $result['result'] == 99999 ) {
                if (!array_key_exists($location, $stats)) {
                    $stats[$location] = array();
                    foreach ($metrics as $metric) {
                        $stats[$location][$metric] = array();
                    }
                }
                foreach ($metrics as $metric) {
                    $data[$url][$location][$metric] = $result[$metric];
                    $data[$url][$location]["$metric.stddev"] = $result["$metric.stddev"];
                    $stats[$location][$metric][] = $result[$metric];
                }
            }
        }
    }
    echo "$invalid of $total\n";
    ksort($data);
    foreach ($metrics as $metric) {
        $file = fopen("./$metric.csv", 'w+');
        if ($file) {
            fwrite($file, 'URL,');
            $metricData = array();
            $first = true;
            foreach($locations as $loc => $label) {
                fwrite($file, "$label,");
                fwrite($file, "$label stddev,");
                if (!$first)
                    fwrite($file, "$label Delta,");
                $metricData[$label] = array();
                $first = false;
            }
            fwrite($file, "Test Comparison\r\n");
            foreach($data as $url => &$urlData) {
                fwrite($file, "$url,");
                // check and make sure we have data for all of the configurations for this url
                $valid = true;
                foreach($locations as $loc => $label) {
                    if (!array_key_exists($label, $urlData) || !array_key_exists($metric, $urlData[$label]))
                        $valid = false;
                }
                if ($valid) {
                    $compare = "\"http://www.webpagetest.org/video/compare.php?tests=";
                    $first = true;
                    $baseline = null;
                    foreach($locations as $loc => $label) {
                        $value = '';
                        if (array_key_exists($label, $urlData) && array_key_exists($metric, $urlData[$label]))
                            $value = $urlData[$label][$metric];
                        fwrite($file, "$value,");
                        $stddev = '';
                        if (array_key_exists($label, $urlData) && array_key_exists("$metric.stddev", $urlData[$label]))
                            $stddev = $urlData[$label]["$metric.stddev"];
                        fwrite($file, "$stddev,");
                        if ($first)
                            $baseline = $value;
                        else {
                            $delta = '';
                            if (strlen($value) && strlen($baseline))
                                $delta = $value - $baseline;
                            fwrite($file, "$delta,");
                        }
                        if (strlen($value))
                            $metricData[$label][] = $value;
                        if (array_key_exists($label, $urlData) && array_key_exists('id', $urlData[$label]))
                            $compare .= $urlData[$label]['id'] . '-l:' . urlencode($label) . ',';
                        $first = false;
                    }
                    $compare .= '"';
                    fwrite($file, $compare);
                }
                fwrite($file, "\r\n");
            }
            fclose($file);
            $summary = fopen("./{$metric}_Summary.csv", 'w+');
            if ($summary) {
                fwrite($summary, ',');
                $first = true;
                foreach($locations as $loc => $label) {
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
                foreach($locations as $loc => $label) {
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
                    foreach($locations as $loc => $label) {
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
