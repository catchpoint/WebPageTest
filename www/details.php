<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
require_once('object_detail.inc');
require_once('page_data.inc');
require_once('waterfall.inc');

// Prevent the details page from running out of control.
set_time_limit(30);

require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestRunResults.php';
require_once __DIR__ . '/include/RunResultHtmlTable.php';
require_once __DIR__ . '/include/UserTimingHtmlTable.php';
require_once __DIR__ . '/include/WaterfallViewHtmlSnippet.php';
require_once __DIR__ . '/include/ConnectionViewHtmlSnippet.php';
require_once __DIR__ . '/include/RequestDetailsHtmlSnippet.php';
require_once __DIR__ . '/include/RequestHeadersHtmlSnippet.php';
require_once __DIR__ . '/include/AccordionHtmlHelper.php';

$testInfo = TestInfo::fromFiles($testPath);
$testRunResults = TestRunResults::fromFiles($testInfo, $run, $cached, null);
$data = loadPageRunData($testPath, $run, $cached, $test['testinfo']);
$isMultistep = $testRunResults->countSteps() > 1;

$page_keywords = array('Performance Test','Details','WebPageTest','Website Speed Test','Page Speed');
$page_description = "Website performance test details$testLabel";

function createForm($formName, $btnText, $callback, $id, $owner, $secret, $siteKey) {
  echo "<form name='$formName' id='$formName' action='/runtest.php?test=$id' method='POST' enctype='multipart/form-data'>";
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
    echo "<button data-sitekey=\"$siteKey\" data-callback='$callback' class=\"g-recaptcha\">$btnText</button>";
  } else {
    echo "<input type=\"submit\" value=\"$btnText\">";
  }
  echo "\n</form>\n";
}

?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest Test Details<?php echo $testLabel; ?></title>
        <script>document.documentElement.classList.add('has-js');</script>

        <?php $gaTemplate = 'Details'; include ('head.inc'); ?>
        <style type="text/css">
        div.bar {
            height:20px;
            margin-top:auto;
            margin-bottom:auto;
        }

        .left {text-align:left;}
        .center {text-align:center;}

        .indented1 {padding-left: 1rem;}
        .indented2 {padding-left: 2rem;}

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
        table.details th.reqMime, table.details td.reqMime {
          max-width: 10em;
          word-wrap: break-word;
          overflow: hidden;
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

        .headers_list h4 {
          font-weight: 500;
          font-size: .8em;
          border-top: 1px solid #eee;
          padding: .8rem 0;
          line-height: 1.3;

        }
        .headers_list h4 strong {
          display: block;
          font-weight: 700;
          padding: .5rem 0;
          font-size: 1.1em;
        }
        .headers_list h4 strong:before {
          content: "+";
          width: 1em;
          display: inline-block;
        }
        .headers_list h4 span[data-expanded] strong:before {
          content: "-";
          
        }
        .a_request {
            cursor: pointer;
        }

        <?php
        include __DIR__ . "/css/accordion.css";
        include "waterfall.css";
        ?>
        </style>
    </head>
    <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
            <?php
            $tab = 'Test Result';
            $subtab = 'Details';
            include 'header.inc';
            ?>

            <div id="result">
            <div class="testinfo_command-bar">
                <div class="testinfo_meta">
                    <?php
                    echo GetTestInfoHtml();
                    if (array_key_exists('custom', $data) && is_array($data['custom']) && count($data['custom']))
                    echo '<br><a href="/custom_metrics.php?' . "test=$id&run=$run&cached=$cached" . '">Custom Metrics</a>';
                    ?>
                    
                </div>
                <div class="testinfo_forms">
                <?php
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
                        createForm('urlEntry', 'Re-run Test', 'onRecaptchaSubmit', $id, $owner, $secret, $siteKey);
                        
                    }
                    ?>
                </div>
                <div class="testinfo_artifacts" tabindex="0">
                <h3>Export Files</h3>
                <ul class="testinfo_artifacts-list">
                <?php
                    $fvMedian = $testResults->getMedianRunNumber($median_metric, false);
                    $rvMedian = $testResults->getMedianRunNumber($median_metric, true);

                    echo "<li><a href='/jsonResult.php?test=$id&pretty=1'>View JSON</a></li>";
                    if (is_file("$testPath/test.log"))
                        echo "<li><a href=\"/viewlog.php?test=$id\">View Test Log</a></li>";
                    if (is_file("$testPath/lighthouse.log.gz"))
                        echo "<li><a href=\"/viewlog.php?test=$id&lighthouse=1\">View Lighthouse Log</a></li>";
                    $publish = GetSetting('publishTo');
                    if( $publish && GetSetting('host') != 'www.webpagetest.org' )
                        echo "<li><a href=\"/publish.php?test=$id\">Publish to $publish</a></li>";
                    echo "<li data-artifact-json=\"download\"><a href='/jsonResult.php?test=$id&pretty=1' download>Download JSON</a></li>";
                    echo '<li><a href="/export.php?bodies=1&pretty=1&test=' . $id . '">Download HAR</a></li>';
                    if ($timelineZip)
                      echo "<li><a href=\"$timelineZip\" download>Download Timeline</a></li>";
                    if (is_file("$testPath/test.log"))
                      echo "<li><a href=\"/viewlog.php?test=$id\" download>Download Test Log</a></li>";
                    if (is_file("$testPath/lighthouse.log.gz"))
                      echo "<li><a href=\"/viewlog.php?test=$id&lighthouse=1\" download>Download Lighthouse Log</a></li>";
                    if( is_file("$testPath/{$run}{$cachedText}_bodies.zip") )
                      echo "<li><a href=\"/$testPath/{$run}{$cachedText}_bodies.zip\" download>Download Response Bodies</a></li>";
                ?>
                </ul>
                </div>
                  </div>
                <div class="cleared"></div>
                <?php
                  $htmlTable = new RunResultHtmlTable($testInfo, $testRunResults);
                  echo $htmlTable->create();
                ?>
                <br>
                <?php
                $userTimingTable = new UserTimingHtmlTable($testRunResults);
                echo $userTimingTable->create();
                if (isset($testRunResults)) {
                  require_once(__DIR__ . '/include/CrUX.php');
                  if ($cached) {
                    InsertCruxHTML(null, $testRunResults);
                  } else {
                    InsertCruxHTML($testRunResults, null);
                  }
                }
                ?>
                <script type="text/javascript">
                  markUserTime('aft.Detail Table');
                </script>

                <?php
                if ($isMultistep) {
                    echo "<a name='quicklinks'><h3>Quicklinks</h3></a>\n";
                    echo "<table id='quicklinks_table'>\n";
                    for ($i = 1; $i <= $testRunResults->countSteps(); $i++) {
                        $stepResult = $testRunResults->getStepResult($i);
                        $urlGenerator = $stepResult->createUrlGenerator("", false);
                        $stepSuffix = "step" . $i;
                        $class = $i % 2 == 0 ? " class='even'" : "";
                        echo "<tr$class>\n";
                        echo "<th>" . $stepResult->readableIdentifier() . "</th>";
                        echo "<td><a href='#waterfall_view_$stepSuffix'>Waterfall View</a></td>";
                        echo "<td><a href='#connection_view_$stepSuffix'>Connection View</a></td>";
                        echo "<td><a href='#request_details_$stepSuffix'>Request Details</a></td>";
                        echo "<td><a href='#request_headers_$stepSuffix'>Request Headers</a></td>";
                        echo "<td><a href='" . $urlGenerator->stepDetailPage("customWaterfall", "width=930") . "'>Customize Waterfall</a></td>";
                        echo "<td><a href='" . $urlGenerator->stepDetailPage("pageimages") . "'>All Images</a></td>";
                        echo "<td><a href='" . $urlGenerator->stepDetailPage("http2_dependencies") . "'>HTTP/2 Dependency Graph</a></td>";
                        echo "</tr>";
                    }
                    echo "</table>\n";
                    $accordionHelper = new AccordionHtmlHelper($testRunResults);
                }
                ?>

                <div style="text-align:center;">
                <h3 name="waterfall_view">Waterfall View</h3>
                <?php
                    if ($isMultistep) {
                        echo $accordionHelper->createAccordion("waterfall_view", "waterfall");
                    } else {
                        $waterfallSnippet = new WaterfallViewHtmlSnippet($testInfo, $testRunResults->getStepResult(1));
                        echo $waterfallSnippet->create();
                    }
                ?>
                <br>
                <br>
                <h3 name="connection_view">Connection View</h3>
                    <?php
                    if ($isMultistep) {
                        echo $accordionHelper->createAccordion("connection_view", "connection");
                    } else {
                        $waterfallSnippet = new ConnectionViewHtmlSnippet($testInfo, $testRunResults->getStepResult(1));
                        echo $waterfallSnippet->create();
                    }
                    ?>
                </div>
                <br><br>

                <br>
                <h3 name="request_details_view">Request Details</h3>
                <?php
                    if ($isMultistep) {
                        echo $accordionHelper->createAccordion("request_details", "requestDetails", "initDetailsTable");
                    } else {
                        $useLinks = !GetSetting('nolinks');
                        $requestDetailsSnippet = new RequestDetailsHtmlSnippet($testInfo, $testRunResults->getStepResult(1), $useLinks);
                        echo $requestDetailsSnippet->create();
                    }
                ?>

                <br>
                <br>
                <?php
                    echo '';
                    if (isset($test) && is_array($test) && isset($test['testinfo']['testerDNS']))
                        echo "<p>Test Machine DNS Server(s): {$test['testinfo']['testerDNS']}</p>\n";

                    if ($isMultistep) {
                        echo "<br><h3 name=\"request_headers_view\" class='center'>Request Headers</h3>\n";
                        echo $accordionHelper->createAccordion("request_headers", "requestHeaders", "initHeaderRequestExpander");
                    } else {
                        $requestHeadersSnippet = new RequestHeadersHtmlSnippet($testRunResults->getStepResult(1), $useLinks);
                        $snippet = $requestHeadersSnippet->create();
                        if ($snippet) {
                            echo '<div id="headers">';
                            echo '<hr><h3>Request Headers</h3>';
                            echo $snippet;
                            echo '</div>';
                        }
                    }
                ?>
            </div>
                </div>
              
        </div>
        <?php include('footer.inc'); ?>

        <div id="experimentSettings" class="inactive">
              <?php
                    if( !$headless && gz_is_file("$testPath/testinfo.json")
                        && !array_key_exists('published', $test['testinfo'])
                        && ($isOwner || !$test['testinfo']['sensitive'])
                        && (!isset($test['testinfo']['type']) || !strlen($test['testinfo']['type'])) )
                    {
                        $siteKey = GetSetting("recaptcha_site_key", "");
                        if (!isset($uid) && !isset($user) && !isset($USER_EMAIL) && strlen($siteKey)) {
                          ?>
                          <script>
                          function onRecaptchaSubmitExperiment(token) {
                            document.getElementById("experimentForm").submit();
                          }
                          </script>
                          <?php
                        }

                        // load the secret key (if there is one)
                        $secret = GetServerSecret();
                        if (!isset($secret))
                            $secret = '';
                            createForm('experimentForm', 'Run Experiment', 'onRecaptchaSubmitExperiment', $id, $owner, $secret, $siteKey);
                          }
                    ?>
              </div>
        <?php
        if ($isMultistep) {
          echo '<script type="text/javascript" src="/js/jk-navigation.js"></script>';
          echo '<script type="text/javascript" src="/js/accordion.js"></script>';
          $testId = $testInfo->getId();
          $testRun = $testRunResults->getRunNumber();
          echo '<script type="text/javascript">';
          echo "var accordionHandler = new AccordionHandler('$testId', $testRun);";
          echo '</script>';
        }
        ?>
        <script type="text/javascript">
        function expandRequest(targetNode) {
          if (targetNode.length) {
            var div_to_expand = $('#' + targetNode.attr('data-target-id'));

            if (div_to_expand.is(":visible")) {
                div_to_expand.hide();
                targetNode.removeAttr("data-expanded");
                //targetNode.html('+' + targetNode.html().substring(1));
            } else {
                div_to_expand.show();
                targetNode.attr("data-expanded", "true");
                //targetNode.html('-' + targetNode.html().substring(1));
            }
          }
        }

        function initDetailsTable(targetNode) {
             $(targetNode).find(".tableDetails").tablesorter({
                headers: { 3: { sorter:'currency' } ,
                    4: { sorter:'currency' } ,
                    5: { sorter:'currency' } ,
                    6: { sorter:'currency' } ,
                    7: { sorter:'currency' } ,
                    8: { sorter:'currency' } ,
                    9: { sorter:'currency' } ,
                    10: { sorter:'currency' }
                }
            });
        }

        function initHeaderRequestExpander(targetNode) {
            $(targetNode).find('.a_request').click(function () {
                expandRequest($(this));
            });
        }

        function expandAll(step) {
          var expandAllNode = $("#step" + step + "_all");
          var expandText = expandAllNode.html();
          var doShow = expandText.substring(0, 1) == "+";
          expandAllNode.html(doShow ? "- Collapse All" : "+ Expand All");
          $("#header_details_step" + step + " .header_details").each(function(index) {
            $(this).toggle(doShow);
          });
        }

        function scrollTo(node) {
            $('html, body').animate({scrollTop: node.offset().top + 'px'}, 'fast');
        }

        function handleRequestHash() {
            var stepNum = -1;
            var doExpandAll = false;
            if (window.location.hash.startsWith("#step")) {
                var parts = window.location.hash.split("_");
                stepNum = parts[0].substring("#step".length);
                doExpandAll = parts[1] == "all";
            } else if (window.location.hash == '#all') {
                stepNum = 1;
                doExpandAll = true;
            }
           if (stepNum <= 0) {
           return;
           }
            var expand = function() {
                var scrollToNode = $(window.location.hash);
                if (doExpandAll) {
                    scrollToNode = $("#step" + stepNum + "_all");
                    expandAll(stepNum);
                } else {
                  if (scrollToNode.length > 0) {
                    expandRequest(scrollToNode);
                  }
                    
                }
                if (scrollToNode.length > 0) {
                  scrollTo(scrollToNode);
                }
            };
            var slide_opener = $("#request_headers_step" + stepNum);
            if (slide_opener.length) {
                <?php if ($isMultistep) { ?>
                accordionHandler.toggleAccordion(slide_opener, true, expand);
                <?php } ?>
            } else {
                expand();
            }
        }

        function handleHash() {
            var hash = window.location.hash;
            if (!hash) {
                var defaultAccordion = $("#waterfall_view_step1");
                if (defaultAccordion.length) {
                    <?php if ($isMultistep) { ?>
                    accordionHandler.toggleAccordion(defaultAccordion);
                    <?php } ?>
                }
                return;
            }
            if (hash.startsWith("#waterfall_view_step") ||
                hash.startsWith("#connection_view_step") ||
                hash.startsWith("#request_details_step") ||
                hash.startsWith("#request_headers_step")) {
              <?php if ($isMultistep) { ?>
              accordionHandler.handleHash();
              <?php } ?>
            }
            handleRequestHash();
        }



        // init existing snippets
        $(document).ready(function() {
            initDetailsTable($(document));
            initHeaderRequestExpander($(document));
            <?php if ($isMultistep) { ?>
              accordionHandler.connect();
            <?php } ?>
            handleHash();
        });
        window.onhashchange = handleHash;

        <?php
        include "waterfall.js";
        ?>
        </script>
        
    </body>
</html>
