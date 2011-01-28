<?php
// load the object data file
function getRequests($id, $testPath, $run, $cached, &$secure, &$haveLocations, $checkLocations, $includeHeaders = false)
{
	$requests = array();
    $start = 100000;
	
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
		
		// loop through each line in the file
		foreach($lines as $linenum => &$line) 
		{
			// skip the header line
			if( $linenum > 0)
			{
				$event = array();
				
				// tokenize the line
				$parseLine = str_replace("\t", "\t ", $line);
				$token = strtok($parseLine, "\t");
				$column = 0;
				while($token)
				{
					$column++;
					$token = trim($token);
					if( strlen($token) > 0)
					{
						switch($column)
						{
							case 4: $event['ipAddr'] = $token; break;
                            case 5: $event['method'] = $token; break;
							case 6: $event['host'] = $token; break;
							case 7: $event['url'] = $token; break;
							case 8: $event['responseCode'] = $token; break;
							case 9: $event['loadTime'] = (int)$token; break;
							case 10: $event['ttfb'] = (int)$token; break;
							case 11: $event['offset'] = (int)$token; break;
							case 12: $event['bytesOut'] = (int)$token; break;
							case 13: $event['bytesIn'] = (int)$token; break;
							case 14: $event['objectSize'] = (int)$token; break;
							case 17: $event['expires'] = $token; break;
							case 18: $event['cacheControl'] = $token; break;
							case 19: $event['contentType'] = $token; break;
							case 20: $event['contentEncoding'] = $token; break;
							case 21: $event['type'] = (int)$token; break;
							case 22: $event['socket'] = (int)$token; break;
                            case 24: $event['totalEndOffset'] = (int)$token; break;
                            case 36: $event['score_cache'] = (int)$token; break;
                            case 37: $event['score_cdn'] = (int)$token; break;
                            case 38: $event['score_gzip'] = (int)$token; break;
                            case 39: $event['score_cookies'] = (int)$token; break;
                            case 40: $event['score_keep-alive'] = (int)$token; break;
                            case 42: $event['score_minify'] = (int)$token; break;
                            case 43: $event['score_combine'] = (int)$token; break;
                            case 44: $event['score_compress'] = (int)$token; break;
                            case 45: $event['score_etags'] = (int)$token; break;
							case 47: $event['secure'] = (int)$token; break;
							case 48: $event['dnsTime'] = (int)$token; break;
							case 49: $event['socketTime'] = (int)$token; break;
							case 50: $event['sslTime'] = (int)$token; break;
						}
					}
					
					// on to the next token
					$token = strtok("\t");
				}
				
				// Track the individual requests only (roll-up the connections and DNS lookups)
				if( (int)$event[type] == 3 )
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
                    
                    if( $event['offset'] < $start )
                        $start = $event['offset'];
					
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
    
    // go through all of the requests and shift the offset to 0
    foreach($requests as &$request)
    {
        $request['offset'] -= $start;
        $request['totalEndOffset'] -= $start;
        $request['endOffset'] -= $start;
        $request['downloadOffset'] -= $start;
        $request['requestOffset'] -= $start;
        $request['sslOffset'] -= $start;
        $request['socketOffset'] -= $start;
        $request['dnsOffset'] -= $start;
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
?>
