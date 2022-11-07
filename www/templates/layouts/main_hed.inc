<?php

// Copyright 2021 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

require_once INCLUDES_PATH . '/page_data.inc';
require_once INCLUDES_PATH . '/include/TestInfo.php';
require_once INCLUDES_PATH . '/include/TestResults.php';
require_once INCLUDES_PATH . '/include/TestRunResults.php';

//If we're looking at a test result, include the extra header section and sub-menu
if (!strcasecmp('Test Result', $tab) && (!isset($nosubheader) || !@$nosubheader) && !EMBED) {
    // make sure the test is actually complete
    if (isset($test['test']['completeTime'])) {
        if (!isset($testResults) || !isset($testInfo)) {
            $testInfo = TestInfo::fromFiles($testPath);
            $testResults = TestResults::fromFiles($testInfo);
        }

        $gradeRun = 1;
        if (array_key_exists('run', $_GET) && $_GET["run"]) {
            $gradeRun = intval($_GET["run"]);
        } else {
            $medianRun = $testResults->getMedianRunNumber($median_metric, false);
            if ($medianRun) {
                $gradeRun = $medianRun;
            }
        }
        $gradeRunResults = $testResults->getRunResult($gradeRun, false);
        $firstRunResults = $testResults->getRunResult(1, false);

        //if not logged in, let's encourage sign-up
        if ($supportsCPAuth && isset($request_context) && is_null($request_context->getUser()->getEmail())) {
            ?>
                <div class="cta-banner">
                    <p><strong>Save Test Results</strong> with a <strong>Free Account</strong>
                    <a class="btn-primary btn-primary-compact" href="/signup">Sign Up &amp; Save Test Result</a></p>
                </div>
                <?php
        }

        echo '<div id="header_container">';

        // Only include optimization data for normal tests
        $data_class = '';
        if (!isset($test['testinfo']['type']) || !strlen($test['testinfo']['type'])) {
            echo '<div id="optimization">';
              echo '<div id="optimization_header">';
              $localPaths = new TestPaths($testPath, $gradeRun, false);
              $urlGenerator = UrlGenerator::create(false, "", $id, $gradeRun, false);

              echo '</div>';
              echo '<div id="grades">';
                  $grades = GetGrades($testInfo, $gradeRunResults, $firstRunResults);
            if (count($grades)) {
                $smaller = '';
                if (count($grades) > 6) {
                    $smaller = ' smaller';
                }
                echo "<ul class=\"grades$smaller\">";
                $optlink = $urlGenerator->resultPage("performance_optimization");
                foreach ($grades as $check => &$grade) {
                    if ($check == 'lighthouse') {
                        $lighthouse = $urlGenerator->resultPage("lighthouse");
                        echo "<li class=\"$check\"><a href=\"$lighthouse\"><h2 class=\"{$grade['class']}\">{$grade['grade']}</h2></a>{$grade['description']}</li>";
                    } elseif ($check == 'security') {
                        $snykUrl = "https://snyk.io/test/website-scanner/?test={$id}&utm_medium=referral&utm_source=webpagetest&utm_campaign=website-scanner";
                        echo "<li class=\"$check\"><a href=\"$snykUrl\"><h2 class=\"{$grade['class']}\">{$grade['grade']}</h2></a>{$grade['description']}</li>";
                    } else {
                        echo "<li class=\"$check\"><a href=\"$optlink#$check\"><h2 class=\"{$grade['class']}\">{$grade['grade']}</h2></a>{$grade['description']}</li>";
                    }
                }
                echo '</ul>';
            }
              echo '</div>';
            echo '</div>';
        } else {
            $data_class = ' class="header_data_full"';
        }

        echo "<div id=\"header_data\"$data_class>";
        // for multistep, link the first URL and show additional text. Otherwise take the test URL
        $numSteps = $gradeRunResults->countSteps();
        $showUrl = $numSteps > 1 ? $gradeRunResults->getStepResult(1)->getUrl() : $url;
        $shortUrl = str_replace('http://', '', FitText($showUrl, 180));
        $shortUrl = $numSteps > 1 ? ($shortUrl . " ($numSteps steps)") : $shortUrl;

            echo "<h2>Web page performance test result for<br>";
        if (GetSetting('nolinks')) {
            echo "<span class=\"page-tested\">$shortUrl</span>";
        } else {
            echo "<a class=\"url cufon-dincond_black\"  rel=\"nofollow\" title=\"$showUrl\" href=\"$showUrl\">$shortUrl</a>";
        }
            echo "</h2>";

            echo "<p class=\"heading_details\">";
            echo "<strong>From:</strong> {$test['test']['location']}";
        if (isset($test['testinfo']['mobile']) && $test['testinfo']['mobile'] === 1) {
            echo " - Mobile";
        }
            echo "<br />\n";
        if (isset($test['testinfo']) && (isset($test['testinfo']['completed']) || isset($test['testinfo']['started']))) {
            if (isset($test['testinfo']['completed'])) {
                $timeStr = $test['testinfo']['completed'];
            } else {
                $timeStr = $test['testinfo']['started'];
            }
            $completed = (int)$timeStr + ($tz_offset * 60);
            $time = strftime('%x %X', $completed);
            echo "<span class=\"jsdate\" date=\"$timeStr\">$time</span><br>\n";
        }

        if ($dom) {
            echo 'DOM Element: <b>' . $dom . '</b><br>';
        }
        if (array_key_exists('authenticated', $test['test']) && (int)$test['test']['authenticated'] == 1) {
            echo '<b>Authenticated: ' . $login . '</b><br>';
        }
        if ((int)$test['test']['connections'] !== 0) {
             echo '<b>' . $test['test']['connections'] . ' Browser connections</b><br>';
        }
        if (array_key_exists('script', $test['test']) && strlen($test['test']['script'])) {
            echo '<b>Scripted test</b><br>';
        }
        if (strlen($blockString)) {
            echo "Blocked: <b>$blockString</b><br>";
        }
        if (strlen($blockDomainsString)) {
            echo "Blocked Domains: <b>$blockDomainsString</b><br>";
        }
        if (isset($test['testinfo']['context']) && strlen($test['testinfo']['context'])) {
            echo 'Context: ';
            $contextText = htmlspecialchars($test['testinfo']['context']);
            if (isset($test['testinfo']['context_url']) && strlen($test['testinfo']['context_url'])) {
                $contextUrl = $test['testinfo']['context_url'];
                if (GetSetting('nolinks')) {
                    echo "<span class=\"medium colored\">$contextText</span>";
                } else {
                    echo "<a class=\"url\" rel=\"nofollow\" title=\"$contextUrl\" href=\"$contextUrl\">$contextText</a>";
                }
            } else {
                echo $contextText;
            }
            echo '<br>';
        }
        if ($test['testinfo']['label']) {
            echo '<strong>Test Label: </strong>' . $test['testinfo']['label']  . '</strong>';
        }
        echo '</div>';
        echo '</div>';

        echo '<div id="test_results-container" class="box">';

        echo '<div id="test-1" class="test_results">';
        echo '<ul class="test_menu">';

        if (!$run) {
            $run = $gradeRun;
        }
        $useFriendlyUrls = !isset($_REQUEST['end']) && constant('FRIENDLY_URLS');
        $menuUrlGenerator = UrlGenerator::create($useFriendlyUrls, "", $id, $run, !empty($cached));
        $endParams = isset($_REQUEST['end']) ? ("end=" . $_REQUEST['end']) : "";

        $tabs = array( 'Summary' => $menuUrlGenerator->resultSummary($endParams),
                       'Details' => $menuUrlGenerator->resultPage("details", $endParams));
        $gradedRunResults = $testResults->getRunResult($gradeRun, !empty($cached));

        if ($gradedRunResults->hasWebVitals()) {
            $tabs['Web Vitals'] = $menuUrlGenerator->resultPagePHP("vitals", $endParams);
        }

        if ($gradedRunResults->isOptimizationChecked()) {
            $tabs['Performance'] = $menuUrlGenerator->resultPage("performance_optimization", $endParams);
        }

        $tabs['Content'] = $menuUrlGenerator->resultPage("breakdown", $endParams);
        $tabs['Domains'] = $menuUrlGenerator->resultPage("domains", $endParams);
        if ($gradedRunResults->hasBreakdownTimeline()) {
          // currently only supported by standard urls
            $menuStandardUrlGenerator = UrlGenerator::create(false, "", $id, $run, !empty($cached));
            $tabs['Processing'] = $menuStandardUrlGenerator->resultPage("breakdownTimeline");
        }

        if (!isset($test['testinfo']) || !isset($test['testinfo']['noimages']) || !$test['testinfo']['noimages']) {
            $tabs['Screenshot'] = $menuUrlGenerator->resultPage("screen_shot", $endParams);
        }
        //$tabs['More Checks'] = "/moreChecks.php?test=$id";

        foreach ($tabs as $tabName => $tabUrl) {
            // make sure we have a test result to navigate to
            if (strlen($tabUrl)) {
                // highlight the current tab
                $current = '';
                if (!strcasecmp($tabName, $subtab)) {
                    $current = ' class="current"';
                }
                echo "<li$current><a href=\"$tabUrl\">$tabName</a></li>";
            }
        }

        // Add the "Image Analysis" link
        if (isset($id) && strlen($id)) {
            $tabUrl = GetSetting('image_analysis');
            if ($tabUrl) {
                $tabUrl = str_replace('{test id}', $id, $tabUrl);
                echo "<li><a href=\"$tabUrl\" title=\"Cloudinary Image Analysis (external) - Opens in a new window.\" target=\"_blank\" rel=\"noopener\" style=\"padding-right: 2px;\">Image Analysis<img src=\"/assets/images/icon-external.svg\"></a></li>";
            }
        }

        // Add the "Request Map" link
        if (isset($id) && strlen($id)) {
            $tabUrl = GetSetting('request_map');
            if ($tabUrl) {
                $tabUrl = str_replace('{test id}', $id, $tabUrl);
                echo "<li><a href=\"$tabUrl\" title=\"Request Map (external) - Opens in a new window.\" target=\"_blank\" rel=\"noopener\" style=\"padding-right: 2px;\">Request Map<img src=\"/assets/images/icon-external.svg\"></a></li>";
            }
        }

        echo '</ul>';
        echo '<div class="test_results-content">';
    } else {
        ?>
        <div id="test_results_running-container">
            <div id="test-1" class="test_results">
                <div class="test_results-content">
        <?php
    }
}

// include the comparison UI pop-up dialog
/*
if( !strcasecmp('Test Result', $tab) || (array_key_exists('compare', $_COOKIE) && strlen($_COOKIE['compare']))) {
    echo '<div id="compare-dlg">';
    echo 'Compare';
    echo '</div>';
}
*/

/**
* Calculate the grades for the given test
* @param TestInfo $testInfo Information about the test
* @param TestRunResults $testRunResults Run results to compute the grades for
* @return array An array with the different grades
*/
function GetGrades($testInfo, $testRunResults, $firstRunResults)
{
    $grades = array();
    $infoArray = $testInfo->getInfoArray();
    if (isset($firstRunResults)) {
        $lighthouse = $firstRunResults->getLighthouseScore();
    }
    if (isset($lighthouse)) {
        $class = 'F';
        if ($lighthouse >= 90) {
            $class = 'A';
        } elseif ($lighthouse >= 50) {
            $class = 'C';
        }
        $grades['lighthouse'] = array( 'class' => $class, 'grade' => $lighthouse, 'description' => 'Lighthouse Perf');
    } elseif (isset($infoArray['lighthouse']) && $infoArray['lighthouse']) {
        $grades['lighthouse'] = array( 'class' => 'F', 'grade' => '?', 'description' => 'Lighthouse Perf');
    }

    if (GetSetting('securityInsights') || isset($_REQUEST['securityInsights'])) {
        // Disable the security check for WordPress sites because it has a false-positive for JQuery issues.
        $securityScoreIncludesVulnerabilities = true;
        $testResults = $testRunResults->getstepResult(1);
        if ($testResults) {
            $detected = $testResults->getRawResults()['detected'];
            if (isset($detected) && isset($detected['CMS'])) {
                if (stripos($detected['CMS'], "WordPress") >= 0) {
                    $securityScoreIncludesVulnerabilities = false;
                }
            }
        }

        require_once(INCLUDES_PATH . '/security_checks.php');
        $securityGrade = getSecurityGrade($testInfo, $testRunResults, $securityScoreIncludesVulnerabilities);
        if (isset($securityGrade)) {
            $grades['security'] = array( 'class' => $securityGrade['class'], 'grade' => $securityGrade['grade'], 'description' => $securityGrade['description']);
        }
    }

    if ($testRunResults->isOptimizationChecked()) {
        require_once(INCLUDES_PATH . '/optimization_detail.inc.php');

        $opt = getOptimizationGradesForRun($testInfo, $testRunResults);
        if (!isset($infoArray['view']) || ($infoArray['view'] != 'simple' && $infoArray['view'] != 'pss')) {
            $grades['first_byte_time'] = array( 'class' => $opt['ttfb']['class'], 'grade' => $opt['ttfb']['grade'], 'description' => $opt['ttfb']['label']);
        }
        $grades['keep_alive_enabled'] = array( 'class' => $opt['keep-alive']['class'], 'grade' => $opt['keep-alive']['grade'], 'description' => $opt['keep-alive']['label']);
        $grades['compress_text'] = array( 'class' => $opt['gzip']['class'], 'grade' => $opt['gzip']['grade'], 'description' => $opt['gzip']['label']);
        $grades['compress_images'] = array( 'class' => $opt['image_compression']['class'], 'grade' => $opt['image_compression']['grade'], 'description' => $opt['image_compression']['label']);
        //if (array_key_exists('progressive_jpeg', $opt))
        //  $grades['progressive_jpeg'] = array( 'class' => $opt['progressive_jpeg']['class'], 'grade' => $opt['progressive_jpeg']['grade'], 'description' => $opt['progressive_jpeg']['label']);
        $grades['cache_static_content'] = array( 'class' => $opt['caching']['class'], 'grade' => $opt['caching']['grade'], 'description' => $opt['caching']['label']);
        $grades['use_of_cdn'] = array( 'class' => $opt['cdn']['class'], 'grade' => $opt['cdn']['grade'], 'description' => $opt['cdn']['label']);
    }

    return $grades;
}
?>
