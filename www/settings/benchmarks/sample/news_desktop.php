<?php
$title = "Top News Sites - Desktop";
$description = "Comparing the landing page, world news and article pages from Yahoo News, The Huffington Post, CNN and Google News.";
$links = array('Yahoo Urls' => '/settings/benchmarks/yahoo_desktop.txt',
               'Huffington Post Urls' => '/settings/benchmarks/huffington_desktop.txt',
               'CNN Urls' => '/settings/benchmarks/cnn_desktop.txt',
			   'Google Urls' => '/settings/benchmarks/google_desktop.txt');
$configurations = array();
$configurations['Yahoo'] = array('title' => 'Yahoo News',
                                  'url_file' => 'yahoo_desktop.txt',
                                  'locations' => array('Dulles:Chrome.Cable', 'Dulles:Firefox.Cable', 'Dulles_IE9.Cable'),
                                  'settings' => array('runs' => 9,
                                                      'fvonly' => 0,
                                                      'video' => 1,
                                                      'priority' => 7));
$configurations['Huffington'] = array('title' => 'Huffington Post',
                                  'url_file' => 'huffington_desktop.txt',
                                  'locations' => array('Dulles:Chrome.Cable', 'Dulles:Firefox.Cable', 'Dulles_IE9.Cable'),
                                  'settings' => array('runs' => 9,
                                                      'fvonly' => 0,
                                                      'video' => 1,
                                                      'priority' => 7));
$configurations['CNN'] = array('title' => 'CNN',
                                  'url_file' => 'cnn_desktop.txt',
                                  'locations' => array('Dulles:Chrome.Cable', 'Dulles:Firefox.Cable', 'Dulles_IE9.Cable'),
                                  'settings' => array('runs' => 9,
                                                      'fvonly' => 0,
                                                      'video' => 1,
                                                      'priority' => 7));
$configurations['Google'] = array('title' => 'Google News',
                                  'url_file' => 'google_desktop.txt',
                                  'locations' => array('Dulles:Chrome.Cable', 'Dulles:Firefox.Cable', 'Dulles_IE9.Cable'),
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
if (!function_exists("news_desktopShouldExecute")) { 
function news_desktopShouldExecute($last_execute_time, $current_time) {
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
