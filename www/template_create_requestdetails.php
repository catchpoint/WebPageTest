<?php
include 'utils.inc';
include 'common.inc';
require_once('object_detail.inc');
require_once('page_data.inc');
require_once('waterfall.inc');


$id = urldecode($_REQUEST['id']);
$testPath = urldecode($_REQUEST['testPath']);
$eventName = urldecode($_REQUEST['eventName']);
$run = $_REQUEST['run'];
$cached = $_REQUEST['cached'];
$test_info = json_decode(urldecode($_REQUEST['testInfo']),true);
$secure = $_REQUEST['secure'];
$haveLocations = $_REQUEST['haveLocations'];

$type = "waterfall";
$file = generateViewImagePath($testPath, $eventName, $run, $cached, $type);
$dataArray = loadPageRunData($testPath, $run, $cached, array('SpeedIndex' => true, 'allEvents' => true));
$requests = getRequests($id, $testPath, $run, $cached, $secure, $haveLocations, true, true, true);
$eventRequests = $requests[$eventName];
?>


    <table id="tableDetails" class="details center">
        <caption>
            <a href="#quicklinks">Back to Quicklinks</a>
        </caption>
        <thead>
        <tr>
            <th class="reqNum">#</th>
            <th class="reqUrl">Resource</th>
            <th class="reqMime">Content Type</th>
            <th class="reqStart">Request Start</th>
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
        foreach($eventRequests as $reqNum => $request)
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
    </table>