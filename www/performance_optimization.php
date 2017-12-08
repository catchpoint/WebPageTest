<?php 
include __DIR__ . '/common.inc';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestRunResults.php';
require_once __DIR__ . '/optimization_detail.inc.php';
require_once __DIR__ . '/include/PerformanceOptimizationHtmlSnippet.php';
require_once __DIR__ . '/include/AccordionHtmlHelper.php';

$page_keywords = array('Optimization','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Website performance optimization recommendations$testLabel.";

global $testPath, $run, $cached, $step; // defined in common.inc
$testInfo = TestInfo::fromFiles($testPath);
$testRunResults = TestRunResults::fromFiles($testInfo, $run, $cached, $step);
$isMultistep = $testRunResults->countSteps() > 1;
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest Optimization Check Results<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Optimization Check'; include ('head.inc'); ?>
        <style type="text/css">
            td.nowrap {white-space:nowrap;}
            th.nowrap {white-space:nowrap;}
            tr.blank {height:2ex;}
			.indented1 {padding-left: 40pt;}
			.indented2 {padding-left: 80pt;}
            h1
            {
                font-size: larger;
            }
            
            #opt
            {
                margin-bottom: 2em;
            }
            #opt_table
            {
                border: 1px solid black;
                border-collapse: collapse;
            }
            #opt_table th
            {
                padding: 5px;
                border: 1px solid black;
                font-weight: normal;
            }
            #opt_table td
            {
                padding: 5px;
                border: 1px solid black;
                font-weight: bold;
            }

            #optimization_summary {
                float: none;
                display: inline-table;
            }

            #optimization_summary td {
                min-height: 30px;
                font-weight: bold;
                font-size: 2.5em;
                max-width: 100px;
                border: 5px white solid;
            }

            #optimization_summary td a {
                text-align: center;
                display: block;
                height: 100%;
                padding: 0.5em;
            }

            #optimization_summary td.checklist {
                font-size: 1em;
                font-weight: normal;
                text-decoration: underline;
            }

            #optimization_summary .step {
                font-size: 1.5em;
                max-width: none;
            }

            #optimization_summary th {
                padding: 0.5em;
                font-weight: bold;
                font-size: 1.2em;
                max-width: 100px;
            }

            .snippet_container .details {
                padding: 1em;
                overflow-x: auto;
            }

            .snippet_container .details h2 {
                text-align: center;
            }

            <?php
            if ($isMultistep) {
                include __DIR__ . "/css/accordion.css";
            }
            ?>
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Performance Review';
            include 'header.inc';

            if ($isMultistep) {
                $firstStep = $testRunResults->getStepResult(1);
                $gradesFirstStep = getOptimizationGradesForStep($testInfo, $firstStep);
                $gradeKeys = array('ttfb', 'keep-alive', 'gzip', 'image_compression', 'caching', 'cdn');
                if (array_key_exists('progressive_jpeg', $gradesFirstStep)) {
                    array_splice($gradeKeys, 4, 0, array('progressive_jpeg'));
                }
            ?>
            <div style="text-align:center;">
                <h1>Optimization Summary</h1>
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
            <br>
            <?php include('./ads/optimization_middle.inc'); ?>
            <br>
            <?php
                // still multistep
                $accordionHelper = new AccordionHtmlHelper($testRunResults);
                echo $accordionHelper->createAccordion("review", "performanceOptimization");
            } else {
                // singlestep
                $snippet = new PerformanceOptimizationHtmlSnippet($testInfo, $testRunResults->getStepResult(1));
                $snippet->setAdsFile(__DIR__ . '/ads/optimization_middle.inc');
                echo $snippet->create();
            }
            ?>

            <?php
                echo '<p></p><br>';
                include('./ads/optimization_bottom.inc');
                echo '<br>';
                dumpOptimizationGlossary($settings);
            ?>
            
            <?php include('footer.inc'); ?>
        </div>
        <a href="#top" id="back_to_top">Back to top</a>

        <!--Load the AJAX API-->
        <?php
        if ($isMultistep) {
            echo '<script type="text/javascript" src="/js/jk-navigation.js"></script>';
            echo '<script type="text/javascript" src="/js/accordion.js"></script>';
            $testId = $testInfo->getId();
            $testRun = $testRunResults->getRunNumber();
        ?>
        <script type="text/javascript">
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
