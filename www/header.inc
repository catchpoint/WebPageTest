<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once __DIR__ . '/page_data.inc';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestResults.php';
require_once __DIR__ . '/include/TestRunResults.php';

if(isset($testPath) ) {
  $testInfo = TestInfo::fromFiles($testPath);
  $testResults = TestResults::fromFiles($testInfo);
}
if (isset($testResults)) {
  $adultKeywords = array();
  if (is_file('./settings/adult.txt'))
    $adultKeywords = file('./settings/adult.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  $isAdult = $testResults->isAdultSite($adultKeywords);
  if ($isAdult) {
    define('ADULT_SITE', true);
    $adult_site = true;
  }
}

// For users that aren't logged in, include details about the test so it can be stored in indexdb for local history support
if ($id && isset($test) && is_array($test) && 
        isset($test['testinfo']['created']) && 
        isset($test['testinfo']['url']) && 
        !isset($user) && !isset($_COOKIE['google_email'])) {
    $history = array(
        'id' => $id,
        'url' => $test['testinfo']['url'],
        'created' => $test['testinfo']['created'],
        'location' => isset($test['testinfo']['locationText']) ? $test['testinfo']['locationText'] : '',
        'runs' => isset($test['testinfo']['runs']) ? $test['testinfo']['runs'] : 1,
        'label' => isset($test['testinfo']['label']) ? $test['testinfo']['label'] : '',
        'video' => $test['testinfo']['video'] ? true : false
    );
    $history_json = json_encode($history);
    echo "\n<script>\nconst wptTestInfo=$history_json;\n</script>\n";
}

if (!defined('EMBED')) {
?>
<?php
$alert = GetSetting('alert');
if ($alert) {
    echo '<div class="alert-banner">' . $alert . '</div>';
}
?>
<header>
    <a class="logo" href="/"><img src="/images/wpt-logo.svg" alt="WebPageTest, by Catchpoint"/></a>
    <nav>
    <ul id="nav"><?php
        if ($id) {
            $resultUrl = "/results.php?test=$id";
            if (array_key_exists('end', $_REQUEST))
                $resultUrl .= "&end={$_REQUEST['end']}";
            elseif (FRIENDLY_URLS)
                $resultUrl = "/result/$id/";
        }
        if (!isset($navTabs) || !count($navTabs)) {
            $navTabs = array(  'Home' => '/' );

            if (!GetSetting('disableTestlog')) {
              $navTabs['Test History'] = FRIENDLY_URLS ? '/testlog/1/' : '/testlog.php?days=1';
            }

            if (is_dir('wptmonitor')) {
                $navTabs['Monitor'] = '/wptmonitor/';
            }
            $apiUrl = GetSetting('api_url');
            if ($apiUrl) {
                $navTabs['API'] = $apiUrl;
            }

            if (GetSetting('forums_url')) {
                $navTabs['Forums'] = GetSetting('forums_url');
            }
            $navTabs['Docs'] = 'https://docs.webpagetest.org/';
            $blogUrl = GetSetting('blog_url');
            if ($blogUrl) {
                $navTabs['Blog'] = $blogUrl;
            }

            $navTabs['About'] = FRIENDLY_URLS ? '/about' : '/about.php';

        }
        foreach ($navTabs as $tabName => $tabUrl) {
            // make sure we have a test result to navigate to
            if (strlen($tabUrl)) {
                // highlight the current tab
                $target = '';
                $current = '';
                $opens = '';
                if( !strcasecmp($tabName, $tab) )
                    $current = ' class="current"';
                if (substr($tabUrl, 0, 4) == 'http' && $tabName != 'API') {
                    $target = ' target="_blank" rel="noopener"';
                    $opens = ' (opens in a new tab)';
                }
                if ($opens != '') {
                    echo "<li$current><a title=\"$tabName$opens\" href=\"$tabUrl\"$target>$tabName</a></li>";
                } else {
                    echo "<li$current><a href=\"$tabUrl\"$target>$tabName</a></li>";
                }
                
            }
        }
?></ul>
    </nav>
<?php

if( $supportsAuth && !defined('EMBED') )
{
    echo '<ul id="wptAuthBar">';
    if ($supportsSaml) {
        if (isset($USER_EMAIL) && GetSetting('saml_account')) {
            $saml_account = GetSetting('saml_account');
            $saml_logout = GetSetting('saml_logout');
            if ($saml_logout) {
                $saml_logout = htmlspecialchars($saml_logout);
                $logoutUrl = "javascript:wptLogout('$saml_logout');";
            } else {
                $logoutUrl = "javascript:wptLogout();";
            }
            echo "<li><a href=\"$saml_account\">My Account</a>&nbsp;|&nbsp; <a href=\"$logoutUrl\">Logout</a></li>";
        } else {
            echo '<li><a href="/saml/login.php">Login';
            echo file_get_contents('./images/icon-login.svg');
            echo '</a></li>';
            $register = GetSetting('saml_register');
            if ($register) {
                echo "<li><a class='pill' href='$register'>Sign-up</a></li>";
            }
        }
    } elseif( isset($user) ) {
        $logoutUrl = 'https://www.webpagetest.org/forums/member.php?action=logout';
        echo "<li>Welcome, " . htmlspecialchars($user) . " &nbsp;|&nbsp; <a href=\"$logoutUrl\">Logout</a></li>";
    } else if( isset($_COOKIE['google_email']) && isset($_COOKIE['google_id']) ) {
        $logoutUrl = 'javascript:wptLogout();';
        $google_email = htmlspecialchars($_COOKIE['google_email']);
        echo "<li>Welcome, $google_email &nbsp;|&nbsp; <a href=\"$logoutUrl\">Logout</a></li>";
    } else if (GetSetting('google_oauth_client_id') && GetSetting('google_oauth_client_secret')) {
        echo '<li> &nbsp;|&nbsp; <a href="/oauth/login.php">Login with Google</a></li>';
    }
    echo '</ul>';
}
?>
</header>

<?php
} // EMBED
?>

<div id="main">


<?php
//If we're looking at a test result, include the extra header section and sub-menu
if( !strcasecmp('Test Result', $tab) && (!isset($nosubheader) || !@$nosubheader) && !defined('EMBED') )
{
    // make sure the test is actually complete
    if(isset($test['test']['completeTime']))
    {
        if (!isset($testResults) || !isset($testInfo)) {
          $testInfo = TestInfo::fromFiles($testPath);
          $testResults = TestResults::fromFiles($testInfo);
        }

        $gradeRun = 1;
        if( array_key_exists('run', $_GET) && $_GET["run"] )
            $gradeRun = intval($_GET["run"]);
        else
        {
            $medianRun = $testResults->getMedianRunNumber($median_metric, false);
            if( $medianRun )
                $gradeRun = $medianRun;
        }
        $gradeRunResults = $testResults->getRunResult($gradeRun, false);
        $firstRunResults = $testResults->getRunResult(1, false);
        echo '<div id="header_container" class="box">';
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
        $shortUrl = str_replace('http://', '',  FitText($showUrl, 180));
        $shortUrl = $numSteps > 1 ? ($shortUrl . " ($numSteps steps)") : $shortUrl;
            echo "<h2>Web page performance test result for<br>";
            if (GetSetting('nolinks')) {
                echo "<span class=\"page-tested\">$shortUrl</span>";
            } else {
                echo "<a class=\"url cufon-dincond_black\"  rel=\"nofollow\" title=\"$showUrl\" href=\"$showUrl\">$shortUrl</a>";
            }
            echo "</h2>";

            echo "<p class=\"heading_details\"><strong>From:</strong> {$test['test']['location']}";
            if (isset($test['testinfo']['mobile']) && $test['testinfo']['mobile'] === 1)
            {
            	echo " - Mobile";
            }
            echo "<br />\n";
            if (isset($test['testinfo']) && (isset($test['testinfo']['completed']) || isset($test['testinfo']['started'])) )
            {
                if (isset($test['testinfo']['completed'])) {
                    $timeStr = $test['testinfo']['completed'];
                } else {
                    $timeStr = $test['testinfo']['started'];
                }
                $completed = (int)$timeStr + ($tz_offset * 60);
                $time = strftime('%x %X', $completed);
                echo "<span class=\"jsdate\" date=\"$timeStr\">$time</span><br>\n";
            }

            if( $dom )
                echo 'DOM Element: <b>' . $dom . '</b><br>';
            if( array_key_exists('authenticated', $test['test']) && (int)$test['test']['authenticated'] == 1)
                echo '<b>Authenticated: ' . $login . '</b><br>';
            if( (int)$test['test']['connections'] !== 0)
                 echo '<b>' . $test['test']['connections'] . ' Browser connections</b><br>';
            if( array_key_exists('script', $test['test']) && strlen($test['test']['script']) )
                echo '<b>Scripted test</b><br>';
            if( strlen($blockString) )
                echo "Blocked: <b>$blockString</b><br>";
            if (isset($test['testinfo']['context']) && strlen($test['testinfo']['context']))
            {
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
        echo '</div>';
        echo '</div>';

        echo '<div id="test_results-container" class="box">';

        echo '<div id="test-1" class="test_results">';
        echo '<ul class="test_menu">';

        if( !$run )
            $run = $gradeRun;
        $useFriendlyUrls = !isset($_REQUEST['end']) && FRIENDLY_URLS;
        $menuUrlGenerator = UrlGenerator::create($useFriendlyUrls, "", $id, $run, !empty($cached));
        $endParams = isset($_REQUEST['end']) ? ("end=" . $_REQUEST['end']) : "";

        $tabs = array( 'Summary' => $menuUrlGenerator->resultSummary($endParams),
                       'Details' => $menuUrlGenerator->resultPage("details", $endParams));
        $gradedRunResults = $testResults->getRunResult($gradeRun, !empty($cached));

        if ($gradedRunResults->hasWebVitals())
            $tabs['Web Vitals'] = $menuUrlGenerator->resultPagePHP("vitals", $endParams);

        if ($gradedRunResults->isOptimizationChecked())
            $tabs['Performance'] = $menuUrlGenerator->resultPage("performance_optimization", $endParams);

        $tabs['Content'] = $menuUrlGenerator->resultPage("breakdown", $endParams);
        $tabs['Domains'] = $menuUrlGenerator->resultPage("domains", $endParams);
        if ($gradedRunResults->hasBreakdownTimeline()) {
          // currently only supported by standard urls
          $menuStandardUrlGenerator = UrlGenerator::create(false, "", $id, $run, !empty($cached));
          $tabs['Processing'] = $menuStandardUrlGenerator->resultPage("breakdownTimeline");
        }

        if( !isset($test['testinfo']) || !isset($test['testinfo']['noimages']) || !$test['testinfo']['noimages'] )
            $tabs['Screenshot'] = $menuUrlGenerator->resultPage("screen_shot", $endParams);
        //$tabs['More Checks'] = "/moreChecks.php?test=$id";

        foreach( $tabs as $tabName => $tabUrl )
        {
            // make sure we have a test result to navigate to
            if( strlen($tabUrl) )
            {
                // highlight the current tab
                $current = '';
                if( !strcasecmp($tabName, $subtab) )
                    $current = ' class="current"';
                echo "<li$current><a href=\"$tabUrl\">$tabName</a></li>";
            }
        }

        // Add the "Image Analysis" link
        if (isset($id) && strlen($id)) {
          $tabUrl = GetSetting('image_analysis');
          if ($tabUrl) {
            $tabUrl = str_replace('{test id}', $id, $tabUrl);
            $onclick = "try{if(_gaq!=undefined){_gaq.push(['_trackEvent','Outbound','Click','Cloudinary']);}}catch(err){}";
            echo "<li><a href=\"$tabUrl\" onclick=\"$onclick\" title=\"Cloudinary Image Analysis (external) - Opens in a new window.\" target=\"_blank\" rel=\"noopener\" style=\"padding-right: 2px;\">Image Analysis<img src=\"/images/icon-external.svg\"></a></li>";
          }
        }

        // Add the "Request Map" link
        if (isset($id) && strlen($id)) {
          $tabUrl = GetSetting('request_map');
          if ($tabUrl) {
            $tabUrl = str_replace('{test id}', $id, $tabUrl);
            $onclick = "try{if(_gaq!=undefined){_gaq.push(['_trackEvent','Outbound','Click','RequestMap']);}}catch(err){}";
            echo "<li><a href=\"$tabUrl\" onclick=\"$onclick\" title=\"Request Map (external) - Opens in a new window.\" target=\"_blank\" rel=\"noopener\" style=\"padding-right: 2px;\">Request Map<img src=\"/images/icon-external.svg\"></a></li>";
          }
        }

        echo '</ul>';
        echo '<div class="test_results-content">';
    }
    else
    {
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
        //if (array_key_exists('progressive_jpeg', $opt))
        //  $grades['progressive_jpeg'] = array( 'class' => $opt['progressive_jpeg']['class'], 'grade' => $opt['progressive_jpeg']['grade'], 'description' => $opt['progressive_jpeg']['label']);
        $grades['cache_static_content'] = array( 'class' => $opt['caching']['class'], 'grade' => $opt['caching']['grade'], 'description' => $opt['caching']['label']);
        $grades['use_of_cdn'] = array( 'class' => $opt['cdn']['class'], 'grade' => $opt['cdn']['grade'], 'description' => $opt['cdn']['label']);
    }

    return $grades;
}
?>
<script type="text/javascript">
  markUserTime('aft.Site Header');
</script>
