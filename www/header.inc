<?php
require_once __DIR__ . '/page_data.inc';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestResults.php';
require_once __DIR__ . '/include/TestRunResults.php';

if(isset($testPath) ) {
  $options = null;
  if (array_key_exists('end', $_REQUEST))
    $options = array('end' => $_REQUEST['end']);
  $testInfo = TestInfo::fromFiles($testPath);
  $testResults = TestResults::fromFiles($testInfo, null, $options);
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

if( $supportsAuth && !defined('EMBED') )
{
    echo '<div id="wptAuthBar">';
    if( isset($user) )
    {
        $logoutUrl = '/forums/member.php?action=logout';
        if( isset($mybb) && strlen($mybb->user['logoutkey']) )
            $logoutUrl .= '&logoutkey=' . $mybb->user['logoutkey'];
        echo "Welcome, $user &nbsp;|&nbsp; <a href=\"$logoutUrl\">Logout</a>";
    }
    else if( isset($_COOKIE['google_email']) && isset($_COOKIE['google_id']) )
	  {
        $logoutUrl = 'javascript:ClearOAuthCookies();';
        $google_email = $_COOKIE['google_email'];
        echo "Welcome, $google_email &nbsp;|&nbsp; <a href=\"$logoutUrl\">Logout</a>";
    }
    else
    {
        if (is_dir('./forums') && (!array_key_exists('disableMybb', $settings) || !$settings['disableMybb'])) {
          echo '<a href="/forums/member.php?action=login">Login</a> &nbsp;|&nbsp; ';
          echo '<a href="/forums/member.php?action=register">Register</a> &nbsp;|&nbsp; ';
        }
        if (GetSetting('google_oauth_client_id') && GetSetting('google_oauth_client_secret')) {
          echo '<a href="/oauth/login.php">Login with Google</a> ';
        }
    }
    echo '</div>';
}

if (!defined('EMBED')) {
?>

<div id="header">
    <h1 class="logo"><a href="/">WebPageTest</a></h1>
    <div class="headerAd">
    <?php
        if( !defined('BARE_UI') )
        {
            // see if we have a location that the test was run from (for a custom ad)
            $testLoc = null;
            if( isset($test) && isset($test['test']['loc']) )
                $testLoc = $test['test']['loc'];
            
            if( strpos($testLoc, '..') === false && strpos($testLoc, '/') === false && strpos($testLoc, '\\') === false && 
                isset($testLoc) && strlen($testLoc) && is_file("./custom/$testLoc/headerAd.inc") ) {
                include("./custom/$testLoc/headerAd.inc");
            } elseif(is_file('./ads/header.inc')) {
                include('./ads/header.inc');
            }
        }
    ?>
    </div>
</div>

<div id="nav_bkg"><ul id="nav" class="cufon-dincond_black"><?php
        if ($id) {
            $resultUrl = "/results.php?test=$id";
            if (array_key_exists('end', $_REQUEST))
                $resultUrl .= "&end={$_REQUEST['end']}";
            elseif (FRIENDLY_URLS)
                $resultUrl = "/result/$id/";
        }
        if (!isset($navTabs) || !count($navTabs)) {
            $navTabs = array(  'Home' => '/' );
            if (isset($headerType) && $headerType == 'video') {
                if (!$filmstrip) {
                    $filmstrip = urldecode($_COOKIE['fs']);
                }
                if ($filmstrip) {
                    $navTabs['Test Result'] = '/video/compare.php?tests=' . urlencode($filmstrip);
                }
            } else {
                $navTabs['Test Result'] = isset($resultUrl) ? $resultUrl : '';
            }

            $navTabs['Test History'] = FRIENDLY_URLS ? '/testlog/1/' : '/testlog.php?days=1';

            if (is_dir('wptmonitor')) {
                $navTabs['Monitor'] = '/wptmonitor/';
            }
            if (is_dir('forums') && !$settings['disableMybb']) {
                $navTabs['Forums'] = '/forums/';
            }
            $navTabs['Documentation'] = 'https://sites.google.com/a/webpagetest.org/docs/';
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
                if (substr($tabUrl, 0, 4) == 'http') {
                    $target = ' target="_blank"';
                    $opens = ' (opens in a new tab)';
                }
                echo "<li$current><a title=\"$tabName$opens\" href=\"$tabUrl\"$target>$tabName</a></li>";
            }
        }
?></ul>

</div>

<?php
if (!defined('BARE_UI') && isset($settings['alert']) && strlen($settings['alert'])) {
    echo '<div class="alert bold">';
    echo $settings['alert'];
    echo '</div>';
}
} // EMBED
?>
    
<div id="main">
    <div class="level_2">
        <div class="content-wrap">
            <div class="content">

            
<?php
//If we're looking at a test result, include the extra header section and sub-menu
if( !strcasecmp('Test Result', $tab) && !@$nosubheader && !defined('EMBED') )
{
    // make sure the test is actually complete
    if( (isset($test['test']) && isset($test['test']['completeTime'])) )
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

        echo '<div id="header_container">';
        // Only include optimization data for normal tests
        $data_class = '';
        if (!isset($test['testinfo']['type']) || !strlen($test['testinfo']['type'])) {
          echo '<div id="optimization">';
              echo '<div id="optimization_header">';
              $localPaths = new TestPaths($testPath, $gradeRun, false);
              $urlGenerator = UrlGenerator::create(FRIENDLY_URLS, "", $id, $gradeRun, false);
              
              echo "<div id=\"opthelp\"><a href=\"https://sites.google.com/a/webpagetest.org/docs/other-resources/optimization-resources\" title=\"Optimization Resources\" target=\"_blank\">Need help improving?</a></div>\n";
              echo '</div>';
              echo '<div id="grades">';
                  $grades = GetGrades($testInfo, $gradeRunResults);
                  if( count($grades) )
                  {
                      $smaller = '';
                      if( count($grades) > 6 )
                        $smaller = ' smaller';
                      echo "<ul class=\"grades$smaller\">";
                      $optlink = $urlGenerator->resultPage("performance_optimization");
                      foreach( $grades as $check => &$grade )
                          echo "<li class=\"$check\"><a href=\"$optlink#$check\"><h2 class=\"{$grade['class']}\">{$grade['grade']}</h2></a>{$grade['description']}</li>";
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
            echo "<h2 class=\"alternate cufon-dincond_regular\">Web Page Performance Test for<br>";
            if ($settings['nolinks']) {
                echo "<span class=\"medium colored\">$shortUrl</span>";
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
            if (isset($test['testinfo']['benchmark']) && strlen($test['testinfo']['benchmark'])) {
                echo 'Benchmark: ';
                $benchmark = $test['testinfo']['benchmark'];
                if (isset($test['testinfo']['epoch'])) {
                    $epochStr = $test['testinfo']['epoch'];
                    $epoch = (int)$epochStr + ($tz_offset * 60);
                    $epochTime = strftime('%x %X', $epoch);
                    $benchmarkStr = "$benchmark - <span class=\"jsdate\" date=\"$epochStr\">$epochTime</span>";
                } else {
                    $benchmarkStr = $benchmark;
                }
                if ($settings['nolinks']) {
                    echo "<span class=\"medium colored\">$benchmarkStr</span>";
                } else {
                    if (isset($test['testinfo']['epoch'])) {
                        $benchmarkUrl = "/benchmarks/viewtest.php?benchmark=$benchmark&metric=docTime&time=$epoch";
                    } else {
                        $benchmarkUrl = "/benchmarks/view.php?benchmark=$benchmark&aggregate=median";
                    }
                    echo "<a class=\"url\" rel=\"nofollow\" title=\"$benchmarkUrl\" href=\"$benchmarkUrl\">$benchmarkStr</a>";
                }
                echo '<br>';
            }
            if (isset($test['testinfo']['context']) && strlen($test['testinfo']['context']))
            {
                echo 'Context: ';
                $contextText = htmlspecialchars($test['testinfo']['context']);
                if (isset($test['testinfo']['context_url']) && strlen($test['testinfo']['context_url'])) {
                    $contextUrl = $test['testinfo']['context_url'];
                    if ($settings['nolinks']) {
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
        
        echo '<div id="test_results-container">';

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

        if ($gradedRunResults->isOptimizationChecked())
            $tabs['Performance Review'] = $menuUrlGenerator->resultPage("performance_optimization", $endParams);

        if ($gradedRunResults->averagePageSpeedScore() !== null)
            $tabs['PageSpeed'] = $menuUrlGenerator->resultPage("pagespeed", $endParams);
        $tabs['Content Breakdown'] = $menuUrlGenerator->resultPage("breakdown", $endParams);
        $tabs['Domains'] = $menuUrlGenerator->resultPage("domains", $endParams);
        if ($gradedRunResults->hasBreakdownTimeline()) {
          // currently only supported by standard urls
          $menuStandardUrlGenerator = UrlGenerator::create(false, "", $id, $run, !empty($cached));
          $tabs['Processing Breakdown'] = $menuStandardUrlGenerator->resultPage("breakdownTimeline");
        }

        if( !isset($test['testinfo']) || !$test['testinfo']['noimages'] )
            $tabs['Screen Shot'] = $menuUrlGenerator->resultPage("screen_shot", $endParams);
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
function GetGrades($testInfo, $testRunResults)
{
    $grades = array();
    if ($testRunResults->isOptimizationChecked()) {
        require_once('optimization_detail.inc.php');

        $opt = getOptimizationGradesForRun($testRunResults);
        $infoArray = $testInfo->getInfoArray();
        if( $infoArray['view'] != 'simple' && $infoArray['view'] != 'pss' )
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
