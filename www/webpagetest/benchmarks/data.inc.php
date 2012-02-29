<?php

require_once('common.inc');

/*
    Helper functions to deal with aggregate benchmark data
*/

function LoadDataTSV($benchmark, $cached, $metric, $aggregate) {
    $tsv = null;
    $isbytes = false;
    $istime = false;
    if (stripos($metric, 'bytes') !== false) {
        $isbytes = true;
    } elseif (stripos($metric, 'time') !== false || 
            stripos($metric, 'render') !== false || 
            stripos($metric, 'fullyloaded') !== false || 
            stripos($metric, 'visualcomplete') !== false || 
            stripos($metric, 'eventstart') !== false || 
            stripos($metric, 'ttfb') !== false) {
        $istime = true;
    }
    if (LoadData($data, $columns, $benchmark, $cached, $metric, $aggregate)) {
        $tsv = 'Date';
        foreach($columns as $column) {
            $tsv .= "\t$column";
        }
        $tsv .= "\n";
        foreach ($data as $time => &$row) {
            $tsv .= date('Y-m-d H:i:s', $time);
            foreach($columns as $column) {
                $tsv .= "\t";
                if (array_key_exists($column, $row)) {
                    $value = $row[$column];
                    if ($isbytes)
                        $value = number_format($value / 1024.0, 3);
                    elseif ($istime)
                        $value = number_format($value / 1000.0, 3);
                    $tsv .= $value;
                }
            }
            $tsv .= "\n";
        }
    }
    return $tsv;
}

/**
* Load data for the given request (benchmark/metric)
* 
*/
function LoadData(&$data, &$columns, $benchmark, $cached, $metric, $aggregate) {
    $ok = false;
    $data = array();
    if (GetConfigurationNames($benchmark, $columns)) {
        $data_file = "./results/benchmarks/$benchmark/aggregate/$metric.json";
        if (gz_is_file($data_file)) {
            $raw_data = json_decode(gz_file_get_contents($data_file), true);
            if (count($raw_data)) {
                $ok = true;
                foreach($raw_data as &$row) {
                    if ($row['cached'] == $cached &&
                        array_key_exists($aggregate, $row)) {
                        $time = $row['time'];
                        if (!array_key_exists($time, $data)) {
                            $data[$time] = array();
                        }
                        $data[$time][$row['config']] = $row[$aggregate];
                    }
                }
            }
        }
    }
    return $ok;
}

/**
* Get the list of configurations for the given benchmark
* 
* @param mixed $benchmark
*/
function GetConfigurationNames($benchmark, &$configs) {
    $ok = false;
    $configs = array();
    if (include "./settings/benchmarks/$benchmark.php") {
        $ok = true;
        foreach ($configurations as $name => &$config) {
            $configs[] = $name;
        }
    }
    return $ok;
}

/**
* Get information about the various benchmarks that are configured
* 
*/
function GetBenchmarks() {
    $benchmarks = array();
    $bm_list = file('./settings/benchmarks/benchmarks.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!count($bm_list))
        $bm_list = glob('./settings/benchmarks/*.php');
    foreach ($bm_list as $benchmark) {
        $benchmarks[] = GetBenchmarkInfo(basename($benchmark, '.php'));
    }
    return $benchmarks;
}

/**
* Get the information for a single benchmark
* 
* @param mixed $benchmark
*/
function GetBenchmarkInfo($benchmark) {
    $info = array('name' => $benchmark);
    if(include "./settings/benchmarks/$benchmark.php") {
        if (isset($title)) {
            $info['title'] = $title;
        }
        if (isset($description)) {
            $info['description'] = $description;
        }
        $info['fvonly'] = false;
        $info['video'] = false;
        if (isset($configurations)) {
            $info['configurations'] = $configurations;
            foreach($configurations as &$configuration) {
                if (array_key_exists('settings', $configuration)) {
                    foreach ($configuration['settings'] as $key => $value) {
                        if ($key == 'fvonly' && $value)
                            $info['fvonly'] = true;
                        elseif ($key == 'video' && $value)
                            $info['video'] = true;
                    }
                }
            }
        }
    }
    return $info;
}
?>