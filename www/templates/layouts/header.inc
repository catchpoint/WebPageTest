<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
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
            echo file_get_contents(__DIR__ . '/../../images/icon-login.svg');
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
