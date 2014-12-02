<?php
require_once('optimization_detail.inc.php');
require_once('breakdown.inc');
require_once('testStatus.inc');
require_once('common.inc');

$breakdown = array();
$video = false;
if( (array_key_exists('Capture Video', $test['test']) && $test['test']['Capture Video']) ||
    (array_key_exists('Video', $test['test']) && $test['test']['Video']) ||
    (array_key_exists('video', $test['test']) && $test['test']['video']))
    $video = true;
$testComplete = true;
$status = GetTestStatus($id, false);
if( $status['statusCode'] < 200 ) 
    $testComplete = false;
$headless = false;
if (array_key_exists('headless', $settings) && $settings['headless']) {
    $headless = true;
}

$page_keywords = array('Results','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Website performance test result$testLabel.";
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest Test Result<?php echo $testLabel; ?></title>
        <script language="JavaScript">
            <?php
                $wpt_host = trim($_SERVER['HTTP_HOST']);
                echo "var wpt_host='$wpt_host';\n";
            ?>
            if( window.location.host.length && wpt_host.length && window.location.host != wpt_host )
                window.location = document.location.protocol + '//' + wpt_host + window.location.pathname;
        </script>
        <?php if( !$testComplete ) { 
                $autoRefresh = true;
        ?>
        <noscript>
        <meta http-equiv="refresh" content="30" />
        </noscript>
        <?php } ?>
        <?php $gaTemplate = 'Test Result'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Summary';
            include 'header.inc';
            ?>
            <div id="result">
            <?php 
            if( !$testComplete ) 
            {
                ?>
                <p class="left">
                <br>
                <?php 
                    if ($settings['nolinks']) {
                        echo "Url: $url<br>\n";
                    } else {
                        echo "Url: <a rel=\"nofollow\" href=\"$url\">$url</a><br>\n";
                    }
                    echo "From: {$test['test']['location']}<br>\n";
                    echo GetTestInfoHtml();
                ?>
                </p>
                <?php 
                $expected = $test['test']['runs'];
                $available = count($pageData);
                echo "<h3>Test is partially complete ($available of $expected tests).<br>This page will refresh as tests complete.</h3>";
                echo "<script>\n";
                echo "var availableTests=$available;\n";
                echo "</script>\n";
            }
            else 
            { 
            ?>
            <div id="download">
                <div id="testinfo">
                    <?php
                    $show_sensitive = false;
                    echo GetTestInfoHtml();
                    if( !$headless && gz_is_file("$testPath/testinfo.json") 
                        && !array_key_exists('published', $test['testinfo'])
                        && ($isOwner || !$test['testinfo']['sensitive']) )
                    {
                        // load the secret key (if there is one)
                        $secret = '';
                        $keys = parse_ini_file('./settings/keys.ini', true);
                        if( $keys && isset($keys['server']) && isset($keys['server']['secret']) )
                          $secret = trim($keys['server']['secret']);

                        echo '<form name="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data">';
                        echo "\n<input type=\"hidden\" name=\"resubmit\" value=\"$id\">\n";
                        echo "<input type=\"hidden\" name=\"vo\" value=\"$owner\">\n";
                        if( strlen($secret) ){
                          $hashStr = $secret;
                          $hashStr .= $_SERVER['HTTP_USER_AGENT'];
                          $hashStr .= $owner;
                          
                          $now = gmdate('c');
                          echo "<input type=\"hidden\" name=\"vd\" value=\"$now\">\n";
                          $hashStr .= $now;
                          
                          $hmac = sha1($hashStr);
                          echo "<input type=\"hidden\" name=\"vh\" value=\"$hmac\">\n";
                        }
                        echo '<input type="submit" value="Re-run the test">';
                        echo "\n</form>\n";
                    }
                    ?>
                </div>
                <?php
                    // create a friendlier (unique) name for the fi
                    $fileUrl = GetFileUrl($url);
                    if( FRIENDLY_URLS )
                    {
                        echo "<a href=\"/result/$id/{$id}_{$fileUrl}_page_data.csv\">Raw page data</a> - ";
                        echo "<a href=\"/result/$id/{$id}_{$fileUrl}_requests.csv\">Raw object data</a>";
                    }
                    else
                    {
                        echo "<a href=\"/csv.php?test=$id\">Raw page data</a> - ";
                        echo "<a href=\"/csv.php?test=$id&requests=1\">Raw object data</a>";
                    }
                    echo '<br><a href="/export.php?bodies=1&pretty=1&test=' . $id . '">Export HTTP Archive (.har)</a>';
                    if( array_key_exists('showslow', $test['testinfo']) && $test['testinfo']['showslow'] && strlen($settings['showslow']) )
                        echo '<br><a href="'.$settings['showslow'].'/details/?url='.urlencode(FixUrlSlash($url)).'#webpagetest' . '">See in ShowSlow</a>';
		                if( is_dir('./google') && array_key_exists('enable_google_csi', $settings) && $settings['enable_google_csi'] )
			                echo '<br><a href="/google/view_csi.php?test=' . $id . '">View CSI data</a>';
                    if (is_file("$testPath/test.log"))
                        echo "<br><a href=\"/viewlog.php?test=$id\">View Test Log</a>";
                    if( array_key_exists('publishTo', $settings) && $settings['publishTo'] )
                        echo "<br><a href=\"/publish.php?test=$id\">Publish to {$settings['publishTo']}</a>";
                ?>
            </div>
            <div class="cleared"></div>
            <div id="average">
                <?php 
                $fvMedian = GetMedianRun($pageData, 0, $median_metric);
                $rvMedian = GetMedianRun($pageData, 1, $median_metric);
                $is_test_error = false;
                if (array_key_exists('testinfo', $test) && 
                    array_key_exists('test_error', $test['testinfo']) &&
                    strlen($test['testinfo']['test_error'])) {
                    $is_test_error = true;
                }
                if( $fvMedian && !$is_test_error )
                {
                    if( count($pageData) > 1) 
                        echo '<h2>Performance Results (Median Run)</h2>';
                ?>
                    <table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
                    <tr>
                        <?php
                        $cols = 3;
                        if (array_key_exists('userTime', $pageData[$fvMedian][0]) && (float)$pageData[$fvMedian][0]['userTime'] > 0.0)
                            $cols++;
                        if (array_key_exists('domTime', $pageData[$fvMedian][0]) && (float)$pageData[$fvMedian][0]['domTime'] > 0.0)
                            $cols++;
                        if (array_key_exists('domElements', $pageData[$fvMedian][0]) && $pageData[$fvMedian][0]['domElements'] > 0)
                            $cols++;
                        if((array_key_exists('SpeedIndex', $pageData[$fvMedian][0]) && (int)$pageData[$fvMedian][0]['SpeedIndex'] > 0) ||
                           (array_key_exists('SpeedIndexDT', $pageData[$fvMedian][0]) && (int)$pageData[$fvMedian][0]['SpeedIndexDT'] > 0))
                            $cols++;
                        ?>
                        <th align="center" class="empty" valign="middle" style="border:1px white solid;"></th>
                        <?php
                        echo "<th align=\"center\" class=\"empty\" valign=\"middle\" colspan=\"$cols\"></th>\n";
                        ?>
                        <th align="center" class="border" valign="middle" colspan="3">Document Complete</th>
                        <th align="center" class="border" valign="middle" colspan="3">Fully Loaded</th>
                    </tr>
                    <tr>
                        <th align="center" class="empty" valign="middle"></th>
                        <th align="center" valign="middle">Load Time</th>
                        <th align="center" valign="middle">First Byte</th>
                        <th align="center" valign="middle">Start Render</th>
                        <?php if(array_key_exists('userTime', $pageData[$fvMedian][0]) && (float)$pageData[$fvMedian][0]['userTime'] > 0.0) { ?>
                        <th align="center" valign="middle">User Time</th>
                        <?php } ?>
                        <?php if((array_key_exists('SpeedIndex', $pageData[$fvMedian][0]) && (int)$pageData[$fvMedian][0]['SpeedIndex'] > 0) || 
                                 (array_key_exists('SpeedIndexDT', $pageData[$fvMedian][0]) && (int)$pageData[$fvMedian][0]['SpeedIndexDT'] > 0)){ ?>
                        <th align="center" valign="middle"><a href="https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index" target="_blank">Speed Index</a></th>
                        <?php } ?>
                        <?php if(array_key_exists('domTime', $pageData[$fvMedian][0]) && (float)$pageData[$fvMedian][0]['domTime'] > 0.0) { ?>
                        <th align="center" valign="middle">DOM Element</th>
                        <?php } ?>
                        <?php if(array_key_exists('domElements', $pageData[$fvMedian][0]) && $pageData[$fvMedian][0]['domElements'] > 0) { ?>
                        <th align="center" valign="middle">DOM Elements</th>
                        <?php } ?>

                        <th align="center" class="border" valign="middle">Time</th>
                        <th align="center" valign="middle">Requests</th>
                        <th align="center" valign="middle">Bytes In</th>

                        <th align="center" class="border" valign="middle">Time</th>
                        <th align="center" valign="middle">Requests</th>
                        <th align="center" valign="middle">Bytes In</th>
                    </tr>
                    <tr>
                        <td align="left" valign="middle">First View
                        <?php
                        if( count($pageData) > 1) 
                            echo " (<a href=\"#run$fvMedian\">Run $fvMedian</a>)";
                        echo "</td><td id=\"fvLoadTime\" valign=\"middle\">" . formatMsInterval($pageData[$fvMedian][0]['loadTime'], 3) . "</td>\n";
                        echo "<td id=\"fvTTFB\" valign=\"middle\">" . formatMsInterval($pageData[$fvMedian][0]['TTFB'], 3) . "</td>\n";
                        echo "<td id=\"fvStartRender\" valign=\"middle\">" . formatMsInterval($pageData[$fvMedian][0]['render'], 3) . "</td>\n";
                        if(array_key_exists('userTime', $pageData[$fvMedian][0]) && (float)$pageData[$fvMedian][0]['userTime'] > 0.0)
                            echo "<td id=\"fvUserTime\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['userTime'] / 1000.0, 3) . "s</td>\n";
                        if(array_key_exists('SpeedIndex', $pageData[$fvMedian][0]) && (int)$pageData[$fvMedian][0]['SpeedIndex'] > 0) {
                            if(array_key_exists('SpeedIndexCustom', $pageData[$fvMedian][0]))
                                echo "<td id=\"fvVisual\" valign=\"middle\">{$pageData[$fvMedian][0]['SpeedIndexCustom']}</td>\n";
                            else
                                echo "<td id=\"fvVisual\" valign=\"middle\">{$pageData[$fvMedian][0]['SpeedIndex']}</td>\n";
                        } elseif(array_key_exists('SpeedIndexDT', $pageData[$fvMedian][0]) && (int)$pageData[$fvMedian][0]['SpeedIndexDT'] > 0) {
                            echo "<td id=\"fvVisual\" valign=\"middle\">{$pageData[$fvMedian][0]['SpeedIndexDT']}</td>\n";
                        }
                        if(array_key_exists('domTime', $pageData[$fvMedian][0]) && (float)$pageData[$fvMedian][0]['domTime'] > 0.0)
                            echo "<td id=\"fvDomElement\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['domTime'] / 1000.0, 3) . "s</td>\n";
                        if(array_key_exists('domElements', $pageData[$fvMedian][0]) && $pageData[$fvMedian][0]['domElements'] > 0)
                            echo "<td id=\"fvDomElements\" valign=\"middle\">{$pageData[$fvMedian][0]['domElements']}</td>\n";

                        echo "<td id=\"fvDocComplete\" class=\"border\" valign=\"middle\">" . formatMsInterval($pageData[$fvMedian][0]['docTime'], 3) . "</td>\n";
                        echo "<td id=\"fvRequestsDoc\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['requestsDoc'],0) . "</td>\n";
                        echo "<td id=\"fvBytesDoc\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['bytesInDoc'] / 1024, 0) . " KB</td>\n";

                        echo "<td id=\"fvFullyLoaded\" class=\"border\" valign=\"middle\">" . formatMsInterval($pageData[$fvMedian][0]['fullyLoaded'], 3) . "</td>\n";
                        echo "<td id=\"fvRequests\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['requests'],0) . "</td>\n";
                        echo "<td id=\"fvBytes\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['bytesIn'] / 1024, 0) . " KB</td>\n";
                        ?>
                    </tr>
                    <?php if( $rvMedian ) { ?>
                    <tr>
                        <td align="left" class="even" valign="middle">Repeat View
                        <?php
                        if( count($pageData) > 1) 
                            echo " (<a href=\"#run$rvMedian\">Run $rvMedian</a>)";
                        echo "</td><td id=\"rvLoadTime\" class=\"even\" valign=\"middle\">" . formatMsInterval($pageData[$rvMedian][1]['loadTime'], 3) . "</td>\n";
                        echo "<td id=\"rvTTFB\" class=\"even\" valign=\"middle\">" . formatMsInterval($pageData[$rvMedian][1]['TTFB'], 3) . "</td>\n";
                        echo "<td id=\"rvStartRender\" class=\"even\" valign=\"middle\">" . formatMsInterval($pageData[$rvMedian][1]['render'], 3) . "</td>\n";
                        if(array_key_exists('userTime', $pageData[$fvMedian][0]) && (float)$pageData[$fvMedian][0]['userTime'] > 0.0)
                            echo "<td id=\"rvUserTime\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['userTime'] / 1000.0, 3) . "s</td>\n";
                        if(array_key_exists('SpeedIndex', $pageData[$fvMedian][0]) && (int)$pageData[$fvMedian][0]['SpeedIndex'] > 0) {
                            $disp = '-';
                            if(array_key_exists('SpeedIndex', $pageData[$rvMedian][1]) && (int)$pageData[$rvMedian][1]['SpeedIndex'] > 0)
                                $disp = $pageData[$rvMedian][1]['SpeedIndex'];
                            echo "<td id=\"rvVisual\" class=\"even\" valign=\"middle\">$disp</td>\n";
                        } elseif (array_key_exists('SpeedIndexDT', $pageData[$fvMedian][0]) && (int)$pageData[$fvMedian][0]['SpeedIndexDT'] > 0) {
                            $disp = '-';
                            if(array_key_exists('SpeedIndexDT', $pageData[$rvMedian][1]) && (int)$pageData[$rvMedian][1]['SpeedIndexDT'] > 0)
                                $disp = $pageData[$rvMedian][1]['SpeedIndexDT'];
                            echo "<td id=\"rvVisual\" class=\"even\" valign=\"middle\">$disp</td>\n";
                        }
                        if(array_key_exists('domTime', $pageData[$fvMedian][0]) && (float)$pageData[$fvMedian][0]['domTime'] > 0.0)
                            echo "<td id=\"rvDomElement\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['domTime'] / 1000.0, 3) . "s</td>\n";
                        if(array_key_exists('domElements', $pageData[$fvMedian][0]) && $pageData[$fvMedian][0]['domElements'] > 0)
                            echo "<td id=\"rvDomElements\" class=\"even\" valign=\"middle\">{$pageData[$rvMedian][1]['domElements']}</td>\n";

                        echo "<td id=\"rvDocComplete\" class=\"even border\" valign=\"middle\">" . formatMsInterval($pageData[$rvMedian][1]['docTime'], 3) . "</td>\n";
                        echo "<td id=\"rvRequestsDoc\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['requestsDoc'],0) . "</td>\n";
                        echo "<td id=\"rvBytesDoc\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['bytesInDoc'] / 1024, 0) . " KB</td>\n";

                        echo "<td id=\"rvFullyLoaded\" class=\"even border\" valign=\"middle\">" . formatMsInterval($pageData[$rvMedian][1]['fullyLoaded'], 3) . "</td>\n";
                        echo "<td id=\"rvRequests\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['requests'],0) . "</td>\n";
                        echo "<td id=\"rvBytes\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['bytesIn'] / 1024, 0) . " KB</td>\n";
                        ?>
                    </tr>
                    <?php } ?>
                    </table>
                    <?php
                    if (count($pageData) > 1) {
                        echo "<a href=\"/graph_page_data.php?tests=$id&medianMetric=$median_metric\">Plot Full Results</a>";
                    }
                    ?>
                    <br>
                <?php
                    if( is_dir('./google') && isset($test['testinfo']['extract_csi']) && $fvMedian && count($pageData) > 1 )
		            {
			        require_once('google/google_lib.inc');
			        // Draw the table and print the first-view details.
		    	        $fv_params = ParseCsiInfo($id, $testPath, $fvMedian, false, true);
		        ?>
		    <h2>Csi Metrics (Median Run)</h2>
                    <table id="tableCustomMetrics" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
                    <tr>
			<th align="center" class="empty" valign="middle" style="border:1px white solid;"></th>
		<?php
		    	foreach ( $test['testinfo']['extract_csi'] as $csi_param )
                       	    echo '<th align="center" class="border" valign="middle" colspan="1">' . $csi_param . '</th>';
		        echo '</tr><tr>';
		        echo '<td align="left" class="even" valign="middle">First View';
                        echo ' (<a href="#run' . $fvMedian . '">Run ' . $fvMedian . '</a>)';
			foreach ( $test['testinfo']['extract_csi'] as $csi_param )
			{
			    if( array_key_exists($csi_param, $fv_params) )
			    {
                                echo '<td class="even" valign="middle">' . $fv_params[$csi_param] . '</td>';
			    }
			    else
			    {
				echo '<td class="even" valign="middle"></td>';
			    }
			}
			// Print the repeat view row.
			if( $rvMedian )
			{
			    echo '</tr><tr>';
			    $rv_params = ParseCsiInfo($id, $testPath, $rvMedian, true, true);
                            echo '<td align="left" class="even" valign="middle">Repeat View';
                            echo ' (<a href="#run' . $rvMedian . '">Run ' . $rvMedian . '</a>)';
                            foreach ( $test['testinfo']['extract_csi'] as $csi_param )
                            {
                                if( array_key_exists($csi_param, $rv_params) )
                                {
                                    echo '<td class="even" valign="middle">' . $rv_params[$csi_param] . '</td>';
                                }
                                else
                                {
                                    echo '<td class="even" valign="middle"></td>';
                                }
                            }
			}
			echo '</tr>';
		?>
		    </table><br>
		<?php
		    }
                }
                else {
                    $error = 'The test completed but there were no successful results.';
                    $detail = null;
                    if ($is_test_error) {
                        $error = 'The test failed to run.';
                        $detail = $test['testinfo']['test_error'];
                    } elseif(array_key_exists('testinfo', $test) &&
                             array_key_exists('errors', $test['testinfo'])) {
                        // just grab the first error we find from an individual run
                        foreach($test['testinfo']['errors'] as &$error_run) {
                            foreach($error_run as &$error_str) {
                                if (strlen($error_str)) {
                                    $error = 'The testing completed but failed.';
                                    $detail = $error_str;
                                    break 2;
                                }
                            }
                        }
                    }
                    echo '<h3>' . htmlspecialchars($error) . '</h3>';
                    if (isset($detail)) {
                        echo '<h4>' . htmlspecialchars($detail) . '</h4>';
                    }
                }
                ?>
            </div>
            <script type="text/javascript">
              markUserTime('aft.Result Data Table');
            </script>
            <?php } ?>
            <div id="tables" style="text-align:left;">
            <?php
            if( count($pageData) > 1) 
                echo '<h3 style="text-align:center;">Test Results</h3>';

            $runs = $test['test']['runs'];
            $fvonly = 1;
            if( isset($rv) )
                $fvonly = 0;
            $first_displayed = false;
            for( $run = 1; $run <= $runs; $run++)
            {
                $error_str = null;
                if (array_key_exists('testinfo', $test) && 
                    array_key_exists('errors', $test['testinfo']) && 
                    array_key_exists($run, $test['testinfo']['errors']) && 
                    array_key_exists(0, $test['testinfo']['errors'][$run]) && 
                    strlen($test['testinfo']['errors'][$run][0])) {
                    $error_str = 'Test Error: ' . $test['testinfo']['errors'][$run][0];
                } elseif (!isset($pageData) || !is_array($pageData) || !array_key_exists($run, $pageData)) {
                    if ($testComplete)
                        $error_str = 'Test Error: Data is missing.';
                    else
                        $error_str = 'Waiting for test result...';
                }
                if( $runs > 1 )
                    echo '<h4><a name="run' . $run. '">Run ' . $run . ':</a></h4>';
                if (isset($error_str)) {
                    echo '<p>' . htmlspecialchars($error_str) . '</p>';
                } else {
            ?>
                <table id="table<?php echo $run;?>" class="pretty result" align="center" border="1" cellpadding="20" cellspacing="0">
                <tr>
                    <th align="center" class="empty" valign="middle"></th>
                    <th align="center" valign="middle">Waterfall</th>
                    <?php
                    $table_columns = 2;
                    if( !isset($test['testinfo']) || !$test['testinfo']['noimages'] ) {
                        echo '<th align="center" valign="middle">Screen Shot</th>';
                        $table_columns++;
                    }
                    if($video) {
                        echo '<th align="center" valign="middle">Video</th>';
                        $table_columns++;
                    }
                echo '</tr><tr>';
                    if (array_key_exists($run, $pageData) && array_key_exists(0, $pageData[$run]) && count($pageData[$run][0])) {
                        $onloadWaterfall = '';
                        $onloadScreenShot = '';
                        if (!$first_displayed) {
                          $onloadWaterfall = " onload=\"markUserTime('aft.First Waterfall')\"";
                          $onloadScreenShot = " onload=\"markUserTime('aft.First Screen Shot')\"";
                        }
                        $first_displayed = true;
                        echo '<td align="left" valign="middle">First View';
                        if( isset($pageData[$run][0]['result']) && $pageData[$run][0]['result'] !== 0 && $pageData[$run][0]['result'] !== 99999 )
                            echo '<br>(Error: ' . LookupError($pageData[$run][0]['result']) . ')';
                        else if( isset($pageData[$run][0]['loadTime']) )
                            echo '<br>(' . number_format($pageData[$run][0]['loadTime'] / 1000.0, 3) . 's)';
                        if( is_file("$testPath/{$run}_dynaTrace.dtas") )
                        {
                            echo "<br><br><div><a href=\"/$testPath/{$run}_dynaTrace.dtas\" title=\"Download dynaTrace Session\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_session_v3.png\" alt=\"Download dynaTrace Session\"></a></div><br>";
                            echo "<a href=\"http://ajax.dynatrace.com/pages/\" target=\"_blank\" title=\"Get dynaTrace AJAX Edition\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_ajax.png\" alt=\"Get dynaTrace Ajax Edition\"></a>";
                        }
                        if( gz_is_file("$testPath/{$run}.cap") )
                        {
                            $tcpdump_url = "/getgzip.php?test=$id&file=$run.cap";
                            if( FRIENDLY_URLS )
                                $tcpdump_url = "/result/$id/{$run}.cap";
                            echo "<br><br><a href=\"$tcpdump_url\" title=\"Download tcpdump session capture\">tcpdump</a>";
                            if (array_key_exists('tcpdump_view', $settings) && strlen($settings['tcpdump_view'])) {
                                $view_url = $settings['tcpdump_view'] . urlencode("http://$wpt_host$tcpdump_url");
                                echo " - (<a href=\"$view_url\" title=\"View tcpdump session capture\">view</a>)";
                            }
                        }
                        if( gz_is_file("$testPath/{$run}_timeline.json") || gz_is_file("$testPath/{$run}_devtools.json") ) {
                            echo "<br><br><a href=\"/getTimeline.php?test=$id&run=$run&cached=0\" title=\"Download Chrome Dev Tools Timeline\">Timeline</a>";
                            echo " (<a href=\"/chrome/timeline.php?test=$id&run=$run\" title=\"View Chrome Dev Tools Timeline\">view</a>)";
                            if (array_key_exists('testinfo', $test) && array_key_exists('timeline', $test['testinfo']) && $test['testinfo']['timeline'])
                              echo "<br><a href=\"/breakdownTimeline.php?test=$id&run=$run&cached=0\" title=\"View browser main thread activity by event type\">Processing Breakdown</a>";
                        }
                        if( gz_is_file("$testPath/{$run}_trace.json")) {
                            echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_trace.json\" title=\"Download Chrome Trace\">Trace</a>";
                            echo " (<a href=\"/chrome/trace.php?test=$id&run=$run&cached=0\" title=\"View Chrome Trace\">view</a>)";
                        }
                        if( gz_is_file("$testPath/{$run}_netlog.txt") ) {
                            echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_netlog.txt\" title=\"Download Network Log\">Net Log</a>";
                        }
                        echo "</td>\n";
                        echo '<td align="center" valign="middle">';
                        $testUrl = "/details.php?test=$id&run=$run";
                        if ($run == $fvMedian && array_key_exists('end', $_REQUEST))
                            $testUrl .= "&end={$_REQUEST['end']}";
                        elseif (FRIENDLY_URLS)
                            $testUrl = "/result/$id/$run/details/";
                        echo "<a href=\"$testUrl\">";
                        echo "<img class=\"progress\"$onloadWaterfall width=250 src=\"/thumbnail.php?test=$id&run=$run&file={$run}_waterfall.png\"></a></td>\n";
                        if (!isset($test['testinfo']) || !$test['testinfo']['noimages']) {
                            if( FRIENDLY_URLS )
                                echo "<td align=\"center\" valign=\"middle\"><a href=\"/result/$id/$run/screen_shot/\"><img class=\"progress\"$onloadScreenShot width=250 src=\"/result/$id/{$run}_screen_thumb.jpg\"></a></td>";
                            else
                                echo "<td align=\"center\" valign=\"middle\"><a href=\"/screen_shot.php?test=$id&run=$run\"><img class=\"progress\"$onloadScreenShot width=250 src=\"/thumbnail.php?test=$id&run=$run&file={$run}_screen.jpg\"></a></td>";
                        }
                        if($video) {
                            echo '<td align="center" valign="middle">';
                            if (is_dir("$testPath/video_$run")) {
                                $end = '';
                                $endId = '';
                                if ($run == $fvMedian && array_key_exists('end', $_REQUEST)) {
                                    $end = "-e:{$_REQUEST['end']}";
                                    $endId = "-e{$_REQUEST['end']}";
                                }
                                echo "<a href=\"/video/compare.php?tests=$id-r:$run-c:0$end\">Filmstrip View</a><br>-<br>";
                                echo "<a href=\"/video/create.php?tests=$id-r:$run-c:0$end&id={$id}.{$run}.0$endId\">Watch Video</a>";
                                //echo "<br>-<br><a href=\"/video/?tid=$id&run=$run&cached=0\">Compare to</a>";
                            } else
                                echo "not available";
                            echo '</td>';
                        }
                    } else {
                        echo "<td colspan=\"$table_columns\" align=\"left\" valign=\"middle\">First View: Test Data Missing</td>";
                    }
                echo '</tr>';
                if (!$test['test']['fvonly'] || isset($pageData[$run][1])) {
                  echo '<tr>';
                  if( isset($pageData[$run][1]) ) { 
                      if (array_key_exists($run, $pageData) && array_key_exists(1, $pageData[$run]) && count($pageData[$run][1])) {
                          echo '<td align="left" class="even" valign="middle">Repeat View';
                          if( isset($pageData[$run][1]['result']) && $pageData[$run][1]['result'] !== 0 && $pageData[$run][1]['result'] !== 99999 )
                              echo '<br>(Error: ' . LookupError($pageData[$run][1]['result']) . ')';
                          else if( isset($pageData[$run][1]['loadTime']) )
                              echo '<br>(' . number_format($pageData[$run][1]['loadTime'] / 1000.0, 3) . 's)';
                          if( is_file("$testPath/{$run}_Cached_dynaTrace.dtas") )
                          {
                              echo "<br><br><div><a href=\"/$testPath/{$run}_Cached_dynaTrace.dtas\" title=\"Download dynaTrace Session\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_session_v3.png\" alt=\"Download dynaTrace Session\"></a></div><br>";
                              echo "<a href=\"http://ajax.dynatrace.com/pages/\" target=\"_blank\" title=\"Get dynaTrace AJAX Edition\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_ajax.png\" alt=\"Get dynaTrace Ajax Edition\"></a>";
                          }
                          if( gz_is_file("$testPath/{$run}_Cached.cap") )
                          {
                              $tcpdump_url = "/getgzip.php?test=$id&file={$run}_Cached.cap";
                              if( FRIENDLY_URLS )
                                  $tcpdump_url = "/result/$id/{$run}_Cached.cap";
                              echo "<br><br><a href=\"$tcpdump_url\" title=\"Download tcpdump session capture\">tcpdump</a>";
                              if (array_key_exists('tcpdump_view', $settings) && strlen($settings['tcpdump_view'])) {
                                  $view_url = $settings['tcpdump_view'] . urlencode("http://$wpt_host$tcpdump_url");
                                  echo " - (<a href=\"$view_url\" title=\"View tcpdump session capture\">view</a>)";
                              }
                          }
                          if( gz_is_file("$testPath/{$run}_Cached_timeline.json") || gz_is_file("$testPath/{$run}_Cached_devtools.json") ) {
                              echo "<br><br><a href=\"/getTimeline.php?test=$id&run={$run}&cached=1\" title=\"Download Chrome Dev Tools Timeline\">Timeline</a>";
                              echo " (<a href=\"/chrome/timeline.php?test=$id&run=$run&cached=1\" title=\"View Chrome Dev Tools Timeline\">view</a>)";
                              if (array_key_exists('testinfo', $test) && array_key_exists('timeline', $test['testinfo']) && $test['testinfo']['timeline'])
                                echo "<br><a href=\"/breakdownTimeline.php?test=$id&run=$run&cached=1\" title=\"View browser main thread activity by event type\">Processing Breakdown</a>";
                          }
                          if( gz_is_file("$testPath/{$run}_Cached_trace.json")) {
                              echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_Cached_trace.json\" title=\"Download Chrome Trace\">Trace</a>";
                              echo " (<a href=\"/chrome/trace.php?test=$id&run=$run&cached=1\" title=\"View Chrome Trace\">view</a>)";
                          }
                          if( gz_is_file("$testPath/{$run}_Cached_netlog.txt") ) {
                              echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_Cached_netlog.txt\" title=\"Download Network Log\">Net Log</a>";
                          }
                          echo '</td>';
                          if( FRIENDLY_URLS )
                              echo "<td align=\"center\" class=\"even\" valign=\"middle\"><a href=\"/result/$id/$run/details/cached/\"><img class=\"progress\" width=250 src=\"/result/$id/{$run}_Cached_waterfall_thumb.png\"></a></td>";
                          else
                              echo "<td align=\"center\" class=\"even\" valign=\"middle\"><a href=\"/details.php?test=$id&run=$run&cached=1\"><img class=\"progress\" width=250 src=\"/thumbnail.php?test=$id&run=$run&cached=1&file={$run}_Cached_waterfall.png\"></a></td>";

                          if (!isset($test['testinfo']) || !$test['testinfo']['noimages']) {
                              if( FRIENDLY_URLS )
                                  echo "<td align=\"center\" class=\"even\" valign=\"middle\"><a href=\"/result/$id/$run/screen_shot/cached/\"><img class=\"progress\" width=250 src=\"/result/$id/{$run}_Cached_screen_thumb.jpg\"></a></td>";
                              else
                                  echo "<td align=\"center\" valign=\"middle\"><a href=\"/screen_shot.php?test=$id&run=$run&cached=1\"><img class=\"progress\" width=250 src=\"/thumbnail.php?test=$id&run=$run&cached=1&file={$run}_Cached_screen.jpg\"></a></td>";
                          }
                          if ($video) {
                              echo '<td align="center" valign="middle">';
                              if (is_dir("$testPath/video_{$run}_cached")) {
                                  echo "<a href=\"/video/compare.php?tests=$id-r:$run-c:1\">Filmstrip View</a><br>-<br>";
                                  echo "<a href=\"/video/create.php?tests=$id-r:$run-c:1&id={$id}.{$run}.1\">Watch Video</a>";
                              } else
                                  echo "not available";
                              echo '</td>';
                          } 
                      }
                  } else if (array_key_exists('testinfo', $test) && 
                      array_key_exists('errors', $test['testinfo']) && 
                      array_key_exists($run, $test['testinfo']['errors']) && 
                      array_key_exists(0, $test['testinfo']['errors'][$run]) && 
                      strlen($test['testinfo']['errors'][$run][1])) {
                      $error_str = htmlspecialchars('Test Error: ' . $test['testinfo']['errors'][$run][1]);
                      echo "<td colspan=\"$table_columns\" align=\"left\" valign=\"middle\">Repeat View: $error_str</td>";
                  } else {
                      echo "<td colspan=\"$table_columns\" align=\"left\" valign=\"middle\">Repeat View: Test Data Missing</td>";
                  }
                  echo '</tr>';
                }
                if( $testComplete && $run == $fvMedian ) { 
                    $b = getBreakdown($id, $testPath, $run, 0, $requests);
                    if (is_array($b)) {
                        $breakdown[] = array('run' => $run, 'data' => $b);
                    }
                ?>
                <tr>
                    <td align="left" valign="middle">
                        <?php if( FRIENDLY_URLS )
                        {
                            echo "<a href=\"/result/$id/$run/breakdown/\">Content Breakdown</a>";
                        }
                        else
                        {
                            echo "<a href=\"/breakdown.php?id=$id&run=$run&cached=0\">Content Breakdown</a>";
                        }
                        ?>
                    </td>
                        <?php
                        $span = 2;
                        if($pageData[$run][0]['optimization_checked'])
                            $span++;
                        if( !isset($test['testinfo']) || !$test['testinfo']['noimages'] )
                            $span++;
                        if( $video )
                            $span++;
                        echo "<td align=\"left\" valign=\"middle\" colspan=\"$span\">";
                        $extension = 'php';
                        if( FRIENDLY_URLS )
                            $extension = 'png';
                        echo "<table><tr><td style=\"border:none;\"><div id=\"requests_$run\"></div></td>";
                        echo "<td style=\"border:none;\"><div id=\"bytes_$run\"></div></td></tr></table>";
                        ?>
                    </td>
                </tr>
                <?php } ?>
                
                </table><br>
            <?php
                }   // $error_str
            }
            ?>
            </div>
            </div>

		    <br>
            <?php include('./ads/results_bottom.inc'); ?>
		    <br>
            
            <?php include('footer.inc'); ?>
        </div>
        <script type="text/javascript" src="//www.google.com/jsapi"></script>
        <script type="text/javascript">
          <?php
          echo 'var wptBreakdown=' . json_encode($breakdown) . ";\n";
          ?>

          google.load("visualization", "1", {packages:["corechart"]});
          google.setOnLoadCallback(drawCharts);
            function RGBtoHex(R,G,B) {return toHex(R)+toHex(G)+toHex(B)}
            function toHex(N) {
                if (N==null) return "00";
                N=parseInt(N); if (N==0 || isNaN(N)) return "00";
                N=Math.max(0,N); N=Math.min(N,255); N=Math.round(N);
                return "0123456789ABCDEF".charAt((N-N%16)/16)
                  + "0123456789ABCDEF".charAt(N%16);
            }
          function drawCharts() {
            for (index in wptBreakdown) {
                var bytes = new google.visualization.DataTable();
                bytes.addColumn('string', 'Content Type');
                bytes.addColumn('number', 'Bytes');
                var bytesColors = new Array();
                for (i in wptBreakdown[index].data) {
                    bytes.addRow([i, wptBreakdown[index].data[i].bytes]);
                    var color = RGBtoHex(wptBreakdown[index].data[i].color[0], wptBreakdown[index].data[i].color[1], wptBreakdown[index].data[i].color[2]);
                    bytesColors.push('#' + color);
                }
                var bytesOptions = {
                  width: 370, height: 200,
                  title: 'Bytes',
                  colors: bytesColors
                };
                var bytesChart = new google.visualization.PieChart(document.getElementById('bytes_' + wptBreakdown[index].run));
                bytesChart.draw(bytes, bytesOptions);

                var requests = new google.visualization.DataTable();
                requests.addColumn('string', 'Content Type');
                requests.addColumn('number', 'Requests');
                var requestsColors = new Array();
                for (i in wptBreakdown[index].data) {
                    requests.addRow([i, wptBreakdown[index].data[i].requests]);
                    var color = RGBtoHex(wptBreakdown[index].data[i].color[0], wptBreakdown[index].data[i].color[1], wptBreakdown[index].data[i].color[2]);
                    requestsColors.push('#' + color);
                }
                var requestsOptions = {
                  width: 370, height: 200,
                  title: 'Requests',
                  colors: requestsColors
                };
                var requestsChart = new google.visualization.PieChart(document.getElementById('requests_' + wptBreakdown[index].run));
                requestsChart.draw(requests, requestsOptions);
            }
          }
        <?php
        if( !$testComplete ) {
            echo "testId = '$id';\n";
        ?>
            var pollingInterval = 15000;
            function UpdateStatus(){
                try {
                  var xhr = new XMLHttpRequest();
                  xhr.open('GET', '/testStatus.php?f=json&pos=1&test=' + testId, true);
                  xhr.onreadystatechange = function() {
                    if (xhr.readyState != 4)
                      return;
                    var reload = false;
                    var interval = pollingInterval;
                    if (xhr.status == 200) {
                        var response = JSON.parse(xhr.responseText);
                        if (response['statusCode'] != undefined) {
                            if (response['statusCode'] == 100) {
                                if (response['data'] != undefined &&
                                    availableTests != undefined &&
                                    response.data['testsCompleted'] != undefined &&
                                    response.data['testsCompleted'] > availableTests)
                                    reload = true;
                            } else
                                reload = true;
                        }
                    }
                    if (reload)
                        window.location.reload(true);
                    else
                        setTimeout('UpdateStatus()', pollingInterval);
                  };
                  xhr.onerror = function() {
                    setTimeout('UpdateStatus()', pollingInterval);
                  };
                  xhr.send();
                } catch (err) {
                    setTimeout('UpdateStatus()', pollingInterval);
                }
            }
            setTimeout('UpdateStatus()', pollingInterval);
        <?php
        }
        ?>
        </script>
    </body>
</html>

<?php
/**
* Translate an error code into the text description
* 
* @param mixed $error
*/
function LookupError($error)
{
    $errorText = $error;
    
    switch($error)
    {
        case 7: $errorText = "Invalid SSL Cert."; break;
        case 99996: $errorText = "Timed Out waiting for DOM element"; break;
        case 99997: $errorText = "Timed Out"; break;
        case 99998: $errorText = "Timed Out"; break;
        case 88888: $errorText = "Script Error"; break;
        case 12999: $errorText = "Navigation Error"; break;
        case -2146697211: $errorText = "Failed to Connect"; break;
    }
    
    return $errorText;
}
?>
