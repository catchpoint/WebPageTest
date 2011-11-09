<div class="center">
<table id="tableDetails" class="details center">
	<caption>Request Details</caption>
    <thead>
	<tr>
		<th class="reqNum">#</th>
		<th class="reqUrl">Resource</th>
		<th class="reqMime">Content Type</th>
		<th class="reqStart">Start Offset</th>
		<th class="reqDNS">DNS Lookup</th>
		<th class="reqSocket">Initial Connection</th>
		<?php if( $secure) { ?>
		<th class="reqSSL">SSL Negotiation</th>
		<?php } ?>
		<th class="reqTTFB">Time to First Byte</th>
		<th class="reqDownload">Content Download</th>
		<th class="reqBytes">Bytes Downloaded</th>
		<th class="reqResult">Error/Status Code</th>
		<th class="reqIP">IP</th>
		<?php if( $haveLocations ) { ?>
		<th class="reqLocation">Location*</th>
		<?php } ?>
	</tr>
    </thead>
    <tbody>

<?php

// loop through all of the requests and spit out a data table
foreach($requests as $reqNum => $request)
{
	if($request)
	{
		echo '<tr>';
        
        $requestNum = $reqNum + 1;

		$highlight;
		unset($highlight);
		$result = (int)$request['responseCode'];
		if( $result >= 400)
			$highlight = 'error ';
		elseif ( $result >= 300)
			$highlight = 'warning ';
		
		if( (int)$requestNum % 2 == 1)
			$highlight .= 'odd';
		else
			$highlight .= 'even';
		
		if( $request['offset'] < $data['render'])
			$highlight .= 'Render';
		elseif ( $request['offset'] < $data['docTime'])
			$highlight .= 'Doc';
		
		echo '<td class="reqNum ' . $highlight . '"><a href="#request' . $requestNum . '">' . $requestNum . '</a></td>';
		
		if( $request['host'] || $request['url'] )
		{
			$protocol = 'http://';
			if( $request['secure'] && $request['secure'] == 1)
				$protocol = 'https://';
			$url = $protocol . $request['host'] . $request['url'];
            $displayurl = ShortenUrl($url);
			echo '<td class="reqUrl ' . $highlight . '"><a rel="nofollow" href="' . $url .  '">' . $displayurl . '</a></td>';
		}
		else
			echo '<td class="reqUrl ' . $highlight . '">-</td>';

		if( $request['contentType'])
			echo '<td class="reqMime ' . $highlight . '">' . $request['contentType'] . '</td>';
		else
			echo '<td class="reqMime ' . $highlight . '">-</td>';

		if( $request['offset'])
			echo '<td class="reqStart ' . $highlight . '">' . $request['offset'] / 1000.0 . ' s</td>';
		else
			echo '<td class="reqStart ' . $highlight . '">-</td>';

		if( $request['dnsTime'] && (int)$request['dnsTime'] !== -1)
			echo '<td class="reqDNS ' . $highlight . '">' . $request['dnsTime'] . ' ms</td>';
        elseif( $request['dns_end'] > 0 )
        {
            $time = $request['dns_end'] - $request['dns_start'];
            echo '<td class="reqDNS ' . $highlight . '">' . $time . ' ms</td>';
        }
		else
			echo '<td class="reqDNS ' . $highlight . '">-</td>';

		if( $request['socketTime'] && (int)$request['socketTime'] !== -1 )
		{
			echo '<td class="reqSocket ' . $highlight . '">' . $request['socketTime'] . ' ms</td>';
			if( $request['secure'] && $request['secure'] == 1 )
				echo '<td class="reqSSL ' . $highlight . '">' . (int)$request['sslTime'] . ' ms</td>';
			elseif( $secure )
				echo '<td class="reqSSL ' . $highlight . '">-</td>';
		}
		elseif( $request['connect_end'] > 0 )
        {
            $time = $request['connect_end'] - $request['connect_start'];
            echo '<td class="reqSocket ' . $highlight . '">' . $time . ' ms</td>';
            if( $secure )
	    {
	        if( $request['ssl_end'] > 0 )
		{
		    $time = $request['ssl_end'] - $request['ssl_start'];
		    echo '<td class="reqSSL ' . $highlight . '">' . $time . ' ms</td>';
		}
		else
		{
		    echo '<td class="reqSSL ' . $highlight . '">-</td>';
		}
	    }
        }
        else
		{
			echo '<td class="reqSocket ' . $highlight . '">-</td>';
			if( $secure )
				echo '<td class="reqSSL ' . $highlight . '">-</td>';
		}

		if( $request['ttfb'])
			echo '<td class="reqTTFB ' . $highlight . '">' . $request['ttfb'] . ' ms</td>';
		else
			echo '<td class="reqTTFB ' . $highlight . '">-</td>';

		if( $request['loadTime']  && $request['ttfb'])
			echo '<td class="reqDownload ' . $highlight . '">' . ($request['loadTime'] - $request['ttfb']) . ' ms</td>';
		else
			echo '<td class="reqDownload ' . $highlight . '">-</td>';
		
		if( $request['bytesIn'])
			echo '<td class="reqBytes ' . $highlight . '">' . number_format($request['bytesIn'] / 1024, 1) . ' KB</td>';
		else
			echo '<td class="reqBytes ' . $highlight . '">-</td>';

		if( $request['responseCode'])
			echo '<td class="reqResult ' . $highlight . '">' . $request['responseCode'] . '</td>';
		else
			echo '<td class="reqResult ' . $highlight . '">-</td>';
		
		if( $request['ipAddr'])
			echo '<td class="reqIP ' . $highlight . '">' . $request['ipAddr'] . '</td>';
		else
			echo '<td class="reqIP ' . $highlight . '">-</td>';
			
		if( $haveLocations)
			echo '<td class="reqLocation ' . $highlight . '">' . $request['location'] . "</td>\n";

		echo '</tr>';
	}
}
?>
</tbody>
</table></div>

<?php 
	if( $haveLocations)
		echo '<p class="center">*This product includes GeoLite data created by MaxMind, available from <a href="http://maxmind.com/">http://maxmind.com/</a>.</p>';
?>

<br>
<?php include('./ads/details_bottom.inc'); ?>
<br>

<div id="headers">
<?php
	// load the raw results
	$cached='';
	if((int)$_GET["cached"] == 1)
		$cached='_Cached';
	$fileName = $testPath . '/' . $run . $cached . '_report.txt';
	$lines = gz_file($fileName);
	if( $lines)
	{
		$requestNum = 1;
		$match = 'Request ' . $requestNum . ':';
		$needsClose = false;
		$display = true;
        $started = false;
		$request = array();
		
		echo '<br><hr><h2>Request Headers</h2>';
		
		// loop through each line in the file
		foreach($lines as $linenum => $line) 
		{
			$line = htmlspecialchars($line);
			$len = strlen($line);
			if( $len > 0 )
			{
				$line = trim($line);
				if( !strcmp($line, $match))
				{
                    if( $started )
                    {
					    if( $needsClose )
						    echo '</p>';
					    echo '<br><h4><a name="request' . $requestNum . '">' . $line . '</a></h4><p class="indented2">' . "\n";
					    $request = $requests[$requestNum - 1];
					    if( $request )
					    {
						    if( $request['host'] || $request['url'] )
						    {
							    $protocol = 'http://';
							    if( $request['secure'] && $request['secure'] == 1)
								    $protocol = 'https://';
							    $url = $protocol . $request['host'] . $request['url'];
							    echo '<b>URL: </b><a rel="nofollow" href="' . $url .  '">' . $url . "</a><br>\n";
						    }
						    echo '<b>Host: </b>' . $request['host'] . "<br>\n";
						    echo '<b>IP: </b>' . $request['ipAddr'] . "<br>\n";
						    if( $haveLocations)
							    echo '<b>Location: </b>' . $request['location'] . "*<br>\n";
						    echo '<b>Error/Status Code: </b>' . $request['responseCode'] . "<br>\n";
						    echo '<b>Start Offset: </b>' . $request['offset'] / 1000.0 . " s<br>\n";
						    if( $request['dnsTime'] && (int)$request['dnsTime'] !== -1 )
							    echo '<b>DNS Lookup: </b>' . $request['dnsTime'] . " ms<br>\n";
						    elseif( $request['dns_end'] > 0 )
						    {
							    $time = $request['dns_end'] - $request['dns_start'];
							    echo '<b>DNS Lookup: </b>' . $time . " ms<br>\n";
						    }
						    if( $request['socketTime'] && (int)$request['socketTime'] !== -1 )
						    {
							    echo '<b>Initial Connection: </b>' . $request['socketTime'] . " ms<br>\n";
							    if( $request['secure'] && $request['secure'] == 1 )
								    echo '<b>SSL Negotiation: </b>' . (int)$request['sslTime'] . " ms<br>\n";
						    }
						    elseif( $request['connect_end'] > 0 )
						    {
							    $time = $request['connect_end'] - $request['connect_start'];
							    echo '<b>Initial Connection: </b>' . $time . " ms<br>\n";
							    if( $request['ssl_end'] > 0 )
							    {
								    $time = $request['ssl_end'] - $request['ssl_start'];
								    echo '<b>SSL Negotiation: </b>' . $time . " ms<br>\n";
							    }
						    }
						    echo '<b>Time to First Byte: </b>' . $request['ttfb'] . " ms<br>\n";
						    if( $request['loadTime'] )
							    echo '<b>Content Download: </b>' . ($request['loadTime'] - $request['ttfb']) . " ms<br>\n";
						    echo '<b>Bytes In (downloaded): </b>' . number_format($request['bytesIn'] / 1024, 1) . " KB<br>\n";
						    echo '<b>Bytes Out (uploaded): </b>' . number_format($request['bytesOut'] / 1024, 1) . " KB<br>\n";
                            if ($request['body']) {
                                $cached = (int)$_GET["cached"];
                                echo "<a href=\"/response_body.php?test=$id&run=$run&cached=$cached&request=$requestNum\">View Response Body</a><br>\n";
                            }
					    }
					    echo "</p>\n";
					    
					    $needsClose = false;
					    $requestNum++;
					    $match = 'Request ' . $requestNum . ':';
					    $display = false;
                    }
				}
				elseif( !strcmp($line, 'Request details:'))
				{
                    $started = true;
				}
				elseif( $started )
				{
					$pos = strpos($line, ':');
					if( $pos )
						$line = '<b>' . substr_replace($line, ':</b>', $pos, 1);
					
					if( $requestNum == 1)
					{
						echo $line . "<br>\n";
					}
					else
					{
						if( !strcmp(substr($line, -5), ':</b>'))
						{
							if( $needsClose )
								echo '</p>';
							echo '<p class="indented1">' . $line . '</p><p class="indented2">' . "\n";
							$needsClose = true;
							$display = true;
						}
						elseif( $display )
							echo $line . "<br>\n";
					}
				}
			}
			else
				echo "<br>\n";
		}
		
		if( $needsClose )
			echo '</p>';
	}
?>
</div>
