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

@ob_start();
function FlushOutput() {
    if (ob_get_length()){            
        @ob_flush();
        @flush();
        @ob_end_flush();
    }
    @ob_start();
}

// make sure we don't execute multiple cron jobs concurrently
$lock = fopen("./tmp/benchmark_cron.lock", "w+");
if ($lock !== false) {
    if (flock($lock, LOCK_EX | LOCK_NB)) {
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
    }
    fclose($lock);
}

FlushOutput();

/**
* Do all of the processing for a given benchmark
* 
* @param mixed $benchmark
*/
function ProcessBenchmark($benchmark) {
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
        CollectResults($benchmark, $state);
    } else {
        $state['running'] = false;
    }
    
    if (!$state['running'] && 
        (array_key_exists('runs', $state) && count($state['runs'])) &&
        (!array_key_exists('needs_aggregation', $state) || $state['needs_aggregation']) ){
        //AggregateResults($benchmark, $state);
    }
    
    // see if we need to kick off a new benchmark run
    if (!$state['running'] && !array_key_exists('tests', $state)) {
        if(include "./settings/benchmarks/$benchmark.php") {
            if (!array_key_exists('last_run', $state))
                $state['last_run'] = 0;
            $now = time();
            if (call_user_func("{$benchmark}ShouldExecute", $state['last_run'], $now)) {
                echo "Running benchmark '$benchmark'<br>\n";
                FlushOutput();
                if (SubmitBenchmark($configurations, $state)) {
                    $state['last_run'] = $now;
                    $state['running'] = true;
                }
            } else {
                echo "Benchmark '$benchmark' does not need to be run<br>\n";
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
                $status = GetTestStatus($test['id'], false);
                if ($status['statusCode'] >= 400) {
                    echo "Test {$test['id']} : Failed<br>\n";
                    $test['completed'] = now;
                } elseif( $status['statusCode'] == 200 ) {
                    echo "Test {$test['id']} : Completed<br>\n";
                    if ($status['completeTime']) {
                        $test['completed'] = $status['completeTime'];
                    } else {
                        $test['completed'] = now;
                    }
                } else {
                    $done = false;
                    echo "Test {$test['id']} : {$status['statusText']}<br>\n";
                }
            }
            FlushOutput();
        }
        
        if ($done) {
            $state['running'] = false;
        }
    }
}

/**
* Do any aggregation once all of the tests have finished
* 
* @param mixed $state
*/
function CollectResults($benchmark, &$state) {
    if (!$state['running'] && array_key_exists('tests', $state)) {
        $start_time = time();
        $data = array();
        foreach ($state['tests'] as &$test) {
            if (@$test['submitted'] && $test['submitted'] < $start_time) {
                $start_time = $test['submitted'];
            }
            $testPath = './' . GetTestPath($test['id']);
            $page_data = loadAllPageData($testPath);
            foreach ($page_data as $run => &$page_run) {
                foreach ($page_run as $cached => &$test_data) {
                    $data_row = $test_data;
                    unset($test_data['URL']);
                    $test_data['url'] = $test['url'];
                    $test_data['label'] = $test['label'];
                    $test_data['location'] = $test['location'];
                    $test_data['config'] = $test['config'];
                    $test_data['cached'] = $cached;
                    $test_data['run'] = $run;
                    $test_data['id'] = $test['id'];
                    $breakdown = getBreakdown($test['id'], $testPath, $run, $cached, $requests);
                    foreach ($breakdown as $mime => $mime_data) {
                        $test_data["{$mime}_requests"] = $mime_data['requests'];
                        $test_data["{$mime}_bytes"] = $mime_data['bytes'];
                    }
                    unset($requests);
                    $data[] = $test_data;
                }
            }
        }
        
        if (count($data)) {
            echo "Collected data for " . count($data) . " individual runs<br>\n";
            FlushOutput();
            if (!is_dir("./results/benchmarks/$benchmark/data"))
                mkdir("./results/benchmarks/$benchmark/data", 0777, true);
            $file_name = "./results/benchmarks/$benchmark/data/" . date('Ymd_Hi', $start_time) . '.json';
            gz_file_put_contents($file_name, json_encode($data));
            $state['runs'][] = $start_time;
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
function SubmitBenchmark(&$configurations, &$state) {
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
                $id = SubmitBenchmarkTest($url, $location, $config['settings']);
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
function SubmitBenchmarkTest($url, $location, &$settings) {
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
            if (array_key_exists('statusCode', $result) && 
                $result['statusCode'] == 200 && 
                array_key_exists('data', $result) && 
                array_key_exists('testId', $result['data']) ){
                $id = $result['data']['testId'];
                echo "Test submitted: $id<br>\n";
            } else {
                echo "Error submitting benchmark test: {$result['statusText']}<br>\n";
            }
        }
    }
    FlushOutput();
    
    return $id;
}

/**
* Generate aggregate metrics for the given test
* 
* @param mixed $benchmark
* @param mixed $state
*/
function AggregateResults($benchmark, $state) {
    if (!is_dir("./results/benchmarks/$benchmark/aggregate"))
        mkdir("./results/benchmarks/$benchmark/aggregate", 0777, true);
    if (is_file("./results/benchmarks/$benchmark/aggregate/info.json")) {
        $info = json_decode("./results/benchmarks/$benchmark/aggregate/info.json");
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
                                'js_requests', 'js_bytes', 'css_requests', 'css_bytes', 'html_requests', 'html_bytes', 
                                'text_requests', 'text_bytes', 'image_requests', 'image_bytes', 'flash_requests', 'flash_bytes');

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
        
        if (array_key_exists('labels', $info) && count($info['labels'])) {
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
        $mul = 0;
        foreach($records as $i => $value) {
             $mul = $i == 0 ? $value : $mul*$value; 
        }
        $entry['geo-mean'] = pow($mul,1/$count);  
        // median
        if ($count %2) {
            $entry['median'] = $records[floor($count * 0.5)];
        } else {
            $entry['median'] = ($records[floor($count * 0.5)] + $records[floor($count * 0.5) - 1]) / 2;
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
