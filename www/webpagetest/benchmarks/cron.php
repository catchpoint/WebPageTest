<?php
/*
    This is called every 15 minutes as long as agents are polling for work
*/
ignore_user_abort(true);
set_time_limit(0);
chdir('..');
require 'common.inc';
require 'testStatus.inc';
require 'breakdown.inc';
$debug=true;

// make sure we don't execute multiple cron jobs concurrently
$lock = fopen("./tmp/benchmark_cron.lock", "w+");
if ($lock !== false) {
    if (flock($lock, LOCK_EX | LOCK_NB)) {
        unlink('./benchmark.log');
        logMsg("Running benchmarks cron processing", './benchmark.log', true);

        // see if we are using API keys
        $key = null;
        if (is_file('./settings/keys.ini')) {
            $keys = parse_ini_file('./settings/keys.ini', true);
            if (array_key_exists('server', $keys) && array_key_exists('key', $keys['server']))
                $key = $keys['server']['key'];
        }

        // load the list of benchmarks
        $bm_list = file('./settings/benchmarks/benchmarks.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (!count($bm_list))
            $bm_list = glob('./settings/benchmarks/*.php');
        foreach ($bm_list as $benchmark) {
            ProcessBenchmark(basename($benchmark, '.php'));
        }
        logMsg("Done", './benchmark.log', true);
    } else {
        echo "Benchmark cron job is already running<br>\n";
    }
    fclose($lock);
}

/**
* Do all of the processing for a given benchmark
* 
* @param mixed $benchmark
*/
function ProcessBenchmark($benchmark) {
    logMsg("Processing benchmark '$benchmark'", './benchmark.log', true);
    if (!is_dir("./results/benchmarks/$benchmark"))
        mkdir("./results/benchmarks/$benchmark", 0777, true);
    if (is_file("./results/benchmarks/$benchmark/state.json")) {
        $state = json_decode(file_get_contents("./results/benchmarks/$benchmark/state.json"), true);
    } else {
        $state = array('running' => false);
    }
    if (!is_array($state)) {
        $state = array('running' => false);
    }
    
    if (array_key_exists('running', $state)) {
        CheckBenchmarkStatus($state);
        // update the state between steps
        file_put_contents("./results/benchmarks/$benchmark/state.json", json_encode($state));
        CollectResults($benchmark, $state);
        file_put_contents("./results/benchmarks/$benchmark/state.json", json_encode($state));
    } else {
        $state['running'] = false;
    }
    
    if (!$state['running'] && 
        (array_key_exists('runs', $state) && count($state['runs'])) &&
        (!array_key_exists('needs_aggregation', $state) || $state['needs_aggregation']) ){
        AggregateResults($benchmark, $state);
        file_put_contents("./results/benchmarks/$benchmark/state.json", json_encode($state));
    }
    
    // see if we need to kick off a new benchmark run
    if (!$state['running'] && !array_key_exists('tests', $state)) {
        if(include "./settings/benchmarks/$benchmark.php") {
            if (!array_key_exists('last_run', $state))
                $state['last_run'] = 0;
            $now = time();
            if (call_user_func("{$benchmark}ShouldExecute", $state['last_run'], $now)) {
                logMsg("Running benchmark '$benchmark'", './benchmark.log', true);
                if (SubmitBenchmark($configurations, $state, $benchmark)) {
                    $state['last_run'] = $now;
                    $state['running'] = true;
                }
            } else {
                logMsg("Benchmark '$benchmark' does not need to be run", './benchmark.log', true);
            }
        }
    }

    file_put_contents("./results/benchmarks/$benchmark/state.json", json_encode($state));
}

/**
* Check the status of any pending tests
* 
* @param mixed $state
*/
function CheckBenchmarkStatus(&$state) {
    if ($state['running']) {
        $done = true;
        foreach ($state['tests'] as &$test) {
            if (!$test['completed']) {
                logMsg("Checking status for {$test['id']}", './benchmark.log', true);
                $status = GetTestStatus($test['id'], false);
                $now = time();
                if ($status['statusCode'] >= 400) {
                    logMsg("Test {$test['id']} : Failed", './benchmark.log', true);
                    $test['completed'] = $now;
                } elseif( $status['statusCode'] == 200 ) {
                    logMsg("Test {$test['id']} : Completed", './benchmark.log', true);
                    if (array_key_exists('completeTime', $status) && $status['completeTime']) {
                        $test['completed'] = $status['completeTime'];
                    } elseif (array_key_exists('startTime', $status) && $status['startTime']) {
                        $test['completed'] = $status['startTime'];
                    } else {
                        $test['completed'] = $now;
                    }
                } else {
                    $done = false;
                    logMsg("Test {$test['id']} : {$status['statusText']}", './benchmark.log', true);
                }
            } else {
                logMsg("Test {$test['id']} : Already complete", './benchmark.log', true);
            }
        }
        
        if ($done) {
            $state['running'] = false;
        }
        
        logMsg("Done checking status", './benchmark.log', true);
    }
}

/**
* Do any aggregation once all of the tests have finished
* 
* @param mixed $state
*/
function CollectResults($benchmark, &$state) {
    logMsg("Collecting results for '$benchmark'", './benchmark.log', true);
    if (!$state['running'] && array_key_exists('tests', $state)) {
        $start_time = time();
        $data = array();
        foreach ($state['tests'] as &$test) {
            if (@$test['submitted'] && $test['submitted'] < $start_time) {
                $start_time = $test['submitted'];
            }
            $testPath = './' . GetTestPath($test['id']);
            logMsg("Loading page data from $testPath", './benchmark.log', true);
            $page_data = loadAllPageData($testPath);
            if (count($page_data)) {
                foreach ($page_data as $run => &$page_run) {
                    foreach ($page_run as $cached => &$test_data) {
                        $data_row = $test_data;
                        unset($data_row['URL']);
                        // figure out the per-type request info (todo: measure how expensive this is and see if we have a better way)
                        $breakdown = getBreakdown($test['id'], $testPath, $run, $cached, $requests);
                        foreach ($breakdown as $mime => &$values) {
                            $data_row["{$mime}_requests"] = $values['requests'];
                            $data_row["{$mime}_bytes"] = $values['bytes'];
                        }
                        // capture the page speed score
                        if ($cached)
                            $data_row['page_speed'] = GetPageSpeedScore("$testPath/{$run}_Cached_pagespeed.txt");
                        else
                            $data_row['page_speed'] = GetPageSpeedScore("$testPath/{$run}_pagespeed.txt");
                        $data_row['url'] = $test['url'];
                        $data_row['label'] = $test['label'];
                        $data_row['location'] = $test['location'];
                        $data_row['config'] = $test['config'];
                        $data_row['cached'] = $cached;
                        $data_row['run'] = $run;
                        $data_row['id'] = $test['id'];
                        $data[] = $data_row;
                        $test['has_data'] = 1;
                    }
                }
            } else {
                $data_row = array();
                $data_row['url'] = $test['url'];
                $data_row['label'] = $test['label'];
                $data_row['location'] = $test['location'];
                $data_row['config'] = $test['config'];
                $data_row['id'] = $test['id'];
                $data[] = $data_row;
            }
        }
        
        if (count($data)) {
            logMsg("Collected data for " . count($data) . " individual runs", './benchmark.log', true);
            if (!is_dir("./results/benchmarks/$benchmark/data"))
                mkdir("./results/benchmarks/$benchmark/data", 0777, true);
            $file_name = "./results/benchmarks/$benchmark/data/" . date('Ymd_Hi', $start_time) . '.json';
            gz_file_put_contents($file_name, json_encode($data));
            $state['runs'][] = $start_time;
        } else {
            logMsg("No test data collected", './benchmark.log', true);
        }
        unset($state['tests']);
        $state['needs_aggregation'] = true;
    }
}

/**
* Submit the various test permutations
* 
* @param mixed $configurations
* @param mixed $state
*/
function SubmitBenchmark(&$configurations, &$state, $benchmark) {
    $submitted = false;
    
    $state['tests'] = array();

    foreach ($configurations as $config_label => &$config) {
        $urls = file("./settings/benchmarks/{$config['url_file']}", FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($urls as $url) {
            $label = '';
            $separator = strpos($url, "\t");
            if ($separator !== false) {
                $label = substr($url, 0, $separator);
                $url = substr($url, $separator + 1);
            }
            foreach ($config['locations'] as $location) {
                $id = SubmitBenchmarkTest($url, $location, $config['settings'], $benchmark);
                if ($id !== false ) {
                    $state['tests'][] = array(  'id' => $id, 
                                                'label' => $label,
                                                'url' => $url, 
                                                'location' => $location, 
                                                'config' => $config_label,
                                                'submitted' => time(), 
                                                'completed' => 0);
                }
            }
        }
    }
    
    if (count($state['tests'])) {
        $submitted = true;
    }
    
    return $submitted;
}

/**
* Submit a single test and return the test ID (or false in the case of failure)
* 
* @param mixed $url
* @param mixed $location
* @param mixed $settings
*/
function SubmitBenchmarkTest($url, $location, &$settings, $benchmark) {
    $id = false;
    global $key;
    $priority = 8;  // default to a really low priority
    
    $boundary = "---------------------".substr(md5(rand(0,32000)), 0, 10);
    $data = "--$boundary\r\n";
    
    foreach ($settings as $setting => $value) {
        if ($setting == 'priority') {
            $priority = $value;
        } else {
            $data .= "Content-Disposition: form-data; name=\"$setting\"\r\n\r\n$value";
            $data .= "\r\n--$boundary\r\n"; 
        }
    }
    
    if (isset($key)) {
        $data .= "Content-Disposition: form-data; name=\"k\"\r\n\r\n$key";
        $data .= "\r\n--$boundary\r\n"; 
    }

    if (!strncasecmp($url, 'script:', 7)) {
        $url = substr($url, 7);
        $url = str_replace('\r', "\r", $url);
        $url = str_replace('\n', "\n", $url);
        $url = str_replace('\t', "\t", $url);
        $data .= "Content-Disposition: form-data; name=\"script\"\r\n\r\n$url";
        $data .= "\r\n--$boundary\r\n"; 
    } else {
        $data .= "Content-Disposition: form-data; name=\"url\"\r\n\r\n$url";
        $data .= "\r\n--$boundary\r\n"; 
    }
    $data .= "Content-Disposition: form-data; name=\"location\"\r\n\r\n$location";
    $data .= "\r\n--$boundary\r\n"; 
    $data .= "Content-Disposition: form-data; name=\"benchmark\"\r\n\r\n$benchmark";
    $data .= "\r\n--$boundary\r\n"; 
    $data .= "Content-Disposition: form-data; name=\"f\"\r\n\r\njson";
    $data .= "\r\n--$boundary\r\n"; 
    $data .= "Content-Disposition: form-data; name=\"priority\"\r\n\r\n$priority"; 
    $data .= "\r\n--$boundary--\r\n";

    $params = array('http' => array(
                       'method' => 'POST',
                       'header' => 'Content-Type: multipart/form-data; boundary='.$boundary,
                       'content' => $data
                    ));

    $ctx = stream_context_create($params);
    $fp = fopen("http://{$_SERVER['HTTP_HOST']}/runtest.php", 'rb', false, $ctx);
    if ($fp) {
        $response = @stream_get_contents($fp);
        if ($response && strlen($response)) {
            $result = json_decode($response, true);
            if (is_array($result) && array_key_exists('statusCode', $result) && 
                $result['statusCode'] == 200 && 
                array_key_exists('data', $result) && 
                array_key_exists('testId', $result['data']) ){
                $id = $result['data']['testId'];
                logMsg("Test submitted: $id", './benchmark.log', true);
            } else {
                logMsg("Error submitting benchmark test: {$result['statusText']}", './benchmark.log', true);
            }
        }
    }
    
    return $id;
}

/**
* Generate aggregate metrics for the given test
* 
* @param mixed $benchmark
* @param mixed $state
*/
function AggregateResults($benchmark, &$state) {
    if (!is_dir("./results/benchmarks/$benchmark/aggregate"))
        mkdir("./results/benchmarks/$benchmark/aggregate", 0777, true);
    if (is_file("./results/benchmarks/$benchmark/aggregate/info.json")) {
        $info = json_decode(file_get_contents("./results/benchmarks/$benchmark/aggregate/info.json"), true);
    } else {
        $info = array('runs' => array());
    }
    
    if (!array_key_exists('runs', $info)) {
        $info['runs'] = array();
    }
    
    // store a list of metrics that we aggregate in the info block
    $info['metrics'] = array('TTFB', 'bytesOut', 'bytesOutDoc', 'bytesIn', 'bytesInDoc', 
                                'connections', 'requests', 'requestsDoc', 'render', 
                                'fullyLoaded', 'docTime', 'domTime', 'score_cache', 'score_cdn',
                                'score_gzip', 'score_keep-alive', 'score_compress', 'gzip_total', 'gzip_savings',
                                'image_total', 'image_savings', 'domElements', 'titleTime', 'loadEvent-Time', 
                                'domContentLoadedEventStart', 'domContentLoadedEvent-Time', 'visualComplete',
                                'js_bytes', 'js_requests', 'css_bytes', 'css_requests', 'image_bytes', 'image_requests',
                                'flash_bytes', 'flash_requests', 'html_bytes', 'html_requests', 'text_bytes', 'text_requests',
                                'other_bytes', 'other_requests');

    // loop through all of the runs and see which ones we don't have aggregates for
    foreach ($state['runs'] as $run_time) {
        if (!array_key_exists($run_time, $info['runs'])) {
            $file_name = "./results/benchmarks/$benchmark/data/" . date('Ymd_Hi', $run_time) . '.json';
            if (gz_is_file($file_name)) {
                $data = json_decode(gz_file_get_contents($file_name), true);
                CreateAggregates($info, $data, $benchmark, $run_time);
                unset($data);
                $info['runs'][$run_time] = 1;
            }
        }
    }
    
    file_put_contents("./results/benchmarks/$benchmark/aggregate/info.json", json_encode($info));
    $state['needs_aggregation'] = false;
}

/**
* Create the various aggregations for the given data chunk
* 
* @param mixed $info
* @param mixed $data
* @param mixed $benchmark
*/
function CreateAggregates(&$info, &$data, $benchmark, $run_time) {
    foreach ($info['metrics'] as $metric) {
        $metric_file = "./results/benchmarks/$benchmark/aggregate/$metric.json";
        if (gz_is_file($metric_file)) {
            $agg_data = json_decode(gz_file_get_contents($metric_file), true);
        } else {
            $agg_data = array();
        }
        AggregateMetric($metric, $info, $data, $run_time, $agg_data);
        gz_file_put_contents($metric_file, json_encode($agg_data));
        unset($agg_data);
        
        if (array_key_exists('labels', $info) && count($info['labels']) <= 20) {
            $metric_file = "./results/benchmarks/$benchmark/aggregate/$metric.labels.json";
            if (gz_is_file($metric_file)) {
                $agg_data = json_decode(gz_file_get_contents($metric_file), true);
            } else {
                $agg_data = array();
            }
            AggregateMetricByLabel($metric, $info, $data, $run_time, $agg_data);
            gz_file_put_contents($metric_file, json_encode($agg_data));
            unset($agg_data);
        }
    }
}

/**
* Create the aggregates for the given metric grouped by config and cached state
* 
* @param mixed $info
* @param mixed $data
* @param mixed $run_time
* @param mixed $agg_data
*/
function AggregateMetric($metric, $info, &$data, $run_time, &$agg_data) {
    $configs = array();
    // group the individual records
    foreach ($data as &$record) {
        if (array_key_exists($metric, $record) && 
            array_key_exists('result', $record) && 
            array_key_exists('config', $record) && 
            array_key_exists('cached', $record) && 
            strlen($record['config']) &&
            ($record['result'] == 0 || $record['result'] == 99999)) {
            $config = $record['config'];
            $cached = $record['cached'];
            if (!array_key_exists($config, $configs)) {
                $configs[$config] = array();
            }
            if (!array_key_exists($cached, $configs[$config])) {
                $configs[$config][$cached] = array();
            }
            $configs[$config][$cached][] = $record[$metric];
            
            if (array_key_exists('label', $record) &&
                strlen($record['label'])) {
                if (!array_key_exists('labels', $info)) {
                    $info['labels'] = array();
                }
                if (!array_key_exists($record['label'], $info['labels'])) {
                    $info['labels'][$record['label']] = $record['label'];
                }
            }
        }
    }
    
    foreach ($configs as $config => &$cache_state) {
        foreach ($cache_state as $cached => &$records) {
            $entry = CalculateMetrics($records);
            if (is_array($entry)) {
                $entry['time'] = $run_time;
                $entry['config'] = $config;
                $entry['cached'] = $cached;
                
                // see if we already have a record that matches that we need to overwrite
                $exists = false;
                foreach ($agg_data as $i => &$row) {
                    if ($row['time'] == $run_time && 
                        $row['config'] == $config &&
                        $row['cached'] == $cached) {
                        $exists = true;
                        $agg_data[$i] = $entry;
                        break;
                    }
                }
                if (!$exists)
                    $agg_data[] = $entry;
                unset ($entry);
            }
        }
    }
}

/**
* Create the aggregates for the given metric grouped by config, label and cached state
* 
* @param mixed $info
* @param mixed $data
* @param mixed $run_time
* @param mixed $agg_data
*/
function AggregateMetricByLabel($metric, $info, &$data, $run_time, &$agg_data) {
    $labels = array();
    // group the individual records
    foreach ($data as &$record) {
        if (array_key_exists($metric, $record) && 
            array_key_exists('result', $record) && 
            array_key_exists('config', $record) && 
            array_key_exists('cached', $record) && 
            array_key_exists('label', $record) && 
            strlen($record['config']) &&
            strlen($record['label']) &&
            ($record['result'] == 0 || $record['result'] == 99999)) {
            $label = $record['label'];
            $config = $record['config'];
            $cached = $record['cached'];
            if (!array_key_exists($label, $labels)) {
                $labels[$label] = array();
            }
            if (!array_key_exists($config, $labels[$label])) {
                $labels[$label][$config] = array();
            }
            if (!array_key_exists($cached, $labels[$label][$config])) {
                $labels[$label][$config][$cached] = array();
            }
            $labels[$label][$config][$cached][] = $record[$metric];
        }
    }

    foreach ($labels as $label => &$configs) {
        foreach ($configs as $config => &$cache_state) {
            foreach ($cache_state as $cached => &$records) {
                $entry = CalculateMetrics($records);
                if (is_array($entry)) {
                    $entry['time'] = $run_time;
                    $entry['label'] = $label;
                    $entry['config'] = $config;
                    $entry['cached'] = $cached;
                    // see if we already have a record that matches that we need to overwrite
                    $exists = false;
                    foreach ($agg_data as $i => &$row) {
                        if ($row['time'] == $run_time && 
                            $row['config'] == $config &&
                            $row['cached'] == $cached &&
                            $row['label'] == $label) {
                            $exists = true;
                            $agg_data[$i] = $entry;
                            break;
                        }
                    }
                    if (!$exists)
                        $agg_data[] = $entry;
                    unset ($entry);
                }
            }
        }
    }
}

/** 
* Calculate several aggregations on the given data set
* 
* @param mixed $records
*/
function CalculateMetrics(&$records) {
    $entry = null;
    sort($records, SORT_NUMERIC);
    $count = count($records);
    if ($count) {
        $entry = array('count' => $count);
        // average
        $sum = 0;
        foreach ($records as $value) {
            $sum += $value;
        }
        $avg = $sum / $count;
        $entry['avg'] = $avg;
        // geometric mean
        $sum = 0.0;
        foreach($records as $value) {
             $sum += log($value);
        }
        $entry['geo-mean'] = exp($sum/$count);  
        // median
        if ($count %2) {
            $entry['median'] = $records[floor($count * 0.5)];
        } else {
            $entry['median'] = intval(round(($records[floor($count * 0.5)] + $records[floor($count * 0.5) - 1]) / 2));
        }
        // 75th percentile
        $entry['75pct'] = $records[floor($count * 0.75)];  // 0-based array, hence the floor instead of ceil
        // 95th percentile
        $entry['95pct'] = $records[floor($count * 0.95)];  // 0-based array, hence the floor instead of ceil
        // standard deviation
        $sum = 0;
        foreach ($records as $value) {
            $sum += pow($value - $avg, 2);
        }
        $entry['stddev'] = sqrt($sum / $count);
    }
    return $entry;
}
?>
