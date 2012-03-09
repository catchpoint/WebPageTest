<?php

require_once('common.inc');

/*
    Helper functions to deal with aggregate benchmark data
*/

function LoadDataTSV($benchmark, $cached, $metric, $aggregate, $loc = null) {
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
    if (LoadData($data, $configurations, $benchmark, $cached, $metric, $aggregate, $loc)) {
        $tsv = 'Date';
        foreach($configurations as &$configuration) {
            if (count($configuration['locations']) > 1) {
                $name = "{$configuration['name']} ";
                if (count($configurations) == 1)
                    $name = '';
                foreach ($configuration['locations'] as &$location) {
                    if (is_numeric($location['label'])) {
                        $tsv .= "\t$name{$location['location']}";
                    } else {
                        $tsv .= "\t$name{$location['label']}";
                    }
                }
            } else {
                $tsv .= "\t{$configuration['name']}";
            }
        }
        $tsv .= "\n";
        foreach ($data as $time => &$row) {
            $tsv .= date('Y-m-d H:i:s', $time);
            foreach($configurations as &$configuration) {
                foreach ($configuration['locations'] as &$location) {
                    $tsv .= "\t";
                    if (array_key_exists($configuration['name'], $row) && array_key_exists($location['location'], $row[$configuration['name']])) {
                        $value = $row[$configuration['name']][$location['location']];
                        if ($isbytes)
                            $value = number_format($value / 1024.0, 3);
                        elseif ($istime)
                            $value = number_format($value / 1000.0, 3);
                        $tsv .= $value;
                    }
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
function LoadData(&$data, &$configurations, $benchmark, $cached, $metric, $aggregate, $loc) {
    $ok = false;
    $data = array();
    if (GetConfigurationNames($benchmark, $configurations, $loc)) {
        $data_file = "./results/benchmarks/$benchmark/aggregate/$metric.json";
        if (gz_is_file($data_file)) {
            $raw_data = json_decode(gz_file_get_contents($data_file), true);
            if (count($raw_data)) {
                foreach($raw_data as &$row) {
                    if ($row['cached'] == $cached &&
                        array_key_exists($aggregate, $row) &&
                        strlen($row[$aggregate])) {
                        $time = $row['time'];
                        $config = $row['config'];
                        $location = $row['location'];
                        if (!isset($loc) || $loc == $location) {
                            $ok = true;
                            if (!array_key_exists($time, $data)) {
                                $data[$time] = array();
                            }
                            if (!array_key_exists($config, $data[$time])) {
                                $data[$time][$config] = array();
                            }
                            $data[$time][$config][$location] = $row[$aggregate];
                        }
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
function GetConfigurationNames($benchmark, &$configs, $loc) {
    $ok = false;
    $configs = array();
    if (include "./settings/benchmarks/$benchmark.php") {
        $ok = true;
        foreach ($configurations as $name => &$config) {
            $entry = array('name' => $name, 'locations' => array());
            if (array_key_exists('locations', $config)) {
                foreach ($config['locations'] as $label => $location) {
                    if (!isset($loc) || $location == $loc) {
                        $entry['locations'][] = array('location' => $location, 'label' => $label);
                    }
                }
            }
            $configs[] = $entry;
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
        $info['expand'] = false;
        if (isset($expand) && $expand)
            $info['expand'] = true;
        if (isset($configurations)) {
            $info['configurations'] = $configurations;
            $info['locations'] = array();
            foreach($configurations as &$configuration) {
                if (array_key_exists('settings', $configuration)) {
                    foreach ($configuration['settings'] as $key => $value) {
                        if ($key == 'fvonly' && $value)
                            $info['fvonly'] = true;
                        elseif ($key == 'video' && $value)
                            $info['video'] = true;
                    }
                }
                if (array_key_exists('locations', $configuration)) {
                    foreach ($configuration['locations'] as $label => $location) {
                        $info['locations'][$location] = $label;
                    }
                }
            }
        }
    }
    return $info;
}
?>