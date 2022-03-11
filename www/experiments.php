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
    <body class="result result-opportunities">
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
                    <p>WebPageTest identifies opportunities for improvements that you can test without changing your actual code. Experiments help you quickly test the impact of a change by re-running your test in a similated test environment.</p>
                </div>

                

            </div>

            <?php
                    $testStepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);
                    $requests = $testStepResult->getRequests();

                    include __DIR__ . '/experiments/common.inc';

                    include __DIR__ . '/experiments/summary.inc';
                    
                ?>


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

                    

                    echo "<form class='experiments_grades results_body' name='urlEntry' id='urlEntry' action='/runtest.php?test=$id' method='POST' enctype='multipart/form-data'>";
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

                    


                    function observationHTML( $parts ){
                        $bottleneckTitle = $parts["title"];
                        
                        $bottleneckDesc = $parts["desc"];
                        $bottleneckExamples = $parts["examples"];
                        $relevantExperiments = $parts["experiments"];
                        $good = $parts["good"];
                        $hideassets = $parts["hideassets"];

                        $out = '';
                        
                        // todo move this summary heading broader for all recs
                        $goodbadClass = "experiments_details-good";
                        if( $good !== true ){
                            $goodbadClass = "experiments_details-bad";
                        }
                        
                        $out .= "<li class=\"$goodbadClass\"><details open><summary>$bottleneckTitle</summary>";
                        $out .= "<div class=\"experiments_details_body\">";
                        
                        $out .= "<div class=\"experiments_details_desc\">";
                        $out .= "<p>$bottleneckDesc</p>";
                        if( count($bottleneckExamples) > 0 ){
                            $out .= "<ul>";
                            foreach( $bottleneckExamples as $ex ) {
                                $out .= "<li>$ex</li>";
                            }
                            $out .= "</ul>";
                        }
                        $out .= "</div>";
                    
                        if( count($relevantExperiments) > 0 ){
                            if( $relevantExperiments[0]->expvar ){
                                $out .= "<h4 class=\"experiments_list_hed\">Relevant Experiments</h4>";
                            }
                            else {
                                $out .= "<h4 class=\"experiments_list_hed experiments_list_hed-recs\">Relevant Recommendations</h4>";
                            }
                    
                            $out .= "<ul class=\"experiments_list\">";
                    
                            foreach( $relevantExperiments as $exp ) {
                                $out .= <<<EOT
                                    <li class="experiment_description">
                                    <div class="experiment_description_text">
                                    <h5>{$exp->title}</h5>
                                    {$exp->desc}
                                EOT;
                    
                    
                                if( $exp->expvar && $exp->expval ){
                                    if( count($exp->expval) ){
                                        $out .= '<details class="experiment_assets '. ($hideassets === true ? "experiment_assets-hide" : "" )  .'"><summary>Assets included in experiment:</summary>';
                                        $out .= '<ol>';
                                        
                                        foreach($exp->expval as $in => $val){
                                            $label = $val;
                                            
                                            if( isset($exp->explabel) ){
                                                $label = $exp->explabel[$in];
                                            }
                                            if( count($exp->expval) > 1 ){
                                            $out .= <<<EOT
                                                <li><label><input type="checkbox" name="{$exp->expvar}[]" value="{$val}" checked>{$label}</label></li>
                                                EOT;
                                            }
                                            else {
                                                $out .= <<<EOT
                                                <li><input type="hidden" name="{$exp->expvar}[]" value="{$val}">{$label}</li>
                                                EOT;
                                            }
                                        }
                                        $out .= '</ol>';
                                        $out .= '</details>';
                                    }
                                    if( $exp->expvar ){
                                        $out .= <<<EOT
                                        </div>
                                        <div class="experiment_description_go">
                                        <label><input type="checkbox" name="recipes[]" value="{$exp->expvar}">Run This Experiment!</label>
                                        </div>
                                        EOT;
                                    }
                                }
                                else if( $exp->expvar && !$exp->expval ) {
                                    $out .= <<<EOT
                                    </div>
                                    <div class="experiment_description_go">
                                    <label><input type="checkbox" name="{$exp->expvar[0]}">Run This Experiment!</label>
                                    </div>
                                    EOT;
                                }
                    
                                $out .= '</li>';
                                    
                            }
                        }
                    
                        $out .= '<ul></div></details></li>';
                        return $out;
                    }


                    




                    // write out the observations HTML
                    foreach($assessment as $key => $cat ){
                       $grade = $cat["grade"];
                       $summary = $cat["summary"];
                       $opps = count($cat["opportunities"]);
                       $bad = $cat["num_recommended"];
                       $good = $opps - $bad;
                        echo <<<EOT
                        <div class="grade_header" id="${key}">
                            <h3 class="grade_heading grade-${grade}">Is it ${key}?</h3>
                            <p class="grade_summary">${summary}</p>
                        </div>
                        <div class="experiments_bottlenecks">
                            <ol>
                        EOT;

                        foreach( $cat["opportunities"] as $opportunity ){
                            echo observationHTML($opportunity);
                        }
                        echo '</ol></div>';
                    }

                    ?>


                



                    <?php

                    echo '<div class="experiments_foot"><p>Ready to go?</p>';
                    
                    echo '<input type="hidden" name="assessment" value="'. urlencode(json_encode( $assessment, JSON_UNESCAPED_SLASHES)) .'">';

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
            document.querySelectorAll("li:not(.experiments_details-bad) details").forEach(deet => {
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
