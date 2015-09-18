<?php
require_once('devtools.inc.php');
require_once('utils.inc');

/**
 * Load the page results directly from the results files
 *
 * @param mixed $id
 * @param mixed $testPath
 * @param mixed $run
 * @param mixed $cached
 * @param array $options
 * 		'allEvents': boolean if data for all events shall be used
 * 		'eventNumberKeys': boolean if using event numbers instead of event names as array keys (event name will be stored in array instead of eventNumber)
 *      'noVisualProgress': boolean if VisualProgress-Data shall be processed, by default VisualProgress will be calculated!
*/
function loadAllPageData($testPath, $options = null)
{
	$tmp = array();
	$ret = array();

	// go in order for the number of runs there are supposed to be
	if (is_file("$testPath/testinfo.ini")) {
		$ini = parse_ini_file("$testPath/testinfo.ini", true);
	    if( gz_is_file("$testPath/testinfo.json") )
	      $ini['testinfo'] = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
			$runs = $ini['test']['runs'];
			$fvonly = $ini['test']['fvonly'];
	    $testInfo = GetTestInfo($testPath);
			$allEventOptions = $options;
			$allEventOptions['allEvents'] = true;
	}
	    $completed = true;
	    if ($testInfo && (!array_key_exists('completed', $testInfo) || !$testInfo['completed']))
	      $completed = false;
	
	for( $run = 1; $run <= $runs; $run++ ) {
      // only load page data for individual runs that are complete (or if the whole test is complete)
      if ($completed || !$testInfo || IsTestRunComplete($run, $testInfo)) {
  			$dataArrayFV = loadPageRunData($testPath, $run, 0, $allEventOptions);
  			if( !$fvonly )
  			{
  				$dataArrayRV = loadPageRunData($testPath, $run, 1, $allEventOptions);
  			}
  			foreach($dataArrayFV as $eventName => $dataFV){
  				$tmp = array();
  				if( isset($dataFV) ){
  					$tmp[0] = $dataFV;
  				}	
  				if( !$fvonly && isset($dataArrayRV) && array_key_exists($eventName, $dataArrayRV) ){
  					$tmp[1] = $dataArrayRV[$eventName];
  				}
  				foreach($tmp as $cached => $data){
  					if(checkOptionKeyAndGetValue('allEvents', $options)){
						if(checkOptionKeyAndGetValue('eventNumberKeys', $options)){
							$eventNumber = $data['eventNumber'];
							$ret[$eventNumber][$run][$cached] = $data;
						} else {
							$ret[$eventName][$run][$cached] = $data;
						}
					} else {
						$ret[$run][$cached] = $data;
					}
				}
				if(!checkOptionKeyAndGetValue('allEvents', $options)){
					break;
				}
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
 * @param array $options
 * 		'allEvents': boolean if data for all events shall be used
 *		'allLevels': boolean if all array levels shall be added (eventName, run and cached)
	 *		'eventNumberKeys': boolean if using event numbers instead of event names as array keys (event name will be stored in array instead of eventNumber)
*/
function loadPageRunData($testPath, $run, $cached, $options = null)
{
	$ret = null;

    $cachedText = $cached ? '_Cached' : '';
	$ret = loadPageData("$testPath/{$run}{$cachedText}_IEWPG.txt", $options);
	if (!isset($ret) || !is_array($ret) || !count($ret))
		GetDevToolsRequests($testPath, $run, $cached, $requests, $ret);

	foreach($ret as $eventName => $data)
    {
        // see if we have video files to calculate a visually complete time from
        $basic_results = false;
        $eventNumber = $data['eventNumber'];
        $video_dir = "$testPath/video_{$run}_{$eventNumber}";

        if (array_key_exists('basic', $_REQUEST) && $_REQUEST['basic']) {
            $basic_results = true;
    if (gz_is_file("$testPath/{$run}{$cachedText}_page_data.json")) {
      $pd = json_decode(gz_file_get_contents("$testPath/{$run}{$cachedText}_page_data.json"), true);
      if ($pd && is_array($pd) && count($pd)) {
        foreach($pd as $key => $value) {

            $data[$key] = $value;
        }

      }
    }
    }

           if (isset($data) && !$basic_results)
           {
            $startOffset = array_key_exists('testStartOffset', $ret) ? intval(round($data['testStartOffset'])) : 0;
            loadUserTimingData($data, $testPath, $run, $cached); // MAYNOTWORK

            // MAYNOTWORK see if we have custom metrics to load
            if (gz_is_file("$testPath/{$run}{$cachedText}_metrics.json"))
                $custom_metrics = json_decode(gz_file_get_contents("$testPath/{$run}{$cachedText}_metrics.json"), true);
            if ($custom_metrics && is_array($custom_metrics) && count($custom_metrics)) {
                $data["custom"] = array();
                foreach ($custom_metrics as $metric => $value) {
                    if (preg_match('/^[0-9]+$/', $value))
                        $data[$metric] = intval($value);
                    elseif (preg_match('/^[0-9]*\.[0-9]+$/', $value))
                    $data[$metric] = floatval($value);
                    else
                        $data[$metric] = $value;
                    $data["custom"][] = $metric;
                }
            }
        }
  			
        // MAYNOTWORK see if we have CSI metrics to load
        if (is_dir('./google') && is_file('./google/google_lib.inc'))
        {
            require_once('google/google_lib.inc');
            $csi = ParseCsiInfo(0, $testPath, $run, $cached, true, false);
            if (isset($csi) && is_array($csi) && count($csi)) {
                $data['CSI'] = array();
                foreach($csi as $metric => $value) {
                    if (preg_match('/^[0-9]+$/', $value))
                        $value = intval($value);
                    elseif (preg_match('/^[0-9\.]+$/', $value))
                    $value = floatval($value);
                    $data["CSI.$metric"] = $value;
                    $data['CSI'][] = $metric;
                }
            }
        }
  			
        if (array_key_exists('loadTime', $data) &&
            !$data['loadTime'] &&
            array_key_exists('fullyLoaded', $data) &&
            $data['fullyLoaded'] > 0) {
                $data['loadTime'] = $data['fullyLoaded'];
        }

        $video_dir = "$testPath/video_$run";
        if ($cached) {
            $video_dir .= '_cached';
        }

        if( is_dir($video_dir) && (!array_key_exists('lastVisualChange', $data) || !$data['lastVisualChange']))
        {
            $frames = null;
            loadVideo($video_dir, $frames);
            if( isset($frames) && is_array($frames) && count($frames) )
            {
                if (!array_key_exists('lastVisualChange', $data) || !$data['lastVisualChange']) {
                    end($frames);
                    $last = max(key($frames) - $startOffset, 0);
                    reset($frames);
                    if( $last ) {
                        $data['lastVisualChange'] = $last;
                        if (!array_key_exists('visualComplete', $data))
                            $data['visualComplete'] = $data['lastVisualChange'];
                    }
                }
                if ((!array_key_exists('render', $data) || !$data['render']) && count($frames) > 1) {
                    next($frames);
                    $first = max(key($frames) - $startOffset, 0);
                    reset($frames);
                    if ($first)
                        $data['render'] = $first;
                }
            }
        }
        if (!checkOptionKeyAndGetValue('noVisualProgress', $options)) {
            require_once('./video/visualProgress.inc.php');
            $progress = GetVisualProgress($testPath, $run, $cached, array('eventNumber' => $eventNumber), null, $startOffset);
        }

        if (isset($progress) && is_array($progress)) {
            if (array_key_exists('SpeedIndex', $progress)) {
                $data['SpeedIndex'] = $progress['SpeedIndex'];
            }
            if (array_key_exists('visualComplete', $progress)) {
                $data['visualComplete'] = $progress['visualComplete'];
            }
            if (array_key_exists('DevTools', $progress) && is_array($progress['DevTools'])) {
                if (array_key_exists('SpeedIndex', $progress['DevTools'])) {
                    $data['SpeedIndexDT'] = intval($progress['DevTools']['SpeedIndex']);
                    if (!array_key_exists('SpeedIndex', $data))
                        $data['SpeedIndex'] = $data['SpeedIndexDT'];
                }
                if (array_key_exists('VisuallyComplete', $progress['DevTools'])) {
                    $data['VisuallyCompleteDT'] = $progress['DevTools']['VisuallyComplete'];
                    if (!array_key_exists('visualComplete', $data))
                        $data['visualComplete'] = $data['VisuallyCompleteDT'];
                }
                if (array_key_exists('StartRender', $progress['DevTools']) &&
                (!array_key_exists('render', $data) || !$data['render']))
                    $data['render'] = $progress['DevTools']['StartRender'];
            }
            if ((!array_key_exists('lastVisualChange', $data) ||
                    !$data['lastVisualChange']) &&
                    array_key_exists('visualComplete', $data))
                $data['lastVisualChange'] = $data['visualComplete'];
        }

        // see if we need a custom Speed Index as well
        $end = null;
        if (isset($options) && array_key_exists('end', $options)) {
            $end = $options['end'];
            if (!checkOptionKeyAndGetValue('noVisualProgress', $options)) {
                $progress = GetVisualProgress($testPath, $run, $cached, array('eventNumber' => $eventNumber), $end, $startOffset);
            }

            if (isset($progress) && is_array($progress)) {
                if (array_key_exists('SpeedIndex', $progress)) {
                    $data['SpeedIndexCustom'] = $progress['SpeedIndex'];
                }
                $data['visualCompleteCustom'] = $progress['visualComplete'];
            }
        }

        if (isset($data) && is_array($data) && isset($data['fullyLoaded']) && $data['fullyLoaded']) {
            $processing = GetDevToolsCPUTime($testPath, $run, $cached, $data['fullyLoaded']);
            if (isset($processing) && is_array($processing) && count($processing)) {
                $data['cpuTimes'] = $processing;
                if (isset($data['docTime']) && $data['docTime']) {
                    $processing = GetDevToolsCPUTime($testPath, $run, $cached, $data['docTime']);
                    if (isset($processing) && is_array($processing) && count($processing)) {
                        $data['cpuTimesDoc'] = $processing;
                    }
                }
            }
        }

        $data['run'] = $run;
        $data['cached'] = $cached;
          
        // calculate the effective bps
        if (array_key_exists('fullyLoaded', $data) &&
          array_key_exists('TTFB', $data) &&
          array_key_exists('bytesIn', $data) &&
          $data['fullyLoaded'] > 0 &&
          $data['TTFB'] > 0 &&
          $data['bytesIn'] > 0 &&
          $data['fullyLoaded'] > $data['TTFB']) {
            $data['effectiveBps'] = intval($data['bytesIn'] / (($data['fullyLoaded'] - $data['TTFB']) / 1000.0));
        }

        if (array_key_exists('docTime', $data) &&
            array_key_exists('TTFB', $data) &&
            array_key_exists('bytesInDoc', $data) &&
            $data['docTime'] > 0 &&
            $data['TTFB'] > 0 &&
            $data['bytesInDoc'] > 0 &&
            $data['docTime'] > $data['TTFB']) {
                $data['effectiveBpsDoc'] = intval($data['bytesInDoc'] / (($data['docTime'] - $data['TTFB']) / 1000.0));
        }

        // clean up any insane values (from negative numbers as unsigned most likely)
        if (array_key_exists('firstPaint', $data) &&
          array_key_exists('fullyLoaded', $data) &&
          $data['firstPaint'] > $data['fullyLoaded']) {
            $data['firstPaint'] = 0;
        }

        $times = array(
            'loadTime',
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
            'server_rtt',
            'firstPaint');

        foreach ($times as $key) {
            if (!array_key_exists($key, $data) || $data[$key] > 3600000 || $data[$key] < 0)
            $data[$key] = 0;
        }
        $ret[$eventName] = $data;
  	}

    


  	if(checkOptionKeyAndGetValue('allLevels', $options))
    {
  		$tmp = array();
  		if(checkOptionKeyAndGetValue('allEvents', $options))
        {
            if(checkOptionKeyAndGetValue('allEvents', $options))
            {
                foreach($ret as $eventName => $data)
                {
                    $eventNumber = $data['eventNumber'];
                    $tmp[$eventNumber][$run][$cached] = $data;
                }
            }
            else
            {
                foreach($ret as $eventName => $data)
                {
                    $tmp[$eventName][$run][$cached] = $data;
                }
            }
        }
        else
        {
            foreach($ret as $eventName => $data)
            {
                $tmp[$eventName][$run][$cached] = $data;
            }
        }

        $ret = $tmp;
    }

    if(checkOptionKeyAndGetValue('eventNumberKeys', $options)){
        $tmp = array();
        foreach($ret as $eventName => $data)
        {
            $tmp[$data['eventNumber']] = $data;
        }
        $ret = $tmp;
    }

    return $ret;
}

	/**
	 * Load the page data from the specified file
	 *
	 * @param mixed $file
	 * @param mixed $testPath
	 * @param array $options
 	 * 		'allEvents': boolean if data for all events shall be used
 	 * 		'eventNumberKeys': boolean if using event numbers instead of event names as array keys (event name will be stored in array instead of eventNumber)
 */
function loadPageData($file, $options = null)
{
    $testPath = dirname($file);
	if( gz_is_file("$testPath/testinfo.json") )
		$test_info = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
	$ret = null;
	$lines = gz_file($file);
	if( $lines)
	{
		$ret = array();
			$eventNumber = 1;
		// loop through each line in the file until we get a data record
		foreach($lines as $linenum => $line)
		{
			$parseLine = str_replace("\t", "\t ", $line);
			$fields = explode("\t", $parseLine);
		 	$eventName = getFullEventName($test_info['label'], trim($fields[2]), $linenum, $ret);
		
			if( count($fields) > 34 && trim($fields[0]) != 'Date' )
			{
				$ret[$eventName] = array();
					$ret[$eventName] = array( 
							'eventName' => $eventName,
							'eventNumber' => $eventNumber++,  
							'URL' => @htmlspecialchars(trim($fields[3])),
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
					
				$ret[$eventName]['fixed_viewport'] = (array_key_exists(88, $fields) && strlen(trim($fields[88]))) ? (int)trim($fields[88]) : -1;
				$ret[$eventName]['score_progressive_jpeg'] = (array_key_exists(89, $fields) && strlen(trim($fields[89]))) ? (int)trim($fields[89]) : -1;
				$ret[$eventName]['firstPaint'] = (array_key_exists(90, $fields) && strlen(trim($fields[90]))) ? (int)trim($fields[90]) : 0;
				//$ret[$eventName]['peakMem'] = (array_key_exists(91, $fields) && strlen(trim($fields[91]))) ? (int)trim($fields[91]) : 0;
				//$ret[$eventName]['processCount'] = (array_key_exists(92, $fields) && strlen(trim($fields[92]))) ? (int)trim($fields[92]) : 0;
				$ret[$eventName]['docCPUms'] = (array_key_exists(93, $fields) && strlen(trim($fields[93]))) ? floatval(trim($fields[93])) : 0.0;
				$ret[$eventName]['fullyLoadedCPUms'] = (array_key_exists(94, $fields) && strlen(trim($fields[94]))) ? floatval(trim($fields[94])) : 0.0;
				$ret[$eventName]['docCPUpct'] = (array_key_exists(95, $fields) && strlen(trim($fields[95]))) ? floatval(trim($fields[95])) : 0;
				$ret[$eventName]['fullyLoadedCPUpct'] = (array_key_exists(96, $fields) && strlen(trim($fields[96]))) ? floatval(trim($fields[96])) : 0;
          		$ret[$eventName]['isResponsive'] = (array_key_exists(97, $fields) && strlen(trim($fields[97]))) ? intval(trim($fields[97])) : -1;

				if(!isset($ret[$eventName]['pageNumber'])){
					$ret[$eventName]['pageNumber'] = $eventNumber;
				}
				$ret[$eventName]['date'] = strtotime(trim($fields[0]) . ' ' . trim($fields[1]));
				if (!strlen($ret[$eventName]['pageSpeedVersion'])){
					$ret[$eventName]['pageSpeedVersion'] = '1.9';
				}
				if(!checkOptionKeyAndGetValue('allEvents', $options)){
					break;
				}
			}
		}
	}
	if(checkOptionKeyAndGetValue('eventNumberKeys', $options)){
		$tmp = array();
		foreach($ret as $eventName => $data){
			$eventNumber = $data['eventNumber'];
			$tmp[$eventNumber] = $data;
		}
		$ret = $tmp;
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

	$ignoreMetrics = array('eventName', 'eventNumber');
		
	// calculate the averages
	if( count($pageData) ) {
		foreach( $pageData as $run => $data ) {
			if( isset($data[0]) && $data[0]['cached'] === 0 ) {
				if (!isset($metrics)) {
					$metrics = array();
					foreach ($data[0] as $metric => $value)
              			if (is_numeric($value))
							$metrics[] = $metric;
				}
			}
				// only look at non-error runs
				if( successfulRun($data[0]) )
				{
					if( !isset($fv) )
						$fv = array();
					foreach ($metrics as $metric) {
              			if (is_numeric($data[0][$metric])) {
	  						if (array_key_exists($metric, $fv))
	  							$fv[$metric] += $data[0][$metric];
	  						else
	  							$fv[$metric] = $data[0][$metric];
              			}
					}
					$fvCount++;
				}
			}

			if( isset($data[1]) && $data[1]['cached'] )
			{
				if (!isset($metrics)) {
					$metrics = array();
					foreach ($data[0] as $metric => $value)
             			if (is_numeric($value))
							$metrics[] = $metric;
				}
			}
			// only look at non-error runs
			if( successfulRun($data[1]) )
			{
				if( !isset($rv) )
					$rv = array();
				foreach ($metrics as $metric) {
              		if (is_numeric($data[1][$metric])) {
	  					if (array_key_exists($metric, $rv))
	  						$rv[$metric] += $data[1][$metric];
	  					else
	  						$rv[$metric] = $data[1][$metric];
              		}
				}
				$rvCount++;
			}

	// calculate the first view stats
	if( isset($fv) && isset($metrics) && $fvCount > 0 )
	{
		foreach ($metrics as $metric)
        	if (is_numeric($fv[$metric]))
					$fv[$metric] /= (double)$fvCount;
	}

	// go through and find the run closest to the average
	$closest = -1;
	$distance = 10000000000;

	foreach( $pageData as $run => $data )
	{
		if( isset($data[0]) && successfulRun($data[0]) )
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

	// calculate the repeat view stats
	if( isset($rv) && isset($metrics) && $rvCount > 0 )
	{
		foreach ($metrics as $metric)
	        if (is_numeric($rv[$metric]))
					$rv[$metric] /= (double)$rvCount;
	}
	
		// go through and find the run closest to the average
		$closest = -1;
		$distance = 10000000000;
	
		foreach( $pageData as $run => $data )
		{
			if( isset($data[1]) && successfulRun($data[1]) )
			{
				$curDist = abs($data[1]['loadTime'] - $rv['loadTime']);
				if( $curDist < $distance )
				{
					$closest = $run;
					$distance = $curDist;
				}
			}
			if( $closest != -1 )
				$rv['avgRun'] = $closest;
		}
	}
}

/**
* Find the index of the test run in $pageData with cache status $cached
* corresponding to the median (or lower of two middle values) of $metric,
* unless the "medianRun" parameter is set to "fastest",
* in which case it returns the index of the fastest run.
* 
* @param mixed $pageData
* @param mixed $cached
*/
function GetMedianRun(&$pageData, $cached, $metric = 'loadTime') {
	$run = 0;
	$cached = $cached ? 1:0;
	$times = array();

	// try successful-only runs first
	$times = values($pageData, $cached, $metric, true);

	if (!count($times)) {
		// include error runs
		$times = values($pageData, $cached, $metric, false);
	}

	$count = count($times);
	if( $count > 1 ) {
		asort($times);
		if (array_key_exists('medianRun', $_REQUEST) &&
		$_REQUEST['medianRun'] == 'fastest')
			$medianIndex = 1;
		else
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
		if( successfulRun($run[$cached]) )
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
	$values = values($pageData, $cached, $metric, true);
    $sum = array_sum($values);
    $count = count($values);

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
                successfulRun($data[$cached]))
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
            if (!isset($pageData['userTimes']))
              $pageData['userTimes'] = array();
            $pageData['userTimes'][$name] = $time;
          }
        }
      }
      $pageData["userTime"] = intval($lastEvent + 0.5);
    }
  }
}

/**
 * Return whether a particular run (cached or uncached) was successful.
 *
 * @param mixed data
 *
 * @return bool
 */
function successfulRun($data) {
  return ($data['result'] === 0 || $data['result']  === 99999);
}

/**
 * Return all values from a pageData for a given cached state and metric
 *
 * @param mixed pageData
 * @param int cached
 * @param string metric
 * @param bool successfulOnly Whether to only include successful runs
 *
 * @return (int|float)[]
 */
function values(&$pageData, $cached, $metric, $successfulOnly) {
  $values = array();
  foreach( $pageData as $index => &$pageRun ) {
    if( array_key_exists($cached, $pageRun) &&
      (!$successfulOnly || successfulRun($pageRun[$cached])) &&
      array_key_exists($metric, $pageRun[$cached]) ) {
        $values[$index] = $pageRun[$cached][$metric];
    }
  }
  return $values;
}

?>
