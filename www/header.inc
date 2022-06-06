<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.

use WebPageTest\Util;

require_once __DIR__ . '/page_data.inc';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestResults.php';
require_once __DIR__ . '/include/TestRunResults.php';

if (!isset($noanalytics)) {
  require_once __DIR__ . '/templates/layouts/google-tag-manager-noscript.inc';
}

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

if( !isset($experiment) ){
    $experiment = false;
}

if (!defined('EMBED')) {
?>
<?php
$alert = Util::getSetting('alert');
// in settings.ini add alert_expiration as a non unix timestamp '2021-11-17 13:02:18'
$alert_expiration = Util::getSetting('alert_expiration');
if (isset($client_error)) {
    echo '<div class="error-banner">' . $client_error . '</div>';
}
elseif ($alert && $alert_expiration && new DateTime() < new DateTime($alert_expiration)) {
    echo '<div class="alert-banner">' . $alert . '</div>';
}
elseif ($alert && empty($alert_expiration)) {
    echo '<div class="alert-banner">' . $alert . '</div>';
}

require_once __DIR__ . '/templates/layouts/includes/wpt-header.php';
?>

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

        echo '<div class="results_header_contain">';
        require_once ( __DIR__ . '/cta-banner.inc');

        echo '<div id="header_container">';





        echo "<div id=\"header_data\"$data_class>";
        // for multistep, link the first URL and show additional text. Otherwise take the test URL
        $numSteps = $gradeRunResults->countSteps();
        $showUrl = $numSteps > 1 || !$url ? $gradeRunResults->getStepResult(1)->getUrl() : $url;
        $shortUrl = str_replace('http://', '',  FitText($showUrl, 180));
        $shortUrl = $numSteps > 1 ? ($shortUrl . " ($numSteps steps)") : $shortUrl;
            echo "<ul class=\"header_data_urltime\">";

            echo "<li><strong>URL: </strong>";
            if (GetSetting('nolinks')) {
                echo "<span class=\"page-tested\">$shortUrl</span>";
            } else {
                echo "<a class=\"url\"  rel=\"nofollow\" title=\"$showUrl\" href=\"$showUrl\">$shortUrl</a>";
            }
            echo "</li>";
            echo "<li><strong>Date: </strong>";

            if (isset($test['testinfo']) && (isset($test['testinfo']['completed']) || isset($test['testinfo']['started'])) )
            {
                if (isset($test['testinfo']['completed'])) {
                    $timeStr = $test['testinfo']['completed'];
                } else {
                    $timeStr = $test['testinfo']['started'];
                }
                $completed = (int)$timeStr + ($tz_offset * 60);
                $time = strftime('%x %X', $completed);
                echo "<span class=\"jsdate\" date=\"$timeStr\">$time</span>\n";
            }
            echo "</li></ul>";

            // Note: "Comprehensive" if it's multi device?
            if( $experiment ){
                echo "<h1 class=\"result_hed-pro\"><img src=\"/images/wpt-logo-pro.svg\" alt=\"WebPageTest Pro\"> Experiment</h1>";
            } else {
                echo "<h1>Webpage Performance Test Result</h1>";

            }


            $flags = array(
                    'ec2-us-east-1' => 'US',
                    'gce-us-west3' => 'US',
                    'ec2-us-west-1' => 'US',
                    'ec2-ca-central-1' => 'CA',
                    'ec2-sa-east-1' => 'BR',
                    'ec2-eu-west-1' => 'IE',
                    'London_EC2_Loc' => 'GB',
                    'ec2-eu-west-3' => 'FR',
                    'gce-europe-west4' => 'NL',
                    'ec2-eu-central-1' => 'DE',
                    'ec2-eu-south-1' => 'IT',
                    'ec2-eu-north-1' => 'SE',
                    'ec2-af-south-1' => 'ZA',
                    'ec2-me-south-1' => 'BS',
                    'azure-uae-north' => 'AE',
                    'ap-south-1' => 'IN',
                    'tencent-bangkok' => 'TH',
                    'ec2-ap-southeast-1' => 'SG',
                    'gce-asia-southeast2' => 'MC',
                    'ec2-ap-east-1' => 'HK',
                    'tencent-shanghai' => 'CN',
                    'ec2-cn-north-1' => 'CN',
                    'tencent-beijing' => 'CN',
                    'ec2-cn-northwest-1' =>  'CN',
                    'ec2-ap-northeast-2' =>  'KR',
                    'ec2-ap-northeast-1' => 'JP',
                    'ec2-ap-northeast-3' => 'JP',
                    'azure-australia-southeast' => 'AU',
                    'ec2-ap-southeast-2' => 'AU',
                    'LosAngeles_M1MacMini' => 'US',
                    'NewYork_M1MacMini' => 'US',
                    'LosAngeles_M1MacMini' => 'US',
                    'NYC_Android' => 'US',
                    'Dulles_Android' => 'US'
                );

            $locationSimple = explode( "-", $test['testinfo']['locationLabel'] )[ 0 ];
            $connectivity = $test['test']['connectivity'];

            $browser = $testResults->getBrowser();
                //check to make sure we have a browser icon
                if (isset($browser) && file_exists(__DIR__.'/images/test_icons/' . strtolower($browser->getName()) . '.svg')) {
                    //exists so let's use it
                    $browserIcon = true;
                } else {
                    $browserIcon = false;
                }

            if ($test['testinfo']['mobile'] == 1) {
                $device = strtolower( $test['testinfo']['mobileDevice'] );
            } else {
                $device = "Desktop";
            }

            ?>

            <div class="test_presets">
                <ul>
                    <?php

                    echo '<li>';

                    if ( $test['testinfo'] && $test['testinfo']['label'] ) {
                        $labelClass = "test_presets_tag-label";
                        if( $experiment ){
                            $labelClass .= " test_presets_tag-experiment";
                        }
                        echo '<span class="'. $labelClass .'" title="'.$test['testinfo']['label'].'">'.$test['testinfo']['label'].'</span>';
                    }


                    echo '<b>Settings:</b> <strong>'.$device.'</strong>';


                    //browser and version
                    if (isset($browser)){
                        echo '<span class="test_presets_tag">';
                        if ($browserIcon) {
                            echo '<img src="/images/test_icons/'. strtolower($browser->getName()) . '.svg" alt="'. $browser->getName() . '">';
                        } else if ($browser->getName()){
                            echo $browser->getName();
                        }
                        if ($browser->getVersion()) {
                            echo 'v' . strtok($browser->getVersion(), '.');
                        }
                        echo '</span>';
                    }

                    //connectivity
                    echo '<span class="test_presets_tag">'. $connectivity . '</span>';
                    //location
                    echo '<span class="test_presets_tag">';

                    if( $flags[$test['test']['loc']] ){
                        echo '<img src="/images/test_icons/flags/' . $flags[$test["test"]["loc"]] . '.svg" alt="">';
                    }

                    echo $locationSimple;
                    echo '</span>';





                    // TODO what is show sensitive?
                    //$show_sensitive = false;
                    echo '<details class="test_presets_more"><summary><span class="test_presets_tag">More</span></summary><div class="details_contain">';
                    echo GetTestInfoHtml();
                    if( $experiment){
                        $experimentData = $metaInfo['experiment'];
                        echo "<p class=\"meta_exp_applied_hed\">Experiment Info:</p>";
                        echo '<ul class="meta_exp_applied_list">';
                        include __DIR__ . '/experiments/list_applied.inc';
                        echo '</ul>';
                        echo "<p>Related Links: <a href=\"". $controlTestHref ."\">Original (Control Run)</a>, <a href=\"". $experimentOriginalTestHref ."\">Original Test</a></p><ul>";
                    }
                    echo '</div></details>';

                    if( isset($socialImage) ){
                        echo "<details class=\"test_presets_more test_presets_more-share\"><summary><span class=\"test_presets_tag\">Share</span></summary>
                        <div class=\"details_contain\">
                            <ul>
                            <li><a href=\"" . $emailURI . "\">Share via Email</a></li>"
                            . (isset($tweetURI) ? "<li><a href=\"" . $tweetURI . "\">Share on Twitter</a></li>" : "")
                            . "<li><a href=\"" . $socialImage . "\" download=\"WebPageTest Pro Experiment Results\">View Formatted Screenshot Image</a></li>"
                            . "</ul>
                        </div></details>";
                    }

                    ?>
                    </li>

                </ul>
            </div>
        </div>



    <?php

        echo '<div class="header_screenshots">';

        if( $experiment && isset($tests) && count($tests) === 2 ){
            $vcTime = $tests[0]['stepResult']->getMetric("visualComplete");
            if(!$vcTime){
                $vcTime = 3000;
            }
            $vcTime = ($vcTime / 1000) * 60;
            $autoplay = "autoplay";
            if( isset($req_screenshot) ){
                $autoplay = "";
            }

            echo '<video id="player" playsinline loop '. $autoplay .' muted="" preload="auto" poster="/video/poster.php?tests='. $tests[0]['id'] .','. $tests[1]['id'] .'&amp;bg=eeeeee&amp;&text=141E33&amp;frameNum='. $vcTime .'">
                    <source src="/video/video.php?tests='. $tests[0]['id'] .','. $tests[1]['id'] .'&amp;applyGrey=0&amp;bg=eeeeee&amp;&text=141E33&amp;end=visual" type="video/mp4">
                </video>
                <button class="play" id="playbtn">Play/Pause Video</button>';
            ?>
            <script>
                (function(){
                var container = document.querySelector(".header_screenshots");
				var video = container.querySelector("video");
				var playbtn = container.querySelector(".play");

				function activate(){
					container.classList.add("playing");
				}
				function deactivate(){
					container.classList.remove("playing");
				}
				video.addEventListener( "play", function(e){
					activate();
				});
				video.addEventListener( "pause", function(e){
                    deactivate();
				});
				playbtn.addEventListener( "click", function(e){
					e.preventDefault();
					if(video.paused){
						video.play();
					} else {
						video.pause();
					}
				});


			}());
            </script>
        <?php
        }
        else {
            require_once __DIR__ . '/screen_shot_embed.php';
        }

        echo '</div></div></div>';

?>


      <?php
        if( !isset($hideResultsNav) ){
        ?>
        <div class="results_nav_contain">
        <div class="results_nav">
            <div class="results_nav_pair">
              <p class="results_nav_hed">View:</p>
              <nav class="link_select" tabindex="0" aria-label="Test Type">
        <span class="link_select_label"><?php echo $subtab; ?></span>
        <span class="visually-hidden"> or...</span>


        <?php
            if( !$id && $test['id'] && isset($tests) ){
                $id = $test['id'];
            }
            if( !isset($run) )
                $run = $gradeRun;


        // create the results nav.
        // if it's a regular result or Same ID compare, it'll be a normal result nav
        // if it's an experiment compare, it'll just have experiment links
        echo '<ul>';


            $useFriendlyUrls = !isset($_REQUEST['end']) && FRIENDLY_URLS;

            $menuUrlGenerator = UrlGenerator::create($useFriendlyUrls, "", $id, $gradeRun, !empty($cached));
            $endParams = isset($_REQUEST['end']) ? ("end=" . $_REQUEST['end']) : "";

            $tabs = array( 'Performance Summary' => $menuUrlGenerator->resultSummary($endParams));


            if( $experiment ){
                $tabs['Opportunities & Experiments'] = $experimentOriginalExperimentsHref;
                $tabs['Experiment Results (Filmstrip)'] = $experimentResultsHref;
            } else {
                $tabs['Opportunities & Experiments'] = $menuUrlGenerator->resultPage("experiments", $endParams);
                $tabs['Filmstrip'] = $menuUrlGenerator->filmstripView("filmstrip", $endParams);
            }
            $tabs['Details'] = $menuUrlGenerator->resultPage("details", $endParams);

            $gradedRunResults = $testResults->getRunResult($gradeRun, !empty($cached));


            if ($gradedRunResults->hasWebVitals())
                $tabs['Web Vitals'] = $menuUrlGenerator->resultPagePHP("vitals", $endParams);


            if ($gradedRunResults->isOptimizationChecked())
                $tabs['Optimization'] = $menuUrlGenerator->resultPage("performance_optimization", $endParams);

            $tabs['Content'] = $menuUrlGenerator->resultPage("breakdown", $endParams);
            $tabs['Domains'] = $menuUrlGenerator->resultPage("domains", $endParams);
            if ($gradedRunResults->hasBreakdownTimeline()) {
            // currently only supported by standard urls
            $menuStandardUrlGenerator = UrlGenerator::create(false, "", $id, $run, !empty($cached));
            $tabs['Processing'] = $menuStandardUrlGenerator->resultPage("breakdownTimeline");
            }




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

            if (isset($firstRunResults)){
                $lighthouse = $firstRunResults->getLighthouseScore();
                $urlGeneratorFirstRun = UrlGenerator::create(false, "", $id, 1, false);

                if (isset($lighthouse)) {
                    $lighthouseURL = $urlGeneratorFirstRun->resultPage("lighthouse");
                    $lhClass = 'poor';
                    if ($lighthouse >= 90)
                        $lhClass = 'good';
                    elseif ($lighthouse >= 50)
                        $lhClass = 'ok';

                echo "<li><a href=\"" . $lighthouseURL . "\" onclick=\"$onclick\" title=\"Lighthouse Report (external) - Opens in a new window.\" target=\"_blank\" rel=\"noopener\" >Lighthouse Report: <span class=\"lh-flag ". $lhClass ."\">". $lighthouse ."</span><img src=\"/images/icon-external.svg\" alt=\"\"></a></li>";
                }
            }

            // Add the "Image Analysis" link
            if (isset($id) && strlen($id)) {
            $tabUrl = GetSetting('image_analysis');
            if ($tabUrl) {
                $tabUrl = str_replace('{test id}', $id, $tabUrl);
                $onclick = "try{if(_gaq!=undefined){_gaq.push(['_trackEvent','Outbound','Click','Cloudinary']);}}catch(err){}";
                echo "<li><a href=\"$tabUrl\" onclick=\"$onclick\" title=\"Cloudinary Image Analysis (external) - Opens in a new window.\" target=\"_blank\" rel=\"noopener\" >Image Analysis<img src=\"/images/icon-external.svg\" alt=\"\"></a></li>";
            }
            }

            // Add the "Request Map" link
            if (isset($id) && strlen($id)) {
            $tabUrl = GetSetting('request_map');
            if ($tabUrl) {
                $tabUrl = str_replace('{test id}', $id, $tabUrl);
                $onclick = "try{if(_gaq!=undefined){_gaq.push(['_trackEvent','Outbound','Click','RequestMap']);}}catch(err){}";
                echo "<li><a href=\"$tabUrl\" onclick=\"$onclick\" title=\"Request Map (external) - Opens in a new window.\" target=\"_blank\" rel=\"noopener\" >Request Map<img src=\"/images/icon-external.svg\" alt=\"\"></a></li>";
            }
            }

            // one dollar sign for every 500KB
            $dollars = "";
            $dollarcount = max(1, min(5, ceil($gradeRunResults->getStepResult(1)->getMetric("bytesIn") / (500 * 1024))));
            for ($i = 1; $i <= 5; $i++)
            $dollars .= $i <= $dollarcount ? '$' : '-';
            if(!$id){
            $id = $testInfo->getId();
            }
            $onclick = "try{if(_gaq!=undefined){_gaq.push(['_trackEvent','Outbound','Click','WhatDoesMySiteCost']);}}catch(err){}";
            echo "<li><a title=\"Find out how much it costs for someone to use your site on mobile networks around the world. (external) - Opens in a new window.\" target=\"_blank\" rel=\"noopener\" " .
            "href=\"http://whatdoesmysitecost.com/index.php?testID=$id\" onclick=\"$onclick\">Data Cost: $dollars <img src=\"/images/icon-external.svg\" alt=\"\"></a></li>";

            if (GetSetting('securityInsights') || isset($_REQUEST['securityInsights'])) {

                // Disable the security check for WordPress sites because it has a false-positive for JQuery issues.
                $securityScoreIncludesVulnerabilities = true;
                if ($gradeRunResults) {
                    $detected = $gradeRunResults->getStepResult(1)->getRawResults()['detected'];
                    if (isset($detected) && isset($detected['CMS'])) {
                        if (stripos($detected['CMS'], "WordPress") >= 0) {
                            $securityScoreIncludesVulnerabilities = false;
                        }
                    }
                }
                require_once('security_checks.php');
                $securityGrade = getSecurityGrade($testInfo, $gradeRunResults, $securityScoreIncludesVulnerabilities);

                $onclick = "try{if(_gaq!=undefined){_gaq.push(['_trackEvent','Outbound','Click','Snyk']);}}catch(err){}";
                $snykUrl = "https://snyk.io/test/website-scanner/?test={$id}&utm_medium=referral&utm_source=webpagetest&utm_campaign=website-scanner";
                echo "<li><a href=\"$snykUrl\" onclick=\"$onclick\" title=\"(external) - Opens Snyk in a new window.\">Security Score: <span class=\"lh-flag\">" . $securityGrade['grade'] . "</span><img src=\"/images/icon-external.svg\" alt=\"\"></a></li>";

            }



        echo '</ul></nav></div>';


        include("testinfo_command-bar.inc");


        echo '</div></div>';

        }
        ?>







<?php
        echo '<div id="test_results-container">';

        echo '<div id="test-1" class="test_results">';

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




?>
