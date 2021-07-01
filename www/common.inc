<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once('./common_lib.inc');
require_once('./plugins.php.inc');
require_once('./util.inc');

// Disable caching by default
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0", true);

if (GetSetting("serverID")) {
  header('X-WPT-Server: ' . GetSetting("serverID"));
}

if (isset($REDIRECT_HTTPS) && $REDIRECT_HTTPS && !isSslConnection() && GetSetting('prefer_https')) {
    $location = 'https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
    header('HTTP/1.1 301 Moved Permanently');
    header('Location: ' . $location);
    exit(0);
}

// if any query parameter includes a .., exit right away - likely a hack attempt
foreach($_REQUEST as $key => $val) {
    if (is_string($val) && strlen($val) && strpos($val, '/../') !== false) {
        header('HTTP/1.1 403 Forbidden');
        echo "<html><body>Sorry, the request was blocked, please contact us for details";
        echo "<br>" . htmlspecialchars($key) . " - " . htmlspecialchars($val) . "</body></html>";
        exit(0);
    }
}
// fast exit for Nagios monitoring scripts
if (array_key_exists('HTTP_USER_AGENT', $_SERVER) &&
    strlen($_SERVER['HTTP_USER_AGENT']) &&
    stripos($_SERVER['HTTP_USER_AGENT'], 'nagios') !== false) {
    echo "OK";
    exit(0);
}
// Blocked user agent strings
if (array_key_exists('HTTP_USER_AGENT', $_SERVER) && strlen($_SERVER['HTTP_USER_AGENT'])) {
  if (preg_match('/UAEmdDd8nuc0DvQH29vueQpMtlFduGU48pbw/i', $_SERVER['HTTP_USER_AGENT'])) {
    header('HTTP/1.1 403 Forbidden');
    echo "<html><body>Sorry, the request was blocked for constantly requesting invalid content, please contact us for details.";
    exit(0);
  }
}

// shared initializiation/loading code
set_time_limit(300);
if (!array_key_exists('debug', $_REQUEST) && (!isset($debug) || !$debug)) {
    error_reporting(0);
}
umask(0);
date_default_timezone_set('UTC');
extract($_POST, EXTR_SKIP|EXTR_PREFIX_ALL|EXTR_REFS, 'req');
extract($_GET, EXTR_SKIP|EXTR_PREFIX_ALL|EXTR_REFS, 'req');

// Prevent embedding except for pages that were explicitly designed to be embedded (video)
if (!isset($ALLOW_IFRAME) || !$ALLOW_IFRAME) {
  header('X-Frames-Options: sameorigin');
}

// Block indexing on everything except www
if (GetSetting('host', '') != 'www.webpagetest.org') {
  header('X-Robots-Tag: noindex');
}

// Compact-mode UI
$COMPACT_MODE = false;
if (isset($_REQUEST['compact'])) {
  if ($_REQUEST['compact']) {
    setcookie('compact', '1', time()+60*60*24*365, '/');
    $COMPACT_MODE = true;
  } else {
    setcookie('compact', '0', time()+60*60*24*365, '/');
  }
} elseif (isset($_COOKIE['compact'])) {
  if ($_COOKIE['compact']) {
    setcookie('compact', '1', time()+60*60*24*365, '/');
    $COMPACT_MODE = true;
  } else {
    setcookie('compact', '0', time()+60*60*24*365, '/');
  }
}

// set up a global curl context that can be used for keep-alive connections (particularly when doing bulk relays)
if (function_exists('curl_init')) {
    $CURL_CONTEXT = curl_init();
    if ($CURL_CONTEXT !== false) {
        curl_setopt($CURL_CONTEXT, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($CURL_CONTEXT, CURLOPT_FAILONERROR, true);
        curl_setopt($CURL_CONTEXT, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($CURL_CONTEXT, CURLOPT_CONNECTTIMEOUT, 30);
        curl_setopt($CURL_CONTEXT, CURLOPT_DNS_CACHE_TIMEOUT, 600);
        curl_setopt($CURL_CONTEXT, CURLOPT_MAXREDIRS, 10);
        curl_setopt($CURL_CONTEXT, CURLOPT_TIMEOUT, 600);
        curl_setopt($CURL_CONTEXT, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($CURL_CONTEXT, CURLOPT_SSL_VERIFYPEER, 0);
    }
} else
    $CURL_CONTEXT = false;

if (isset($_SERVER["REMOTE_ADDR"]) && $_SERVER["REMOTE_ADDR"] == '127.0.0.1' && isset($_REQUEST['addr'])) {
  $_SERVER["REMOTE_ADDR"] = $_REQUEST['addr'];
}
if (function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    if (array_key_exists('X-Forwarded-For', $headers)){
        $_SERVER["HTTP_X_FORWARDED_FOR"] = $headers['X-Forwarded-For'];
    }
}
if (isset($_SERVER["HTTP_X_FORWARDED_FOR"])) {
  $forwarded = explode(',',$_SERVER["HTTP_X_FORWARDED_FOR"]);
  if (isset($forwarded) && is_array($forwarded) && count($forwarded)) {
    $forwarded_ip = trim(end($forwarded));
    if (strlen($forwarded_ip) && $forwarded_ip != "127.0.0.1")
        $_SERVER["REMOTE_ADDR"] = $forwarded_ip;
  }
}
if (isset($_SERVER["HTTP_FASTLY_CLIENT_IP"]))
  $_SERVER["REMOTE_ADDR"] = $_SERVER["HTTP_FASTLY_CLIENT_IP"];

if (GetSetting('friendly_urls') || (array_key_exists('HTTP_MOD_REWRITE', $_SERVER) && $_SERVER['HTTP_MOD_REWRITE'] == 'On')) {
    define('FRIENDLY_URLS', true);
    define('VER_TIMELINE', '28/');       // version of the timeline javascript
} else {
    define('FRIENDLY_URLS', false);
    define('VER_TIMELINE', '');       // Leave the timeline version empty
}

$privateInstall = true;
if (array_key_exists('HTTP_HOST', $_SERVER) &&
    stristr($_SERVER['HTTP_HOST'] , 'httparchive.webpagetest.org') === false &&
    stristr($_SERVER['HTTP_HOST'] , 'webpagetest.org') !== false) {
    $privateInstall = false;
}

$userIsBot = false;
if (!$privateInstall) {
  if (array_key_exists('HTTP_USER_AGENT', $_SERVER) &&
      strlen($_SERVER['HTTP_USER_AGENT'])) {
    if (preg_match('/robot|spider|crawler|indexer|WeSEE|Googlebot|YandexBot|Twitterbot|SemrushBot|Slackbot|Slack-ImgProxy|bingbot|SEOdiver|EPiServer|BlockBit|Wget|Faraday|Apache-HttpClient|WebSpeedTest|wptagent|^$/i', $_SERVER['HTTP_USER_AGENT'])) {
      $userIsBot = true;
    }
  } else {
    $userIsBot = true;
  }
}

// constants
define('VER_WEBPAGETEST', '21.07');   // webpagetest version
define('VER_CSS', 135);                // version of the sitewide css file
define('VER_JS', 40);                 // version of the sitewide javascript file
define('VER_JS_TEST', 47);            // version of the javascript specific to the test pages
define('VER_JS_RUNNING', 1);          // version of the javascript specific to the test running status page
define('UNKNOWN_TIME', -1);           // Value used as a flag for an unknown time.
                                      // To find code that fails to check that a time
                                      // is unknown, change this constant to a large
                                      // negative number.

// SEO stuff
$page_keywords = array('WebPageTest','Website Speed Test','Page Speed');
$page_description = "Run a free website speed test from around the globe using real browsers at consumer connection speeds with detailed optimization recommendations.";

$tempDir = './tmp';
if (!is_dir($tempDir))
    mkdir($tempDir, 0777, true);
$tempDir = realpath($tempDir) . '/';

if (isset($_REQUEST['embed'])) {
    define('EMBED', true);
    define('BARE_UI', true);
    define('NAV_NO_SHARE', true);
} elseif (isset($_REQUEST['bare'])) {
    define('BARE_UI', true);
    define('NAV_NO_SHARE', true);
    $noanalytics = true;
    if (extension_loaded('newrelic'))
      @newrelic_disable_autorum();
}
$is_ssl = isSslConnection();
$GLOBALS['cdnPath'] = '';
if (GetSetting('cdn') && !$is_ssl) {
    $GLOBALS['cdnPath'] = GetSetting('cdn');
}

$tz_offset = null;
if (isset($_COOKIE['tzo'])) {
    $tz_offset = (int)$_COOKIE['tzo'];
}
SetLocaleFromBrowser();

$USER_EMAIL = null;
$supportsAuth = false;
$supportsSaml = GetSetting('saml_login') !== false;
if ($supportsSaml) {
  $supportsAuth = true;
} elseif (GetSetting('google_oauth_client_id') && GetSetting('google_oauth_client_secret')) {
  $supportsAuth = true;
}
$uid = NULL;
$user = NULL;
$admin = false;
$api_keys;

if ($supportsSaml) {
  $USER_EMAIL = GetSamlEmail();
} elseif( isset($_COOKIE['google_email']) && isset($_COOKIE['google_id']) ) {
  $USER_EMAIL = $_COOKIE['google_email'];
}

if (!$admin) {
  $this_user = null;
  if (isset($user)) {
    $this_user = $user;
  } elseif (isset($USER_EMAIL)) {
    $this_user = $USER_EMAIL;
  }
  if (isset($this_user) && strlen($this_user)) {
    $admin_users = GetSetting("admin_users");
    if ($admin_users) {
      $admin_users = explode(',', $admin_users);
      if (is_array($admin_users) && count($admin_users)) {
        foreach($admin_users as $substr) {
          if (stripos($this_user, $substr) !== false) {
            $admin = true;
            break;
          }
        }
      }
    }
  }
}

// assign a unique ID to each person
$isFirstVisit = true;
$isOwner = false;
$owner = null;
if ($supportsSaml) {
  $isFirstVisit = false;
  $owner = GetSamlAccount();
} elseif( isset($_COOKIE['google_id']) && strlen($_COOKIE['google_id']) ) {
  $isFirstVisit = false;
  $owner = $_COOKIE['google_id'];
} else if( isset($_COOKIE['o']) && strlen($_COOKIE['o']) ){
  $isFirstVisit = false;
  $owner = $_COOKIE['o'];
}
if (!isset($owner)) {
  $owner = sha1(uniqid(uniqid('', true), true));
}
// Sanitize the owner string
$owner = preg_replace('/[^a-zA-Z0-9]/', '', $owner);
setcookie('o', $owner, time()+60*60*24*365, '/');

// set their color selection as a cookie
if (isset($_REQUEST['color'])) {
    setcookie('color', $_REQUEST['color'], time()+60*60*24*365, '/');
    $_REQUEST['color'] = $_REQUEST['color'];
}

// Load the test-specific data
$id = '';
if (isset($_REQUEST['test']) && preg_match('/^[a-zA-Z0-9_]+$/', @$_REQUEST['test'])) {
    $id = $_REQUEST['test'];
}

$median_metric = GetSetting('medianMetric') ? GetSetting('medianMetric') : 'loadTime';
$testLabel = '';
if (strlen($id)) {
    if(extension_loaded('newrelic')) {
        newrelic_add_custom_parameter ('testID', $id);
    }  
    if (isset($_REQUEST['rkey']) && @strlen($_REQUEST['rkey'])) {
        // We are serving a relay request, so munge the id accordingly.
        $id = trim(htmlspecialchars($_REQUEST['rkey'])) . ".$id";
    }
    if (!$userIsBot)
      RestoreTest($id);   // restore the test if it is archived (and deleted)

    $testPath = './' . GetTestPath($id);
    $test = array();
    if (is_file("$testPath/testinfo.ini")) {
        $test = @parse_ini_file("$testPath/testinfo.ini",true);
        if (!$userIsBot)
          touch("$testPath/testinfo.ini");
    }
    $test['testinfo'] = GetTestInfo($id);
    if (isset($test['testinfo']['medianMetric']))
      $median_metric = $test['testinfo']['medianMetric'];

    $run = isset($_REQUEST['run']) ? intval($_REQUEST['run']) : 0;
    if (!$run) {
        $run = (int)1;
    }
    $step = max(1, isset($_REQUEST['step']) ? @(int)$_REQUEST['step'] : 1); // default is step=1
    $cached = isset($_REQUEST['cached']) ? @(int)$_REQUEST['cached'] : 0;  // define a global used in other files
    if (array_key_exists('run', $_REQUEST) && !strcasecmp($_REQUEST['run'], 'median')) {
      require_once 'include/TestInfo.php';
      require_once 'include/TestResults.php';
      $testInfo = TestInfo::fromFiles($testPath);
      $testResults = TestResults::fromFiles($testInfo);
      $run = $testResults->getMedianRunNumber($median_metric, $cached);
    }
    $cachedText = $cached ? '_Cached' : '';
    $testDate = null;
    if ($test['testinfo']) {
      if( array_key_exists('completed', $test['testinfo']))
          $testDate = strftime('%x %X', (int)$test['testinfo']['completed'] + ($tz_offset * 60));
      if (array_key_exists('owner', $test['testinfo']) && strlen($owner) && $owner == $test['testinfo']['owner'])
          $isOwner = true;
      elseif (array_key_exists('uid', $test['testinfo']) && strlen($uid) && $uid == $test['testinfo']['uid'])
          $isOwner = true;

      $url = array_key_exists('url', $test['testinfo']) ? htmlspecialchars($test['testinfo']['url']) : null;
      $dom = array_key_exists('domElement', $test['testinfo']) ? htmlspecialchars($test['testinfo']['domElement']) : null;
      $login = array_key_exists('login', $test['testinfo']) ? htmlspecialchars($test['testinfo']['login']) : null;
      $blockString = array_key_exists('block', $test['testinfo']) ? htmlspecialchars($test['testinfo']['block']) : null;
      $label = array_key_exists('label', $test['testinfo']) ? htmlspecialchars($test['testinfo']['label']) : null;
    }

    // build a common label to add to the title of each of the results pages
    if (isset($test["test"]) && isset($test["test"]["location"])) {
        $locs = preg_replace('/<.*>/U', '', $test["test"]["location"]);
        $locscitypos =  strpos($locs, ",");
        if ($locscitypos)
            $locs = substr($locs,0,strpos($locs, ","));
        $url_temp = $url;
        if (substr($url,0,7) == 'http://')
            $url_temp = substr($url,7);
        elseif (substr($url,0,8) == 'https://')
            $url_temp = substr($url,8);
        if ($label)
            $label = $label . " : ";
        $testLabel = FitText(' - ' . $locs . ' : ' . $label . $url_temp, 40);
        if( isset($testDate) && strlen($testDate) )
            $testLabel .= " - $testDate";
    }

    if (!isset($test)) {
        $test = array();
    }

    if (!array_key_exists('testinfo', $test)) {
        $test['testinfo'] = array();
    }
}

// see if we need to proxy requests to another server (after restoring the test and if we don't have it locally)
if (isset($testPath) && !is_dir($testPath)) {
  if ($_SERVER['REQUEST_METHOD'] === 'GET' &&
      strpos($_SERVER['REQUEST_URI'], '/video/', 0) !== 0 &&
      preg_match('/\d\d\d\d\d\d_([\w]+)i[^_]+_[\w]+/', $_SERVER['QUERY_STRING'], $matches)) {
    $proxy_host = GetSetting("proxy_{$matches[1]}");
    if ($proxy_host) {
      proxy_request($proxy_host);
      exit(0);
    }
  }
}

if (array_key_exists('medianMetric', $_REQUEST)) {
    $median_metric = htmlspecialchars($_REQUEST['medianMetric']);
}

if (is_file('./settings/custom_common.inc.php')) {
    include('./settings/custom_common.inc.php');
}