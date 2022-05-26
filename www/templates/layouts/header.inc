<?php

declare(strict_types=1);
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once __DIR__ . '/../../common.inc';

use WebPageTest\Util;

require_once __DIR__ . '/../../page_data.inc';
require_once __DIR__ . '/../../include/TestInfo.php';
require_once __DIR__ . '/../../include/TestResults.php';
require_once __DIR__ . '/../../include/TestRunResults.php';



if(isset($testPath) ) {
  $testInfo = TestInfo::fromFiles($testPath);
  $testResults = TestResults::fromFiles($testInfo);
}
if (isset($testResults)) {
  $adultKeywords = array();
  if (is_file('../../settings/adult.txt'))
    $adultKeywords = file('../../settings/adult.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
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

// If $tab is null, make it an empty string for strcasecmp
$tab ??= "";

if (!defined('EMBED')) {
?>
<?php
$alert = Util::getSetting('alert');
if (isset($client_error)) {
  echo '<div class="error-banner">' . $client_error . '</div>';
} elseif ($alert) {
  echo '<div class="alert-banner">' . $alert . '</div>';
}
?>
<wpt-header>
        <header>
            <a class="wptheader_logo" href="/">
                <img src="/images/wpt-logo.svg"  alt="WebPageTest, by Catchpoint" />
            </a>
            <details class="wptheader_menu">
                <summary class="wptheader_menubtn">Menu:</summary>
                <nav>
                    <ul class="wptheader_nav">
                        <?php
        if ($id) {
            $resultUrl = "/results.php?test=$id";
            if (array_key_exists('end', $_REQUEST))
                $resultUrl .= "&end={$_REQUEST['end']}";
            elseif (FRIENDLY_URLS)
                $resultUrl = "/result/$id/";
        }


            function addTab($tabName, $tabUrl, $addClass = '') {
                global $tab;
                // make sure we have a test result to navigate to
                if (strlen($tabUrl)) {
                    // highlight the current tab
                    $target = '';
                    $class = '';
                    $opens = '';
                    $tabindex = '';
                    $classes = array();
                    if( strlen($addClass) ){
                        $classes[] = $addClass;
                    }
                    if( !strcasecmp($tabName, $tab) ){
                        $classes[] = 'wptheader-current';
                        $tabindex = ' tabindex="-1"';
                    }

                    if( count($classes) > 0){
                        $class = ' class="' . implode(' ', $classes) . '"' . $tabindex;
                    }

                    if (substr($tabUrl, 0, 4) == 'http' && $tabName != 'API') {
                        $target = ' target="_blank" rel="noopener"';
                        $opens = ' (opens in a new tab)';
                    }
                    if ($opens != '') {
                        return "<li><a $class title=\"$tabName$opens\" href=\"$tabUrl\"$target><span>$tabName</span></a></li>";
                    } else {
                        return "<li><a $class href=\"$tabUrl\"$target><span>$tabName</span></a></li>";
                    }
                }
            }

            echo addTab('Start Test','/');

            if (!GetSetting('disableTestlog')) {
              echo addTab('Test History', FRIENDLY_URLS ? '/testlog/1/' : '/testlog.php?days=1' );
            }

            ?>

            <li class="wptheader_nav_menu">
                    <details>
                        <summary><span>Products</span></summary>
                        <div class="wptheader_nav_menu_content">
                            <div class="wptheader_nav_menu_section">
                                <img src="/images/wpt-logo-pro-dark.svg" width="143" height="17" alt="WebPageTest Pro">
                            </div>
                            <div class="wptheader_nav_menu_section">
                                <ul>
                                    <li class="wptheader_nav_menu_link"><a href="/products/experiments">Opportunities & Experiments</a></li>
                                    <li class="wptheader_nav_menu_link"><a href="/products/api">API</a></li>
                                </ul>
                            </div>
                            <div class="wptheader_nav_menu_section">
                                <p class="wptheader_nav_cta">
                                    <span>Ready to go <strong>Pro?</strong></span>
                                    <a href="/products/pricing">Compare Plans</a>
                                </p>
                            </div>
                        </div>
                    </details>
                </li>



                <li><a href="/products/pricing"><span>Pricing</span></a></li>
               

                <li class="wptheader_nav_menu">
                    <details>
                        <summary><span>Resources</span></summary>
                        <div class="wptheader_nav_menu_content">
                            <div class="wptheader_nav_menu_section">
                                <ul>
                                    <li class="wptheader_nav_menu_link"><a href="https://docs.webpagetest.org/">Docs</a></li>
                                    <li class="wptheader_nav_menu_link"><a href="https://blog.webpagetest.org/">Blog</a></li>
                                    <li class="wptheader_nav_menu_link"><a href="https://events.webpagetest.org/">Events</a></li>
                                    <?php
  ;
                                    if (GetSetting('forums_url')) {
                                        echo '<li class="wptheader_nav_menu_link"><a href="'. GetSetting('forums_url') .'">Forums</a></li>';
                                    }
                                    ?>
                                </ul>
                            </div>
                            <div class="wptheader_nav_menu_section">
                                <p class="wptheader_nav_cta">Find us on...</p>
                                <ul class="wptheader_nav_menu_linkgrid">
                                    <li class="wptheader_nav_menu_link"><img src="https://webpagetest.org/images/twitter.svg" alt=""><a href="#https://twitter.com/RealWebPageTest">Twitter</a></li>
                                    <li class="wptheader_nav_menu_link"><img src="https://webpagetest.org/images/youtube.svg" alt=""><a href="https://www.youtube.com/channel/UC5CqJ9V7cQddZDf1DKXcy7Q">Youtube</a></li>
                                    <li class="wptheader_nav_menu_link"><img src="https://webpagetest.org/images/linkedin.svg" alt=""><a href="https://www.linkedin.com/company/webpagetest/">LinkedIn</a></li>
                                    <li class="wptheader_nav_menu_link"><img src="https://webpagetest.org/images/github.svg" alt="https://github.com/WPO-Foundation/webpagetest/"><a href="#">Github</a></li>
                                </ul>
                            </div>
                        </div>
                    </details>
                </li>

            <?php
            echo addTab('Why WebPageTest', '/why-webpagetest');


        
        
?>
                    </ul>
                    <ul class="wptheader_acct">

                    <?php

if ($supportsAuth && !defined('EMBED')) {
    if ($supportsCPAuth) {
        $is_logged_in = isset($request_context) && !is_null($request_context->getUser()) && !is_null($request_context->getUser()->getAccessToken());
        if ($is_logged_in) {
          echo "<li><a href='/account'>My Account</a></li>";
          $logoutBtn =
<<<HTML
<li>
<form method='POST' action='/logout' class='logout-form'>
<button type='submit'>Logout</button>
<input type="hidden" name="csrf_token" value="{$_SESSION['csrf_token']}" />
</form>
</li>
HTML;
          echo $logoutBtn;
        } else {
          echo '<li><a href="/login">Login</a></li>';
          echo "<li><a href='/signup'>Sign-up</a></li>";
        }
    } else if ($supportsSaml) {
if (isset($USER_EMAIL) && GetSetting('saml_account')) {
    $saml_account = GetSetting('saml_account');
    $saml_logout = GetSetting('saml_logout');
    if ($saml_logout) {
        $saml_logout = htmlspecialchars($saml_logout);
        $logoutUrl = "javascript:wptLogout('$saml_logout');";
    } else {
        $logoutUrl = "javascript:wptLogout();";
    }
    echo "<li><a href=\"$saml_account\">My Account</a></li><li><a href=\"$logoutUrl\">Logout</a></li>";
} else {
    echo '<li><a href="/saml/login.php">Login</a></li>';
    $register = GetSetting('saml_register');
    if ($register) {
        echo "<li><a href='$register' onclick=\"try{if(_gaq!=undefined){_gaq.push(['_trackEvent','Outbound','Click','Signup']);}}catch(err){}\">Sign-up</a></li>";
    }
}
} elseif( isset($user) ) {
$logoutUrl = 'https://www.webpagetest.org/forums/member.php?action=logout';
echo "<li>Welcome, " . htmlspecialchars($user) . "</li><li><a href=\"$logoutUrl\">Logout</a></li>";
} else if( isset($_COOKIE['google_email']) && isset($_COOKIE['google_id']) ) {
$logoutUrl = 'javascript:wptLogout();';
$google_email = htmlspecialchars($_COOKIE['google_email']);
echo "<li>Welcome, $google_email </li><li><a href=\"$logoutUrl\">Logout</a></li>";
} else if (GetSetting('google_oauth_client_id') && GetSetting('google_oauth_client_secret')) {
echo '<li><a href="/oauth/login.php">Login with Google</a></li>';
}
}
?>
                        
                    </ul>
                </nav>
            </details>
        </header>
    </wpt-header>

<?php
} // EMBED
?>
