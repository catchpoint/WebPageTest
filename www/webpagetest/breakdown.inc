<?php
include 'object_detail.inc';
require_once('contentColors.inc'); 

/**
* Aggregate the individual requests by mime type
* 
* @param mixed $requests
*/
function getBreakdown($id, $testPath, $run, $cached, &$requests)
{
    $cache = array();
    $cache_file = "$testPath/breakdown.json";
    if (is_file($cache_file)) {
        $cache = json_decode(file_get_contents($cache_file), true);
    }
    
    if (array_key_exists($run, $cache)) {
        if (array_key_exists($cached, $cache[$run])) {
            $breakdown = $cache[$run][$cached];
        }
    } else {
        $cache[$run] = array($cached => array());
    }

    if (!isset($breakdown)) {
        // get all of the requests
        $secure = false;
        $haveLocations = false;
        $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);
        
        $breakdown = array();
        $mime_colors = MimeColors();
        
        foreach($requests as $request)
        {
            $contentType = ContentType($request['contentType']);
            $object = strtolower($request['url']);
            if( strlen($contentType) && (stripos($object, 'favicon.ico') === FALSE) )
            {
                if( !isset($breakdown[$contentType]) )
                {
                    $entry = array(
                        'color' => $mime_colors[$contentType],
                        'bytes' => 0,
                        'requests' => 0
                        );
                    $breakdown["$contentType"] = $entry;
                }
                
                $breakdown["$contentType"]['bytes'] += $request['bytesIn'];
                $breakdown["$contentType"]['requests']++;
            }
        }
        $cache[$run][$cached] = $breakdown;
        file_put_contents($cache_file, json_encode($cache));
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
            $rvData['requests'] = 0;
        }
        $combined[$type]['rvBytes'] = $rvData['bytes'];
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
            $fv['requests'] = 0;
            $fv['rvBytes'] = $data['bytes'];
            $fv['rvRequests'] = $data['requests'];
            $combined[$type] = $fv;
        }
    }
    
    return $combined;
}
?>
