<?php
/**
* Load the page results directly from the results files
* 
* @param mixed $id
* @param mixed $testPath
* @param mixed $run
* @param mixed $cached
*/
function loadAllPageData($testPath)
{
    $ret = array();
    
    // go in order for the number of runs there are supposed to be
    $ini = parse_ini_file("$testPath/testinfo.ini", true);
    if( gz_is_file("$testPath/testinfo.json") )
        $ini['testinfo'] = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
    $runs = $ini['test']['runs'];
    $fvonly = $ini['test']['fvonly'];
    for( $run = 1; $run <= $runs; $run++ )
    {
        $data = loadPageRunData($testPath, $run, 0);
        if( isset($data) )
            $ret[$run][0] = $data;
        
        if( !$fvonly )
        {
            unset( $data );
            $data = loadPageRunData($testPath, $run, 1);
            if( isset($data) )
                $ret[$run][1] = $data;
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
function loadPageRunData($testPath, $run, $cached)
{
    $ret = null;

    if( $cached )
        $ret = loadPageData("$testPath/{$run}_Cached_IEWPG.txt");
    else
        $ret = loadPageData("$testPath/{$run}_IEWPG.txt");

    return $ret;
}

/**
* Load the page data from the specified file
* 
* @param mixed $file
*/
function loadPageData($file)
{
    $ret = null;
    $lines = gz_file($file);
    if( $lines)
    {
        // loop through each line in the file
        foreach($lines as $linenum => $line) 
        {
            $parseLine = str_replace("\t", "\t ", $line);
            $fields = explode("\t", $parseLine);
            if( count($fields) > 34 && trim($fields[0]) != 'Date' )
            {
                $ret = array(   'URL' => htmlspecialchars(trim($fields[3])),
                                // 'loadTime' => (int)$fields[4],
                                'loadTime' => (int)$fields[32],
                                'TTFB' => (int)$fields[5],
                                'bytesOut' => (int)$fields[7],
                                'bytesOutDoc' => (int)$fields[45],
                                'bytesIn' => (int)$fields[8],
                                'bytesInDoc' => (int)$fields[46],
                                'connections' => (int)$fields[10],
                                'requests' => (int)$fields[11],
                                'requestsDoc' => (int)$fields[49],
                                'result' => (int)$fields[17],
                                'render' => (int)$fields[18],
                                'fullyLoaded' => (int)$fields[22],
                                'cached' => (int)$fields[27],
                                'web' => (int)$fields[30],
                                'docTime' => (int)$fields[32],
                                'domTime' => (int)$fields[34],
                                'score_cache' => (int)$fields[36],
                                'score_cdn' => (int)$fields[37],
                                'score_gzip' => (int)$fields[39],
                                'score_cookies' => (int)$fields[40],
                                'score_keep-alive' => (int)$fields[41],
                                'score_minify' => (int)$fields[43],
                                'score_combine' => (int)$fields[44],
                                'score_compress' => (int)$fields[55],
                                'score_etags' => (int)$fields[58],
                                'gzip_total' => (int)$fields[64],
                                'gzip_savings' => (int)$fields[65],
                                'minify_total' => (int)$fields[66],
                                'minify_savings' => (int)$fields[67],
                                'image_total' => (int)$fields[68],
                                'image_savings' => (int)$fields[69],
                                'optimization_checked' => (int)$fields[71],
                                'aft' => (int)$fields[72],
                                'domElements' => (int)$fields[73],
                                'pageSpeedVersion' => trim($fields[74])
                            );
                
                $ret['date'] = strtotime(trim($fields[0]) . ' ' . trim($fields[1]));
                if (!strlen($ret['pageSpeedVersion']))
                    $ret['pageSpeedVersion'] = '1.9';
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
    if( count($pageData) )
    {
        foreach( $pageData as $run => $data )
        {
            if( isset($data[0]) && $data[0]['cached'] === 0 )
            {
                // only look at non-error runs
                if( $data[0]['result'] === 0 || $data[0]['result'] === 99999 )
                {
                    if( !isset($fv) )
                        $fv = array();

                    $fv['loadTime'] += $data[0]['loadTime'];
                    $fv['TTFB'] += $data[0]['TTFB'];
                    $fv['bytesIn'] += $data[0]['bytesIn'];
                    $fv['bytesInDoc'] += $data[0]['bytesInDoc'];
                    $fv['requests'] += $data[0]['requests'];
                    $fv['requestsDoc'] += $data[0]['requestsDoc'];
                    $fv['render'] += $data[0]['render'];
                    $fv['fullyLoaded'] += $data[0]['fullyLoaded'];
                    $fv['docTime'] += $data[0]['docTime'];
                    $fv['domTime'] += $data[0]['domTime'];
                    $fvCount++;
                }
            }

            if( isset($data[1]) && $data[1]['cached'] )
            {
                // only look at non-error runs
                if( $data[1]['result'] === 0 || $data[1]['result'] === 99999 )
                {
                    if( !isset($rv) )
                        $rv = array();
                    
                    $rv['loadTime'] += $data[1]['loadTime'];
                    $rv['TTFB'] += $data[1]['TTFB'];
                    $rv['bytesIn'] += $data[1]['bytesIn'];
                    $rv['bytesInDoc'] += $data[1]['bytesInDoc'];
                    $rv['requests'] += $data[1]['requests'];
                    $rv['requestsDoc'] += $data[1]['requestsDoc'];
                    $rv['render'] += $data[1]['render'];
                    $rv['fullyLoaded'] += $data[1]['fullyLoaded'];
                    $rv['docTime'] += $data[1]['docTime'];
                    $rv['domTime'] += $data[1]['domTime'];
                    $rvCount++;
                }
            }
        }
    }

    // calculate the first view stats    
    if( isset($fv) )
    {
        $fv['loadTime'] /= (double)$fvCount;
        $fv['TTFB'] /= (double)$fvCount;
        $fv['bytesIn'] /= (double)$fvCount;
        $fv['bytesInDoc'] /= (double)$fvCount;
        $fv['requests'] /= (double)$fvCount;
        $fv['requestsDoc'] /= (double)$fvCount;
        $fv['render'] /= (double)$fvCount;
        $fv['fullyLoaded'] /= (double)$fvCount;
        $fv['docTime'] /= (double)$fvCount;
        $fv['domTime'] /= (double)$fvCount;
        
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
    if( isset($rv) )
    {
        $rv['loadTime'] /= (double)$rvCount;
        $rv['TTFB'] /= (double)$rvCount;
        $rv['bytesIn'] /= (double)$rvCount;
        $rv['bytesInDoc'] /= (double)$rvCount;
        $rv['requests'] /= (double)$rvCount;
        $rv['requestsDoc'] /= (double)$rvCount;
        $rv['render'] /= (double)$rvCount;
        $rv['fullyLoaded'] /= (double)$rvCount;
        $rv['docTime'] /= (double)$rvCount;
        $rv['domTime'] /= (double)$rvCount;
        
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
function GetMedianRun(&$pageData, $cached)
{
    if( !$cached )
        $cached = 0;
        
    $run = 0;
    
    $times = array();
    
    // try successful-only runs first
    foreach( $pageData as $index => &$pageRun )
        if( isset( $pageRun[$cached] ) && isset($pageRun[$cached]['result']) && ($pageRun[$cached]['result'] == 0 || $pageRun[$cached]['result'] == 99999) )
            $times[$index] = $pageRun[$cached]['loadTime'];
            
    if( !count($times) )
    {
        // include error runs
        foreach( $pageData as $index => &$pageRun )
            if( isset( $pageRun[$cached] ) )
                $times[$index] = $pageRun[$cached]['loadTime'];
    }
    
    $count = count($times);
    if( $count > 1 )
    {
        asort($times);
        $medianIndex = (int)floor(((float)$count + 1.0) / 2.0);
        $current = 0;
        foreach( $times as $index => $time )
        {
            $current++;
            if( $current == $medianIndex )
            {
                $run = $index;
                break;
            }
        }
    }
    elseif( $count == 1 )
        $run = 1;
    
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
    foreach( $pageData as &$run )
    {
        if( ($run[$cached]['result'] === 0 || $run[$cached]['result'] === 99999) && isset($run[$cached][$metric]) )
        {
            $values[] = $run[$cached][$metric];
            $sum += $run[$cached][$metric];
            $count++;
        }
    }
    
    if( $count )
    {
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
?>
