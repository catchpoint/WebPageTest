<?php
include './settings.inc';

$results = array();

$loc = array();
$loc['EC2_East_Chromium:Webkit Scheduler.DSL'] = 'Webkit Scheduler';
$loc['EC2_East_Chromium:Chrome Scheduler.DSL'] = 'Chrome Scheduler';
$loc['EC2_East_Chromium:No False Start.DSL'] = 'No False Start';

$metrics = array('ttfb', 'startRender', 'docComplete', 'fullyLoaded', 'speedIndex', 'bytes', 'requests', 'domContentReady', 'visualComplete');

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
        if (array_key_exists('bytes', $result) &&
            $result['bytes'] &&
            array_key_exists('docComplete', $result) &&
            $result['docComplete'] &&
            array_key_exists('ttfb', $result) &&
            $result['ttfb'] &&
            $result['docComplete'] > $result['ttfb']) {
            $bw = ($result['bytes'] * 8) / ($result['docComplete'] - $result['ttfb']);
            if (isset($maxBandwidth) && $maxBandwidth && $bw > $maxBandwidth) {
                echo "bw: $bw\n";
                $valid = false;
                $invalid++;
            }
        } else {
            $valid = false;
        }
        if ($valid) {
            $url = $result['url'];
            $location = $loc[$result['location']];
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
            foreach($loc as $label) {
                fwrite($file, "$label,");
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
                foreach($loc as $label) {
                    if (!array_key_exists($label, $urlData) || !array_key_exists($metric, $urlData[$label]))
                        $valid = false;
                }
                if ($valid) {
                    $compare = "\"http://www.webpagetest.org/video/compare.php?thumbSize=200&ival=100&end=doc&tests=";
                    $first = true;
                    $baseline = null;
                    foreach($loc as $label) {
                        $value = '';
                        if (array_key_exists($label, $urlData) && array_key_exists($metric, $urlData[$label]))
                            $value = $urlData[$label][$metric];
                        fwrite($file, "$value,");
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
                foreach($loc as $label) {
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
                foreach($loc as $label) {
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
                    foreach($loc as $label) {
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
* Dump the data of a particular type to a tab-delimited report
* 
* @param mixed $data
* @param mixed $type
*/
function ReportData(&$data, $type)
{
    global $locations;
    $file = fopen("./report_$type.txt", 'wb');
    if($file)
    {
        fwrite($file, "URL\t");
        foreach($locations as $location)
            fwrite($file, "$location $type avg\t");
        foreach($locations as $location)
            fwrite($file, "$location $type stddev\t");
        foreach($locations as $location)
            fwrite($file, "$location $type stddev/avg\t");
        fwrite($file, "\r\n");
        foreach($data as $urlhash => &$urlentry)
        {
            fwrite($file, "{$urlentry['url']}\t");
            foreach($locations as $location){
                $value = $urlentry['data'][$location]["{$type}_avg"];
                fwrite($file, "$value\t");
            }
            foreach($locations as $location){
                $value = $urlentry['data'][$location]["{$type}_stddev"];
                fwrite($file, "$value\t");
            }
            foreach($locations as $location){
                $value = $urlentry['data'][$location]["{$type}_ratio"];
                fwrite($file, "$value\t");
            }
            fwrite($file, "\r\n");
        }
        fclose($file);
    }
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
