<?php
// load the object data file
function getRequests($id, $testPath, $run, $cached, &$secure, &$haveLocations, $checkLocations, $includeHeaders = false)
{
	$requests = array();
    $secure = false;
    $haveLocations = false;
	
	$geoip;
    if( $checkLocations == true )
    {
	    try
	    {
		    include('./Net/GeoIP.php');
		    $geoip = Net_GeoIP::getInstance('./Net/GeoLiteCity.dat', Net_GeoIP::MEMORY_CACHE);
	    }catch(Exception $e) { }
    }
	
	// load the object file into an array of lines
	$cachedText='';
	if((int)$cached == 1)
		$cachedText ='_Cached';
	$fileName = $testPath . '/' . $run . $cachedText . '_IEWTR.txt';
	$lines = gz_file($fileName);
	if( $lines)
	{
		$dnsTime;
		$socketTime;
        
        $columns = array(   4 => 'ipAddr', 5 => 'method', 6 => 'host', 7 => 'url', 
                            8 => 'responseCode', 9 => 'loadTime', 10 => 'ttfb', 11 => 'offset', 
                            12 => 'bytesOut', 13 => 'bytesIn', 14 => 'objectSize', 17 => 'expires', 
                            18 => 'cacheControl', 19 => 'contentType', 20 => 'contentEncoding', 21 => 'type', 
                            22 => 'socket', 24 => 'totalEndOffset', 36 => 'score_cache', 37 => 'score_cdn', 
                            38 => 'score_gzip', 39 => 'score_cookies', 40 => 'score_keep-alive', 42 => 'score_minify', 
                            43 => 'score_combine', 44 => 'score_compress', 45 => 'score_etags', 47 => 'secure', 
                            48 => 'dnsTime', 49 => 'socketTime', 50 => 'sslTime', 51 => 'gzip_total',
                            52 => 'gzip_save', 53 => 'minify_total', 54 => 'minify_save', 55 => 'image_total',
                            56 => 'image_save', 57 => 'cache_time', 61 => 'cdn_provider', 
                            62 => 'dns_start', 63 => 'dns_end', 64 => 'connect_start', 65 => 'connect_end',
                            66 => 'ssl_start', 67 => 'ssl_end'
                        );
		
		// loop through each line in the file
		foreach($lines as $linenum => &$line) 
		{
			$event = array();
			
			// tokenize the line
			$parseLine = str_replace("\t", "\t ", $line);
            $column = explode("\t", $parseLine);
            if( count($column) )
			{
                foreach( $columns as $columnNum => $key )
                {
                    $col = $columnNum - 1;
                    if( array_key_exists($col, $column) )
                        $event[$key] = trim($column[$col]);
                }
			}
			
			// Track the individual requests only (roll-up the connections and DNS lookups)
			if( (int)$event['type'] == 3 )
			{
                // keep track of the full request time (as the offset gets adjusted down)
                if( $event['ttfb'] > 0 )
                    $event['downloadOffset'] = $event['offset'] + $event['ttfb'];
                    
                $event['endOffset'] = $event['offset'] + $event['loadTime'];
                $event['requestOffset'] = $event['offset'];

                if( $event['sslTime'] > 0 )
                {
                    $event['offset'] -= $event['sslTime'];
                    $event['sslOffset'] = $event['offset'];
                }
                
				if( $socketTime && !$event['socketTime'] )
					$event['socketTime'] = $socketTime;
                if( $event['socketTime'] > 0 )
                {
					$event['offset'] -= $event['socketTime'];
                    $event['socketOffset'] = $event['offset'];
                }

                if( $dnsTime && !$event['dnsTime'] )
                    $event['dnsTime'] = $dnsTime;
                if( $event['dnsTime'] > 0 )
                {
                    $event['offset'] -= $event['dnsTime'];
                    $event['dnsOffset'] = $event['offset'];
                }
                
                $event['totalTime'] = $event['endOffset'] - $event['offset'];
                
				unset($dnsTime);
				unset($socketTime);
				
				if( $event['secure'] && $event['secure'] > 0)
					$secure = true;
				
				// do the IP lookup
				if( $geoip && $event['ipAddr'])
				{
					try
					{
						$location = $geoip->lookupLocation($event['ipAddr']);
						if( $location)
						{
							$haveLocations = true;
							$event['country'] = $location->countryName;
							$event['countryCode'] = $location->countryCode3;
							$event['city'] = $location->city;
							$event['region'] = $location->region;
							$event['lat'] = $location->latitude;
							$event['long'] = $location->longitude;

							$loc = '-';
							if( $event['city'])
							{
								if ( $event['region'] && $event['countryCode'] == 'USA' )
									$loc = $event['city'] . ', ' . $event['region'];
								elseif( $event['country'])
									$loc = $event['city'] . ', ' . $event['country'];
							}
							elseif ( $event['region'] )
							{
								if( $event['country'])
									$loc = $event['region'] . ', ' . $event['country'];
							}
							elseif ( $event['country'] )
								$loc = $event['country'];
							$event['location'] = $loc;
						}
					}catch(Exception $e) {}
				}
				
				// add this event to the requests list
                $event['index'] = count($requests);
				$requests[] = $event;
			}
			else if( (int)$event[type] == 1 )
				$dnsTime = $event['loadTime'];
			else if( (int)$event[type] == 2 )
				$socketTime = $event['loadTime'];
		}
        
        // load the raw headers if we have them
        $fileName = $testPath . '/' . $run . $cachedText . '_report.txt';
        $lines = gz_file($fileName);
        if( $lines)
        {
            $started = false;
            $request = -1;
            $requestHeaders = array();
            $responseHeaders = array();
            $req = false;
            $resp = false;
            foreach($lines as &$line)
            {
                $trimmed = trim($line);
                if( !$started )
                {
                    if( $trimmed == 'Request details:' )
                        $started = true;
                }
                else
                {
                    if( !strncmp($line, 'Request ', 8) )
                    {
                        // see if we had a previous request to store
                        if( $request > -1 && (count($requestHeaders) || count($responseHeaders)) && isset($requests[$request]) )
                        {
                            $requests[$request]['headers'] = array();
                            $requests[$request]['headers']['request'] = $requestHeaders;
                            $requests[$request]['headers']['response'] = $responseHeaders;
                        }
                        
                        // start up a new request
                        $req = false;
                        $resp = false;
                        $requestHeaders = array();
                        $responseHeaders = array();
                        $parts = explode(' ', $line);
                        $request = (int)$parts[1];
                        if( $request > 0 )
                            $request--;
                        else
                            $request = -1;
                    }
                    elseif( $trimmed == 'Request Headers:' )
                    {
                        $req = true;
                        $resp = false;
                    }
                    elseif( $trimmed == 'Response Headers:' )
                    {
                        $req = false;
                        $resp = true;
                    }
                    elseif( strlen($trimmed) )
                    {
                        if( $req )
                            $requestHeaders[] = $trimmed;
                        if( $resp )
                            $responseHeaders[] = $trimmed;
                    }
                }
            }

            // store the last request
            if( $request > -1 && (count($requestHeaders) || count($responseHeaders)) && isset($requests[$request]) )
            {
                $requests[$request]['headers'] = array();
                $requests[$request]['headers']['request'] = $requestHeaders;
                $requests[$request]['headers']['response'] = $responseHeaders;
            }
        }
	}
    
	return $requests;
}

/**
* Figure out how much time is spent during the page load for downloading, requests, etc
* 
* @param mixed $requests
*/
function CalculateComponentTimes(&$pageData, &$requests)
{
    // figure out what the appropriate end time is
    $end = $pageData['loadTime'];
    $times = array('dns' => 0.0, 'socket' => 0.0, 'ssl' => 0.0, 'request' => 0.0, 'download' => 0.0, 'execution' => 0.0);
    
    // loop through every millisecond calculating the component times
    for( $i = 0; $i <= $end; $i++ )
    {
        $totalCount = 0;
        $dnsCount = 0;
        $socketCount = 0;
        $sslCount = 0;
        $requestCount = 0;
        $downloadCount = 0;
        
        // loop through every request and see which were active during this millisecond
        foreach( $requests as $request )
        {
            if( $i >= $request['offset'] && $i <= $request['endOffset'] )
            {
                $totalCount++;
                
                // figure out what the request was doing
                if( $request['downloadOffset'] && $i >= $request['downloadOffset'] )
                    $downloadCount++;
                elseif( $request['requestOffset'] && $i >= $request['requestOffset'] )
                    $requestCount++;
                elseif( $request['sslOffset'] && $i >= $request['sslOffset'] )
                    $requestCount++;
                elseif( $request['socketOffset'] && $i >= $request['socketOffset'] )
                    $socketCount++;
                elseif( $i >= $request['dnsOffset'] )
                    $dnsCount++;
            }
        }
        
        if( $totalCount > 0 )
        {
            // if anything is downloading the download gets the full share
            if( $downloadCount )
                $times['download']++;
            else
            {
                // otherwise, split the time between the "wasted" time components
                $times['dns'] += $dnsCount / $totalCount;
                $times['socket'] += $socketCount / $totalCount;
                $times['ssl'] += $sslCount / $totalCount;
                $times['request'] += $requestCount / $totalCount;
            }
        }
        else
            $times['execution']++;
    }
    
    return $times;
}

/**
* Get the request for the base page (first non-redirect)
* 
* @param mixed $requests
*/
function GetBasePage(&$requests)
{
    $basePage = null;
    foreach($requests as &$request)
    {
        if( $request['responseCode'] < 300 || $request['responseCode'] >= 400 )
        {
            $basePage = $request;
            break;
        }
    }
    
    return $basePage;
}
?>
