<?php
require_once('devtools.inc.php');

/**
* Load the page results directly from the results files
* 
* @param mixed $id
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function loadAllPageData($testPath, $options = null)
{
    $ret = array();
    
    // go in order for the number of runs there are supposed to be
    if (is_file("$testPath/testinfo.ini")) {
      $ini = parse_ini_file("$testPath/testinfo.ini", true);
      if( gz_is_file("$testPath/testinfo.json") )
          $ini['testinfo'] = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
      $runs = $ini['test']['runs'];
      $fvonly = $ini['test']['fvonly'];
      for( $run = 1; $run <= $runs; $run++ )
      {
          $data = loadPageRunData($testPath, $run, 0, $options);
          if( isset($data) )
              $ret[$run][0] = $data;
          
          if( !$fvonly )
          {
              unset( $data );
              $data = loadPageRunData($testPath, $run, 1, $options);
              if( isset($data) )
                  $ret[$run][1] = $data;
          }
      }
    }
    
    return $ret;
}

/**
* Load the page data for the given run
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $fv
* @param mixed $rv
*/
function loadPageRunData($testPath, $run, $cached, $options = null)
{
    $ret = null;

    if( $cached )
        $ret = loadPageData("$testPath/{$run}_Cached_IEWPG.txt", $options);
    else
        $ret = loadPageData("$testPath/{$run}_IEWPG.txt", $options);
    if (!isset($ret) || !is_array($ret) || !count($ret))
        GetDevToolsRequests($testPath, $run, $cached, $requests, $ret);
    
    // see if we have video files to calculate a visually complete time from
    if (isset($ret)) {
        loadUserTimingData($ret, $testPath, $run, $cached);
        if (array_key_exists('loadTime', $ret) &&
            !$ret['loadTime'] &&
            array_key_exists('fullyLoaded', $ret) &&
            $ret['fullyLoaded'] > 0)
            $ret['loadTime'] = $ret['fullyLoaded'];
        $video_dir = "$testPath/video_$run";
        if ($cached)
            $video_dir .= '_cached';
        if( is_dir($video_dir) && (!array_key_exists('lastVisualChange', $ret) || !$ret['lastVisualChange'])) {
            $frames = null;
            loadVideo($video_dir, $frames);
            if( isset($frames) && is_array($frames) && count($frames) ) {
                end($frames);
                $last = key($frames);
                reset($frames);
                if( $last ) {
                    $ret['lastVisualChange'] = $last * 100;
                    if (!array_key_exists('visualComplete', $ret))
                        $ret['visualComplete'] = $ret['lastVisualChange'];
                }
            }
        }
        require_once('./video/visualProgress.inc.php');
        $progress = GetVisualProgress($testPath, $run, $cached);
        if (isset($progress) && is_array($progress)) {
            if (array_key_exists('FLI', $progress)) {
                $ret['SpeedIndex'] = $progress['FLI'];
            }
            if (array_key_exists('visualComplete', $progress)) {
                $ret['visualComplete'] = $progress['visualComplete'];
            }
            if (array_key_exists('DevTools', $progress) && is_array($progress['DevTools'])) {
                if (array_key_exists('SpeedIndex', $progress['DevTools'])) {
                    $ret['SpeedIndexDT'] = intval($progress['DevTools']['SpeedIndex']);
                    if (!array_key_exists('SpeedIndex', $ret))
                        $ret['SpeedIndex'] = $ret['SpeedIndexDT'];
                }
                if (array_key_exists('VisuallyComplete', $progress['DevTools'])) {
                    $ret['VisuallyCompleteDT'] = $progress['DevTools']['VisuallyComplete'];
                    if (!array_key_exists('visualComplete', $ret))
                        $ret['visualComplete'] = $ret['VisuallyCompleteDT'];
                }
                if (array_key_exists('StartRender', $progress['DevTools']) &&
                    (!array_key_exists('render', $ret) || !$ret['render']))
                    $ret['render'] = $progress['DevTools']['StartRender'];
            }
            if ((!array_key_exists('lastVisualChange', $ret) ||
                 !$ret['lastVisualChange']) &&
                array_key_exists('visualComplete', $ret))
                $ret['lastVisualChange'] = $ret['visualComplete'];
        }
        // see if we need a custom Speed Index as well
        $end = null;
        if (isset($options) && array_key_exists('end', $options)) {
            $end = $options['end'];
            $progress = GetVisualProgress($testPath, $run, $cached, null, $end);
            if (isset($progress) && is_array($progress)) {
                if (array_key_exists('FLI', $progress)) {
                    $ret['SpeedIndexCustom'] = $progress['FLI'];
                }
                $ret['visualCompleteCustom'] = $progress['visualComplete'];
            }
        }
        // clean up any insane values (from negative numbes as unsigned most likely)
        $times = array('loadTime',
                       'TTFB',
                       'render',
                       'fullyLoaded',
                       'docTime',
                       'domTime',
                       'aft',
                       'titleTime',
                       'loadEventStart',
                       'loadEventEnd',
                       'domContentLoadedEventStart',
                       'domContentLoadedEventEnd',
                       'lastVisualChange',
                       'server_rtt');
        foreach ($times as $key) {
          if ($ret[$key] > 3600000 || $ret[$key] < 0)
            $ret[$key] = 0;
        }
    }
    
    return $ret;
}

/**
* Load the page data from the specified file
* 
* @param mixed $file
*/
function loadPageData($file, $options = null)
{
    $ret = null;
    $lines = gz_file($file);
    if( $lines)
    {
        // loop through each line in the file until we get a data record
        foreach($lines as $linenum => $line) 
        {
            $parseLine = str_replace("\t", "\t ", $line);
            $fields = explode("\t", $parseLine);
            if( count($fields) > 34 && trim($fields[0]) != 'Date' )
            {
                $ret = array();
                $ret = array(   'URL' => @htmlspecialchars(trim($fields[3])),
                                // 'loadTime' => (int)$fields[4],
                                'loadTime' => @(int)$fields[32],
                                'TTFB' => @(int)$fields[5],
                                'bytesOut' => @(int)$fields[7],
                                'bytesOutDoc' => @(int)$fields[45],
                                'bytesIn' => @(int)$fields[8],
                                'bytesInDoc' => @(int)$fields[46],
                                'connections' => @(int)$fields[10],
                                'requests' => @(int)$fields[11],
                                'requestsDoc' => @(int)$fields[49],
                                'responses_200' => @(int)$fields[12],
                                'responses_404' => @(int)$fields[15],
                                'responses_other' => @(int)$fields[16],
                                'result' => @(int)$fields[17],
                                'render' => @(int)$fields[18],
                                'fullyLoaded' => @(int)$fields[22],
                                'cached' => @(int)$fields[27],
                                'docTime' => @(int)$fields[32],
                                'domTime' => @(int)$fields[34],
                                'score_cache' => @(int)$fields[36],
                                'score_cdn' => @(int)$fields[37],
                                'score_gzip' => @(int)$fields[39],
                                'score_cookies' => @(int)$fields[40],
                                'score_keep-alive' => @(int)$fields[41],
                                'score_minify' => @(int)$fields[43],
                                'score_combine' => @(int)$fields[44],
                                'score_compress' => @(int)$fields[55],
                                'score_etags' => @(int)$fields[58],
                                'gzip_total' => @(int)$fields[64],
                                'gzip_savings' => @(int)$fields[65],
                                'minify_total' => @(int)$fields[66],
                                'minify_savings' => @(int)$fields[67],
                                'image_total' => @(int)$fields[68],
                                'image_savings' => @(int)$fields[69],
                                'optimization_checked' => @(int)$fields[71],
                                'aft' => @(int)$fields[72],
                                'domElements' => @(int)$fields[73],
                                'pageSpeedVersion' => @trim($fields[74]),
                                'title' => @htmlspecialchars(trim($fields[75]),ENT_NOQUOTES,'UTF-8'),
                                'titleTime' => @(int)$fields[76],
                                'loadEventStart' => @(int)$fields[77],
                                'loadEventEnd' => @(int)$fields[78],
                                'domContentLoadedEventStart' => @(int)$fields[79],
                                'domContentLoadedEventEnd' => @(int)$fields[80],
                                'lastVisualChange' => @(int)$fields[81],
                                'browser_name' => @trim($fields[82]),
                                'browser_version' => @trim($fields[83]),
                                'server_count' => @(int)trim($fields[84]),
                                'server_rtt' => @(int)trim($fields[85]),
                                'base_page_cdn' => @trim($fields[86]),
                                'adult_site' => @(int)trim($fields[87])
                            );

                $ret['fixed_viewport'] = (array_key_exists(88, $fields) && strlen(trim($fields[88]))) ? (int)trim($fields[88]) : -1;
                $ret['score_progressive_jpeg'] = (array_key_exists(89, $fields) && strlen(trim($fields[89]))) ? (int)trim($fields[89]) : -1;
                
                $ret['date'] = strtotime(trim($fields[0]) . ' ' . trim($fields[1]));
                if (!strlen($ret['pageSpeedVersion']))
                    $ret['pageSpeedVersion'] = '1.9';

                break;
            }
        }
    }
    
    return $ret;
}

/**
* Find the median run and use it for the results
* 
* @param mixed $pageData
*/
function calculatePageStats(&$pageData, &$fv, &$rv)
{
    $fvCount = 0;
    $rvCount = 0;
    
    // calculate the averages
    if( count($pageData) ) {
        foreach( $pageData as $run => $data ) {
            if( isset($data[0]) && $data[0]['cached'] === 0 ) {
                if (!isset($metrics)) {
                    $metrics = array();
                    foreach ($data[0] as $metric => $value)
                        $metrics[] = $metric;
                }
                // only look at non-error runs
                if( $data[0]['result'] === 0 || $data[0]['result'] === 99999 )
                {
                    if( !isset($fv) )
                        $fv = array();
                    foreach ($metrics as $metric) {
                        if (array_key_exists($metric, $fv))
                            $fv[$metric] += $data[0][$metric];
                        else
                            $fv[$metric] = $data[0][$metric];
                    }
                    $fvCount++;
                }
            }

            if( isset($data[1]) && $data[1]['cached'] )
            {
                if (!isset($metrics)) {
                    $metrics = array();
                    foreach ($data[0] as $metric => $value)
                        $metrics[] = $metric;
                }
                // only look at non-error runs
                if( $data[1]['result'] === 0 || $data[1]['result'] === 99999 )
                {
                    if( !isset($rv) )
                        $rv = array();
                    foreach ($metrics as $metric) {
                        if (array_key_exists($metric, $rv))
                            $rv[$metric] += $data[1][$metric];
                        else
                            $rv[$metric] = $data[1][$metric];
                    }
                    $rvCount++;
                }
            }
        }
    }

    // calculate the first view stats    
    if( isset($fv) && isset($metrics) && $fvCount > 0 )
    {
        foreach ($metrics as $metric)
            $fv[$metric] /= (double)$fvCount;
        
        // go through and find the run closest to the average
        $closest = -1;
        $distance = 10000000000;

        foreach( $pageData as $run => $data )
        {
            if( isset($data[0]) && ($data[0]['result'] === 0 || $data[0]['result'] === 99999) )
            {
                $curDist = abs($data[0]['loadTime'] - $fv['loadTime']);
                if( $curDist < $distance )
                {
                    $closest = $run;
                    $distance = $curDist;
                }
            }
        }
        
        if( $closest != -1 )
            $fv['avgRun'] = $closest;
    }

    // calculate the repeat view stats    
    if( isset($rv) && isset($metrics) && $rvCount > 0 )
    {
        foreach ($metrics as $metric)
            $rv[$metric] /= (double)$rvCount;
        
        // go through and find the run closest to the average
        $closest = -1;
        $distance = 10000000000;

        foreach( $pageData as $run => $data )
        {
            if( isset($data[1]) && ($data[1]['result'] === 0 || $data[1]['result'] === 99999) )
            {
                $curDist = abs($data[1]['loadTime'] - $rv['loadTime']);
                if( $curDist < $distance )
                {
                    $closest = $run;
                    $distance = $curDist;
                }
            }
        }
        
        if( $closest != -1 )
            $rv['avgRun'] = $closest;
    }
}

/**
* Find the test run closest to the median
* 
* @param mixed $pageData
* @param mixed $cached
*/
function GetMedianRun(&$pageData, $cached, $metric = 'loadTime') {
    $run = 0;
    $cached = $cached ? 1:0;
    $times = array();
    
    // try successful-only runs first
    foreach( $pageData as $index => &$pageRun ) {
        if( array_key_exists($cached, $pageRun) && 
            array_key_exists('result', $pageRun[$cached]) && 
            array_key_exists($metric, $pageRun[$cached]) &&
            ($pageRun[$cached]['result'] == 0 || $pageRun[$cached]['result'] == 99999) ) {
            $times[$index] = $pageRun[$cached][$metric];
        }
    }
            
    if (!count($times)) {
        // include error runs
        foreach( $pageData as $index => &$pageRun ) {
            if( array_key_exists($cached, $pageRun) && array_key_exists($metric, $pageRun[$cached])) {
                $times[$index] = $pageRun[$cached][$metric];
            }
        }
    }
    
    $count = count($times);
    if( $count > 1 ) {
        asort($times);
        $medianIndex = (int)floor(((float)$count + 1.0) / 2.0);
        $current = 0;
        foreach( $times as $index => $time ) {
            $current++;
            if( $current == $medianIndex ) {
                $run = $index;
                break;
            }
        }
    }
    elseif( $count == 1 ) {
        foreach( $times as $index => $time ) {
            $run = $index;
            break;
        }
    }
    
    // fall back to loadTime if we failed to get a run with the specified metric
    if (!$run && $metric != 'loadTime') {
        $run = GetMedianRun($pageData, $cached);
    }
    
    return $run;
}

/**
* Count the number of tests with successful results
* 
* @param mixed $pageData
* @param mixed $cached
*/
function CountSuccessfulTests(&$pageData, $cached)
{
    $count = 0;
    foreach( $pageData as &$run )
    {
        if( $run[$cached]['result'] === 0 || $run[$cached]['result'] === 99999 )
            $count++;
    }
    
    return $count;
}

/**
* Calculate some stats for the given metric from the page data
* 
* @param mixed $pageData
* @param mixed $cached
* @param mixed $metric
* @param mixed $median
* @param mixed $avg
* @param mixed $stdDev
*/
function CalculateAggregateStats(&$pageData, $cached, $metric, &$median, &$avg, &$stdDev)
{
    $median = null;
    $avg = null;
    $stdDev = null;
    $count = 0;
    
    // first pass, calculate the average and array of values for grabbing the median
    $values = array();
    $sum = 0;
    foreach( $pageData as &$run ) {
        if( ($run[$cached]['result'] === 0 || $run[$cached]['result'] === 99999) && array_key_exists($metric, $run[$cached]) ) {
            $values[] = $run[$cached][$metric];
            $sum += $run[$cached][$metric];
            $count++;
        }
    }
    
    if( $count ) {
        $avg = $sum / $count;
        sort($values, SORT_NUMERIC);
        $medianIndex = (int)($count / 2);
        $median = $values[$medianIndex];
        
        // pass 2, calculate the standard deviation
        $sum = 0;
        foreach($values as $value){
            $sum += pow($value - $avg, 2);
        }
        $stdDev = sqrt($sum / $count);
    }
    
    return $count;
}

/**
* Calculate the standard deviation for the provided metric
* 
*/
function PageDataStandardDeviation($pageData, $metric, $cached) {
    $ret = null;
    $values = array();
    if( count($pageData) ) {
        foreach( $pageData as $run => $data ) {
            if( array_key_exists($cached, $data) &&
                array_key_exists($metric,$data[$cached]) &&
                array_key_exists('result', $data[$cached]) &&
                ($data[$cached]['result'] === 0 ||
                 $data[$cached]['result'] === 99999))
                $values[] = $data[$cached][$metric];
        }
    }
    $count = count($values);
    if ($count) {
        $sum = 0;
        foreach ($values as $value)
            $sum += $value;
        $avg = $sum / $count;
        $sum = 0;
        foreach ($values as $value)
            $sum += pow($value - $avg, 2);
        $ret = (int)sqrt($sum / $count);
    }
    return $ret;
}

/**
* Load the reported user timings data for the given run
* 
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function loadUserTimingData(&$pageData, $testPath, $run, $cached) {
  if( $cached )
    $file = "$testPath/{$run}_Cached_timed_events.json";
  else
    $file = "$testPath/{$run}_timed_events.json";
  if (gz_is_file($file)) {
    $events = json_decode(gz_file_get_contents($file), true);
    if (isset($events) && is_array($events) && count($events)) {
      $lastEvent = 0;
      foreach ($events as $event) {
        if (is_array($event) &&
            array_key_exists('name', $event) &&
            array_key_exists('startTime', $event)) {
          $name = preg_replace('/[^a-zA-Z0-9\.\-_\(\) ]/', '_', $event['name']);
          $time = intval($event['startTime'] + 0.5);
          if ($time > 0 && $time < 3600000) {
            if ($event['startTime'] > $lastEvent)
              $lastEvent = $event['startTime'];
            $pageData["userTime.$name"] = $time;
          }
        }
      }
      $pageData["userTime"] = intval($lastEvent + 0.5);
    }
  }
}
?>
