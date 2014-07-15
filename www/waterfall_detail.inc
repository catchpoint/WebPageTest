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

		$highlight = '';
		$result = (int)$request['responseCode'];
		if( $result != 401 && $result >= 400)
			$highlight = 'error ';
		elseif ( $result >= 300)
			$highlight = 'warning ';

		if( (int)$requestNum % 2 == 1)
			$highlight .= 'odd';
		else
			$highlight .= 'even';

		if( $request['load_start'] < $data['render'])
			$highlight .= 'Render';
		elseif ( $request['load_start'] < $data['docTime'])
			$highlight .= 'Doc';

        if ($settings['nolinks']) {
            echo '<td class="reqNum ' . $highlight . '">' . $requestNum . '</td>';
        } else {
            echo '<td class="reqNum ' . $highlight . '"><a href="#request' . $requestNum . '">' . $requestNum . '</a></td>';
        }

		if( $request['host'] || $request['url'] )
		{
			$protocol = 'http://';
			if( $request['is_secure'] && $request['is_secure'] == 1)
				$protocol = 'https://';
			$url = $protocol . $request['host'] . $request['url'];
            $displayurl = ShortenUrl($url);
            if ($settings['nolinks']) {
                echo "<td class=\"reqUrl $highlight\"><a title=\"$url\" href=\"#request$requestNum\">$displayurl</a></td>";
            } else {
			    echo '<td class="reqUrl ' . $highlight . '"><a rel="nofollow" href="' . $url .  '">' . $displayurl . '</a></td>';
            }
		}
		else
			echo '<td class="reqUrl ' . $highlight . '">-</td>';

		if( array_key_exists('contentType', $request) && strlen($request['contentType']))
			echo '<td class="reqMime ' . $highlight . '">' . $request['contentType'] . '</td>';
		else
			echo '<td class="reqMime ' . $highlight . '">-</td>';

		if( $request['load_start'])
			echo '<td class="reqStart ' . $highlight . '">' . $request['load_start'] / 1000.0 . ' s</td>';
		else
			echo '<td class="reqStart ' . $highlight . '">-</td>';

		if( $request['dns_ms'] && (int)$request['dns_ms'] !== -1)
			echo '<td class="reqDNS ' . $highlight . '">' . $request['dns_ms'] . ' ms</td>';
        elseif( $request['dns_end'] > 0 )
        {
            $time = $request['dns_end'] - $request['dns_start'];
            echo '<td class="reqDNS ' . $highlight . '">' . $time . ' ms</td>';
        }
		else
			echo '<td class="reqDNS ' . $highlight . '">-</td>';

		if( $request['connect_ms'] && (int)$request['connect_ms'] !== -1 )
		{
			echo '<td class="reqSocket ' . $highlight . '">' . $request['connect_ms'] . ' ms</td>';
			if( $request['is_secure'] && $request['is_secure'] == 1 ) {
				echo '<td class="reqSSL ' . $highlight . '">' . (int)$request['ssl_ms'] . ' ms</td>';
			} elseif( $secure )
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

		if( array_key_exists('ttfb_ms', $request) && $request['ttfb_ms'])
			echo '<td class="reqTTFB ' . $highlight . '">' . $request['ttfb_ms'] . ' ms</td>';
		else
			echo '<td class="reqTTFB ' . $highlight . '">-</td>';

		if( array_key_exists('download_ms', $request) && $request['download_ms'])
			echo '<td class="reqDownload ' . $highlight . '">' . $request['download_ms'] . ' ms</td>';
		else
			echo '<td class="reqDownload ' . $highlight . '">-</td>';

		if( array_key_exists('bytesIn', $request) && $request['bytesIn'])
			echo '<td class="reqBytes ' . $highlight . '">' . number_format($request['bytesIn'] / 1024, 1) . ' KB</td>';
		else
			echo '<td class="reqBytes ' . $highlight . '">-</td>';

		if( array_key_exists('responseCode', $request) && $request['responseCode'])
			echo '<td class="reqResult ' . $highlight . '">' . $request['responseCode'] . '</td>';
		else
			echo '<td class="reqResult ' . $highlight . '">-</td>';

		if( array_key_exists('ip_addr', $request) && $request['ip_addr'])
			echo '<td class="reqIP ' . $highlight . '">' . $request['ip_addr'] . '</td>';
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

<?php
echo '<div id="headers">';
    if (array_key_exists('testinfo', $test) && array_key_exists('testerDNS', $test['testinfo']) && strlen($test['testinfo']['testerDNS']))
        echo "<p>Test Machine DNS Server(s): {$test['testinfo']['testerDNS']}</p>\n";
    if (isset($requests) &&
        is_array($requests) &&
        count($requests) &&
        array_key_exists(0, $requests) &&
        array_key_exists('headers', $requests[0])) {
        echo '<br><hr><h2>Request Headers</h2>';
        echo '<p>+ <a id="all" href="javascript:expandAll();">Expand All</a></p>';
        foreach($requests as $reqNum => $request) {
            if($request) {
                $requestNum = $reqNum + 1;
                echo "<h4><span class=\"a_request\" id=\"request$requestNum\" data-target-id=\"headers_$requestNum\">";
                echo "+ Request $requestNum: " . htmlspecialchars($request['full_url']) . "</span></h4>";
                echo '<div class="header_details" id="headers_' . $requestNum . '">';
                echo "<p class=\"indented2\">\n";
                if ($settings['nolinks'])
                    echo "<b>URL:</b> {$request['full_url']}<br>\n";
                else
                    echo "<b>URL:</b> <a rel=\"nofollow\" href=\"{$request['full_url']}\">{$request['full_url']}</a><br>\n";
                echo "<b>Host:</b> " . htmlspecialchars($request['host']) . "<br>\n";
                if (array_key_exists('ip_addr', $request) && strlen($request['ip_addr']))
                    echo "<b>IP:</b> {$request['ip_addr']}<br>\n";
                if (array_key_exists('location', $request) && strlen($request['location']))
                    echo "<b>Location:</b> " . htmlspecialchars($request['location']) . "<br>\n";
                echo "<b>Error/Status Code:</b> " . htmlspecialchars($request['responseCode']) . "<br>\n";
                if (array_key_exists('initiator', $request) && strlen($request['initiator'])) {
                    echo "<b>Initiated By:</b> " . htmlspecialchars($request['initiator']);
                    if (array_key_exists('initiator_line', $request) && strlen($request['initiator_line']))
                        echo " line " . htmlspecialchars($request['initiator_line']);
                    if (array_key_exists('initiator_column', $request) && strlen($request['initiator_column']))
                        echo " column " . htmlspecialchars($request['initiator_column']);
                    echo "<br>\n";
                }
                if (array_key_exists('client_port', $request) && intval($request['client_port']))
                    echo "<b>Client Port:</b> " . htmlspecialchars($request['client_port']) . "<br>\n";
                if (array_key_exists('custom_rules', $request)) {
                    foreach($request['custom_rules'] as $rule_name => &$rule) {
                        echo "<b>Custom Rule - " . htmlspecialchars($rule_name) . ": </b>(" . htmlspecialchars($rule['count']) . " matches) - " . htmlspecialchars($rule['value']) . "<br>\n";
                    }
                }
                echo "<b>Start Offset:</b> " . number_format($request['load_start'] / 1000.0, 3) . " s<br>\n";
                if (array_key_exists('dns_ms', $request) && $request['dns_ms'] > 0)
                    echo "<b>DNS Lookup:</b> {$request['dns_ms']} ms<br>\n";
                if (array_key_exists('connect_ms', $request) && $request['connect_ms'] > 0)
                    echo "<b>Initial Connection:</b> {$request['connect_ms']} ms<br>\n";
                if (array_key_exists('ttfb_ms', $request) && $request['ttfb_ms'] > 0)
                    echo "<b>Time to First Byte:</b> {$request['ttfb_ms']} ms<br>\n";
                if (array_key_exists('download_ms', $request) && $request['download_ms'] > 0)
                    echo "<b>Content Download:</b> {$request['download_ms']} ms<br>\n";
                echo "<b>Bytes In (downloaded):</b> " . number_format($request['bytesIn'] / 1024.0, 1) . " KB<br>\n";
                echo "<b>Bytes Out (uploaded):</b> " . number_format($request['bytesOut'] / 1024.0, 1) . " KB<br>\n";
                if (array_key_exists('body', $request) && $request['body']) {
                    $cached = (int)@$_GET["cached"];
                    echo "<a href=\"/response_body.php?test=$id&run=$run&cached=$cached&request=$requestNum\">View Response Body</a><br>\n";
                }
                echo "</p>";
                if (array_key_exists('headers', $request)) {
                    if (array_key_exists('request', $request['headers']) && is_array($request['headers']['request'])) {
                        echo '<p class="indented1"><b>Request Headers:</b></p><p class="indented2">' . "\n";
                        foreach ($request['headers']['request'] as $value)
                            echo htmlspecialchars($value) . "<br>\n";
                        echo "</p>";
                    }
                    if (array_key_exists('response', $request['headers']) && is_array($request['headers']['response'])) {
                        echo '<p class="indented1"><b>Response Headers:</b></p><p class="indented2">' . "\n";
                        foreach ($request['headers']['response'] as $value)
                            echo htmlspecialchars($value) . "<br>\n";
                        echo "</p>";
                    }
                }

                echo '</div>'; // header_details
            }
        }
    }
?>
</div>
