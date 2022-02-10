<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

declare(strict_types=1);

require_once __DIR__ . '/common.inc';

use WebPageTest\Util;

require_once __DIR__ . '/optimization_detail.inc.php';
require_once __DIR__ . '/breakdown.inc';
require_once __DIR__ . '/testStatus.inc';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestResults.php';
require_once __DIR__ . '/include/RunResultHtmlTable.php';
require_once __DIR__ . '/include/TestResultsHtmlTables.php';

$breakdown = array();
$testComplete = true;
$status = GetTestStatus($id, false);
if ($status['statusCode'] < 200) {
    $testComplete = false;
}
$headless = false;
if (Util::getSetting('headless')) {
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
        <title><?php echo "$page_title - WebPageTest Result"; ?></title>
        <script>document.documentElement.classList.add('has-js');</script>
        <style type="text/css">
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
        <?php } ?>
        <?php $gaTemplate = 'Test Result';
        require 'head.inc'; ?>
    </head>
    <body class="result">
            <?php
            $tab = 'Test Result';
            $subtab = 'Opportunities & Experiments';
            require 'header.inc';
            ?>


            <div class="results_main_contain">
            <div class="results_main">

            <div id="result">
            <?php
            if (!$testComplete) {
                ?>
                <p class="left">
                <br>
                <?php
                if (Util::getSetting('nolinks')) {
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


            <div id="average">

            <div class="results_and_command">
                <div class="results_header results_header-experiments">
                    <h2>Opportunities &amp; Experiments <em class="flag">New</em></h2>
                    <p>With <strong>Experiments</strong>, WebPageTest identifies opportunities for improvements that you can test without changing your actual code. Experiments help you quickly test the impact of a change by re-running your test in a similated test environment.</p>
                </div>

                <?php include "testinfo_command-bar.inc"; ?>
            </div>


                <?php
                if (
                    !$headless && gz_is_file("$testPath/testinfo.json")
                    && !array_key_exists('published', $test['testinfo'])
                    && ($isOwner || !$test['testinfo']['sensitive'])
                    && (!isset($test['testinfo']['type']) || !strlen($test['testinfo']['type']))
                ) {
                    // load the secret key (if there is one)
                    $secret = GetServerSecret();
                    if (!isset($secret)) {
                        $secret = '';
                    }

                    echo "<form class='experiments_grades' name='urlEntry' id='urlEntry' action='/runtest.php?test=$id' method='POST' enctype='multipart/form-data'>";
                    echo "\n<input type=\"hidden\" name=\"resubmit\" value=\"$id\">\n";
                    echo '<input type="hidden" name="vo" value="' . htmlspecialchars($owner) . "\">\n";
                    if (strlen($secret)) {
                        $hashStr = $secret;
                        $hashStr .= $_SERVER['HTTP_USER_AGENT'];
                        $hashStr .= $owner;

                        $now = gmdate('c');
                        echo "<input type=\"hidden\" name=\"vd\" value=\"$now\">\n";
                        $hashStr .= $now;

                        $hmac = sha1($hashStr);
                        echo "<input type=\"hidden\" name=\"vh\" value=\"$hmac\">\n";
                    }

                    $testStepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);
                    $requests = $testStepResult->getRequests();

                    include __DIR__ . '/experiments/common.inc';

                    ?>


                <div class="grade_header">
                    <h3 class="grade_heading grade-a">Quick: <span>8/10</span></h3>
                    <p class="grade_summary"><strong>Great work!</strong> This page connects to the server quickly and begins rendering visually soon after initial delivery. Large content renders soon as well. But you can always make improvements...</p>
                </div>


                    <?php

                    echo '<div class="experiments_bottlenecks">
                        <p>Relevant Opportunities...</p><ol>';

                    include __DIR__ . '/experiments/slow-ttfb.inc';

                    include __DIR__ . '/experiments/render-blocking-scripts.inc';

                    include __DIR__ . '/experiments/render-blocking-css.inc';

                    include __DIR__ . '/experiments/render-blocking-font-css.inc';

                    include __DIR__ . '/experiments/lcp.inc';

                    echo '</ol></div>';




                    ?>

                <div class="grade_header">
                    <h3 class="grade_heading grade-c">Usable: <span>6/10</span></h3>
                    <p class="grade_summary"><strong>Not bad!</strong> Users can begin interacting with this page after a short delay. Readability is average. Touch-friendliness is average.</p>
                </div>

                <div class="experiments_bottlenecks">
                        <p>Relevant Opportunities...</p><ol>
                    <?php
                    include __DIR__ . '/experiments/layout-shifts.inc';
                    ?>
                        </ol>
                </div>


                <div class="grade_header">
                    <h3 class="grade_heading grade-f">Resilient: <span>4/10</span></h3>
                    <p class="grade_summary"><strong>Needs Improvement!</strong> This page contains several render-blocking CSS and JavaScript requests and contains critical content that is generated client-side with JavaScript. </p>
                </div>
                <div class="experiments_bottlenecks">
                    <p>Relevant Opportunities...</p><ol>
                    <?php
                    echo observationHTML(
                        "Several security vulnerabilies found by Snyk",
                        "Snyk has found 2 security vulnerabilities, 1 high priority, and 1 low.",
                        array(
                            "<strong>Strict Transport Security:</strong>A HSTS Policy informing the HTTP client how long to cache the HTTPS only policy and whether this applies to subdomains.",
                            "<strong>X Content Type Options:</strong> The only defined value, \"nosniff\", prevents Internet Explorer from MIME-sniffing a response away from the declared content-type. "
                        ),
                        array(
                            (object) [
                                'title' => 'Add strict transport security.',
                                "desc" => 'This experiment will add a blah blah to your HTML document, causing browsers to  blah blah',
                                "expvar" => 'preload',
                                "expval" => $lcpSource . "|as_image"
                            ],
                            (object) [
                                'title' => 'Add X Content Type Options',
                                "desc" => 'This experiment will add a blah blah to your HTML document, causing browsers to  blah blah',
                                "expvar" => 'addimportance',
                                "expval" => $lcpSource . "|i_high"
                            ]
                        )
                    );
                    
                    ?>
                </ol>
                    
                </div>

                    <?php

                    echo '<div class="experiments_foot"><p>Ready to go?</p>';

                    echo '<input type="submit" value="Re-Run Test with Experiments">';
                    echo "\n</div></form>\n";
                }
                ?>


            <?php } ?>

            <?php require 'footer.inc'; ?>
        </div>
        </div>
        </div>
        <script type="text/javascript" src="/js/jk-navigation.js"></script>
        <script type="text/javascript">
            addJKNavigation("tr.stepResultRow");
            // collapse later opps
            document.querySelectorAll("li:first-child + li details").forEach(deet => {
                deet.open = false;
            });
        </script>

        <?php
        $breakdown = $resultTables->getBreakdown();
        if ($breakdown) {
            ?>
          <script type="text/javascript" src="//www.google.com/jsapi"></script>

            <?php
        } // $breakdown

        if (!$testComplete) {
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
