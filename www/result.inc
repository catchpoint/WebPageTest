<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
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
if (GetSetting('headless')) {
    $headless = true;
}

$testInfo = TestInfo::fromFiles($testPath);
$testResults = TestResults::fromFiles($testInfo);

$page_keywords = array('Results','WebPageTest','Website Speed Test','Page Speed');
$page_description = "Website performance test result$testLabel.";
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest Test Result<?php echo $testLabel; ?></title>
        <style type="text/css">
            tr.stepResultRow.jkActive td.resultCell {
                border-left: 2px #181741 solid;
            }
            td.separation {
                height: 2em;
            }
        </style>
        <?php if( !$testComplete ) {
                $autoRefresh = true;
        ?>
        <noscript>
        <meta http-equiv="refresh" content="30" />
        </noscript>
        <?php } ?>
        <?php $gaTemplate = 'Test Result'; include ('head.inc'); ?>
    </head>
    <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
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
                    if (GetSetting('nolinks')) {
                        echo "URL: $url<br>\n";
                    } else {
                        echo "URL: <a rel=\"nofollow\" href=\"$url\">$url</a><br>\n";
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
                        $siteKey = GetSetting("recaptcha_site_key", "");
                        if (!isset($uid) && !isset($user) && !isset($USER_EMAIL) && strlen($siteKey)) {
                          echo "<script src=\"https://www.google.com/recaptcha/api.js\" async defer></script>\n";
                          ?>
                          <script>
                          function onRecaptchaSubmit(token) {
                            document.getElementById("urlEntry").submit();
                          }
                          </script>
                          <?php
                        }
                        // load the secret key (if there is one)
                        $secret = GetServerSecret();
                        if (!isset($secret))
                            $secret = '';

                        echo "<form name='urlEntry' id='urlEntry' action='/runtest.php?test=$id' method='POST' enctype='multipart/form-data'>";
                        echo "\n<input type=\"hidden\" name=\"resubmit\" value=\"$id\">\n";
                        echo '<input type="hidden" name="vo" value="' . htmlspecialchars($owner) . "\">\n";
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
                        if (strlen($siteKey)) {
                          echo "<button data-sitekey=\"$siteKey\" data-callback='onRecaptchaSubmit' class=\"g-recaptcha\">Re-run the test</button>";
                        } else {
                          echo '<input type="submit" value="Re-run the test">';
                        }
                        echo "\n</form>\n";
                    }
                    ?>
                </div>
                <?php
                    $fvMedian = $testResults->getMedianRunNumber($median_metric, false);
                    $rvMedian = $testResults->getMedianRunNumber($median_metric, true);

                    echo "<a href='/jsonResult.php?test=$id&pretty=1'>View JSON result</a><br>";
                    echo '<a href="/export.php?bodies=1&pretty=1&test=' . $id . '">Export HTTP Archive (.har)</a>';
                    if (is_file("$testPath/test.log"))
                        echo "<br><a href=\"/viewlog.php?test=$id\">View Test Log</a>";
                    if (is_file("$testPath/lighthouse.log.gz"))
                        echo " - <a href=\"/viewlog.php?test=$id&lighthouse=1\">Lighthouse Test Log</a>";
                    $publish = GetSetting('publishTo');
                    if( $publish && GetSetting('host') != 'www.webpagetest.org' )
                        echo "<br><a href=\"/publish.php?test=$id\">Publish to $publish</a>";
                ?>
            </div>
            <div id="average">
                <?php
                $is_test_error = $testInfo->isTestError();
                if ($fvMedian)
                {
                    if ($testResults->countRuns() > 1)
                        echo '<h2>Performance Results (Median Run - ' . htmlspecialchars($median_metric) . ')</h2>';
                    $fvRunResults = $testResults->getRunResult($fvMedian, false);
                    $rvRunResults = $rvMedian ? $testResults->getRunResult($rvMedian, true) : null;
                    $resultTable = new RunResultHtmlTable($testInfo, $fvRunResults, $rvRunResults);
                    $resultTable->useLabelLinks(true);
                    $resultTable->disableColumns(array(
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
            <?php
            if (isset($fvRunResults)) {
              require_once(__DIR__ . '/include/CrUX.php');
              InsertCruxHTML($fvRunResults, $rvRunResults, '');
            }
            ?>
            <script type="text/javascript">
              markUserTime('aft.Result Data Table');
            </script>
            <?php } ?>
            <div id="tables" style="text-align:left;">
            <?php
            $tcpDumpView = GetSetting('tcpdump_view') ? GetSetting('tcpdump_view') : null;
            $resultTables = new TestResultsHtmlTables($testInfo, $testResults, $testComplete, $median_metric, $tcpDumpView);
            echo $resultTables->create();
            ?>
            </div>
            </div>

              </div>

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
