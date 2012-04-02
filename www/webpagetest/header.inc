<?php
    require_once('page_data.inc');

    if( $supportsAuth )
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
            echo '<a href="/forums/member.php?action=login">Login</a> &nbsp;|&nbsp; ';
            echo '<a href="/forums/member.php?action=register">Register</a> &nbsp;|&nbsp; ';
            $currentPath = $_SERVER['SCRIPT_NAME'];
            echo '<a href="/oauth/login.php">Login with Google</a> ';
        }
        echo '</div>';
    }
?>

<div id="header">
    <h1 class="logo"><a href="/">WebPageTest</a></h1>
    <div class="headerAd">
    <?php
        if( !defined('BARE_UI') )
        {
            // see if we have a location that the test was run from (for a custom ad)
            $testLoc = null;
            if( isset($adLoc) )
                $testLoc = $adLoc;
            elseif( isset($test) && isset($test['test']) && isset($test['test']['loc']) )
                $testLoc = $test['test']['loc'];
            elseif(isset($_COOKIE["cfg"]))
                $testLoc = $_COOKIE["cfg"];
            
            if( isset($testLoc) && strlen($testLoc) && is_file("./custom/$testLoc/headerAd.inc") )
                include("./custom/$testLoc/headerAd.inc");
            elseif( is_file('./ads/header.inc') && (!array_key_exists('HTTP_SSL', $_SERVER) || $_SERVER['HTTP_SSL'] != 'On') )
                include('./ads/header.inc');
        }
    ?>
    </div>
</div>

<div id="nav_bkg"><ul id="nav" class="cufon-dincond_black"><?php
        if ($id) {
            $resultUrl = FRIENDLY_URLS ? "/result/$id/" : "/results.php?test=$id";
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
            $navTabs['Documentation'] = 'http://sites.google.com/a/webpagetest.org/docs/';
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

        if (!$privateInstall && $_SERVER['HTTP_SSL'] != 'On' && (!defined('NAV_NO_SHARE') || !NAV_NO_SHARE))
        {
            echo '<div class="gplusone"><g:plusone size="medium" count="false" href="http://www.webpagetest.org/" actions="+1,addtocircles"></g:plusone>&nbsp;
                <a href="http://twitter.com/share" class="twitter-share-button" data-count="none" data-text=" "></a>
                <script type="text/javascript">
                    (function() {
                        var po = document.createElement(\'script\'); po.type = \'text/javascript\'; po.async = true;
                        po.src = \'https://apis.google.com/js/plusone.js\';
                        var tw = document.createElement(\'script\'); tw.type = \'text/javascript\'; tw.async = true;
                        tw.src = \'http://platform.twitter.com/widgets.js\';
                        var s = document.getElementsByTagName(\'script\')[0]; 
                        s.parentNode.insertBefore(po, s);
                        s.parentNode.insertBefore(tw, s);
                      })();
              </script></div>
              ';
        }
?></ul>

</div>

<?php
if (isset($settings['alert']) && strlen($settings['alert'])) {
    echo '<div class="alert bold">';
    echo $settings['alert'];
    echo '</div>';
}
?>
    
<div id="main">
    <div class="level_2">
        <div class="content-wrap">
            <div class="content">

            
<?php
//If we're looking at a test result, include the extra header section and sub-menu
if( !strcasecmp('Test Result', $tab) && !@$nosubheader )
{
    // make sure the test is actually complete
    if( (isset($test['test']) && isset($test['test']['completeTime'])) )
    {
        if( !isset($pageData) )
            $pageData = loadAllPageData($testPath);
            
        $gradeRun = 1;
        if( $_GET["run"] )
            $gradeRun = $run;
        else
        {
            $medianRun = GetMedianRun($pageData, 0);
            if( $medianRun )
                $gradeRun = $medianRun;
        }

        echo '<div id="header_container">';
        echo '<div id="optimization">';
            echo '<div id="optimization_header">';
            if( gz_is_file("$testPath/{$gradeRun}_pagespeed.txt") )
            {
                $score = GetPageSpeedScore("$testPath/{$gradeRun}_pagespeed.txt");
                if( strlen($score) )
                {
                    $pageSpeedUrl = FRIENDLY_URLS ? "/result/$id/$gradeRun/pagespeed/" : "pagespeed.php?test=$id&run=$gradeRun";
                    echo "<span id=\"headerPagespeedScore\"><a href=\"$pageSpeedUrl\">Page Speed {$pageData[$gradeRun][0]['pageSpeedVersion']} Score</a>: <b>$score/100</b></span>";
                }
            }
            
            echo "<div id=\"opthelp\"><a href=\"http://www.webperformancecentral.com/wiki/WebPagetest/Optimization_Help\" title=\"Optimization Resources\" target=\"_blank\">Need help improving?</a></div>\n";
            echo '</div>';
            echo '<div id="grades">';
                $grades = GetGrades($pageData[$gradeRun][0], $test, $id, $gradeRun);
                if( count($grades) )
                {
                    echo '<ul class="grades">';
                    $optlink = FRIENDLY_URLS ? "/result/$id/$gradeRun/performance_optimization/" : "performance_optimization.php?test=$id&run=$gradeRun";
                    foreach( $grades as $check => &$grade )
                        echo "<li class=\"$check\"><a href=\"$optlink#$check\"><h2 class=\"{$grade['class']}\">{$grade['grade']}</h2></a>{$grade['description']}</li>";
                    echo '</ul>';
                }
            echo '</div>';
        echo '</div>';
        
        echo '<div id="header_data">';
            $shortUrl = str_replace('http://', '',  FitText($url, 120));
            echo "<h2 class=\"alternate cufon-dincond_regular\">Web Page Performance Test for<br><a class=\"url cufon-dincond_black\"  rel=\"nofollow\" title=\"$url\" href=\"$url\">$shortUrl</a></h2>";
            
            echo "<p class=\"heading_details\"><strong>From:</strong> {$test['test']['location']}<br>";
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
            if( (int)$test['test']['authenticated'] == 1)
                echo '<b>Authenticated: ' . $login . '</b><br>';
            if( (int)$test['test']['connections'] !== 0)
                 echo '<b>' . $test[test][connections] . ' Browser connections</b><br>';
            if( $test['test']['script'] ) 
                echo '<b>Scripted test</b><br>';
            if( strlen($blockString) )
                echo "Blocked: <b>$blockString</b><br>";
        echo '</div>';
        echo '</div>';
        
        echo '<div id="test_results-container">';

        echo '<div id="test-1" class="test_results">';
        echo '<ul class="test_menu">';
        
        if( !$run )
            $run = $avgRun;
        
        $cTxt = '';
        if( $cached )
            $cTxt = 'cached/';

        $tabs = array( 'Summary' => FRIENDLY_URLS ? "/result/$id/" : "results.php?test=$id",
                    'Details' => FRIENDLY_URLS ? "/result/$id/$run/details/$cTxt" : "/details.php?test=$id&run=$run&cached=$cached"
                    );
                    
        if( $pageData[$run][$cached]['optimization_checked'] )
            $tabs['Performance Review'] = FRIENDLY_URLS ? "/result/$id/$run/performance_optimization/$cTxt" : "/performance_optimization.php?test=$id&run=$run&cached=$cached";
        
        $cTxt2 = '';
        if( $cached )
            $cTxt2 = '_Cached';
        if( gz_is_file("$testPath/$run{$cTxt2}_pagespeed.txt") )
            $tabs['Page Speed'] = FRIENDLY_URLS ? "/result/$id/$run/pagespeed/$cTxt" : "/pagespeed.php?test=$id&run=$run&cached=$cached";

        $tabs['Content Breakdown'] = FRIENDLY_URLS ? "/result/$id/$run/breakdown/$cTxt" : "/breakdown.php?test=$id&run=$run&cached=$cached";
        $tabs['Domains'] = FRIENDLY_URLS ? "/result/$id/$run/domains/$cTxt" : "/domains.php?test=$id&run=$run&cached=$cached";
        
        if( !isset($test['testinfo']) || !$test['testinfo']['noimages'] )
            $tabs['Screen Shot'] = FRIENDLY_URLS ? "/result/$id/$run/screen_shot/$cTxt" : "/screen_shot.php?test=$id&run=$run&cached=$cached";
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

/**
* Calculate the grades for the given test
* 
*/
function GetGrades(&$pageData, &$test, $id, $run)
{
    global $test;
    $grades = array();
    if($pageData['optimization_checked'])
    {
        require_once('optimization_detail.inc.php');

        $opt = getOptimizationGrades($pageData, $test, $id, $run);

        if( $test['testinfo']['view'] != 'simple' && $test['testinfo']['view'] != 'pss' )
            $grades['first_byte_time'] = array( 'class' => $opt['ttfb']['class'], 'grade' => $opt['ttfb']['grade'], 'description' => $opt['ttfb']['label']);
        $grades['keep_alive_enabled'] = array( 'class' => $opt['keep-alive']['class'], 'grade' => $opt['keep-alive']['grade'], 'description' => $opt['keep-alive']['label']);
        $grades['compress_text'] = array( 'class' => $opt['gzip']['class'], 'grade' => $opt['gzip']['grade'], 'description' => $opt['gzip']['label']);
        $grades['compress_images'] = array( 'class' => $opt['image_compression']['class'], 'grade' => $opt['image_compression']['grade'], 'description' => $opt['image_compression']['label']);
        $grades['cache_static_content'] = array( 'class' => $opt['caching']['class'], 'grade' => $opt['caching']['grade'], 'description' => $opt['caching']['label']);
        $grades['use_of_cdn'] = array( 'class' => $opt['cdn']['class'], 'grade' => $opt['cdn']['grade'], 'description' => $opt['cdn']['label']);
    }
    
    return $grades;
}
?>
