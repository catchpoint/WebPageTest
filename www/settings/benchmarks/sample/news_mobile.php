<?php
$title = "Top News Sites - Mobile";
$description = "Comparing the landing page, world news and article pages from Yahoo News, The Huffington Post, CNN and Google News.";
$links = array('Yahoo Urls' => '/settings/benchmarks/yahoo_mobile.txt',
               'Huffington Post Urls' => '/settings/benchmarks/huffington_mobile.txt',
               'CNN Urls' => '/settings/benchmarks/cnn_mobile.txt',
			   'Google Urls' => '/settings/benchmarks/google_mobile.txt');
$configurations = array();
$configurations['Yahoo'] = array('title' => 'Yahoo News',
                                  'url_file' => 'yahoo_mobile.txt',
                                  'locations' => array('Dulles_MotoG:Motorola G - Chrome', 'Dulles_MotoG:Motorola G - Chrome Beta'),
                                  'settings' => array('runs' => 9,
                                                      'fvonly' => 0,
                                                      'video' => 1,
                                                      'priority' => 7));
$configurations['Huffington'] = array('title' => 'Huffington Post',
                                  'url_file' => 'huffington_mobile.txt',
                                  'locations' => array('Dulles_MotoG:Motorola G - Chrome', 'Dulles_MotoG:Motorola G - Chrome Beta'),
                                  'settings' => array('runs' => 9,
                                                      'fvonly' => 0,
                                                      'video' => 1,
                                                      'priority' => 7));
$configurations['CNN'] = array('title' => 'CNN',
                                  'url_file' => 'cnn_mobile.txt',
                                  'locations' => array('Dulles_MotoG:Motorola G - Chrome', 'Dulles_MotoG:Motorola G - Chrome Beta'),
                                  'settings' => array('runs' => 9,
                                                      'fvonly' => 0,
                                                      'video' => 1,
                                                      'priority' => 7));
$configurations['Google'] = array('title' => 'Google News',
                                  'url_file' => 'google_mobile.txt',
                                  'locations' => array('Dulles_MotoG:Motorola G - Chrome', 'Dulles_MotoG:Motorola G - Chrome Beta'),
                                  'settings' => array('runs' => 9,
                                                      'fvonly' => 0,
                                                      'video' => 1,
                                                      'priority' => 7));

/**
* Custom logic to determine if it is time for the benchmark to execute
* 
* @param mixed $last_execute_time
* @param mixed $current_time
*/
if (!function_exists("news_mobileShouldExecute")) { 
function news_mobileShouldExecute($last_execute_time, $current_time) {
    $should_run = false;
    $hours = 0;
    if ($current_time > $last_execute_time)
        $hours = ($current_time - $last_execute_time) / 3600;
    if ((!$last_execute_time || $hours > 6) &&
        gmdate('G') == '5') {   // daily at midnight ET
        $should_run = true;
    }
    return  $should_run;
}
}
?>
