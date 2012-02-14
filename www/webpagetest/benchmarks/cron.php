<?php
/*
    This is called every 15 minutes as long as agents are polling for work
*/
ignore_user_abort(true);
set_time_limit(0);
chdir('..');
require 'common.inc';
require 'testStatus.inc';

// make sure we don't execute multiple cron jobs concurrently
$lock = fopen("./tmp/benchmark_cron.lock", "w+");
if ($lock !== false) {
    if (flock($lock, LOCK_EX)) {
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
}

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
    
    // see if we need to kick off a new benchmark run
    if (!$state['running'] && !array_key_exists('tests', $state)) {
        if(include "./settings/benchmarks/$benchmark.php") {
            if (!array_key_exists('last_run', $state))
                $state['last_run'] = 0;
            $now = time();
            if (call_user_func("{$benchmark}ShouldExecute", $state['last_run'], $now)) {
                echo "Running benchmark '$benchmark'<br>\n";
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
                    $data[] = $test_data;
                }
            }
        }
        
        if (count($data)) {
            echo "Collected data for " . count($data) . " individual runs<br>\n";
            if (!is_dir("./results/benchmarks/$benchmark/data"))
                mkdir("./results/benchmarks/$benchmark/data", 0777, true);
            $file_name = "./results/benchmarks/$benchmark/data/" . date('Ymd_Hi', $start_time) . '.json';
            gz_file_put_contents($file_name, json_encode($data));
            $state['runs'][] = $start_time;
        }
        unset($state['tests']);
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
    
    return $id;
}
?>
