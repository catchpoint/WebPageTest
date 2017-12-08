<?php

require_once('common.inc');
$raw_data = array();
$trend_data = null;
$median_data = null;
$start_time = 0;
$days = 93;
if (array_key_exists('days', $_REQUEST))
    $days = (int)$_REQUEST['days'];
if ($days > 0)
    $start_time = time() - (86400 * $days);

/**
* Get a list of the series to display
* 
*/
function GetSeriesLabels($benchmark) {
    $series = null;
    $info = GetBenchmarkInfo($benchmark);
    if ($info && is_array($info)) {
        $loc = null;
        if ($info['expand'] && count($info['locations'] > 1)) {
            foreach ($info['locations'] as $location => $label) {
                $loc = $location;
                break;
            }
        }
        
        if (GetConfigurationNames($benchmark, $configurations, $loc, $loc_aliases)) {
            $series = array();
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
                            $series[] = array('name' => "$name{$location['location']}", 'configuration' => $configuration['name'], 'location' => $location['location']);
                        } else {
                            $series[] = array('name' => "$name{$location['label']}", 'configuration' => $configuration['name'], 'location' => $location['location']);
                        }
                    }
                } else {
                    $series[] = array('name' => $title, 'configuration' => $configuration['name'], 'location' => '');
                }
            }
        }
    }
    return $series;
}


/*
    Helper functions to deal with aggregate benchmark data
*/
function LoadDataTSV($benchmark, $cached, $metric, $aggregate, $loc, &$annotations) {
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
            stripos($metric, 'lastVisualChange') !== false || 
            stripos($metric, 'domContentLoadedEventStart') !== false || 
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
                $series[] = $title;
            }
        }
        $tsv .= "\n";
        $dates = array();
        foreach ($data as $time => &$row) {
            $date_text = gmdate('c', $time);
            $tsv .= $date_text;
            $dates[$date_text] = $time;
            foreach($configurations as &$configuration) {
                foreach ($configuration['locations'] as &$location) {
                    $tsv .= "\t";
                    if (array_key_exists($configuration['name'], $row) && array_key_exists($location['location'], $row[$configuration['name']])) {
                        $value = $row[$configuration['name']][$location['location']];
                        if ($aggregate != 'count') {
                            $divisor = $isbytes ? 1024.0 : $istime ? 1000.0 : 1;
                            if (strpos($value, ';') === false) {
                              $value = isset($divisor) ? number_format($value / $divisor, 3, '.', '') : $value;
                            } else {
                              $values = explode(';', $value);
                              foreach($values as $index => $val)
                                $values[$index] = isset($divisor) ? number_format($val / $divisor, 3, '.', '') : $value;
                              $value = implode(';', $values);
                            }
                        }
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
                    $UTC = new DateTimeZone('UTC');
                    $date = DateTime::createFromFormat('Y-m-d H:i', $note_date, $UTC);
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
                        $annotations[] = array('series' => $data_series, 'x' => $note_date, 'shortText' => "$i", 'text' => $note['text']);
                    }
                }
            }
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
    global $start_time;
    global $INCLUDE_ERROR_BARS;
    global $raw_data;
    $data = array();
    if (GetConfigurationNames($benchmark, $configurations, $loc, $loc_aliases)) {
        $data_file = "./results/benchmarks/$benchmark/aggregate/$metric.json";
        $key = "$metric-$benchmark";
        if (gz_is_file($data_file)) {
            if (!array_key_exists($key, $raw_data)) {
              $raw_data[$key] = json_decode(gz_file_get_contents($data_file), true);
              usort($raw_data[$key], 'RawDataCompare');
            }
            if (count($raw_data[$key])) {
                foreach($raw_data[$key] as &$row) {
                    if ($row['cached'] == $cached &&
                        array_key_exists($aggregate, $row) &&
                        strlen($row[$aggregate])) {
                        $time = $row['time'];
                        if (!$start_time || $time > $start_time) {
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
                                if (!array_key_exists($time, $data))
                                    $data[$time] = array();
                                if (!array_key_exists($config, $data[$time]))
                                    $data[$time][$config] = array();
                                $mid = $row[$aggregate];
                                if ($INCLUDE_ERROR_BARS && $aggregate == 'median') {
                                  $low = array_key_exists('confLow', $row) ? $row['confLow'] : $mid;
                                  $high = array_key_exists('confHigh', $row) ? $row['confHigh'] : $mid;
                                  $value = "$low;$mid;$high";
                                } else {
                                  $value = $mid;
                                }
                                $data[$time][$config][$location] = $value;
                            }
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
    if (!$bm_list || !count($bm_list))
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
        if (isset($links)) {
            $info['links'] = $links;
        }
        if (isset($metrics)) {
          $info['metrics'] = $metrics;
        }
        $info['fvonly'] = false;
        $info['video'] = false;
        $info['expand'] = false;
        $info['options'] = array();
        if (isset($expand) && $expand)
            $info['expand'] = true;
        if (isset($options))
            $info['options'] = $options;
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

/**
* Load the raw data for the given test
* 
*/
function LoadTestDataTSV($benchmark, $cached, $metric, $test, &$meta, $loc) {
    $tsv = null;
    $isbytes = false;
    $istime = false;
    $annotations = array();
    $meta = array();
    if (stripos($metric, 'bytes') !== false) {
        $isbytes = true;
    } elseif (stripos($metric, 'time') !== false || 
            stripos($metric, 'render') !== false || 
            stripos($metric, 'fullyloaded') !== false || 
            stripos($metric, 'visualcomplete') !== false || 
            stripos($metric, 'eventstart') !== false || 
            stripos($metric, 'lastVisualChange') !== false || 
            stripos($metric, 'ttfb') !== false) {
        $istime = true;
    }

    if (LoadTestData($data, $configurations, $benchmark, $cached, $metric, $test, $meta, $loc)) {
        $series = array();
        $tsv = 'URL';
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
                $series[] = $title;
            }
        }
        $tsv .= "\n";
        foreach ($data as $url => &$row) {
            $data_points = 0;
            $url_data = array();
            // figure out the maximum number of data points we have
            foreach($configurations as &$configuration) {
                foreach ($configuration['locations'] as &$location) {
                    if (array_key_exists($configuration['name'], $row) && 
                        array_key_exists($location['location'], $row[$configuration['name']]) &&
                        is_array($row[$configuration['name']][$location['location']])) {
                        $count = count($row[$configuration['name']][$location['location']]);
                        if ($count > $data_points)
                            $data_points = $count;
                    }
                }
            }
            for ($i = 0; $i < $data_points; $i++) {
                $tsv .= $url;
                $column = 0;
                foreach($configurations as &$configuration) {
                    foreach ($configuration['locations'] as &$location) {
                        $value = ' ';
                        if (array_key_exists($configuration['name'], $row) && 
                            array_key_exists($location['location'], $row[$configuration['name']]) &&
                            is_array($row[$configuration['name']][$location['location']])) {
                            $count = count($row[$configuration['name']][$location['location']]);
                            if ($i < $count) {
                                if (!array_key_exists('tests', $meta[$url])) {
                                    $meta[$url]['tests'] = array();
                                    for ($j = 0; $j < count($series); $j++)
                                        $meta[$url]['tests'][] = '';
                                }
                                $meta[$url]['tests'][$column] = $row[$configuration['name']][$location['location']][$i]['test'];
                                $value = $row[$configuration['name']][$location['location']][$i]['value'];
                                if ($isbytes)
                                    $value = number_format($value / 1024.0, 3, '.', '');
                                elseif ($istime)
                                    $value = number_format($value / 1000.0, 3, '.', '');
                            }
                        }
                        $tsv .= "\t$value";
                        $column++;
                    }
                }
                $tsv .= "\n";
            }
        }
    }
    return $tsv;
}

/**
* Comparison function for sorting the raw test data by URL
* 
*/
function RawDataCompare($a, $b) {
    $ret = 0;
    if (is_array($a) && is_array($b) &&
        array_key_exists('url', $a) &&
        array_key_exists('url', $b)) {
        $ret = $a['url'] < $b['url'] ? -1 : 1;
    }
    return $ret;
}

/**
* Load the raw data for a given test
* 
*/
function LoadTestData(&$data, &$configurations, $benchmark, $cached, $metric, $test, &$meta, $loc) {
    global $raw_data;
    $ok = false;
    $data = array();
    if (!isset($meta))
      $meta = array();
    if (GetConfigurationNames($benchmark, $configurations, $loc, $loc_aliases)) {
        $date = gmdate('Ymd_Hi', $test);
        $data_file = "./results/benchmarks/$benchmark/data/$date.json";
        $key = "$benchmark-$date";
        if (gz_is_file($data_file)) {
            if (!array_key_exists($key, $raw_data)) {
                $raw_data[$key] = json_decode(gz_file_get_contents($data_file), true);
                usort($raw_data[$key], 'RawDataCompare');
            }
            if (count($raw_data[$key])) {
                foreach($raw_data[$key] as &$row) {
                    if (array_key_exists('cached', $row) &&
                        $row['cached'] == $cached &&
                        array_key_exists('url', $row) && 
                        array_key_exists('config', $row) && 
                        array_key_exists('location', $row) && 
                        array_key_exists($metric, $row) && 
                        strlen($row[$metric]) &&
                        isset($row['result']) &&
                        ($row['result'] == 0 || $row['result'] == 99999)) {
                        $url = $row['url'];
                        if (array_key_exists('label', $row) && strlen($row['label'])) {
                            $url = $row['label'];
                        }
                        $url = GetUrlIndex($url, $meta);
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
                            if (!array_key_exists($url, $data)) {
                                $data[$url] = array();
                            }
                            if (!array_key_exists($config, $data[$url])) {
                                $data[$url][$config] = array();
                            }
                            $data[$url][$config][$location][] = array('value' => $row[$metric], 'test' => $row['id']);
                        }
                    }
                }
            }
        }
    }
    return $ok;
}

function LoadTestComparisonTSV($configs, $cached, $metric, &$meta) {
  $ok = false;
  $tsv = '';
  if (stripos($metric, 'bytes') !== false) {
      $isbytes = true;
  } elseif (stripos($metric, 'time') !== false || 
          stripos($metric, 'render') !== false || 
          stripos($metric, 'fullyloaded') !== false || 
          stripos($metric, 'visualcomplete') !== false || 
          stripos($metric, 'eventstart') !== false || 
          stripos($metric, 'lastVisualChange') !== false || 
          stripos($metric, 'ttfb') !== false) {
      $istime = true;
  }
  $row = "URL";
  foreach ($configs as $config)
    $row .= "\t{$config['label']}";
  $row .= "\n";
  $tsv .= $row;
  $rows = array();
  $maxValues = 0;
  foreach ($configs as $column => $config) {
    if (LoadTestData($data, $bmConfigs, $config['benchmark'], $cached, $metric, $config['time'], $meta, $config['location'])) {
      foreach ($data as $url => &$configData) {
        $ok = true;
        if (!array_key_exists($url, $rows))
          $rows[$url] = array();
        if (array_key_exists($config['config'], $configData) &&
            array_key_exists($config['location'], $configData[$config['config']])) {
          foreach ($configData[$config['config']][$config['location']] as &$result) {
            if (!array_key_exists($column, $rows[$url])) {
              $rows[$url][$column] = array('test' => $result['test'], 'values' => array());
              if (!array_key_exists($url, $meta))
                $meta[$url] = array();
              if (!array_key_exists('tests', $meta[$url]))
                $meta[$url]['tests'] = array();
              $meta[$url]['tests'][$column] = $result['test'];
            }
            $value = $result['value'];
            if ($isbytes)
                $value = number_format($value / 1024.0, 3, '.', '');
            elseif ($istime)
                $value = number_format($value / 1000.0, 3, '.', '');
            $rows[$url][$column]['values'][] = $value;
            $maxValues = max($maxValues, count($rows[$url][$column]['values']));
          }
        }
      }
    }
  }
  foreach ($rows as $url => $rowData) {
    for ($index = 0; $index < $maxValues; $index++) {
      $row = $url;
      foreach ($configs as $column => $config) {
        $row .= "\t";
        if (array_key_exists($column, $rowData) &&
            array_key_exists($index, $rowData[$column]['values']))
          $row .= $rowData[$column]['values'][$index];
      }
      $row .= "\n";
      $tsv .= $row;
    }
  }
  if (!$ok)
    unset($tsv);
  return $tsv;
}

/**
* Convert the URLs into indexed numbers
* 
* @param mixed $url
* @param mixed $urls
*/
function GetUrlIndex($url, &$meta) {
    $index = 0;
    $found = false;
    foreach($meta as $i => &$u) {
        if ($u['url'] == $url) {
            $index = $i;
            $found = true;
            break;
        }
    }
    if (!$found) {
        $index = count($meta);
        $meta[] = array('url' => $url);
    }
    return $index;
}

/*
    Helper functions to deal with aggregate benchmark data
*/
function LoadTrendDataTSV($benchmark, $cached, $metric, $url, $loc, &$annotations, &$meta) {
    $tsv = null;
    $isbytes = false;
    $istime = false;
    $annotations = array();
    $meta = array();
    if (stripos($metric, 'bytes') !== false) {
        $isbytes = true;
    } elseif (stripos($metric, 'time') !== false || 
            stripos($metric, 'render') !== false || 
            stripos($metric, 'fullyloaded') !== false || 
            stripos($metric, 'visualcomplete') !== false || 
            stripos($metric, 'eventstart') !== false || 
            stripos($metric, 'lastVisualChange') !== false || 
            stripos($metric, 'ttfb') !== false) {
        $istime = true;
    }
    if (LoadTrendData($data, $configurations, $benchmark, $cached, $metric, $url, $loc)) {
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
                $series[] = $title;
            }
        }
        $tsv .= "\n";
        $dates = array();
        foreach ($data as $time => &$row) {
            $date_text = gmdate('c', $time);
            $tsv .= $date_text;
            $dates[$date_text] = $time;
            $column=0;
            foreach($configurations as &$configuration) {
                foreach ($configuration['locations'] as &$location) {
                    $tsv .= "\t";
                    if (array_key_exists($configuration['name'], $row) && 
                        array_key_exists($location['location'], $row[$configuration['name']]) &&
                        array_key_exists('value', $row[$configuration['name']][$location['location']]) ) {
                        $value = $row[$configuration['name']][$location['location']]['value'];
                        if ($isbytes)
                            $value = number_format($value / 1024.0, 3, '.', '');
                        elseif ($istime)
                            $value = number_format($value / 1000.0, 3, '.', '');
                        $tsv .= $value;
                        if (!array_key_exists($time, $meta)) {
                            $meta[$time] = array();
                        }
                        $meta[$time][] = array('label' => $series[$column], 'test' => $row[$configuration['name']][$location['location']]['test']);
                    }
                    $column++;
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
                    $UTC = new DateTimeZone('UTC');
                    $date = DateTime::createFromFormat('Y-m-d H:i', $note_date, $UTC);
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
                        $annotations[] = array('series' => $data_series, 'x' => $note_date, 'shortText' => "$i", 'text' => $note['text']);
                    }
                }
            }
        }
    }
    return $tsv;
}

/**
* Load data for a single URL trended over time from all of the configurations
* 
*/
function LoadTrendData(&$data, &$configurations, $benchmark, $cached, $metric, $url, $loc) {
    global $trend_data;
    global $start_time;
    global $raw_data;
    $ok = false;
    $data = array();
    if (GetConfigurationNames($benchmark, $configurations, $loc, $loc_aliases)) {
        if (!isset($trend_data)) {
            // loop through all of the data files
            $files = scandir("./results/benchmarks/$benchmark/data");
            foreach( $files as $file ) {
                if (preg_match('/([0-9]+_[0-9]+)\..*/', $file, $matches)) {
                    $UTC = new DateTimeZone('UTC');
                    $date = DateTime::createFromFormat('Ymd_Hi', $matches[1], $UTC);
                    $time = $date->getTimestamp();
                    if (!$start_time || $time > $start_time) {
                        $tests = array();
                        $file = basename($file, ".gz");
                        $key = "$benchmark.$file";
                        if (!array_key_exists($key, $raw_data)) {
                          $raw_data[$key] = json_decode(gz_file_get_contents("./results/benchmarks/$benchmark/data/$file"), true);
                          usort($raw_data[$key], 'RawDataCompare');
                        }
                        if (count($raw_data[$key])) {
                            foreach($raw_data[$key] as $row) {
                                if (array_key_exists('docTime', $row) && 
                                    ($row['result'] == 0 || $row['result'] == 99999) &&
                                    ($row['label'] == $url || $row['url'] == $url)) {
                                    $location = $row['location'];
                                    $id = $row['id'];
                                    if (!array_key_exists($id, $tests)) {
                                        $tests[$id] = array();
                                    }
                                    $row['time'] = $time;
                                    $tests["$id-{$row['cached']}"][] = $row;
                                }
                            }
                            // grab the median run from each test
                            if (count($tests)) {
                                $info = GetBenchmarkInfo($benchmark);
                                $median_metric = 'docTime';
                                if (isset($info) && is_array($info) && 
                                    array_key_exists('options', $info) && 
                                    array_key_exists('median_run', $info['options'])) {
                                    $median_metric = $info['options']['median_run'];
                                }
                                foreach($tests as &$test) {
                                    if (is_array($test) && count($test)) {
                                        $times = array();
                                        foreach($test as $row) {
                                            $times[] = $row[$median_metric];
                                        }
                                        $median_run_index = 0;
                                        $count = count($times);
                                        if( $count > 1 ) {
                                            asort($times);
                                            $medianIndex = (int)floor(((float)$count + 1.0) / 2.0);
                                            $current = 0;
                                            foreach( $times as $index => $time ) {
                                                $current++;
                                                if( $current == $medianIndex ) {
                                                    $median_run_index = $index;
                                                    break;
                                                }
                                            }
                                        }
                                        $trend_data[] = $test[$median_run_index];
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if (count($trend_data)) {
            foreach( $trend_data as &$row ) {
                if( $row['cached'] == $cached &&
                    is_array($row) &&
                    array_key_exists($metric, $row) && 
                    strlen($row[$metric])) {
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
                        $data[$time][$config][$location] = array('value' => $row[$metric], 'test' => $row['id']);
                    }
                }
            }
        }
    }
    return $ok;
}

/**
* Get a report of all of the test errors
*/
function GetTestErrors(&$errors, $benchmark, $test) {
    global $raw_data;
    $errors_detected = false;
    $errors = array();
    $loc = null;
    $loc_aliases = null;
    if (GetConfigurationNames($benchmark, $configurations, $loc, $loc_aliases)) {
        foreach($configurations as &$configuration) {
            if (array_key_exists('title', $configuration) && strlen($configuration['title']))
                $title = $configuration['title'];
            else
                $title = $configuration['name'];
            $errors[$configuration['name']] = array('label' => $title, 'locations' => array());
            foreach($configuration['locations'] as &$location) {
                $title = $location['label'];
                if (is_numeric($title))
                    $title = $location['location'];
                $errors[$configuration['name']]['locations'][$location['location']] = array('label' => $title, 'urls' => array());
            }
        }
        $date = gmdate('Ymd_Hi', $test);
        $data_file = "./results/benchmarks/$benchmark/data/$date.json";
        $key = "$benchmark-$date";
        if (gz_is_file($data_file)) {
            if (!array_key_exists($key, $raw_data)) {
                $raw_data[$key] = json_decode(gz_file_get_contents($data_file), true);
                usort($raw_data[$key], 'RawDataCompare');
            }
            if (count($raw_data[$key])) {
                foreach($raw_data[$key] as &$row) {
                    if (array_key_exists('url', $row) && 
                        array_key_exists('config', $row) && 
                        array_key_exists('location', $row)) {
                        $url = $row['url'];
                        if (array_key_exists('label', $row) && strlen($row['label'])) {
                            $url = $row['label'];
                        }
                        $config = $row['config'];
                        $location = $row['location'];
                        if (!array_key_exists('result', $row) ||
                            ($row['result'] != 0 && $row['result'] != 99999)) {
                            $errors_detected = true;
                            $error = '-1';
                            if (array_key_exists('result', $row))
                                $error = $row['result'];
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
                            if (!array_key_exists($config, $errors)) {
                                $errors[$config] = array('label' => $config, 'locations' => array());
                            }
                            if (!array_key_exists($location, $errors[$config]['locations'])) {
                                $errors[$config]['locations'][$location] = array('label' => $location, 'urls' => array());
                            }
                            if (!array_key_exists($url, $errors[$config]['locations'][$location]['urls'])) {
                                $errors[$config]['locations'][$location]['urls'][$url] = array('url' => $url, 'errors' => array());
                            }
                            $errors[$config]['locations'][$location]['urls'][$url]['errors'][] = array('error' => $error, 'id' => $row['id'], 'run' => @$row['run'], 'cached' => @$row['cached']);
                        }
                    }
                }
            }
        }
    }
    return $errors_detected;
}

function LoadDeltaTSV($benchmark, $ref, $config, $cached, $metric, $test_time, &$meta, $loc) {
    $tsv = null;
    $delta = LoadDelta($benchmark, $ref, $config, $cached, $metric, $test_time, $loc);
    if (isset($delta) && count($delta) > 1) {
        $count = count($delta) - 1;
        $index = 0;
        $tsv = "Delta,Percentile\n";
        $meta = array();
        foreach($delta as &$data) {
            $percentile = number_format(($index / $count) * 100, 5, '.', '');
            $tsv .= "{$data['delta']},$percentile\n";
            $meta[$percentile] = $data;
            $index++;
        }
    }
    return $tsv;
}

function LoadDelta($benchmark, $ref, $config, $cached, $metric, $test_time, $loc) {
    $delta = null;
    global $median_data;
    LoadMedianData($benchmark, $test_time);
    if (isset($median_data) && 
        array_key_exists($config, $median_data) &&
        array_key_exists($ref, $median_data)) {
        if (isset($loc)) {
            $refLoc = $loc;
        } else {
            reset($median_data[$config]);
            $loc = key($median_data[$config]);
            reset($median_data[$ref]);
            $refLoc = key($median_data[$ref]);
        }
        if (array_key_exists($loc, $median_data[$config]) &&
            array_key_exists($cached, $median_data[$config][$loc]) &&
            array_key_exists($refLoc, $median_data[$ref]) &&
            array_key_exists($cached, $median_data[$ref][$refLoc])) {
            foreach ($median_data[$config][$loc][$cached] as $url => &$data) {
                if (array_key_exists($url, $median_data[$ref][$refLoc][$cached])) {
                    $refData = &$median_data[$ref][$refLoc][$cached][$url];
                    if (array_key_exists($metric, $data) &&
                        array_key_exists($metric, $refData)) {
                        $value = $data[$metric];
                        $refValue = $refData[$metric];
                        $deltaV = 0;
                        if ($refValue) {
                            $deltaV = ($value - $refValue) / $refValue;
                        }
                        $delta[] = array('delta' => $deltaV, 'url' => $url, 'ref' => $refData['id'], 'cmp' => $data['id']);
                    }
                }
            }
        }
    }
    if (count($delta)) {
        usort($delta, "DeltaSortCompare");
    }
    return $delta;
}

function DeltaSortCompare(&$a, &$b) {
    $ret = 0;
    if (isset($a) && is_array($a) && 
        isset($b) && is_array($b) && 
        array_key_exists('delta', $a) &&
        array_key_exists('delta', $b)) {
        if ($a['delta'] > $b['delta']) {
            $ret = 1;
        } elseif ($a['delta'] < $b['delta']) {
            $ret = -1;
        }
    }
    return $ret;
}

/**
* Load the test data and keep just the median run for each config
*/
function LoadMedianData($benchmark, $test_time) {
    global $median_data;
    global $raw_data;
    if (!isset($median_data)) {
        // see if we have a custom metric to use to calculate the median for the given benchmark
        $info = GetBenchmarkInfo($benchmark);
        $median_metric = 'docTime';
        if (isset($info) && is_array($info) && 
            array_key_exists('options', $info) && 
            array_key_exists('median_run', $info['options'])) {
            $median_metric = $info['options']['median_run'];
        }
        $date = gmdate('Ymd_Hi', $test_time);
        $data_file = "./results/benchmarks/$benchmark/data/$date.json";
        $key = "$benchmark-$date";
        if (gz_is_file($data_file)) {
            if (!array_key_exists($key, $raw_data)) {
              $raw_data[$key] = json_decode(gz_file_get_contents($data_file), true);
              usort($raw_data[$key], 'RawDataCompare');
            }
            if (count($raw_data[$key])) {
                $tests = array();
                // group the results by test ID
                foreach($raw_data[$key] as &$row) {
                    if (array_key_exists($median_metric, $row) && 
                        ($row['result'] == 0 || $row['result'] == 99999)) {
                        $id = $row['id'];
                        $cached = $row['cached'];
                        $key = "$id-$cached";
                        if (!array_key_exists($key, $tests)) {
                            $tests[$key] = array();
                        }
                        $tests[$key][] = $row;
                    }
                }
                // extract just the median runs
                $median_data = array();
                foreach($tests as &$test) {
                    $times = array();
                    foreach($test as $row) {
                        $times[] = $row[$median_metric];
                    }
                    $median_run_index = 0;
                    $count = count($times);
                    if( $count > 1 ) {
                        asort($times);
                        $medianIndex = (int)floor(((float)$count + 1.0) / 2.0);
                        $current = 0;
                        foreach( $times as $index => $time ) {
                            $current++;
                            if( $current == $medianIndex ) {
                                $median_run_index = $index;
                                break;
                            }
                        }
                    }
                    $row = $test[$median_run_index];
                    if (array_key_exists('cached', $row) &&
                        array_key_exists('url', $row) && 
                        array_key_exists('config', $row) && 
                        array_key_exists('location', $row) ) {
                        $url = $row['url'];
                        if (array_key_exists('label', $row) && strlen($row['label'])) {
                            $url = $row['label'];
                        }
                        $config = $row['config'];
                        $location = $row['location'];
                        $cached = $row['cached'];
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
                        if (!array_key_exists($config, $median_data)) {
                            $median_data[$config] = array();
                        }
                        if (!array_key_exists($location, $median_data[$config])) {
                            $median_data[$config][$location] = array();
                        }
                        if (!array_key_exists($cached, $median_data[$config][$location])) {
                            $median_data[$config][$location][$cached] = array();
                        }
                        $median_data[$config][$location][$cached][$url] = $row;
                    }
                }
            }
        }
    }
}

/**
* Convert a TSV back into an array
* 
* @param mixed $tsv
*/
function TSVEncode(&$tsv) {
    $out = array();
    $rows = explode("\n", $tsv);
    date_default_timezone_set('UTC');
    foreach($rows as &$row) {
        $row = trim($row);
        if (strlen($row)) {
            $pieces = explode("\t", trim(str_replace("\t", "\t ", $row)));
            if (!isset($columns)) {
                $columns = $pieces;
            } else {
                $out_row = array();
                foreach($pieces as $column => $value) {
                    $name = trim($columns[$column]);
                    if ($name == 'Date')
                      $out_row['time'] = strtotime(trim($value));
                    $out_row[$name] = trim($value);
                }
                $out[] = $out_row;
            }
        }
    }
    return $out;
}

?>
