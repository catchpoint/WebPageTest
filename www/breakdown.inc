<?php
require_once('object_detail.inc');
require_once('contentColors.inc'); 

if(extension_loaded('newrelic')) { 
    newrelic_add_custom_tracer('getBreakdown');
    newrelic_add_custom_tracer('getBreakdownCombined');
}

define('BREAKDOWN_CACHE_VERSION', 4);

/**
* Aggregate the individual requests by mime type
* 
* @param mixed $requests
*/
function getBreakdown($id, $testPath, $run, $cached, &$requests) {
    $rootUrlGenerator = UrlGenerator::create(true, "", $id, $run, $cached);
    $localPaths = new TestPaths($testPath, $run, $cached);
    return getBreakdownForStep($localPaths, $rootUrlGenerator, $requests);
}

/**
 * @param TestPaths $localPaths
 * @param UrlGenerator $rootUrlGenerator
 * @param array $requests
 * @return array
 */
function getBreakdownForStep($localPaths, $rootUrlGenerator, &$requests) {
    $cache = array();
    $cache_file = $localPaths->breakdownCacheFile(BREAKDOWN_CACHE_VERSION);
    $cacheKey = $localPaths->cacheKey();
    if (gz_is_file($cache_file)) {
      $cache = json_decode(gz_file_get_contents($cache_file), true);
    }
    if (!empty($cache[$cacheKey])) {
      $breakdown = $cache[$cacheKey];
    }
    if (!isset($breakdown)) {
        // get all of the requests
        $secure = false;
        $haveLocations = false;
        $requests = getRequestsForStep($localPaths, $rootUrlGenerator, $secure);
        
        $breakdown = array();
        $mime_colors = MimeColors();
        foreach ($mime_colors as $contentType => $color) {
            $entry = array(
                'color' => $color,
                'bytes' => 0,
                'bytesUncompressed' => 0,
                'requests' => 0
                );
            $breakdown["$contentType"] = $entry;
        }
        
        foreach($requests as $request) {
          if (isset($request['contentType']) && isset($request['url'])) {
            $contentType = ContentType($request['contentType'], $request['url']);
            $object = strtolower($request['url']);
            if( strlen($contentType) && (stripos($object, 'favicon.ico') === FALSE) ) {
              $breakdown[$contentType]['bytes'] += $request['bytesIn'];
              $breakdown[$contentType]['requests']++;
              if (isset($request['objectSizeUncompressed']) && $request['objectSizeUncompressed'] > 0)
                $breakdown[$contentType]['bytesUncompressed'] += $request['objectSizeUncompressed'];
            }
          }
        }
        $cache[$cacheKey] = $breakdown;
        gz_file_put_contents($cache_file, json_encode($cache));
    }
    
    return $breakdown;
}

/**
* Get a combined result that has both first and repeat view data
* 
* @param mixed $id
* @param mixed $run
*/
function getBreakdownCombined($id, $testPath, $run)
{
    $rCombined;
    $combined = getBreakdown($id, $testPath, $run, 0, $rCombined);
    $rRv;
    $rv = getBreakdown($id, $testPath, $run, 1, $rRv);

    // combine the two data sets
    foreach( $combined as $type => $data )
    {
        unset($rvData);
        $rvData = $rv[$type];
        if( !count($rvData) )
        {
            $rvData['bytes'] = 0;
            $rvData['bytesUncompressed'] = 0;
            $rvData['requests'] = 0;
        }
        $combined[$type]['rvBytes'] = $rvData['bytes'];
        $combined[$type]['rvBytesUncompressed'] = $rvData['bytesUncompressed'];
        $combined[$type]['rvRequests'] = $rvData['requests'];
    }

    // grab any that had data in the repeat view but not first view
    foreach( $rv as $type => $data )
    {
        unset($fv);
        $fv = $combined[$type];
        if( !count($fv) )
        {
            $fv = array();
            $fv['bytes'] = 0;
            $fv['bytesUncompressed'] = 0;
            $fv['requests'] = 0;
            $fv['rvBytes'] = $data['bytes'];
            $fv['rvBytesUncompressed'] = $data['bytesUncompressed'];
            $fv['rvRequests'] = $data['requests'];
            $combined[$type] = $fv;
        }
    }
    
    return $combined;
}
?>
