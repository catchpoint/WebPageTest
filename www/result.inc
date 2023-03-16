<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once __DIR__ . '/common.inc';

require_once INCLUDES_PATH . '/optimization_detail.inc.php';
require_once INCLUDES_PATH . '/breakdown.inc';
require_once INCLUDES_PATH . '/testStatus.inc';
require_once INCLUDES_PATH . '/common.inc';
require_once INCLUDES_PATH . '/include/TestInfo.php';
require_once INCLUDES_PATH . '/include/TestResults.php';
require_once INCLUDES_PATH . '/include/RunResultHtmlTable.php';
require_once INCLUDES_PATH . '/include/TestResultsHtmlTables.php';

$breakdown = array();
$testComplete = true;
$status = GetTestStatus($id, false);
if ($status['statusCode'] < 200) {
    $testComplete = false;
}
$headless = false;
if (GetSetting('headless')) {
    $headless = true;
}

$testInfo = TestInfo::fromFiles($testPath);
$testResults = TestResults::fromFiles($testInfo);


$testStepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);
$requests = $testStepResult->getRequests();

$blockingReqs = array();

foreach ($requests as $request) {
    if ($request['renderBlocking'] === "blocking" && $request['contentType'] === "application/javascript") {
        array_push($blockingReqs, $request['host'] . $request['url']);
    }
}




$page_keywords = array('Results','WebPageTest','Website Speed Test','Page Speed');
$page_description = "Website performance test result$testLabel.";
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title><?php echo "$page_title - WebPageTest Result"; ?></title>
        <script>document.documentElement.classList.add('has-js');</script>
        <style>
            tr.stepResultRow.jkActive td.resultCell {
                border-left: 2px #181741 solid;
            }
            td.separation {
                height: 2em;
            }
        </style>
        <?php if (!$testComplete) {
                $autoRefresh = true;
            ?>
        <noscript>
        <meta http-equiv="refresh" content="30" />
        </noscript>
        <?php }
        $useScreenshot = true;
         $socialTitle = "WebPageTest Performance Test Results";
         $socialDesc = "Check out these web performance test results on WebPageTest.org: ";
        ?>
        <?php include('head.inc'); ?>

    </head>
    <body class="result result-summary <?php if ($req_screenshot) {
        echo ' screenshot';
                                       } ?>">
            <?php
            $tab = 'Test Result';
            $subtab = 'Performance Summary';
            include 'header.inc';
            ?>


            <div class="results_main_contain">
        <div class="results_main">

        <?php
        if (!$testComplete) {
            ?>
                <p class="left">
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
        } else {
            ?>



           <div class="results_and_command">





           <div class="results_header">
                <h2>Performance Summary</h2>
                <div class="summary_opps">


                <?php
                include INCLUDES_PATH . '/experiments/common.inc';
                include INCLUDES_PATH . '/experiments/summary.inc';

                ?>
                <?php if (!isset($experiments_paid) || !$experiments_paid) { ?>
                <p><span class="opportunities_summary_exps">You have Free Experiments Available!
                    <?php
                    if ($tabs && $tabs['Opportunities & Experiments']) {
                        echo '<a href="' . $tabs['Opportunities & Experiments'] . '">Try them now!</a>';
                    }
                    ?></span></p>
                <?php } ?>
                </div>




              </div>

            </div>





            <div id="result" class="results_body">



            <div id="average">
                <?php
                $is_test_error = $testInfo->isTestError();
                $fvRunResults = $testResults->getRunResult($fvMedian, false);
                $rvRunResults = $rvMedian ? $testResults->getRunResult($rvMedian, true) : null;

                if ($fvMedian) {
                      echo '<h3 class="hed_sub">Page Performance Metrics ';
                      $medianMetrics = array(
                        "chromeUserTiming.CumulativeLayoutShift" => "Cumulative Layout Shift",
                        "firstContentfulPaint" => "First Contentful Paint",
                        "chromeUserTiming.LargestContentfulPaint" => "Largest Contentful Paint",
                        "fullyLoaded" => "Load Time",
                        "SpeedIndex" => "Speed Index",
                        "render" => "Start Render",
                        "TTFB" => "Time to First Byte",
                        "TotalBlockingTime" => "Total Blocking Time"
                      );
                      if ($medianMetrics[$median_metric]) {
                          $friendlyMedianMetric = $medianMetrics[$median_metric];
                      } else {
                          $friendlyMedianMetric = htmlspecialchars($median_metric);
                      }
                      if ($testResults->countRuns() > 1) {
                          echo '<em>(Based on Median Run by:
                          <details><summary>' . $friendlyMedianMetric . '</summary>';
                          echo "<ul>";

                          $url = strtok($_SERVER["REQUEST_URI"], '?');
                          foreach ($medianMetrics as $key => $value) {
                              if ($pageData[$run][$cached][$key]) {
                                  echo "<li><a href='" . $url . "?test=$id&medianMetric=" . $key . "'>" . $value . "</a></li>";
                              }
                          }
                          echo "</ul>";


                          echo '</details>)</em>';
                      }
                        echo '</h3>';

                        echo '<details class="metrics_shown">
                          <summary><strong>Note:</strong> Metric availability will vary</summary>
                          <p><strong>Please note:</strong> Availability of metrics will vary based on the browser being tested. Also, the way a site performs in some conditions may not predict how well it will perform in others, so we encourage testing in a variety of browsers, devices, & locations.</p>
                          </details>';

                      $resultTable = new RunResultHtmlTable($testInfo, $fvRunResults, $rvRunResults, false, true);
                      $resultTable->useLabelLinks(true);
                      $resultTable->disableColumns(array(
                        RunResultHtmlTable::COL_VISUAL_COMPLETE,
                        RunResultHtmlTable::COL_COST,
                        RunResultHtmlTable::COL_FULLYLOADED,
                        RunResultHtmlTable::COL_REQUESTS,
                        RunResultHtmlTable::COL_RESULT,
                      ));
                      $resultTable->disableCustomMetrics();
                    if (GetSetting('show_cost')) {
                        //$resultTable->enableColumns(array(RunResultHtmlTable::COL_COST));
                    }
                    echo $resultTable->create(true);

                    if ($testResults->countRuns() > 1) {
                        $link = '/video/compare.php?tests=';
                        $repeatlink = '/video/compare.php?tests=';
                        $cnt = 1;
                        do {
                            $link .= $id . '-r:' . $cnt;
                            $repeatlink .= $id . '-r:' . $cnt . '-c:1';
                            if ($tests[0]['step']) {
                                $link .= '-s:' . $test['step'];
                                $repeatlink .= '-s:' . $test['step'];
                            }
                            $link .= ',';
                            $repeatlink .= ',';
                            $cnt++;
                        } while ($cnt <= $testResults->countRuns());
                        echo "<a href=\"" . substr($link, 0, -1) . "\" class=\"result_plot\">Compare First Views</a>";
                        if ($rvRunResults) {
                            echo "<a href=\"" . substr($repeatlink, 0, -1) . "\" class=\"result_plot\">Compare Repeat Views</a>";
                        }
                        echo "<a href=\"/graph_page_data.php?tests=$id&medianMetric=$median_metric\" class=\"result_plot\">Plot Full Results</a>";
                    }
                    ?>
                    <?php
                } // fvMedian
                if (!$fvMedian || $is_test_error) {
                    $error = 'The test completed but there were no successful results.';
                    $detail = null;
                    if ($is_test_error) {
                        $error = 'The test failed to run.';
                        $detail = $test['testinfo']['test_error'];
                    } elseif (
                        array_key_exists('testinfo', $test) &&
                             array_key_exists('errors', $test['testinfo'])
                    ) {
                        // just grab the first error we find from an individual run
                        foreach ($test['testinfo']['errors'] as &$error_run) {
                            foreach ($error_run as &$error_str) {
                                if (strlen($error_str)) {
                                    $error = 'The testing completed but failed.';
                                    $detail = $error_str;
                                    break 2;
                                }
                            }
                        }
                    }
                    if (!$fvMedian) {
                        echo '<h3>' . htmlspecialchars($error) . '</h3>';
                    }
                    if (isset($detail)) {
                        echo '<h4>' . htmlspecialchars($detail) . '</h4>';
                    }
                }
                ?>
            </div>



            <?php
            if (isset($fvRunResults)) {
                echo '<div class="cruxembed">';
                require_once(INCLUDES_PATH . '/include/CrUX.php');
                InsertCruxHTML($fvRunResults, '');
                echo '</div>';
            }
            ?>
        <?php } ?>



            <div id="tables" style="text-align:left;">
            <h3 class="hed_sub">Individual Runs</h3>



            <?php
            $tcpDumpView = GetSetting('tcpdump_view') ? GetSetting('tcpdump_view') : null;
            $resultTables = new TestResultsHtmlTables($testInfo, $testResults, $testComplete, $median_metric, $tcpDumpView);
            echo $resultTables->create();
            ?>
            </div>
            </div>
  <?php include(INCLUDES_PATH . '/cta-banner.inc'); ?>
              </div>

            <?php include('footer.inc'); ?>
        </div>
        <script src="/assets/js/jk-navigation.js"></script>
        <script>
            addJKNavigation("tr.stepResultRow");
        </script>
        <?php
        $breakdown = $resultTables->getBreakdown();
        if ($breakdown) {
            ?>
          <script src="//www.google.com/jsapi"></script>
          <script>
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

        if (!$testComplete) {
            echo "<script>\n";
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
