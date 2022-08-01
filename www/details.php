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
require_once __DIR__ . '/include/TestResults.php';
require_once __DIR__ . '/include/TestRunResults.php';
require_once __DIR__ . '/include/RunResultHtmlTable.php';
require_once __DIR__ . '/include/UserTimingHtmlTable.php';
require_once __DIR__ . '/include/WaterfallViewHtmlSnippet.php';
require_once __DIR__ . '/include/ConnectionViewHtmlSnippet.php';
require_once __DIR__ . '/include/RequestDetailsHtmlSnippet.php';
require_once __DIR__ . '/include/RequestHeadersHtmlSnippet.php';
require_once __DIR__ . '/include/AccordionHtmlHelper.php';

$testInfo = TestInfo::fromFiles($testPath);
$testResults = TestResults::fromFiles($testInfo);
$testRunResults = TestRunResults::fromFiles($testInfo, $run, $cached, null);
$data = loadPageRunData($testPath, $run, $cached, $test['testinfo']);
$pageData = loadAllPageData($testPath);
$isMultistep = $testRunResults->countSteps() > 1;

$page_keywords = array('Performance Test', 'Details', 'WebPageTest', 'Website Speed Test', 'Page Speed');
$page_description = "Website performance test details$testLabel";

function createForm($formName, $btnText, $id, $owner, $secret)
{
    echo "<form name='$formName' id='$formName' action='/runtest.php?test=$id' method='POST' enctype='multipart/form-data'>";
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
    echo "<input type=\"submit\" value=\"$btnText\">";
    echo "\n</form>\n";
}

?>
<!DOCTYPE html>
<html lang="en-us">

<head>
    <title><?php echo "$page_title - WebPageTest Details"; ?></title>
    <script>
        document.documentElement.classList.add('has-js');
    </script>

    <?php $gaTemplate = 'Details';
    include('head.inc'); ?>
</head>

<body class="result result-details">
    <?php
    $tab = 'Test Result';
    $subtab = 'Details';
    include 'header.inc';

    ?>

    <div class="results_main_contain">
        <div class="results_main">


            <div class="results_and_command">

                <div class="results_header">
                    <h2>Requests Details</h2>
                    <p>Use this page to explore the metric timings and request waterfall for any run of your test.</p>
                </div>


            </div>


            <div id="result" class="results_body">

                <?php
                echo '<h3 class="hed_sub">Observed Metrics <em>(Run number ' . $run . ($cached ? ', Repeat View' : '') . ')</em></h3>';

                $hasRepeats = GetMedianRun($pageData, 1, $median_metric);
                if ($testResults->countRuns() > 1 || $hasRepeats) {
                    $runs = $testResults->countRuns() + 1;

                    $useFriendlyUrls = !isset($_REQUEST['end']) && FRIENDLY_URLS;
                    $endParams = isset($_REQUEST['end']) ? ("end=" . $_REQUEST['end']) : "";

                    echo '<p>View run details: ';
                    for ($i = 1; $i < $runs; $i++) {
                        $menuUrlGenerator = UrlGenerator::create($useFriendlyUrls, "", $id, $i, false);

                        $link = $menuUrlGenerator->resultPage("details", $endParams);
                        if ($hasRepeats) {
                            $menuUrlGeneratorCached = UrlGenerator::create($useFriendlyUrls, "", $id, $i, true);
                            $linkCACHED = $menuUrlGeneratorCached->resultPage("details", $endParams);
                        }

                        echo "<a href=\"$link\"" . ($run === $i && !$cached ? ' aria-current="page"' : '') . ">Run $i</a>";
                        if ($linkCACHED) {
                            echo " <a href=\"$linkCACHED\"" . ($run === $i && $cached ? ' aria-current="page"' : '') . ">(Repeat View)</a>";;
                        }

                        if ($i + 1 < $runs) {
                            echo ", ";
                        }
                    }
                    echo '</p>';
                }
                ?>


                <?php
                $htmlTable = new RunResultHtmlTable($testInfo, $testRunResults);
                $htmlTable->disableColumns(array(
                    RunResultHtmlTable::COL_RESULT
                ));
                $htmlTable->enableColumns(array(
                    RunResultHtmlTable::COL_DOC_COMPLETE,
                    RunResultHtmlTable::COL_DOC_REQUESTS,
                    RunResultHtmlTable::COL_DOC_BYTES,
                    RunResultHtmlTable::COL_FULLYLOADED,
                    RunResultHtmlTable::COL_REQUESTS
                ));
                echo $htmlTable->create(true);
                ?>
                <?php
                $userTimingTable = new UserTimingHtmlTable($testRunResults);
                echo $userTimingTable->create(true);


                // Full custom metrics (formerly in custommetrics.php)

                if (
                    isset($pageData) &&
                    is_array($pageData) &&
                    array_key_exists($run, $pageData) &&
                    is_array($pageData[$run]) &&
                    array_key_exists($cached, $pageData[$run]) &&
                    array_key_exists('custom', $pageData[$run][$cached]) &&
                    is_array($pageData[$run][$cached]['custom']) &&
                    count($pageData[$run][$cached]['custom'])
                ) {
                    echo '<details class="details_custommetrics"><summary>Custom Metrics Data</summary>';
                    echo '<div class="scrollableTable"><table class="pretty details">';
                    foreach ($pageData[$run][$cached]['custom'] as $metric) {
                        if (array_key_exists($metric, $pageData[$run][$cached])) {
                            echo '<tr><th>' . htmlspecialchars($metric) . '</th><td>';
                            $val = $pageData[$run][$cached][$metric];
                            if (!is_string($val) && !is_numeric($val)) {
                                $val = json_encode($val);
                            }
                            echo htmlspecialchars($val);
                            echo '</td></tr>';
                        }
                    }
                    echo '</table></details>';
                }




                if (isset($testRunResults)) {
                    echo '<div class="cruxembed">';
                    require_once(__DIR__ . '/include/CrUX.php');
                    if ($cached) {
                        InsertCruxHTML(null, $testRunResults);
                    } else {
                        InsertCruxHTML($testRunResults, null);
                    }
                    echo '</div>';
                }
                ?>

                <?php
                if ($isMultistep) {
                    echo "<a name='quicklinks'><h3 class='hed_sub'>Quicklinks</h3></a>\n";
                    echo "<div class='scrollableTable'><table class='pretty details' id='quicklinks_table'>\n";
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
                    echo "</table></div>\n";
                    $accordionHelper = new AccordionHtmlHelper($testRunResults);
                }
                ?>

                <div>
                    <h3 class="hed_sub" name="waterfall_view">Waterfall View</h3>
                    <?php
                    if ($isMultistep) {
                        echo $accordionHelper->createAccordion("waterfall_view", "waterfall");
                    } else {
                        $waterfallSnippet = new WaterfallViewHtmlSnippet($testInfo, $testRunResults->getStepResult(1));
                        echo $waterfallSnippet->create();
                    }
                    ?>

                    <h3 class="hed_sub" name="connection_view">Connection View</h3>
                    <?php
                    if ($isMultistep) {
                        echo $accordionHelper->createAccordion("connection_view", "connection");
                    } else {
                        $waterfallSnippet = new ConnectionViewHtmlSnippet($testInfo, $testRunResults->getStepResult(1));
                        echo $waterfallSnippet->create();
                    }
                    ?>
                </div>

                <h3 class="hed_sub" name="request_details_view">Request Details</h3>
                <?php
                if ($isMultistep) {
                    echo $accordionHelper->createAccordion("request_details", "requestDetails", "initDetailsTable");
                } else {
                    $useLinks = !GetSetting('nolinks');
                    $requestDetailsSnippet = new RequestDetailsHtmlSnippet($testInfo, $testRunResults->getStepResult(1), $useLinks);
                    echo $requestDetailsSnippet->create();
                }
                ?>


                <?php
                echo '';
                if (isset($test) && is_array($test) && isset($test['testinfo']['testerDNS'])) {
                    echo "<p>Test Machine DNS Server(s): {$test['testinfo']['testerDNS']}</p>\n";
                }

                if ($isMultistep) {
                    echo "<h3 class=\"hed_sub\" name=\"request_headers_view\" class='center'>Request Headers</h3>\n";
                    echo $accordionHelper->createAccordion("request_headers", "requestHeaders", "initHeaderRequestExpander");
                } else {
                    $requestHeadersSnippet = new RequestHeadersHtmlSnippet($testRunResults->getStepResult(1), $useLinks);
                    $snippet = $requestHeadersSnippet->create();
                    if ($snippet) {
                        echo '<div id="headers">';
                        echo '<h3 class="hed_sub">Request Headers</h3>';
                        echo $snippet;
                        echo '</div>';
                    }
                }
                ?>
            </div>
        </div>

    </div>
    <?php include('footer.inc'); ?>

    </div>
    </div>

    <div id="requestBlockingSettings" class="inactive">
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
            createForm('requestBlockingForm', 'Run with Blocked', $id, $owner, $secret);
        }
        ?>
    </div>
    <?php
    if ($isMultistep) {
        echo '<script src="/js/jk-navigation.js"></script>';
        echo '<script src="/js/accordion.js"></script>';
        $testId = $testInfo->getId();
        $testRun = $testRunResults->getRunNumber();
        echo '<script>';
        echo "var accordionHandler = new AccordionHandler('$testId', $testRun);";
        echo '</script>';
    }
    ?>
    <script>
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
                headers: {
                    3: {
                        sorter: 'currency'
                    },
                    4: {
                        sorter: 'currency'
                    },
                    5: {
                        sorter: 'currency'
                    },
                    6: {
                        sorter: 'currency'
                    },
                    7: {
                        sorter: 'currency'
                    },
                    8: {
                        sorter: 'currency'
                    },
                    9: {
                        sorter: 'currency'
                    },
                    10: {
                        sorter: 'currency'
                    }
                }
            });
        }

        function initHeaderRequestExpander(targetNode) {
            $(targetNode).find('.a_request').click(function() {
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
            $('html, body').animate({
                scrollTop: node.offset().top + 'px'
            }, 'fast');
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