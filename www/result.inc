<?php
require_once __DIR__ . '/optimization_detail.inc.php';
require_once __DIR__ . '/breakdown.inc';
require_once __DIR__ . '/testStatus.inc';
require_once __DIR__ . '/common.inc';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestResults.php';
require_once __DIR__ . '/include/RunResultHtmlTable.php';
require_once __DIR__ . '/include/TestResultsHtmlTables.php';

$breakdown = array();
$testComplete = true;
$status = GetTestStatus($id, false);
if( $status['statusCode'] < 200 ) 
    $testComplete = false;
$headless = false;
if (array_key_exists('headless', $settings) && $settings['headless']) {
    $headless = true;
}

$testInfo = TestInfo::fromFiles($testPath);
$testResults = TestResults::fromFiles($testInfo);

$page_keywords = array('Results','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Website performance test result$testLabel.";
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest Test Result<?php echo $testLabel; ?></title>
        <style type="text/css">
            tr.stepResultRow.jkActive td.resultCell {
                border-left: 2px #181741 solid;
            }
            td.separation {
                height: 2em;
            }
        </style>
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
                $available = $testResults->countRuns();
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
                        && ($isOwner || !$test['testinfo']['sensitive'])
                        && (!isset($test['testinfo']['type']) || !strlen($test['testinfo']['type'])) )
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
                $fvMedian = $testResults->getMedianRunNumber($median_metric, false);
                $rvMedian = $testResults->getMedianRunNumber($median_metric, true);
                $is_test_error = $testInfo->isTestError();
                if ($fvMedian)
                {
                    if ($testResults->countRuns() > 1)
                        echo '<h2>Performance Results (Median Run)</h2>';
                    $fvRunResults = $testResults->getRunResult($fvMedian, false);
                    $rvRunResults = $rvMedian ? $testResults->getRunResult($rvMedian, true) : null;
                    $resultTable = new RunResultHtmlTable($testInfo, $fvRunResults, $rvRunResults);
                    $resultTable->useLabelLinks(true);
                    $resultTable->disableColumns(array(
                      RunResultHtmlTable::COL_ABOVE_THE_FOLD,
                      RunResultHtmlTable::COL_VISUAL_COMPLETE,
                      RunResultHtmlTable::COL_RESULT
                    ));
                    if (GetSetting('show_cost')) {
                        $resultTable->enableColumns(array(RunResultHtmlTable::COL_COST));
                    }
                    echo $resultTable->create();

                    if ($testResults->countRuns() > 1) {
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
		    } // csi
                } // fvMedian
                if (!$fvMedian || $is_test_error) {
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
                    if (!$fvMedian)
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
            if ($testResults->countRuns() > 1)
                echo '<h3 style="text-align:center;">Test Results</h3>';
            $tcpDumpView = !empty($settings['tcpdump_view']) ? $settings['tcpdump_view'] : null;
            $resultTables = new TestResultsHtmlTables($testInfo, $testResults, $testComplete, $median_metric, $tcpDumpView);
            echo $resultTables->create();
            ?>
            </div>
            </div>

		    <br>
            <?php if (file_exists('./ads/results_bottom.inc')) include('./ads/results_bottom.inc'); ?>
		    <br>
            
            <?php include('footer.inc'); ?>
        </div>
        <script type="text/javascript" src="/js/jk-navigation.js"></script>
        <script type="text/javascript">
            addJKNavigation("tr.stepResultRow");
        </script>
        <?php
        $breakdown = $resultTables->getBreakdown();
        if ($breakdown) {
        ?>
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
        <?php
        } // $breakdown

        if( !$testComplete ) {
            echo "<script type=\"text/javascript\">\n";
            echo "var testId = '$id';\n";
        ?>
            // polyfill performance.now
            if ("performance" in window == false) {
                window.performance = {};
            }
            Date.now = (Date.now || function () {  // thanks IE8
              return new Date().getTime();
            });
            if ("now" in window.performance == false){
              var nowOffset = Date.now();
              if (performance.timing && performance.timing.navigationStart){
                nowOffset = performance.timing.navigationStart
              }
              window.performance.now = function now(){
                return Date.now() - nowOffset;
              }
            }
            var lastUpdate = window.performance.now();
            function UpdateStatus(){
                var now = window.performance.now();
                var elapsed = now - lastUpdate;
                lastUpdate = now;
                if (elapsed < 0 || elapsed > 10000) {
                  try {
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', '/testStatus.php?f=json&pos=1&test=' + testId, true);
                    xhr.onreadystatechange = function() {
                      if (xhr.readyState != 4)
                        return;
                      var reload = false;
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
                      if (reload) {
                          window.location.reload(true);
                      } else {
                          setTimeout('UpdateStatus()', 15000);
                      }
                    };
                    xhr.onerror = function() {
                      setTimeout('UpdateStatus()', 15000);
                    };
                    xhr.send();
                  } catch (err) {
                      setTimeout('UpdateStatus()', 15000);
                  }
                } else {
                  setTimeout('UpdateStatus()', 15000);
                }
            }
            setTimeout('UpdateStatus()', 15000);
          </script>
        <?php
        }
        ?>
    </body>
</html>
