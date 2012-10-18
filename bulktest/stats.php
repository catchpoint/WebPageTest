<?php
include './settings.inc';

$results = array();

$loc = array();
$loc['Pat_Chrome:Current.Native'] = 'Reference';
$loc['Pat_Chrome:Dev.Native'] = 'Experiment';

$metrics = array('ttfb', 'startRender', 'docComplete', 'fullyLoaded', 'speedIndex', 'bytes', 'requests');

// Load the existing results
if (LoadResults($results)) {
    // split them up by URL and location
    $data = array();
    $stats = array();
    foreach($results as &$result) {
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
    ksort($data);
    foreach ($metrics as $metric) {
        $file = fopen("./$metric.csv", 'w+');
        if ($file) {
            fwrite($file, "URL,Reference,Experiment,Experiment Delta,Test Comparison\r\n");
            $metricData = array('Reference' => array(), 'Experiment' => array());
            $experimentFaster = 0;
            foreach($data as $url => &$urlData) {
                fwrite($file, "$url,");
                $reference = null;
                if (array_key_exists('Reference', $urlData) && array_key_exists($metric, $urlData['Reference'])) {
                    $reference = $urlData['Reference'][$metric];
                    fwrite($file, $reference);
                }
                fwrite($file, ',');
                $experiment = null;
                if (array_key_exists('Experiment', $urlData) && array_key_exists($metric, $urlData['Experiment'])) {
                    $experiment = $urlData['Experiment'][$metric];
                    fwrite($file, $experiment);
                }
                fwrite($file, ',');
                if (isset($reference) && isset($experiment)) {
                    $delta = $experiment - $reference;
                    fwrite($file, $delta);
                }
                fwrite($file, ',');
                $compare = "\"http://www.webpagetest.org/video/compare.php?thumbSize=200&ival=100&end=doc&tests=";
                $compare .= $urlData['Reference']['id'] . '-l:Reference,';
                $compare .= $urlData['Experiment']['id'] . '-l:Experiment,';
                $compare .= '"';
                fwrite($file, $compare);
                fwrite($file, "\r\n");
                if (isset($reference) && isset($experiment)) {
                    $metricData['Reference'][] = $reference;
                    $metricData['Experiment'][] = $experiment;
                    if ($experiment < $reference) {
                        $experimentFaster++;
                    }
                }
            }
            fclose($file);
            $summary = fopen("./{$metric}_Summary.csv", 'w+');
            if ($summary) {
                sort($metricData['Reference']);
                sort($metricData['Experiment']);
                fwrite($summary, ",Reference,Experiment,Experiment delta\r\n");
                $reference = Avg($metricData['Reference']);
                $experiment = Avg($metricData['Experiment']);
                $experimentDelta = $experiment - $reference;
                $experimentDeltaPct = round(($experimentDelta / $reference) * 100);
                fwrite($summary, "Average,$reference,$experiment,$experimentDelta ($experimentDeltaPct%)\r\n");
                $percentiles = array(25,50,75,95,99);
                foreach($percentiles as $percentile) {
                    $reference = Percentile($metricData['Reference'], $percentile);
                    $experiment = Percentile($metricData['Experiment'], $percentile);
                    $experimentDelta = $experiment - $reference;
                    $experimentDeltaPct = number_format(($experimentDelta / $reference) * 100, 2);
                    fwrite($summary, "{$percentile}th Percentile,$reference,$experiment,$experimentDelta ($experimentDeltaPct%)\r\n");
                }
                fwrite($summary, "\r\n");
                fwrite($summary, "Test Count," . count($metricData['Reference']) . "\r\n");
                fwrite($summary, "Experiment Faster,$experimentFaster\r\n");
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
