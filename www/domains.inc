<?php
require_once('object_detail.inc'); 

/**
* Aggregate the individual requests by domain
* 
* @param mixed $requests
*/
function getDomainBreakdown($id, $testPath, $run, $cached, &$requests)
{
    // get all of the requests
    if (!isset($requests) || !count($requests)) {
        $secure = false;
        $haveLocations = false;
        $requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, false);
    }
    
    $breakdown = array();
    
    $connections = array();
    foreach($requests as $request)
    {
        $domain = strtok($request['host'],':');
        $object = strtolower($request['url']);
        if( strlen($domain) && (strstr($object, 'favicon.ico') === FALSE) )
        {
            if( !array_key_exists($domain, $breakdown))
                $breakdown["$domain"] = array('bytes' => 0, 'requests' => 0);
            if( !array_key_exists($domain, $connections))
                $connections["$domain"] = array();
            $connections["$domain"][$request['socket']] = 1;
                        
            if (array_key_exists('bytesIn', $request))
              $breakdown["$domain"]['bytes'] += $request['bytesIn'];
            $breakdown["$domain"]['requests']++;
        }
    }
    foreach ($breakdown as $domain => &$data) {
        $data['connections'] = 0;
        if( array_key_exists($domain, $connections)) {
            $data['connections'] = count($connections[$domain]);
        }
    }
    
    // sort the array by reversed domain so the resources from a given domain are grouped
    uksort($breakdown, function($a, $b) {return strcmp(strrev($a), strrev($b));});
    
    return $breakdown;
}

/**
* Get a combined result that has both first and repeat view data
* 
* @param mixed $id
* @param mixed $run
*/
function getDomainBreakdownCombined($id, $testPath, $run)
{
    $rCombined;
    $combined = getBreakdown($id, $testPath, $run, 0, $rCombined);
    $rRv;
    $rv = getBreakdown($id, $testPath, $run, 1, $rRv);

    // combine the two data sets
    foreach( $combined as $domain => $data )
    {
        unset($rvData);
        $rvData = $rv[$domain];
        if( !count($rvData) )
        {
            $rvData['bytes'] = 0;
            $rvData['requests'] = 0;
        }
        $combined[$domain]['rvBytes'] = $rvData['bytes'];
        $combined[$domain]['rvRequests'] = $rvData['requests'];
    }

    // grab any that had data in the repeat view but not first view
    foreach( $rv as $domain => $data )
    {
        unset($fv);
        $fv = $combined[$domain];
        if( !count($fv) )
        {
            $fv = array();
            $fv['bytes'] = 0;
            $fv['requests'] = 0;
            $fv['rvBytes'] = $data['bytes'];
            $fv['rvRequests'] = $data['requests'];
            $combined[$domain] = $fv;
        }
    }
    
    return $combined;
}
?>