<?php

require_once('common.inc');

/*
    Helper functions to deal with aggregate benchmark data
*/
function LoadDataTSV($benchmark, $cached, $metric, $aggregate, $loc = null, &$annotations) {
    $tsv = null;
    $isbytes = false;
    $istime = false;
    $annotations = array();
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
        $series = array();
        $tsv = 'Date';
        foreach($configurations as &$configuration) {
            if (array_key_exists('title', $configuration) && strlen($configuration['title']))
                $title = $configuration['title'];
            else
                $title = $configuration['name'];
            if (count($configuration['locations']) > 1) {
                $name = "$title ";
                if (count($configurations) == 1)
                    $name = '';
                foreach ($configuration['locations'] as &$location) {
                    if (is_numeric($location['label'])) {
                        $tsv .= "\t$name{$location['location']}";
                        $series[] = "$name{$location['location']}";
                    } else {
                        $tsv .= "\t$name{$location['label']}";
                        $series[] = "$name{$location['label']}";
                    }
                }
            } else {
                $tsv .= "\t$title";
            }
        }
        $tsv .= "\n";
        $dates = array();
        foreach ($data as $time => &$row) {
            $date_text = date('Y-m-d H:i:s', $time);
            $tsv .= $date_text;
            $dates[$date_text] = $time;
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
        if (is_file("./settings/benchmarks/$benchmark.notes")) {
            $notes = parse_ini_file("./settings/benchmarks/$benchmark.notes", true);
            $i = 0;
            asort($dates);
            foreach($notes as $note_date => $note) {
                // find the closest data point on or after the selected date
                $note_date = str_replace('/', '-', $note_date);
                if (!array_key_exists($note_date, $dates)) {
                    $date = DateTime::createFromFormat('Y-m-d H:i', $note_date);
                    if ($date !== false) {
                        $time = $date->getTimestamp();
                        unset($note_date);
                        if ($time) {
                            foreach($dates as $date_text => $date_time) {
                                if ($date_time >= $time) {
                                    $note_date = $date_text;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (isset($note_date) && array_key_exists('text', $note) && strlen($note['text'])) {
                    $i++;
                    foreach($series as $data_series) {
                        $annotations[] = array('series' => $data_series, 'attachAtBottom' => true, 'x' => $note_date, 'shortText' => "$i", 'text' => $note['text']);
                    }
                }
            }
        }
    }
    return $tsv;
}

/**
* Load the annotations for the given location and return them in a form that is suitable for Dygraph to use
* 
* @param mixed $benchmark
* @param mixed $loc
*/
function GetAnnotations($benchmark, $loc = null) {
}

/**
* Load data for the given request (benchmark/metric)
* 
*/
function LoadData(&$data, &$configurations, $benchmark, $cached, $metric, $aggregate, $loc) {
    $ok = false;
    $data = array();
    if (GetConfigurationNames($benchmark, $configurations, $loc, $loc_aliases)) {
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
                        if (isset($loc_aliases) && count($loc_aliases)) {
                            foreach($loc_aliases as $loc_name => &$aliases) {
                                foreach($aliases as $alias) {
                                    if ($location == $alias) {
                                        $location = $loc_name;
                                        break 2;
                                    }
                                }
                            }
                        }
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
function GetConfigurationNames($benchmark, &$configs, $loc, &$loc_aliases) {
    $ok = false;
    $configs = array();
    if (isset($loc_aliases))
        unset($loc_aliases);
    if (include "./settings/benchmarks/$benchmark.php") {
        $ok = true;
        if (isset($location_aliases)) {
            $loc_aliases = $location_aliases;
        }
        foreach ($configurations as $name => &$config) {
            $entry = array('name' => $name, 'title' => $config['title'] ,'locations' => array());
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