<?php
    require_once('page_data.inc');

    if( $supportsAuth && !defined('BARE_UI') )
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
            $testLoc;
            if( isset($adLoc) )
                $testLoc = $adLoc;
            elseif( isset($test) && isset($test['test']) && isset($test['test']['loc']) )
                $testLoc = $test['test']['loc'];
            elseif(isset($_COOKIE["cfg"]))
                $testLoc = $_COOKIE["cfg"];
            
            if( strlen($testLoc) && is_file("./custom/$testLoc/headerAd.inc") )
                include("./custom/$testLoc/headerAd.inc");
            elseif( is_file('./ads/header.inc') )
                include('./ads/header.inc');
        }
    ?>
    </div>
</div>

<div id="nav_bkg"><ul id="nav" class="cufon-dincond_black"><?php
        if( $id )
            $resultUrl = "/result/$id/";
            
        $tabs = array(  'Home' => '/' );
                        
        if( $headerType == 'video' )
        {
            if( !$filmstrip )
                $filmstrip = urldecode($_COOKIE['fs']);
            
            if( $filmstrip )
                $tabs['Test Result'] = '/video/compare.php?tests=' . urlencode($filmstrip);
        }
        else
        {
            $tabs['Test Result'] = $resultUrl;
        }

        $tabs['Test History'] = '/testlog/1';

        if( is_dir('wptmonitor') )
            $tabs['Monitor'] = '/wptmonitor/';

        if( is_dir('forums') && !$settings['disableMybb'] )
            $tabs['Forums'] = '/forums/';
        
        $tabs['Documentation'] = 'http://www.webperformancecentral.com/wiki/WebPagetest';
            
        $tabs['About'] = '/about';
        
        foreach( $tabs as $tabName => $tabUrl )
        {
            // make sure we have a test result to navigate to
            if( strlen($tabUrl) )
            {
                // highlight the current tab
                $current = '';
                if( !strcasecmp($tabName, $tab) )
                    $current = ' class="current"';
                echo "<li$current><a href=\"$tabUrl\">$tabName</a></li>";
            }
        }
?></ul>
</div>
    
<div id="main">
    <div class="level_2">
        <div class="content-wrap">
            <div class="content">

            
<?php
//If we're looking at a test result, include the extra header section and sub-menu
if( !strcasecmp('Test Result', $tab) && !$nosubheader )
{
    // make sure the test is actually complete
    if( (isset($test['test']) && isset($test['test']['completeTime'])) )
    {
        if( !isset($pageData) )
            $pageData = loadAllPageData($testPath);
            
        $gradeRun = 1;
        if( $run )
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
            if( !strcasecmp('Test Result', $tab) && !$nosubheader &&
                (isset($test['test']) && isset($test['test']['completeTime'])) )
            {
                if( !isset($pageData) )
                    $pageData = loadAllPageData($testPath);
                
                $gradeRun = 1;
                if( $run )
                    $gradeRun = $run;
                else
                {
                    $medianRun = GetMedianRun($pageData, 0);
                    if( $medianRun )
                        $gradeRun = $medianRun;
                }

                if( gz_is_file("$testPath/{$gradeRun}_pagespeed.txt") )
                {
                    $score = GetPageSpeedScore("$testPath/{$gradeRun}_pagespeed.txt");
                    if( strlen($score) )
                        echo "<span id=\"headerPagespeedScore\"><a href=\"/result/$id/$gradeRun/pagespeed/\">Page Speed {$pageData[$gradeRun][0]['pageSpeedVersion']} Score</a>: <b>$score/100</b></span>";
                }
                
                echo "<div id=\"opthelp\"><a href=\"http://www.webperformancecentral.com/wiki/WebPagetest/Optimization_Help\" title=\"Optimization Resources\" target=\"_blank\">Need help improving?</a></div>\n";
            }
            echo '</div>';
            echo '<div id="grades">';
                $grades = GetGrades($pageData[$gradeRun][0]);
                if( count($grades) )
                {
                    echo '<ul class="grades">';
                    $optlink = "/result/$id/$gradeRun/performance_optimization/";
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
            if (isset($test['testinfo']) && isset($test['testinfo']['completed']))
            {
                $completed = (int)$test['testinfo']['completed'] + ($tz_offset * 60);
                $time = strftime('%x %X', $completed);
                echo "<span class=\"jsdate\" date=\"{$test['testinfo']['completed']}\">$time</span><br>\n";
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

        $tabs = array( 'Summary' => "/result/$id/",
                    'Details' => "/result/$id/$run/details/$cTxt"
                    );
                    
        if( $pageData[$run][$cached]['optimization_checked'] )
            $tabs['Performance Review'] = "/result/$id/$run/performance_optimization/$cTxt";
        
        $cTxt2 = '';
        if( $cached )
            $cTxt2 = '_Cached';
        if( gz_is_file("$testPath/$run{$cTxt2}_pagespeed.txt") )
            $tabs['Page Speed'] = "/result/$id/$run/pagespeed/$cTxt";

        $tabs['Content Breakdown'] = "/result/$id/$run/breakdown/$cTxt";
        $tabs['Domains'] = "/result/$id/$run/domains/$cTxt";
        
        if( !isset($test['testinfo']) || !$test['testinfo']['noimages'] )
            $tabs['Screen Shot'] = "/result/$id/$run/screen_shot/$cTxt";
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
function GetGrades(&$pageData)
{
    $grades = array();
    if($pageData['optimization_checked'])
    {
        require_once('optimization_detail.inc.php');

        $opt = getOptimizationGrades($pageData);

        $grades['keep_alive_enabled'] = array( 'class' => $opt['keep-alive']['class'], 'grade' => $opt['keep-alive']['grade'], 'description' => 'Keep-alive Enabled');
        $grades['compress_text'] = array( 'class' => $opt['gzip']['class'], 'grade' => $opt['gzip']['grade'], 'description' => 'Compress Text');
        $grades['compress_images'] = array( 'class' => $opt['image_compression']['class'], 'grade' => $opt['image_compression']['grade'], 'description' => 'Compress Images');
        $grades['cache_static_content'] = array( 'class' => $opt['caching']['class'], 'grade' => $opt['caching']['grade'], 'description' => 'Cache Static Content');
        $grades['combine_js_css_files'] = array( 'class' => $opt['combine']['class'], 'grade' => $opt['combine']['grade'], 'description' => 'Combine JS/CSS Files');
        $grades['use_of_cdn'] = array( 'class' => $opt['cdn']['class'], 'grade' => $opt['cdn']['grade'], 'description' => 'Use of CDN');
    }
    
    return $grades;
}
?>
