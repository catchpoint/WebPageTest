<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

declare(strict_types=1);

require_once __DIR__ . '/common.inc';

use WebPageTest\Util;

require_once INCLUDES_PATH . '/optimization_detail.inc.php';
require_once INCLUDES_PATH . '/breakdown.inc';
require_once INCLUDES_PATH . '/testStatus.inc';
require_once INCLUDES_PATH . '/include/TestInfo.php';
require_once INCLUDES_PATH . '/include/TestResults.php';
require_once INCLUDES_PATH . '/include/RunResultHtmlTable.php';
require_once INCLUDES_PATH . '/include/TestResultsHtmlTables.php';

// if this is an experiment itself, we don't want to offer opps on it, so we redirect to the source test's opps page.
if ($experiment && isset($experimentOriginalExperimentsHref)) {
    header('Location: ' . $experimentOriginalExperimentsHref);
}

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
            .selectall, .unselectall {
                cursor: pointer;
            }
        </style>
        <?php if (!$testComplete) {
            $autoRefresh = true;
            ?>
        <noscript>
        <meta http-equiv="refresh" content="30" />
        </noscript>
        <?php } ?>
        <?php
        $useScreenshot = true;
        $socialTitle = "WebPageTest Opportunities & Experiments";
        $socialDesc = "Check out these opportunities for improvement identified by WebPageTest";

        require_once 'head.inc'; ?>
    </head>
    <body class="result result-opportunities <?php if ($req_screenshot) {
        echo ' screenshot';
                                             } ?>">
            <?php
            $tab = 'Test Result';
            $subtab = 'Opportunities & Experiments';
            require_once INCLUDES_PATH . '/header.inc';
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
                    <p>WebPageTest helps identify opportunities to improve a site's experience. Select one or more No-Code Experiments below and submit to test their impact.</p>
                </div>



            </div>



                <?php
                    $testStepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);
                    $requests = $testStepResult->getRequests();


                    include INCLUDES_PATH . '/experiments/common.inc';

                    include INCLUDES_PATH . '/experiments/summary.inc';
                if ($experiment) {
                    $moreExperimentsLink = false;
                    include INCLUDES_PATH . '/experiments/meta.inc';
                }
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



                    echo "<form class='experiments_grades results_body' name='urlEntry' id='urlEntry' action='/runtest.php?test=$id' method='POST' enctype='multipart/form-data'><div class=\"form_clip\">";
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

                    // this is to capture the first host that is a successful response and not a redirect. that'll be the one we want to override in an experiment
                    echo '<input type="hidden" name="initialHostNonRedirect" value="' . $initialHost . '">';
                    echo '<input type="hidden" name="initialOriginNonRedirect" value="' . $initialOrigin . '">';

                    // used for tracking exp access
                    $expCounter = 0;



                    function observationHTML($parts)
                    {
                        global $expCounter;
                        global $test;
                        global $experiments_paid;
                        global $experiments_logged_in;
                        $allowedFreeExperimentIds = array('001','020');

                        $bottleneckTitle = $parts["title"];

                        $bottleneckDesc = $parts["desc"];
                        $bottleneckExamples = $parts["examples"];
                        $relevantExperiments = $parts["experiments"];
                        $good = $parts["good"];
                        $textinput = isset($parts["inputttext"]);
                        $hideassets = $parts["hideassets"];

                        $out = '';

                        // todo move this summary heading broader for all recs
                        $goodbadClass = "experiments_details-good";
                        if ($good === null) {
                            $goodbadClass = "experiments_details-neutral";
                        } elseif ($good !== true) {
                            $goodbadClass = "experiments_details-bad";
                        }

                        $out .= "<li class=\"$goodbadClass\"><details open><summary>$bottleneckTitle</summary>";
                        $out .= "<div class=\"experiments_details_body\">";

                        if (count($bottleneckExamples) > 10) {
                            $out .= "<div class=\"experiments_details_desc util_overflow_more\">";
                        } else {
                            $out .= "<div class=\"experiments_details_desc\">";
                        }

                        $out .= "<p>$bottleneckDesc</p>";
                        if (count($bottleneckExamples) > 0) {
                            $out .= "<ul>";
                            foreach ($bottleneckExamples as $ex) {
                                if (!is_null($ex)) {
                                    $out .= "<li>" . htmlentities($ex) . "</li>";
                                }
                            }
                            $out .= "</ul>";
                        }
                        $out .= "</div>";

                        if (count($relevantExperiments) > 0) {
                            if ($relevantExperiments[0]->expvar) {
                                $out .= "<h4 class=\"experiments_list_hed\">Relevant Experiments</h4>";
                            } else {
                                $out .= "<h4 class=\"experiments_list_hed experiments_list_hed-recs\">Relevant Tips</h4>";
                            }

                            $out .= "<ul class=\"experiments_list\">";

                            foreach ($relevantExperiments as $exp) {
                                $expNum = $exp->id;
                                if ($exp->expvar) {
                                    $expCounter++;
                                }

                                // experiments are enabled for the following criteria
                                $experimentEnabled = $experiments_paid || ( in_array($expNum, $allowedFreeExperimentIds));
                                // exception allowed for tests on the metric times
                                if (strpos($test['testinfo']['url'], 'webpagetest.org/themetrictimes')) {
                                    $experimentEnabled = true;
                                }

                                $out .= <<<EOT
                                    <li class="experiment_description" id="experiment-{$exp->id}">
                                    <div class="experiment_description_text">
                                    <h5>{$exp->title}</h5>
                                    {$exp->desc}
                                EOT;

                                if ($experiments_logged_in === false && $experiments_paid === false) {
                                    $upgradeLink = <<<EOT
                                    </div>
                                    <div class="experiment_description_go">
                                    <a href="https://webpagetest.org/login"><span>Login to WebPageTest</span> <span>to run Pro experiments.</span></a>
                                    </div>
                                    EOT;
                                }
                                if ($experiments_logged_in === true && $experiments_paid === false) {
                                    $upgradeLink = <<<EOT
                                    </div>
                                    <div class="experiment_description_go">
                                    <a href="/signup"><span>Get <img class="pro_upgrade" src="/assets/images/wpt-logo-pro-dark.svg" alt="WebPageTest Pro"></span> <span>for unlimited experiments.</span></a>
                                    </div>
                                    EOT;
                                }


                                if ($exp->expvar && $exp->expval) {
                                    if (count($exp->expval)) {
                                        $enable_select_all = count($exp->expval) > 7;
                                        $out .= '<details class="experiment_assets ' . (($hideassets === true || $exp->hideassets === true) ? "experiment_assets-hide" : "" )  . '"><summary>Assets included in experiment:</summary>';
                                        if ($enable_select_all) {
                                            $out .= '<span class="selectall">Select all</span> <span class="unselectall">Unselect all</span>';
                                        }

                                        $out .= '<ol>';

                                        foreach ($exp->expval as $in => $val) {
                                            $label = $val;

                                            if (isset($exp->explabel)) {
                                                $label = $exp->explabel[$in];
                                            }
                                            if (isset($label)) {
                                                $label = htmlentities($label);
                                            }

                                            if (count($exp->expval) > 1) {
                                                $out .= <<<EOT
                                                <li><label><input type="checkbox" name="{$expNum}-{$exp->expvar}[]" value="{$val}" checked>{$label}</label></li>
                                                EOT;
                                            } else {
                                                $out .= <<<EOT
                                                <li><input type="hidden" name="{$expNum}-{$exp->expvar}[]" value="{$val}">{$label}</li>
                                                EOT;
                                            }
                                        }
                                        $out .= '</ol>';
                                        $out .= '</details>';
                                    }
                                    if ($exp->expvar) {
                                        if ($experimentEnabled) {
                                            $out .= <<<EOT
                                            </div>
                                            <div class="experiment_description_go">
                                            <label><input type="checkbox" name="recipes[]" value="{$expNum}-{$exp->expvar}">Run This Experiment!</label>
                                            </div>
                                            EOT;
                                        } else {
                                            $out .= $upgradeLink;
                                        }
                                    }
                                } elseif ($exp->expvar && !$exp->expval && $exp->expfields) {
                                    if ($experimentEnabled) {
                                        $out .= <<<EOT
                                        </div>
                                        <div class="experiment_description_go experiment_description_go-multi">
                                        <label class="experiment_pair_check"><input type="checkbox" name="recipes[]" value="{$expNum}-{$exp->expvar}">Run this Experiment with...</label>
                                        EOT;
                                        $addmore = $exp->addmore ? ' experiment_pair_value-add' : '';

                                        foreach ($exp->expfields as $field) {
                                            if ($field->type === "text") {
                                                $out .= <<<EOT
                                                <label class="experiment_pair_value-visible {$addmore}"><span>{$field->label} </span><input type="{$field->type}" name="{$expNum}-{$exp->expvar}[]"></label>
                                                EOT;
                                            } else {
                                                $out .= <<<EOT
                                                    <label class="experiment_pair_value-visible"><input type="{$field->type}" name="{$expNum}-{$exp->expvar}[]"><span> {$field->label}</span></label>
                                                    EOT;
                                            }
                                        }
                                        $out .= <<<EOT
                                        </div>
                                        EOT;
                                    } else {
                                        $out .= $upgradeLink;
                                    }
                                } elseif ($exp->expvar && !$exp->expval && $textinput) {
                                    if ($experimentEnabled) {
                                        $placeholderEncodedVal = htmlentities('<script src="https://example.com/test.js"></script>');
                                        $textinputvalue = $exp->textinputvalue ? $exp->textinputvalue : "";
                                        $fullscreenfocus = $exp->fullscreenfocus ? "true" : "false";
                                        $out .= <<<EOT
                                        </div>
                                        <div class="experiment_description_go experiment_description_go-multi">
                                            <label class="experiment_pair_check"><input type="checkbox" name="recipes[]" value="{$expNum}-{$exp->expvar}">Run this Experiment with...</label>
                                            <label class="experiment_pair_value"><span>Value: </span><textarea id="experiment-{$exp->id}-textarea" data-fullscreenfocus="{$fullscreenfocus}" name="{$expNum}-{$exp->expvar}[]">{$textinputvalue}</textarea></label>
                                        </div>
                                        EOT;
                                    } else {
                                        $out .= $upgradeLink;
                                    }
                                } elseif ($exp->expvar && !$exp->expval) {
                                    if ($experimentEnabled) {
                                        $out .= <<<EOT
                                        </div>
                                        <div class="experiment_description_go">
                                        <label><input type="checkbox" name="{$expNum}-{$exp->expvar[0]}">Run This Experiment!</label>
                                        </div>
                                        EOT;
                                    } else {
                                        $out .= $upgradeLink;
                                    }
                                } else {
                                    $out .= '</div>';
                                }

                                $out .= '</li>';
                            }
                        }

                        $out .= '<ul></div></details></li>';
                        return $out;
                    }







                    // write out the observations HTML
                    foreach ($assessment as $key => $cat) {
                        $grade = $cat["grade"];
                        $summary = $cat["summary"];
                        $sentiment = $cat["sentiment"];
                        $opps = count($cat["opportunities"]);
                        $oppsEnd = $opps === 1 ? "y" : "ies";
                        $bad = $cat["num_recommended"];
                        $good = $opps - $bad;
                        if ($key === "Custom") {
                            echo <<<EOT
                            <details class="experiments_create">
                            <summary class="grade_header" id="${key}">
                                <h3 class="grade_heading grade-${grade}">Create Experiments</h3>
                                <p class="grade_summary"><strong>${sentiment}</strong> ${summary}</p>
                            </summary>
                            <div class="experiments_bottlenecks">
                                <ol>

                            EOT;
                            foreach ($cat["opportunities"] as $opportunity) {
                                echo observationHTML($opportunity);
                            }
                            echo '</ol></div></details>';
                        } else {
                            echo <<<EOT

                        <div class="grade_header" id="${key}">
                            <h3 class="grade_heading grade-${grade}">Is it ${key}?</h3>
                            <p class="grade_summary"><strong>${sentiment}</strong> ${summary}</p>
                        </div>
                        <div class="experiments_bottlenecks">
                            <p>WebPageTest ran ${opps} diagnostic checks related to this category and found ${bad} opportunities.</p>
                            <ol>

                        EOT;


                            foreach ($cat["opportunities"] as $opportunity) {
                                  echo observationHTML($opportunity);
                            }
                            echo '</ol></div>';
                        }
                    }

                    $numRuns = $test['test']['runs'];
                    $fvonly = $test['testinfo']['fvonly'];


                    echo '<div class="experiments_foot">
                    <div><p><span class="exps-active"></span> </p>
                    <p class="exps-runcount"><label>Experiment Runs: <input type="hidden" name="fvonly" value="' . $fvonly . '" required=""><input type="number" min="1" max="9" class="text short" name="runs" value="' . $numRuns . '" required=""> <b class="exps-runcount-total"></b> <small>Each experiment run uses 2 test runs (1 experiment, 1 control) for each first & repeat view</small></label></p>
                    </div>';

                    echo '<input type="hidden" name="assessment" value="' . urlencode(json_encode($assessment, JSON_UNESCAPED_SLASHES)) . '">';

                    echo '<input type="submit" value="Re-Run Test with Experiments">';
                    echo "\n</div></div></form>\n";
                }
                ?>


            <?php } ?>

            <?php require 'footer.inc'; ?>
        </div>
        </div>
        </div>
        <script type="text/javascript" src="/assets/js/jk-navigation.js"></script>
        <script type="text/javascript">
            addJKNavigation("tr.stepResultRow");
            // collapse later opps
            document.querySelectorAll("li:not(.experiments_details-bad,.experiments_details-neutral)").forEach(deet => {
                deet.open = false;
            });
        </script>

        <?php


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


<script>
    // dependency fields
    function toggleDepChecks(check){
        let parent = check.closest(".experiment_description_go");
        let inputsToDisable = 'textarea,input:not([name="recipes[]"])';
        if(check.checked){
            parent.classList.add('experiment_description_go-checked');
            parent.querySelectorAll(inputsToDisable).forEach(textarea => {
                textarea.disabled = false;
            });
        } else {
            parent.classList.remove('experiment_description_go-checked');
            parent.querySelectorAll(inputsToDisable).forEach(textarea => {
                textarea.disabled = true;
            });
        }
    }
    let depChecks = document.querySelectorAll('.experiment_pair_check input');
    depChecks.forEach(check => {
        check.addEventListener('change', () => {
            toggleDepChecks(check);
        });
    });
    function updateCheckDeps(){
        depChecks.forEach(check => {
            toggleDepChecks(check);
        });
    }
    updateCheckDeps();

    // refresh the form state from saved localstorage values
    function refreshExperimentFormState(){
        var priorState = localStorage.getItem("experimentForm");
        var currentTestID = '<?php if (isset($id)) {
            echo "$id";
                             } ?>';
        if(priorState && currentTestID && priorState.indexOf("resubmit="+ currentTestID) > -1 ){
            var form = document.querySelector("form.experiments_grades");
            form.reset();
            var pairs = priorState.split("&");

                pairs.forEach(pair => {
                    let keyval = pair.split("=").map(decodeURIComponent);
                    if( keyval[0] !== 'runs' ){
                        var checks = form.querySelectorAll("[type=checkbox][name='" + keyval[0] + "']");
                        if( checks.length ){
                            checks.forEach(input => {
                                    if( input.value === keyval[1] ){
                                        input.checked = true;
                                    }
                            });
                        }
                        var input = form.querySelector("textarea[name='" + keyval[0] + "']:not([data-hydrated='true']),input[type='text'][name='" + keyval[0] + "']:not([data-hydrated='true'])");
                        
                        if( !input ){
                            let priors = form.querySelectorAll("textarea[name='" + keyval[0] + "'],input[type='text'][name='" + keyval[0] + "']");
                            if( priors.length ){
                                var lastPrior = priors[priors.length - 1];
                                if( lastPrior && lastPrior.parentElement.classList.contains('experiment_pair_value-add') ){
                                    var newInput = lastPrior.parentElement.cloneNode(true);
                                    lastPrior.parentElement.after(newInput);
                                    input = newInput.querySelector('input[type=text],textarea');
                                }
                            }
                        }
                        if( input && !(keyval[1] === 'on' && form.querySelectorAll("[type=checkbox][name='" + keyval[0] + "']")) && keyval[1] !== "" ){
                            input.value = keyval[1];
                            input.setAttribute('data-hydrated', 'true');
                        }
                        
                    }
                });
            updateCheckDeps();
        }
    }

    // try and set the form state to localstorage
    let form = document.querySelector("form.experiments_grades");

    function saveExperimentFormState(){
        let formData = new FormData(form);
        // encode values before they get poorly encoded for us by the browser (spaces turn to + etc)
        let formString = "";
        for (const pair of formData.entries()) {
            formString += `${encodeURIComponent(pair[0])}=${encodeURIComponent(pair[1])}&`;
        }
        
        
        localStorage.setItem("experimentForm", formString);
    }
    
    form.addEventListener("change", saveExperimentFormState );
    form.addEventListener("submit", sortExperimentOrder );
    form.addEventListener("submit", saveExperimentFormState );
    window.addEventListener("beforeunload", unSortExperimentOrder );

    // append inputs to end of form on submit to impact post order
    function sortExperimentOrder(e){
        let appliedOrder = document.querySelectorAll('.exps-active li');
        let sortedElemsContainer = document.createElement('div');
        sortedElemsContainer.className = "temp-sorted-inputs";
        form.append(sortedElemsContainer);
        appliedOrder.forEach(li => {
            let associatedInput = form.querySelector( "[name=\"" + li.getAttribute('data-input-name') + "\"][value=\"" + li.getAttribute('data-input-value') + "\"]" );
            if(associatedInput){
                // append an identical input to the end of the form in the order these list items arrive
                sortedElemsContainer.append(associatedInput.cloneNode(true));
                // disable the actual input for submission
                associatedInput.disabled = true;
            }
        });
    }
    // before the submit goes out, we undo the sorted inputs
    function unSortExperimentOrder(){
        document.querySelector(".temp-sorted-inputs")
        let sortedInputs = document.querySelectorAll("input[type=checkbox][name='recipes[]'][disabled]");
        sortedInputs.forEach(input => {
            input.disabled = false;
        });
    }

    // this attempts to sort the order if it's saved, onload
    function refreshExperimentOrder(){
        let priorState = localStorage.getItem("experimentOrder");
        if(priorState){
            priorState = JSON.parse(priorState);
        }
        let currentTestID = '<?php if (isset($id)) {
            echo "$id";
                             } ?>';
        if(currentTestID && priorState && priorState && priorState[0] === currentTestID){
            priorState.reverse();
            for(var i = 0; i < priorState.length-1; i++){
                let sortableLi = document.querySelector(".exps-active ol li[data-input-name='"+ priorState[i][0] +"'][data-input-value='"+ priorState[i][1] +"']");
                if(sortableLi){
                    sortableLi.parentElement.prepend(sortableLi);
                }
            }
        }
    }

    function saveExperimentOrder(){
        let appliedOrder = document.querySelectorAll('.exps-active li');
        let currentTestID = '<?php if (isset($id)) {
            echo "$id";
                             } ?>';
        if( currentTestID ){
            let orderObj = [currentTestID];
            appliedOrder.forEach(li => {
                orderObj.push( [ li.getAttribute('data-input-name'), li.getAttribute('data-input-value') ]);
            });
            localStorage.setItem("experimentOrder", JSON.stringify(orderObj));
        }
    }
    

    var expsActive;
    function updateCount(){
        expsActive = document.querySelectorAll(".experiment_description_go label:not(.experiment_pair_value-visible) input:checked");
        if(expsActive.length > 0){

            // open parent details of active experiments
            expsActive.forEach(elem => {
                while( elem.closest('details:not([open])') ){
                    elem.closest('details:not([open])').open = true;
                }
            });

            
            document.querySelector(".experiments_foot").classList.add("experiments_foot-stick");
            let cta = document.querySelector(".exps-cta");
            if( cta ){
                cta.innerText = "Ready to go?";
            }
            let expsActiveInfo = document.createElement('details');
            expsActiveInfo.innerHTML = '<summary><strong>' + expsActive.length + '</strong> experiment'+ (expsActive.length>1?'s':'') +' selected.</summary>';

            let expsActiveLinksContain = document.createElement('div');
            expsActiveLinksContain.innerHTML = '<p class="experiments_jump">Experiments apply in this order: <i>(Order matters! Some experiments will override others.)</i></p>';
            let expsActiveLinks = document.createElement('ol');
            
            expsActive.forEach(exp => {
                let newLi = document.createElement('li');
                newLi.setAttribute("data-input-name", exp.getAttribute('name'));
                newLi.setAttribute("data-input-value", exp.getAttribute('value'));
                let expDesc = exp.closest(".experiment_description");
                newLi.innerHTML = '<button type="button" class="experiment_scroll">'+ expDesc.querySelector('h5').innerText +'</button><button type="button" class="experiment_sort">Sort</button>';
                expsActiveLinks.append(newLi);
                newLi.querySelector('button.experiment_scroll').addEventListener("click", () => {
                    expDesc.scrollIntoView({behavior: 'smooth'});
                });
                newLi.querySelector('button.experiment_sort').addEventListener("click", () => {
                    var prevLi = newLi.previousElementSibling;
                    if(prevLi){
                        prevLi.before(newLi);
                    }
                    saveExperimentOrder();
                });
            });

            expsActiveLinksContain.append(expsActiveLinks);
            expsActiveInfo.append(expsActiveLinksContain);


            document.querySelector(".exps-active").innerHTML = '';
            document.querySelector(".exps-active").append(expsActiveInfo);
            form.querySelector("[type=submit]").removeAttribute("aria-disabled");
        } else{
            form.querySelector(".experiments_foot").classList.remove("experiments_foot-stick");
            let expsActive = document.querySelector(".exps-cta");
            if( expsActive ){
                expsActive.innerText = "";
            }
            let cta = document.querySelector(".exps-cta");
            if( cta ){
                cta.innerText = "Select one or more experiments...";
            }
            
            document.querySelector("[type=submit]").setAttribute("aria-disabled", true);

        }
    }

    function updateTestRunTotal(){
        let fvonly = document.querySelector('[name=fvonly]').value;
        let multiplier = fvonly === "1" ? 2 : 4;
        let totalRuns = parseFloat(document.querySelector('[name=runs]').value) * multiplier;
        document.querySelector('.exps-runcount-total').innerText = "(" + totalRuns + " total runs)";
    }

    document.querySelector('[name=runs]').addEventListener("input", updateTestRunTotal);
    updateTestRunTotal();

    // try and restore state at load
    refreshExperimentFormState();
    updateCount();
    refreshExperimentOrder();
    form.addEventListener("input", updateCount );
    form.addEventListener("input", refreshExperimentOrder );

    // add add buttons
    document.querySelectorAll(".experiment_pair_value-add:last-child").forEach(pair => {
        let btn = document.createElement('button');
        btn.type = "button";
        btn.className = "experiment_pair_value_addbtn";
        btn.innerText = "Add more";
        pair.after(btn);
        btn.addEventListener("click", () => { 
            let newpair = pair.cloneNode(true);
            pair.after(newpair);
        });
    });

    let overflowSections = document.querySelectorAll(".util_overflow_more");
    overflowSections.forEach(section => {
        let btn = document.createElement('button');
        btn.type = "button";
        btn.innerText = "Expand All"; 
        section.append(btn);
        btn.addEventListener("click", () => { 
            btn.closest(".util_overflow_more").classList.add("util_overflow_more-expanded");
        });
    });

    // select all
    document.querySelectorAll('.experiment_assets').forEach(details => {
        details.addEventListener('click', e => {
            if (e.target.className === 'selectall') {
                details.querySelectorAll('input[type=checkbox]').forEach(el => el.checked = true);
            }
            if (e.target.className === 'unselectall') {
                details.querySelectorAll('input[type=checkbox]').forEach(el => el.checked = false);
            }
        });
    });

    

</script>
    </body>
</html>
