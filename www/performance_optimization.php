<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include __DIR__ . '/common.inc';
require_once INCLUDES_PATH . '/include/TestInfo.php';
require_once INCLUDES_PATH . '/include/TestRunResults.php';
require_once INCLUDES_PATH . '/optimization_detail.inc.php';
require_once INCLUDES_PATH . '/include/PerformanceOptimizationHtmlSnippet.php';
require_once INCLUDES_PATH . '/include/AccordionHtmlHelper.php';

$page_keywords = array('Optimization','WebPageTest','Website Speed Test','Page Speed');
$page_description = "Website performance optimization recommendations$testLabel.";

global $testPath, $run, $cached, $step; // defined in common.inc
$testInfo = TestInfo::fromFiles($testPath);
$testRunResults = TestRunResults::fromFiles($testInfo, $run, $cached, $step);
$isMultistep = $testRunResults->countSteps() > 1;
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title><?php echo "$page_title - WebPageTest Optimization Check Results"; ?></title>
        <script>document.documentElement.classList.add('has-js');</script>

        <?php include('head.inc'); ?>
    </head>
    <body class="result">
            <?php
            $tab = 'Test Result';
            $subtab = 'Optimization';
            include 'header.inc';


            echo '<div class="results_main_contain">
            <div class="results_main">';

            ?>

<div class="results_and_command">

<div class="results_header">
    <h2>Performance Optimization Overview</h2>
    <p>A detailed view of this site's asset optimization and related opportunities.</p>
</div>


</div>

            <?php

            if ($isMultistep) {
                $firstStep = $testRunResults->getStepResult(1);
                $gradesFirstStep = getOptimizationGradesForStep($testInfo, $firstStep);
                $gradeKeys = array('ttfb', 'keep-alive', 'gzip', 'image_compression', 'caching', 'cdn');
                if (array_key_exists('progressive_jpeg', $gradesFirstStep)) {
                    array_splice($gradeKeys, 4, 0, array('progressive_jpeg'));
                }
                ?>











            <div id="result" class="results_body">
            <h3 class="hed_sub">Optimization Summary</h3>

            <p>Quickly jump to the sections below:</p>



                <table id="optimization_summary" class="grades">
                    <tr>
                        <th>Step</th>
                        <?php
                        foreach ($gradeKeys as $key) {
                            echo "<th>" . $gradesFirstStep[$key]['label'] . "</th>\n";
                        }
                        ?>
                    </tr>
                    <?php
                    foreach ($testRunResults->getStepResults() as $stepResult) {
                        $stepNum = $stepResult->getStepNumber();
                        $grades = getOptimizationGradesForStep($testInfo, $stepResult);
                        echo "<tr>\n<th class='step'><a href='#review_step$stepNum'>";
                        echo $stepResult->readableIdentifier() . "</a></th>\n";
                        foreach ($gradeKeys as $key) {
                            if (empty($grades[$key])) {
                                echo "<td class='na'>N/A</td>\n";
                            } else {
                                echo "<td class='" . $grades[$key]['class'] . "'><a href='#${key}_step${stepNum}'>";
                                echo $grades[$key]['grade'] . "</a></td>\n";
                            }
                        }
                        echo "<td class='checklist'><a href='#checklist_step$stepNum'>Full Checklist</a></td>\n";
                        echo "</tr>\n";
                    }
                    ?>
                </table>
            </div>

                <?php
                // still multistep
                $accordionHelper = new AccordionHtmlHelper($testRunResults);
                echo $accordionHelper->createAccordion("review", "performanceOptimization");
            } else {
                echo '<div id="result" class="results_body">';
                // singlestep
                echo '<h3 class="hed_sub">Optimization Summary</h3><p>Quickly jump to the sections below:</p>';

                include("grades.inc");

                $snippet = new PerformanceOptimizationHtmlSnippet($testInfo, $testRunResults->getStepResult(1));
                echo $snippet->create();
            }
            ?>

            <h3 class="hed_sub">Glossary</h3>
            <?php
                echo view('partials.glossary', []);
            ?>

        </div>

            <?php include('footer.inc'); ?>
        </div>
        </div>
        </div>


        <!--Load the AJAX API-->
        <?php
        if ($isMultistep) {
            echo '<script src="/assets/js/jk-navigation.js"></script>';
            echo '<script src="/assets/js/accordion.js"></script>';
            $testId = $testInfo->getId();
            $testRun = $testRunResults->getRunNumber();
            ?>
        <script>
        var accordionHandler = new AccordionHandler('<?php echo $testId ?>', <?php echo $testRun ?>);
        $(document).ready(initJS);

        function initJS() {
            accordionHandler.connect();
            window.onhashchange = handleHash;
            if (window.location.hash.length > 0) {
                handleHash();
            } else {
                accordionHandler.toggleAccordion($('#review_step1'), true);
            }
        }

        function handleHash() {
            var hash = window.location.hash;
            var hashParts = hash.split("_", 2);
            if (hashParts[0] == "#review") {
                accordionHandler.handleHash();
            } else if (hashParts[1].startsWith("step")) {
                // open accordion and load content before scrolling to it
                accordionHandler.toggleAccordion($('#review_' + hashParts[1]), true, function() {
                    $('html, body').animate({scrollTop: $(hash).offset().top + 'px'}, 'fast');
                });
            }
        }

        </script>

        <?php } //isMultistep ?>
    </body>
</html>
