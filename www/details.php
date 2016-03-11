<?php
include 'common.inc';
require_once('object_detail.inc');
require_once('page_data.inc');
require_once('waterfall.inc');

$options = null;
if (array_key_exists('end', $_REQUEST))
    $options = array('end' => $_REQUEST['end']);
$data = loadPageRunData($testPath, $run, $cached, $options, $test['testinfo']);

$page_keywords = array('Performance Test','Details','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Website performance test details$testLabel";
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest Test Details<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Details'; include ('head.inc'); ?>
        <style type="text/css">
        div.bar {
            height:12px;
            margin-top:auto;
            margin-bottom:auto;
        }

        .left {text-align:left;}
        .center {text-align:center;}

        .indented1 {padding-left: 40pt;}
        .indented2 {padding-left: 80pt;}

        td {
            white-space:nowrap;
            text-align:left;
            vertical-align:middle;
        }

        td.center {
            text-align:center;
        }

        table.details {
          margin-left:auto; margin-right:auto;
          background: whitesmoke;
          border-collapse: collapse;
        }
        table.details th, table.details td {
          border: 1px silver solid;
          padding: 0.2em;
          text-align: center;
          font-size: smaller;
        }
        table.details th {
          background: gainsboro;
        }
        table.details caption {
          margin-left: inherit;
          margin-right: inherit;
          background: whitesmoke;
        }
        table.details th.reqUrl, table.details td.reqUrl {
          text-align: left;
          width: 30em;
          word-wrap: break-word;
        }
        table.details td.even {
          background: gainsboro;
        }
        table.details td.odd {
          background: whitesmoke;
        }
        table.details td.evenRender {
          background: #dfffdf;
        }
        table.details td.oddRender {
          background: #ecffec;
        }
        table.details td.evenDoc {
          background: #dfdfff;
        }
        table.details td.oddDoc {
          background: #ececff;
        }
        table.details td.warning {
          background: #ffff88;
        }
        table.details td.error {
          background: #ff8888;
        }
        .header_details {
            display: none;
        }
        .a_request {
            cursor: pointer;
        }
        <?php
        include "waterfall.css";
        ?>
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Details';
            include 'header.inc';
            ?>

            <div id="result">
                <div id="download">
                    <div id="testinfo">
                        <?php
                        echo GetTestInfoHtml();
                        ?>
                    </div>
                    <?php
                        echo '<a href="/export.php?' . "test=$id&run=$run&cached=$cached&bodies=1&pretty=1" . '">Export HTTP Archive (.har)</a>';
                        if ( is_dir('./google') && array_key_exists('enable_google_csi', $settings) && $settings['enable_google_csi'] )
                            echo '<br><a href="/google/google_csi.php?' . "test=$id&run=$run&cached=$cached" . '">CSI (.csv) data</a>';
                        if (array_key_exists('custom', $data) && is_array($data['custom']) && count($data['custom']))
                            echo '<br><a href="/custom_metrics.php?' . "test=$id&run=$run&cached=$cached" . '">Custom Metrics</a>';
                        if( is_file("$testPath/{$run}{$cachedText}_dynaTrace.dtas") )
                        {
                            echo "<br><a href=\"/$testPath/{$run}{$cachedText}_dynaTrace.dtas\">Download dynaTrace Session</a>";
                            echo ' (<a href="http://ajax.dynatrace.com/pages/" target="_blank">get dynaTrace</a>)';
                        }
                        if( is_file("$testPath/{$run}{$cachedText}_bodies.zip") )
                            echo "<br><a href=\"/$testPath/{$run}{$cachedText}_bodies.zip\">Download Response Bodies</a>";
                        echo '<br>';
                    ?>
                </div>
                <div class="cleared"></div>
                <br>
                <table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
                    <tr>
                        <?php
                        $cols = 4;
                        if (array_key_exists('userTime', $data) && (float)$data['userTime'] > 0.0)
                            $cols++;
                        if (array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0)
                            $cols++;
                        if (array_key_exists('aft', $test['test']) && $test['test']['aft'] )
                            $cols++;
                        if (array_key_exists('domElements', $data) && $data['domElements'] > 0)
                            $cols++;
                        if (array_key_exists('SpeedIndex', $data) && (int)$data['SpeedIndex'] > 0)
                            $cols++;
                        if (array_key_exists('visualComplete', $data) && (float)$data['visualComplete'] > 0.0)
                            $cols++;
                        ?>
                        <th align="center" class="empty" valign="middle" colspan=<?php echo "\"$cols\"";?> ></th>
                        <th align="center" class="border" valign="middle" colspan="3">Document Complete</th>
                        <th align="center" class="border" valign="middle" colspan="3">Fully Loaded</th>
                    </tr>
                    <tr>
                        <th align="center" valign="middle">Load Time</th>
                        <th align="center" valign="middle">First Byte</th>
                        <th align="center" valign="middle">Start Render</th>
                        <?php if (array_key_exists('userTime', $data) && (float)$data['userTime'] > 0.0 ) { ?>
                        <th align="center" valign="middle">User Time</th>
                        <?php } ?>
                        <?php if( array_key_exists('aft', $test['test']) && $test['test']['aft'] ) { ?>
                        <th align="center" valign="middle">Above the Fold</th>
                        <?php } ?>
                        <?php if (array_key_exists('visualComplete', $data) && (float)$data['visualComplete'] > 0.0) { ?>
                        <th align="center" valign="middle">Visually Complete</th>
                        <?php } ?>
                        <?php if (array_key_exists('SpeedIndex', $data) && (int)$data['SpeedIndex'] > 0) { ?>
                        <th align="center" valign="middle"><a href="https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index" target="_blank">Speed Index</a></th>
                        <?php } ?>
                        <?php if (array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0 ) { ?>
                        <th align="center" valign="middle">DOM Element</th>
                        <?php } ?>
                        <?php if (array_key_exists('domElements', $data) && $data['domElements'] > 0 ) { ?>
                        <th align="center" valign="middle">DOM Elements</th>
                        <?php } ?>
                        <th align="center" valign="middle">Result (error code)</th>

                        <th align="center" class="border" valign="middle">Time</th>
                        <th align="center" valign="middle">Requests</th>
                        <th align="center" valign="middle">Bytes In</th>

                        <th align="center" class="border" valign="middle">Time</th>
                        <th align="center" valign="middle">Requests</th>
                        <th align="center" valign="middle">Bytes In</th>
                    </tr>
                    <tr>
                        <?php
                        echo "<td id=\"LoadTime\" valign=\"middle\">" . formatMsInterval($data['loadTime'], 3) . "</td>\n";
                        echo "<td id=\"TTFB\" valign=\"middle\">" . formatMsInterval($data['TTFB'], 3) . "</td>\n";
                        //echo "<td id=\"startRender\" valign=\"middle\">" . number_format($data['render'] / 1000.0, 3) . "s</td>\n";
                        echo "<td id=\"startRender\" valign=\"middle\">" . formatMsInterval($data['render'], 3) . "</td>\n";
                        if (array_key_exists('userTime', $data) && (float)$data['userTime'] > 0.0 )
                            echo "<td id=\"userTime\" valign=\"middle\">" . formatMsInterval($data['userTime'], 3) . "</td>\n";
                        if (array_key_exists('aft', $test['test']) && $test['test']['aft'] ) {
                            $aft = number_format($data['aft'] / 1000.0, 1) . 's';
                            if( !$data['aft'] )
                                $aft = 'N/A';
                            echo "<td id=\"aft\" valign=\"middle\">$aft</th>";
                        }
                        if( array_key_exists('visualComplete', $data) && (float)$data['visualComplete'] > 0.0 )
                            echo "<td id=\"visualComplate\" valign=\"middle\">" . formatMsInterval($data['visualComplete'], 3) . "</td>\n";
                        if( array_key_exists('SpeedIndex', $data) && (int)$data['SpeedIndex'] > 0 ) {
                            if (array_key_exists('SpeedIndexCustom', $data))
                                echo "<td id=\"speedIndex\" valign=\"middle\">{$data['SpeedIndexCustom']}</td>\n";
                            else
                                echo "<td id=\"speedIndex\" valign=\"middle\">{$data['SpeedIndex']}</td>\n";
                        }
                        if (array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0 )
                            echo "<td id=\"domTime\" valign=\"middle\">" . formatMsInterval($data['domTime'], 3) . "</td>\n";
                        if (array_key_exists('domElements', $data) && $data['domElements'] > 0 )
                            echo "<td id=\"domElements\" valign=\"middle\">{$data['domElements']}</td>\n";
                        echo "<td id=\"result\" valign=\"middle\">{$data['result']}</td>\n";

                        echo "<td id=\"docComplete\" class=\"border\" valign=\"middle\">" . formatMsInterval($data['docTime'], 3) . "</td>\n";
                        echo "<td id=\"requestsDoc\" valign=\"middle\">{$data['requestsDoc']}</td>\n";
                        echo "<td id=\"bytesInDoc\" valign=\"middle\">" . number_format($data['bytesInDoc'] / 1024, 0) . " KB</td>\n";

                        echo "<td id=\"fullyLoaded\" class=\"border\" valign=\"middle\">" . formatMsInterval($data['fullyLoaded'], 3) . "</td>\n";
                        echo "<td id=\"requests\" valign=\"middle\">{$data['requests']}</td>\n";
                        echo "<td id=\"bytesIn\" valign=\"middle\">" . number_format($data['bytesIn'] / 1024, 0) . " KB</td>\n";
                        ?>
                    </tr>
                </table><br>
                <?php
                if( is_dir('./google') && isset($test['testinfo']['extract_csi']) )
                {
                    require_once('google/google_lib.inc');
                    $params = ParseCsiInfo($id, $testPath, $run, $_GET["cached"], true);
                ?>
                    <h2>Csi Metrics</h2>
                            <table id="tableCustomMetrics" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
                               <tr>
                            <?php
                                    foreach ( $test['testinfo']['extract_csi'] as $csi_param )
                                        echo '<th align="center" class="border" valign="middle">' . $csi_param . '</th>';
                                    echo '</tr><tr>';
                                    foreach ( $test['testinfo']['extract_csi'] as $csi_param )
                                    {
                                        if( array_key_exists($csi_param, $params) )
                                        {
                                            echo '<td class="even" valign="middle">' . $params[$csi_param] . '</td>';
                                        }
                                        else
                                        {
                                            echo '<td class="even" valign="middle"></td>';
                                        }
                                    }
                                    echo '</tr>';
                            ?>
                    </table><br>
                <?php
                }
                $userTimings = array();
                foreach($data as $metric => $value)
                  if (substr($metric, 0, 9) == 'userTime.')
                    $userTimings[substr($metric, 9)] = number_format($value / 1000, 3) . 's';
                if (isset($data['custom']) && count($data['custom'])) {
                  foreach($data['custom'] as $metric) {
                    if (isset($data[$metric])) {
                      $value = $data[$metric];
                      if (is_double($value))
                        $value = number_format($value, 3, '.', '');
                      $userTimings[$metric] = $value;
                    }
                  }
                }
                $timingCount = count($userTimings);
                $navTiming = false;
                if ((array_key_exists('loadEventStart', $data) && $data['loadEventStart'] > 0) ||
                    (array_key_exists('domContentLoadedEventStart', $data) && $data['domContentLoadedEventStart'] > 0))
                    $navTiming = true;
                if ($timingCount || $navTiming)
                {
                    $borderClass = '';
                    if ($timingCount)
                      $borderClass = ' class="border"';
                    echo '<table id="tableW3CTiming" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">';
                    echo '<tr>';
                    if ($timingCount)
                      foreach($userTimings as $label => $value)
                        echo '<th>' . htmlspecialchars($label) . '</th>';
                    if ($navTiming) {
                      echo "<th$borderClass>";
                      if ($data['firstPaint'] > 0)
                        echo "RUM First Paint</th><th>";
                      if (isset($data['domInteractive']) && $data['domInteractive'] > 0)
                        echo "<a href=\"http://dvcs.w3.org/hg/webperf/raw-file/tip/specs/NavigationTiming/Overview.html#process\">domInteractive</a></th><th>";
                      echo "<a href=\"http://dvcs.w3.org/hg/webperf/raw-file/tip/specs/NavigationTiming/Overview.html#process\">domContentLoaded</a></th><th><a href=\"http://dvcs.w3.org/hg/webperf/raw-file/tip/specs/NavigationTiming/Overview.html#process\">loadEvent</a></th>";
                    }
                    echo '</tr><tr>';
                    if ($timingCount)
                      foreach($userTimings as $label => $value)
                        echo '<td>' . htmlspecialchars($value) . '</td>';
                    if ($navTiming) {
                      echo "<td$borderClass>";
                      if ($data['firstPaint'] > 0)
                        echo number_format($data['firstPaint'] / 1000.0, 3) . 's</td><td>';
                      if (isset($data['domInteractive']) && $data['domInteractive'] > 0)
                        echo number_format($data['domInteractive'] / 1000.0, 3) . 's</td><td>';
                      echo number_format($data['domContentLoadedEventStart'] / 1000.0, 3) . 's - ' .
                              number_format($data['domContentLoadedEventEnd'] / 1000.0, 3) . 's (' .
                              number_format(($data['domContentLoadedEventEnd'] - $data['domContentLoadedEventStart']) / 1000.0, 3) . 's)' . '</td>';
                      echo '<td>' . number_format($data['loadEventStart'] / 1000.0, 3) . 's - ' .
                              number_format($data['loadEventEnd'] / 1000.0, 3) . 's (' .
                              number_format(($data['loadEventEnd'] - $data['loadEventStart']) / 1000.0, 3) . 's)' . '</td>';
                    }
                    echo '</tr>';
                    echo '</table><br>';
                }
                $secure = false;
                $haveLocations = false;
                $requests = getRequests($id, $testPath, $run, @$_GET['cached'], $secure, $haveLocations, true, true);
                ?>
                <script type="text/javascript">
                  markUserTime('aft.Detail Table');
                </script>

                <div style="text-align:center;">
                <h3 name="waterfall_view">Waterfall View</h3>
                <table border="1" bordercolor="silver" cellpadding="2px" cellspacing="0" style="width:auto; font-size:11px; margin-left:auto; margin-right:auto;">
                    <tr>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#1f7c83"></div></td><td>DNS Lookup</td></tr></table></td>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#e58226"></div></td><td>Initial Connection</td></tr></table></td>
                        <?php if($secure) { ?>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#c141cd"></div></td><td>SSL Negotiation</td></tr></table></td>
                        <?php } ?>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#1fe11f"></div></td><td>Time to First Byte</td></tr></table></td>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#1977dd"></div></td><td>Content Download</td></tr></table></td>
                        <td style="vertical-align:middle; padding: 4px;"><div style="background-color:#ffff60">&nbsp;3xx response&nbsp;</div></td>
                        <td style="vertical-align:middle; padding: 4px;"><div style="background-color:#ff6060">&nbsp;4xx+ response&nbsp;</div></td>
                    </tr>
                </table>
                <table border="1" bordercolor="silver" cellpadding="2px" cellspacing="0" style="width:auto; font-size:11px; margin-left:auto; margin-right:auto; margin-top:11px;">
                    <tr>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#28BC00"></div></td><td>Start Render</td></tr></table></td>
                        <?php 
                        if (array_key_exists('aft', $data) && $data['aft'] )
                          echo '<td><table><tr><td><div class="bar" style="width:2px; background-color:#FF0000"></div></td><td>Above the Fold</td></tr></table></td>';
                        if (array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0 )
                          echo '<td><table><tr><td><div class="bar" style="width:2px; background-color:#F28300"></div></td><td>DOM Element</td></tr></table></td>';
                        if(array_key_exists('firstPaint', $data) && (float)$data['firstPaint'] > 0.0 )
                          echo '<td><table><tr><td><div class="bar" style="width:2px; background-color:#8FBC83"></div></td><td>msFirstPaint</td></tr></table></td>';
                        if(array_key_exists('domInteractive', $data) && (float)$data['domInteractive'] > 0.0 )
                          echo '<td><table><tr><td><div class="bar" style="width:2px; background-color:#FFC61A"></div></td><td>DOM Interactive</td></tr></table></td>';
                        if(array_key_exists('domContentLoadedEventStart', $data) && (float)$data['domContentLoadedEventStart'] > 0.0 )
                          echo '<td><table><tr><td><div class="bar" style="width:15px; background-color:#D888DF"></div></td><td>DOM Content Loaded</td></tr></table></td>';
                        if(array_key_exists('loadEventStart', $data) && (float)$data['loadEventStart'] > 0.0 )
                          echo '<td><table><tr><td><div class="bar" style="width:15px; background-color:#C0C0FF"></div></td><td>On Load</td></tr></table></td>';
                        echo '<td><table><tr><td><div class="bar" style="width:2px; background-color:#0000FF"></div></td><td>Document Complete</td></tr></table></td>';
                        if(array_key_exists('userTime', $data) || (array_key_exists('enable_google_csi', $settings) && $settings['enable_google_csi']))
                          echo '<td><table><tr><td><div class="arrow-down"></div></td><td>User Timings</td></tr></table></td>';
                        ?>
                    </tr>
                </table>
                <br>
                <?php
                    InsertWaterfall($url, $requests, $id, $run, $cached, $data);
                    echo "<br><a href=\"/customWaterfall.php?width=930&test=$id&run=$run&cached=$cached\">customize waterfall</a> &#8226; ";
                    echo "<a id=\"view-images\" href=\"/pageimages.php?test=$id&run=$run&cached=$cached\">View all Images</a>";
                ?>
                <br>
                <br>
                <h3 name="connection_view">Connection View</h3>
                <map name="connection_map">
                <?php
                    $connection_rows = GetConnectionRows($requests);
                    $options = array(
                        'id' => $id,
                        'path' => $testPath,
                        'run_id' => $run,
                        'is_cached' => (bool)@$_GET['cached'],
                        'use_cpu' => true,
                        'show_labels' => true,
                        'width' => 930
                        );
                    $map = GetWaterfallMap($connection_rows, $url, $options, $data);
                    foreach($map as $entry) {
                        if (array_key_exists('request', $entry)) {
                            $index = $entry['request'] + 1;
                            $title = "$index: " . htmlspecialchars($entry['url']);
                            echo "<area href=\"#request$index\" alt=\"$title\" title=\"$title\" shape=RECT coords=\"{$entry['left']},{$entry['top']},{$entry['right']},{$entry['bottom']}\">\n";
                        } elseif(array_key_exists('url', $entry)) {
                            echo "<area href=\"#request\" alt=\"{$entry['url']}\" title=\"{$entry['url']}\" shape=RECT coords=\"{$entry['left']},{$entry['top']},{$entry['right']},{$entry['bottom']}\">\n";
                        }
                    }
                ?>
                </map>
                <table border="1" bordercolor="silver" cellpadding="2px" cellspacing="0" style="width:auto; font-size:11px; margin-left:auto; margin-right:auto;">
                    <tr>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#007B84"></div></td><td>DNS Lookup</td></tr></table></td>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#FF7B00"></div></td><td>Initial Connection</td></tr></table></td>
                        <?php if($secure) { ?>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#CF25DF"></div></td><td>SSL Negotiation</td></tr></table></td>
                        <?php } ?>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#28BC00"></div></td><td>Start Render</td></tr></table></td>
                        <?php if(array_key_exists('domTime', $data) && (float)$data['domTime'] > 0.0 ) { ?>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#F28300"></div></td><td>DOM Element</td></tr></table></td>
                        <?php } ?>
                        <?php if(array_key_exists('domContentLoadedEventStart', $data) && (float)$data['domContentLoadedEventStart'] > 0.0 ) { ?>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#D888DF"></div></td><td>DOM Content Loaded</td></tr></table></td>
                        <?php } ?>
                        <?php if(array_key_exists('loadEventStart', $data) && (float)$data['loadEventStart'] > 0.0 ) { ?>
                        <td><table><tr><td><div class="bar" style="width:15px; background-color:#C0C0FF"></div></td><td>On Load</td></tr></table></td>
                        <?php } ?>
                        <td><table><tr><td><div class="bar" style="width:2px; background-color:#0000FF"></div></td><td>Document Complete</td></tr></table></td>
                    </tr>
                </table>
                <br>
                <img class="progress" alt="Connection View waterfall diagram" usemap="#connection_map" id="connectionView" src="<?php
                    $extenstion = 'php';
                    if( FRIENDLY_URLS )
                        $extenstion = 'png';
                    echo "/waterfall.$extenstion?type=connection&width=930&test=$id&run=$run&cached=$cached&mime=1";?>">
                </div>
                <br><br>
                <?php include('./ads/details_middle.inc'); ?>

                <br>
                <?php include 'waterfall_detail.inc'; ?>
            </div>

            <?php include('footer.inc'); ?>
        </div>

        <script type="text/javascript">
        function expandRequest(targetNode) {
          if (targetNode.length) {
            var div_to_expand = $('#' + targetNode.attr('data-target-id'));

            if (div_to_expand.is(":visible")) {
                div_to_expand.hide();
                targetNode.html('+' + targetNode.html().substring(1));
            } else {
                div_to_expand.show();
                targetNode.html('-' + targetNode.html().substring(1));
            }
          }
        }

        $(document).ready(function() { $("#tableDetails").tablesorter({
            headers: { 3: { sorter:'currency' } ,
                       4: { sorter:'currency' } ,
                       5: { sorter:'currency' } ,
                       6: { sorter:'currency' } ,
                       7: { sorter:'currency' } ,
                       8: { sorter:'currency' } ,
                       9: { sorter:'currency' }
                     }
        }); } );

        $('.a_request').click(function () {
            expandRequest($(this));
        });

        function expandAll() {
          $(".header_details").each(function(index) {
            $(this).show();
          });
        }
        
        if (window.location.hash == '#all') {
          expandAll();
        } else
          expandRequest($(window.location.hash));

        <?php
        include "waterfall.js";
        ?>
        </script>
    </body>
</html>
