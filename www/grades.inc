<div class="results_grades_contain">
        <div class="results_grades">
            
        <?php 
            // Only include optimization data for normal tests
            $data_class = '';
            if (!isset($test['testinfo']['type']) || !strlen($test['testinfo']['type'])) {
            echo '<div id="">';
                echo '<div id="">';
                $localPaths = new TestPaths($testPath, $gradeRun, false);
                $urlGenerator = UrlGenerator::create(false, "", $id, $gradeRun, false);

                echo '</div>';
                echo '<div id="grades">'; ?>
                <ul class="grades">
                     <?php
                    $grades = GetGrades($testInfo, $gradeRunResults, $firstRunResults);
                    if( count($grades) )
                    {
                        $smaller = '';
                        if( count($grades) > 6 )
                            $smaller = ' smaller';
                        echo "<ul class=\"grades$smaller\">";
                        $optlink = $urlGenerator->resultPage("performance_optimization");
                        foreach( $grades as $check => &$grade ) {
                            if ($check == 'lighthouse') {
                                $lighthouse = $urlGenerator->resultPage("lighthouse");
                                echo "<li class=\"$check\"><a href=\"$lighthouse\"><h2 class=\"{$grade['class']}\">{$grade['grade']}</h2></a>{$grade['description']}</li>";
                            }else if ($check == 'security') {
                                $onclick = "try{if(_gaq!=undefined){_gaq.push(['_trackEvent','Outbound','Click','Snyk']);}}catch(err){}";
                                $snykUrl = "https://snyk.io/test/website-scanner/?test={$id}&utm_medium=referral&utm_source=webpagetest&utm_campaign=website-scanner";
                                echo "<li class=\"$check\"><a href=\"$snykUrl\" onclick=\"$onclick\"><h2 class=\"{$grade['class']}\">{$grade['grade']}</h2></a>{$grade['description']}</li>";
                            }else {
                                echo "<li class=\"$check\"><a href=\"#$check\"><h2 class=\"{$grade['class']}\">{$grade['grade']}</h2></a>{$grade['description']}</li>";
                            }
                        }
                        echo '</ul>';
                    }
                echo '</div>';
            echo '</div>';
            } else {
            $data_class = ' class="header_data_full"';
            }
        



         
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
    if (isset($firstRunResults))
      $lighthouse = $firstRunResults->getLighthouseScore();
    if (isset($lighthouse)) {
      $class = 'F';
      if ($lighthouse >= 90)
        $class = 'A';
      elseif ($lighthouse >= 50)
        $class = 'C';
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
        
        require_once('security_checks.php');
        $securityGrade = getSecurityGrade($testInfo, $testRunResults, $securityScoreIncludesVulnerabilities);
        if (isset($securityGrade)) {
            $grades['security'] = array( 'class' => $securityGrade['class'], 'grade' => $securityGrade['grade'], 'description' => $securityGrade['description']);
        }
    }

    if ($testRunResults->isOptimizationChecked()) {
        require_once('optimization_detail.inc.php');

        $opt = getOptimizationGradesForRun($testInfo, $testRunResults);
        if( !isset($infoArray['view']) || ($infoArray['view'] != 'simple' && $infoArray['view'] != 'pss') )
            $grades['first_byte_time'] = array( 'class' => $opt['ttfb']['class'], 'grade' => $opt['ttfb']['grade'], 'description' => $opt['ttfb']['label']);
        $grades['keep_alive_enabled'] = array( 'class' => $opt['keep-alive']['class'], 'grade' => $opt['keep-alive']['grade'], 'description' => $opt['keep-alive']['label']);
        $grades['compress_text'] = array( 'class' => $opt['gzip']['class'], 'grade' => $opt['gzip']['grade'], 'description' => $opt['gzip']['label']);
        $grades['compress_images'] = array( 'class' => $opt['image_compression']['class'], 'grade' => $opt['image_compression']['grade'], 'description' => $opt['image_compression']['label']);
        if (array_key_exists('progressive_jpeg', $opt))
          $grades['progressive_jpeg'] = array( 'class' => $opt['progressive_jpeg']['class'], 'grade' => $opt['progressive_jpeg']['grade'], 'description' => $opt['progressive_jpeg']['label']);
        $grades['cache_static_content'] = array( 'class' => $opt['caching']['class'], 'grade' => $opt['caching']['grade'], 'description' => $opt['caching']['label']);
        $grades['use_of_cdn'] = array( 'class' => $opt['cdn']['class'], 'grade' => $opt['cdn']['grade'], 'description' => $opt['cdn']['label']);
    }






    return $grades;
}   
            ?>