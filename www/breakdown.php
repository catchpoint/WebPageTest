<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include __DIR__ . '/common.inc';
require_once __DIR__ . '/breakdown.inc';
require_once __DIR__ . '/contentColors.inc';
require_once __DIR__ . '/waterfall.inc';
require_once __DIR__ . '/page_data.inc';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestPaths.php';
require_once __DIR__ . '/include/TestRunResults.php';
require_once __DIR__ . '/include/MimetypeBreakdownHtmlSnippet.php';
require_once __DIR__ . '/include/AccordionHtmlHelper.php';

$page_keywords = array('Content Breakdown','MIME Types','WebPageTest','Website Speed Test','Page Speed');
$page_description = "Website content breakdown by MIME type$testLabel";

$testInfo = TestInfo::fromFiles($testPath);
$firstViewResults = TestRunResults::fromFiles($testInfo, $run, false);
$isMultistep = $firstViewResults->countSteps() > 1;
$repeatViewResults = null;
if(!$testInfo->isFirstViewOnly()) {
    $repeatViewResults = TestRunResults::fromFiles($testInfo, $run, true);
}
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title><?php echo $page_title; ?> - WebPageTest Content Breakdown</title>
        <script>document.documentElement.classList.add('has-js');</script>
 
        <?php $gaTemplate = 'Content Breakdown'; include ('head.inc'); ?>
    </head>
    <body class="result">
            <?php
            $tab = 'Test Result';
            $subtab = 'Content';
            include 'header.inc';
            ?>

            
<div class="results_main_contain">
        <div class="results_main">

        <div class="results_and_command">

            <div class="results_header">
                <h2>Content Breakdown</h2>
                <p>How this site's assets are comprised by content type.</p>
            </div>


            </div>

            <div id="result" class="results_body">
            <?php
            if ($isMultistep) {
                echo "<a name='quicklinks'><h3>Quicklinks</h3></a>\n";
                echo "<table id='quicklinks_table'>\n";
                $rvSteps = $repeatViewResults ? $repeatViewResults->countSteps() : 0;
                $maxSteps = max($firstViewResults->countSteps(), $rvSteps);
                for ($i = 1; $i <= $maxSteps; $i++) {
                    $stepResult = $firstViewResults->getStepResult($i);
                    $stepSuffix = "step" . $i;
                    $class = $i % 2 == 0 ? " class='even'" : "";
                    echo "<tr$class>\n";
                    echo "<th>" . $stepResult->readableIdentifier() . "</th>";
                    echo "<td><a href='#breakdown_fv_$stepSuffix'>First View Breakdown</a></td>";
                    if ($repeatViewResults) {
                        echo "<td><a href='#breakdown_rv_$stepSuffix'>Repeat View Breakdown</a></td>";
                    }
                    echo "</tr>";
                }
                echo "</table>\n<br>\n";
            }
            ?>
            <h3 class="hed_sub">Breakdown by MIME type</h3>
            <h4>First View:</h4>
            <?php
                if ($isMultistep) {
                    $accordionHelper = new AccordionHtmlHelper($firstViewResults);
                    echo $accordionHelper->createAccordion("breakdown_fv", "mimetypeBreakdown", "drawTable");
                } else {
                    $snippetFv = new MimetypeBreakdownHtmlSnippet($testInfo, $firstViewResults->getStepResult(1));
                    echo $snippetFv->create();
                    // defines the global JS object wptBreakdownData which contains the breakdown data at key
                    // $snippetFv->getBreakdownId(), so it can be globally found from JS
                }
            ?>
            <?php if ($repeatViewResults) { ?>

            <h4>Repeat View:</h4>
                <?php
                    if ($isMultistep) {
                        $accordionHelper = new AccordionHtmlHelper($repeatViewResults);
                        echo $accordionHelper->createAccordion("breakdown_rv", "mimetypeBreakdown", "drawTable");
                    } else {
                        $snippetRv = new MimetypeBreakdownHtmlSnippet($testInfo, $repeatViewResults->getStepResult(1));
                        echo $snippetRv->create();
                    }
                ?>
            <?php } ?>
                </div>
        <?php include('footer.inc'); ?>
                </div>
                </div>
                </div>

        <!--Load the AJAX API-->
        <script src="//www.google.com/jsapi"></script>
        <?php
        if ($isMultistep) {
            echo '<script src="/js/jk-navigation.js"></script>';
            echo '<script src="/js/accordion.js"></script>';
            $testId = $testInfo->getId();
            $testRun = $firstViewResults->getRunNumber();
            echo '<script>';
            echo "var accordionHandler = new AccordionHandler('$testId', $testRun);";
            echo '</script>';
        }
        ?>
        <script>

        // Load the Visualization API and the table package.
        google.load('visualization', '1', {'packages':['table', 'corechart']});
        google.setOnLoadCallback(initJS);

        function initJS() {
            <?php if ($isMultistep) { ?>
                accordionHandler.connect();
                window.onhashchange = function() { accordionHandler.handleHash() };
                if (window.location.hash.length > 0) {
                    accordionHandler.handleHash();
                } else {
                    accordionHandler.toggleAccordion($('#breakdown_fv_step1'), true);
                }
            <?php } else { ?>
                drawTable($('#<?php echo $snippetFv->getBreakdownId(); ?>'));
                <?php if ($repeatViewResults) { ?>
                drawTable($('#<?php echo $snippetRv->getBreakdownId(); ?>'));
                <?php } ?>
            <?php } ?>
        }

        function rgb2html(rgb) {
            return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
        }

        function drawTable(parentNode) {
            parentNode = $(parentNode);
            var breakdownId = parentNode.find(".breakdownFrame").data('breakdown-id');
            if (!breakdownId) {
                return;
            }
            var breakdown = wptBreakdownData[breakdownId];
            var numData = breakdown.length;
            var data = new google.visualization.DataTable();
            data.addColumn('string', 'MIME Type');
            data.addColumn('number', 'Requests');
            data.addColumn('number', 'Bytes');
            data.addColumn('number', 'Uncompressed');
            data.addRows(numData);
            var requests = new google.visualization.DataTable();
            requests.addColumn('string', 'Content Type');
            requests.addColumn('number', 'Requests');
            requests.addRows(numData);
            var colors = new Array();
            var bytes = new google.visualization.DataTable();
            bytes.addColumn('string', 'Content Type');
            bytes.addColumn('number', 'Bytes');
            bytes.addRows(numData);
            for (var i = 0; i < numData; i++) {
                data.setValue(i, 0, breakdown[i]['type']);
                data.setValue(i, 1, breakdown[i]['requests']);
                data.setValue(i, 2, breakdown[i]['bytes']);
                data.setValue(i, 3, breakdown[i]['bytesUncompressed']);
                requests.setValue(i, 0, breakdown[i]['type']);
                requests.setValue(i, 1, breakdown[i]['requests']);
                bytes.setValue(i, 0, breakdown[i]['type']);
                bytes.setValue(i, 1, breakdown[i]['bytes']);
                colors.push(rgb2html(breakdown[i]['color']));
            }

            var viewRequests = new google.visualization.DataView(data);
            viewRequests.setColumns([0, 1]);

            var tableRequests = new google.visualization.Table(parentNode.find('div.tableRequests')[0]);
            tableRequests.draw(viewRequests, {showRowNumber: false, sortColumn: 1, sortAscending: false});

            var viewBytes = new google.visualization.DataView(data);
            viewBytes.setColumns([0, 2, 3]);

            var tableBytes = new google.visualization.Table(parentNode.find('div.tableBytes')[0]);
            tableBytes.draw(viewBytes, {showRowNumber: false, sortColumn: 1, sortAscending: false});

            var pieRequests = new google.visualization.PieChart(parentNode.find('div.pieRequests')[0]);
            pieRequests.draw(requests, {width: 450, height: 300, title: 'Requests', colors: colors});

            var pieBytes = new google.visualization.PieChart(parentNode.find('div.pieBytes')[0]);
            pieBytes.draw(bytes, {width: 450, height: 300, title: 'Bytes', colors: colors});
        }
        </script>
    </body>
</html>
