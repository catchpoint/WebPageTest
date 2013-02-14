<?php
/**
* Calculate the visual progress and speed index from the dev tools timeline trace
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function GetDevToolsProgress($testPath, $run, $cached) {
    $progress = GetCachedDevToolsProgress($testPath, $run, $cached);
    if (!isset($progress) || !is_array($progress)) {
        if (GetTimeline($testPath, $run, $cached, $timeline)) {
            $startTime = 0;
            $fullScreen = 0;
            $regions = array();
            foreach($timeline as &$entry) {
                ProcessPaintEntry($entry, $startTime, $fullScreen, $regions);
            }
            $regionCount = count($regions);
            if ($regionCount) {
                $paintEvents = array();
                $total = 0.0;
                foreach($regions as $name => &$region) {
                    $elapsed = $event['startTime'] - $startTime;
                    $area = $region['width'] * $region['height'];
                    if ($regionCount == 1 || $area != $fullScreen) {
                        $updateCount = floatval(count($region['times']));
                        $incrementalImpact = floatval($area) / $updateCount;
                        foreach($region['times'] as $time) {
                            $total += $incrementalImpact;
                            $elapsed = (int)($time - $startTime);
                            if (!array_key_exists($elapsed, $paintEvents))
                                $paintEvents[$elapsed] = $incrementalImpact;
                            else
                                $paintEvents[$elapsed] += $incrementalImpact;
                        }
                    }
                }
                if (count($paintEvents)) {
                    ksort($paintEvents, SORT_NUMERIC);
                    $current = 0.0;
                    $lastTime = 0.0;
                    $lastProgress = 0.0;
                    $progress = array('SpeedIndex' => 0.0, 'VisuallyComplete' => 0, 'VisualProgress' => array());
                    foreach($paintEvents as $time => $increment) {
                        $current += $increment;
                        $currentProgress = floatval(floatval($current) / floatval($total));
                        $currentProgress = floatval(round($currentProgress * 100) / 100.0);
                        $elapsed = $time - $lastTime;
                        $siIncrement = floatval($elapsed) * (1.0 - $lastProgress);
                        $progress['SpeedIndex'] += $siIncrement;
                        $progress['VisualProgress'][$time] = $currentProgress;
                        $progress['VisuallyComplete'] = $time;
                        $lastProgress = $currentProgress;
                        $lastTime = $time;
                        if ($currentProgress >= 1.0)
                            break;
                    }
                }
            }
        }
        if (isset($progress) && is_array($progress))
            SavedCachedDevToolsProgress($testPath, $run, $cached, $progress);
    }
    return $progress;
}  

/**
* Load the timeline data for the given test run (from a timeline file or a raw dev tools dump)
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
* @param mixed $timeline
*/
function GetTimeline($testPath, $run, $cached, &$timeline) {
    $ok = false;
    $cachedText = '';
    if( $cached )
        $cachedText = '_cached';
    $timelineFile = "$testPath/$run{$cachedText}_timeline.json";
    if (gz_is_file($timelineFile)){
        $timeline = json_decode(gz_file_get_contents($timelineFile), true);
        if ($timeline)
            $ok = true;
    }
    return $ok;
}

/**
* Pull out the paint entries from the timeline data and group them by the region being painted
* 
* @param mixed $entry
* @param mixed $startTime
* @param mixed $fullScreen
* @param mixed $regions
*/
function ProcessPaintEntry(&$entry, &$startTime, &$fullScreen, &$regions) {
    $ret = false;
    $hadPaintChildren = false;
    if (array_key_exists('startTime', $entry)) {
        if ($entry['startTime'] && (!$startTime || $entry['startTime'] < $startTime)) {
            $startTime = $entry['startTime'];
        }
    }
    if(array_key_exists('children', $entry) &&
       is_array($entry['children'])) {
        foreach($entry['children'] as &$child) {
            if (ProcessPaintEntry($child, $startTime, $fullScreen, $regions))
                $hadPaintChildren = true;
        }
    }
    if (!$hadPaintChildren &&
        array_key_exists('type', $entry) &&
        !strcasecmp($entry['type'], 'Paint') &&
        array_key_exists('data', $entry) &&
        array_key_exists('width', $entry['data']) &&
        array_key_exists('height', $entry['data']) &&
        array_key_exists('x', $entry['data']) &&
        array_key_exists('y', $entry['data'])) {
        $ret = true;
        $paintEvent = $entry['data'];
        $paintEvent['startTime'] = $entry['startTime'];
        $area = $paintEvent['width'] * $paintEvent['height'];
        if ($area > $fullScreen)
            $fullScreen = $area;
        $regionName = "{$paintEvent['x']},{$paintEvent['y']} - {$paintEvent['width']}x{$paintEvent['height']}";
        if (!array_key_exists($regionName, $regions)) {
            $regions[$regionName] = $paintEvent;
            $regions[$regionName]['times'] = array();
        }
        $regions[$regionName]['times'][] = $entry['startTime'];
    }
    return $ret;
}

/**
* Load a cached version of the calculated visual progress if it exists
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function GetCachedDevToolsProgress($testPath, $run, $cached) {
    $progress = null;
    if (gz_is_file("$testPath/devToolsProgress.json")) {
        $cache = json_decode(gz_file_get_contents("$testPath/devToolsProgress.json"), true);
        $key = "$run.$cached";
        if (isset($cache) && is_array($cache) && array_key_exists($key, $cache))
            $progress = $cache[$key];
    }
    return $progress;
}

/**
* Save the cached visual progress to disk
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
* @param mixed $progress
*/
function SavedCachedDevToolsProgress($testPath, $run, $cached, $progress) {
    $key = "$run.$cached";
    $cache = null;
    if (gz_is_file("$testPath/devToolsProgress.json"))
        $cache = json_decode(gz_file_get_contents("$testPath/devToolsProgress.json"), true);
    if (!isset($cache) || !is_array($cache))
        $cache = array();
    $cache[$key] = $progress;
    gz_file_put_contents("$testPath/devToolsProgress.json", json_encode($cache));
}

?>
