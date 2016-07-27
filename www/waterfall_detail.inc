<?php
require_once __DIR__ . '/include/RequestDetailsHtmlSnippet.php';

$useLinks = !$settings['nolinks'];
$requestDetailsSnippet = new RequestDetailsHtmlSnippet($testInfo, $testRunResults->getStepResult(1), $useLinks);
echo $requestDetailsSnippet->create();
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
                if (isset($request['priority']) && strlen($request['priority']))
                    echo "<b>Priority:</b> " . htmlspecialchars($request['priority']) . "<br>\n";
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
                echo "<b>Request Start:</b> " . number_format($request['load_start'] / 1000.0, 3) . " s<br>\n";
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
                if (isset($request['body_id']) && $request['body_id'] > 0) {
                    $cached = (int)@$_GET["cached"];
                    echo "<a href=\"/response_body.php?test=$id&run=$run&cached=$cached&bodyid={$request['body_id']}\">View Response Body</a><br>\n";
                } elseif (array_key_exists('body', $request) && $request['body']) {
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
