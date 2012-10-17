<?php
require_once('optimization_detail.inc.php');
require_once('breakdown.inc');
require_once('testStatus.inc');
require_once('common.inc');

$breakdown = array();
$video = false;
if( $test['test']['Capture Video'] || $test['test']['Video'] || $test['test']['video'] )
    $video = true;
$testComplete = true;
$status = GetTestStatus($id, false);
if( $status['statusCode'] < 200 ) 
    $testComplete = false;

$page_keywords = array('Results','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Website performance test result$testLabel.";
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
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
        <script language="JavaScript">
        setTimeout( "window.location.reload(true)", 30000 );
        </script>
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
                $runs = max(array_keys($pageData));
                echo "<h3>Test is partially complete ($runs of {$test['test']['runs']} runs).<br>This page will refresh every 30 seconds until the full test is complete.</h3>";
            }
            else 
            { 
            ?>
            <div id="download">
                <div id="testinfo">
                    <?php
                    echo GetTestInfoHtml();
                    if( gz_is_file("$testPath/testinfo.json") )
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
                    echo '<br><a href="/export.php?test=' . $id . '">Export HTTP Archive (.har)</a>';
                    if( $test['testinfo']['showslow'] && strlen($settings['showslow']) )
                        echo '<br><a href="'.$settings['showslow'].'/details/?url='.urlencode(FixUrlSlash($url)).'#webpagetest' . '">See in ShowSlow</a>';
		            if( is_dir('./google') && $settings['enable_google_csi'] )
			            echo '<br><a href="/google/view_csi.php?test=' . $id . '">View CSI data</a>';
                    if( $settings['publishTo'] )
                        echo "<br><a href=\"/publish.php?test=$id\">Publish to {$settings['publishTo']}</a>";
                ?>
            </div>
            <div class="cleared"></div>
            <div id="average">
                <?php 
                $fvMedian = GetMedianRun($pageData, 0, $median_metric);
                $rvMedian = GetMedianRun($pageData, 1, $median_metric);
                
                if( $fvMedian )
                {
                    if( count($pageData) > 1) 
                        echo '<h2>Performance Results (Median Run)</h2>';
                ?>
                    <table id="tableResults" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
                    <tr>
                        <?php
                        $cols = 3;
                        if((float)$pageData[$fvMedian][0]['domTime'] > 0.0)
                            $cols++;
                        if( $test['test']['aft'] )
                            $cols++;
                        if($pageData[$fvMedian][0]['domElements'] > 0)
                            $cols++;
                        if(array_key_exists('SpeedIndex', $pageData[$fvMedian][0]) && (int)$pageData[$fvMedian][0]['SpeedIndex'] > 0)
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
                        <?php if( $test['test']['aft'] ) { ?>
                        <th align="center" valign="middle">Above the Fold</th>
                        <?php } ?>
                        <?php if(array_key_exists('SpeedIndex', $pageData[$fvMedian][0]) && (int)$pageData[$fvMedian][0]['SpeedIndex'] > 0) { ?>
                        <th align="center" valign="middle"><a href="https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index" target="_blank">Speed Index</a></th>
                        <?php } ?>
                        <?php if((float)$pageData[$fvMedian][0]['domTime'] > 0.0) { ?>
                        <th align="center" valign="middle">DOM Element</th>
                        <?php } ?>
                        <?php if($pageData[$fvMedian][0]['domElements'] > 0) { ?>
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
                        if( $test['test']['aft'] ) {
                            $aft = number_format($pageData[$fvMedian][0]['aft'] / 1000.0, 1) . 's';
                            if( !$pageData[$fvMedian][0]['aft'] )
                                $aft = 'N/A';
                            echo "<td id=\"fvAFT\" valign=\"middle\">$aft</th>";
                        }
                        if(array_key_exists('SpeedIndex', $pageData[$fvMedian][0]) && (int)$pageData[$fvMedian][0]['SpeedIndex'] > 0)
                            echo "<td id=\"fvVisual\" valign=\"middle\">{$pageData[$fvMedian][0]['SpeedIndex']}</td>\n";
                        if((float)$pageData[$fvMedian][0]['domTime'] > 0.0)
                            echo "<td id=\"fvDomElement\" valign=\"middle\">" . number_format($pageData[$fvMedian][0]['domTime'] / 1000.0, 3) . "s</td>\n";
                        if($pageData[$fvMedian][0]['domElements'] > 0)
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
                        if( $test['test']['aft'] ) {
                            $aft = number_format($pageData[$rvMedian][1]['aft'] / 1000.0, 1);
                            if( !$pageData[$rvMedian][1]['aft'] )
                                $aft = 'N/A';
                            echo "<td id=\"rvAFT\" class=\"even\" valign=\"middle\">$aft</th>";
                        }
                        if(array_key_exists('SpeedIndex', $pageData[$fvMedian][0]) && (int)$pageData[$fvMedian][0]['SpeedIndex'] > 0) {
                            $disp = '-';
                            if(array_key_exists('SpeedIndex', $pageData[$rvMedian][1]) && (int)$pageData[$rvMedian][1]['SpeedIndex'] > 0)
                                $disp = $pageData[$rvMedian][1]['SpeedIndex'];
                            echo "<td id=\"rvVisual\" class=\"even\" valign=\"middle\">$disp</td>\n";
                        }
                        if((float)$pageData[$fvMedian][0]['domTime'] > 0.0)
                            echo "<td id=\"rvDomElement\" class=\"even\" valign=\"middle\">" . number_format($pageData[$rvMedian][1]['domTime'] / 1000.0, 3) . "s</td>\n";
                        if($pageData[$fvMedian][0]['domElements'] > 0)
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
                        echo "<a href=\"/graph_page_data.php?test=$id&medianMetric=$median_metric\">Plot Full Results</a>";
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
                else
                    echo '<h3>The test completed but there were no successful results.</h3>';
                ?>
            </div>
            <?php } ?>
            <div id="tables" style="text-align:left;">
            <?php
            if( count($pageData) > 1) 
                echo '<h3 style="text-align:center;">Test Results</h3>';

            $runs = max(array_keys($pageData));
            $fvonly = 1;
            if( isset($rv) )
                $fvonly = 0;
            for( $run = 1; $run <= $runs; $run++)
            {
                if( $runs > 1 )
                    echo '<h4><a name="run' . $run. '">Run ' . $run . ':</a></h4>';
            ?>
                <table id="table<?php echo $run;?>" class="pretty result" align="center" border="1" cellpadding="20" cellspacing="0">
                <tr>
                    <th align="center" class="empty" valign="middle"></th>
                    <th align="center" valign="middle">Waterfall</th>
                    <?php
                    if( !isset($test['testinfo']) || !$test['testinfo']['noimages'] )
                        echo '<th align="center" valign="middle">Screen Shot</th>';
                    if($video)
                        echo '<th align="center" valign="middle">Video</th>';
                    ?>
                </tr>
                <tr>
                    <td align="left" valign="middle">First View<?php 
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
                            if( FRIENDLY_URLS )
                                echo "<br><br><a href=\"/result/$id/{$run}.cap\" title=\"Download tcpdump session capture\">tcpdump</a>";
                            else
                                echo "<br><br><a href=\"/getgzip.php?test=$id&file=$run.cap\" title=\"Download tcpdump session capture\">tcpdump</a>";
                        }
                        if( gz_is_file("$testPath/{$run}_timeline.json") ) {
                            echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_timeline.json\" title=\"Download Chrome Dev Tools Timeline\">Timeline</a>";
                            echo " (<a href=\"/timeline/" . VER_TIMELINE . "/timeline.html?url=%2Fgetgzip.php%3Ftest%3D{$id}%26file%3D{$run}_timeline.json\" title=\"View Chrome Dev Tools Timeline\">view</a>)";
                        }
                        if( gz_is_file("$testPath/{$run}_netlog.txt") ) {
                            echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_netlog.txt\" title=\"Download Network Log\">Net Log</a>";
                        }
                        if( gz_is_file("$testPath/{$run}_trace.json") ) {
                            echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_trace.json\" title=\"Download Trace\">Trace</a>";
                        }
                    ?></td>
                    <td align="center" valign="middle"><a href="<?php echo FRIENDLY_URLS ? "/result/$id/$run/details/" : "/details.php?test=$id&run=$run"; ?>"><img class="progress" width=250 src="<?php echo FRIENDLY_URLS ? "/result/$id/{$run}_waterfall_thumb.png" : "/thumbnail.php?test=$id&run=$run&file={$run}_waterfall.png"; ?>"></a></td>
                    <?php
                    if( !isset($test['testinfo']) || !$test['testinfo']['noimages'] )
                    {
                        if( FRIENDLY_URLS )
                            echo "<td align=\"center\" valign=\"middle\"><a href=\"/result/$id/$run/screen_shot/\"><img class=\"progress\" width=250 src=\"/result/$id/{$run}_screen_thumb.jpg\"></a></td>";
                        else
                            echo "<td align=\"center\" valign=\"middle\"><a href=\"/screen_shot.php?test=$id&run=$run\"><img class=\"progress\" width=250 src=\"/thumbnail.php?test=$id&run=$run&file={$run}_screen.jpg\"></a></td>";
                    }
                    if($video) 
                    {
                        echo '<td align="center" valign="middle">';
                        if( is_dir("$testPath/video_$run") )
                        {
                            echo "<a href=\"/video/compare.php?tests=$id-r:$run-c:0\">Filmstrip View</a><br>-<br>";
                            echo "<a href=\"/video/create.php?tests=$id-r:$run-c:0&id={$id}.{$run}.0\">Watch Video</a><br>-<br>";
                            echo "<a href=\"/video/?tid=$id&run=$run&cached=0\">Compare to</a>";
                        }
                        else
                            echo "not available";
                        echo '</td>';
                    }
                    ?>
                </tr>

                <?php if( isset($pageData[$run][1]) ) { ?>
                <tr>
                    <td align="left" class="even" valign="middle">Repeat View<?php 
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
                            if( FRIENDLY_URLS )
                                echo "<br><br><a href=\"/result/$id/{$run}_Cached.cap\" title=\"Download tcpdump session capture\">tcpdump</a>";
                            else
                                echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_Cached.cap\" title=\"Download tcpdump session capture\">tcpdump</a>";
                        }
                        if( gz_is_file("$testPath/{$run}_Cached_timeline.json") ) {
                            echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_Cached_timeline.json\" title=\"Download Chrome Dev Tools Timeline\">Timeline</a>";
                            echo " (<a href=\"/timeline/" . VER_TIMELINE . "/timeline.html?url=%2Fgetgzip.php%3Ftest%3D{$id}%26file%3D{$run}_Cached_timeline.json\" title=\"View Chrome Dev Tools Timeline\">view</a>)";
                        }
                        if( gz_is_file("$testPath/{$run}_Cached_netlog.txt") ) {
                            echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_Cached_netlog.txt\" title=\"Download Network Log\">Net Log</a>";
                        }
                        if( gz_is_file("$testPath/{$run}_Cached_trace.json") ) {
                            echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_Cached_trace.json\" title=\"Download Trace\">Trace</a>";
                        }
                    echo '</td>';
                    if( FRIENDLY_URLS )
                        echo "<td align=\"center\" class=\"even\" valign=\"middle\"><a href=\"/result/$id/$run/details/cached/\"><img class=\"progress\" width=250 src=\"/result/$id/{$run}_Cached_waterfall_thumb.png\"></a></td>";
                    else
                        echo "<td align=\"center\" class=\"even\" valign=\"middle\"><a href=\"/details.php?test=$id&run=$run&cached=1\"><img class=\"progress\" width=250 src=\"/thumbnail.php?test=$id&run=$run&cached=1&file={$run}_Cached_waterfall.png\"></a></td>";

                    if( !isset($test['testinfo']) || !$test['testinfo']['noimages'] )
                    {
                        if( FRIENDLY_URLS )
                            echo "<td align=\"center\" class=\"even\" valign=\"middle\"><a href=\"/result/$id/$run/screen_shot/cached/\"><img class=\"progress\" width=250 src=\"/result/$id/{$run}_Cached_screen_thumb.jpg\"></a></td>";
                        else
                            echo "<td align=\"center\" valign=\"middle\"><a href=\"/screen_shot.php?test=$id&run=$run&cached=1\"><img class=\"progress\" width=250 src=\"/thumbnail.php?test=$id&run=$run&cached=1&file={$run}_Cached_screen.jpg\"></a></td>";
                    }
                    if($video) 
                    {
                        echo '<td align="center" valign="middle">';
                        if( is_dir("$testPath/video_{$run}_cached") )
                        {
                            echo "<a href=\"/video/compare.php?tests=$id-r:$run-c:1\">Filmstrip View</a><br>-<br>";
                            echo "<a href=\"/video/create.php?tests=$id-r:$run-c:1&id={$id}.{$run}.1\">Watch Video</a>";
                        }
                        else
                            echo "not available";
                        echo '</td>';
                    } 
                    ?>
                </tr>
                <?php } ?>
                
                <?php if( $testComplete && $run == $fvMedian ) { 
                    $b = getBreakdown($id, $testPath, $run, 0, $requests);
                    if (is_array($b)) {
                        $breakdown[] = array('run' => $run, 'data' => $b);
                    }
                ?>
                <tr>
                    <td align="left" valign="middle"><a href="/result/<?php echo "$id/$run/breakdown/"; ?>">Content Breakdown</a></td>
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
        case -2146697211: $errorText = "Failed to Connect"; break;
    }
    
    return $errorText;
}
?>
