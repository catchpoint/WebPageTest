<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.


// Load app and composer-based dependencies
require_once(__DIR__ . '/../vendor/autoload.php');

use WebPageTest\Util;
use WebPageTest\User;
use WebPageTest\RequestContext;
use WebPageTest\Exception\ClientException;
use WebPageTest\Exception\ForbiddenException;

if (Util::getSetting('php_sessions')) {
  // Start session handling for this request
  session_start();
}

$client_error = null;
if (Util::getSetting('cp_auth')) {
    $client_error = $_SESSION['client_error'] ?? null;
    unset($_SESSION['client_error']);

    set_exception_handler(function($e) {
        if(is_a($e, ForbiddenException::class)) {
          http_response_code(404);
          die();
        } else if(is_a($e, ClientException::class)) {
            $route = $e->getRoute();
            $message = $e->getMessage();
            $host = Util::getSetting('host');
            unset($_SESSION['client_error']);
            $_SESSION['client_error'] = $message;
            $protocol = "https";
            $location = "{$protocol}://{$host}{$route}";
            header('Location: ' . $location);
            exit();
        }
        error_log($e->getMessage);
        throw $e;
    });
}

// Load local deps
require_once(__DIR__ . '/common_lib.inc');
require_once(__DIR__ . '/plugins.php.inc');
require_once(__DIR__ . '/util.inc');

// Create global request context for future use
$request_context = new RequestContext($_REQUEST, $_SERVER);

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
define('VER_CSS', @md5_file(__DIR__ . '/pagestyle2.css'));          // version of the sitewide css file
define('VER_HEADER_CSS', @md5_file(__DIR__ . '/wpt-header.css')); // version of the header css file
define('VER_ACCOUNT_CSS', @md5_file(__DIR__ . '/css/account.css')); // version of the account css file
define('VER_BUTTON_CSS', @md5_file(__DIR__ . '/css/button.css'));   // version of the button css file
define('VER_JS', 41);                 // version of the sitewide javascript file
define('VER_JS_TEST', 47);            // version of the javascript specific to the test pages
define('VER_JS_RUNNING', 1);          // version of the javascript specific to the test running status page
define('VER_JS_ACCOUNT', @md5_file(__DIR__ . '/js/account.js'));          // version of the javascript specific to the test running status page
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

// Supported Authentication types
$supportsAuth = false;
$supportsSaml = Util::getSetting('saml_login') !== false;
$supportsCPAuth = Util::getSetting('cp_auth');
$supportsGoogleOAuth = Util::getSetting('google_oauth_client_id') && Util::getSetting('google_oauth_client_secret');
$supportsAuth = $supportsSaml || $supportsCPAuth || $supportsGoogleOAuth;

$uid = NULL;
$user = NULL;
$saml_user = null;
$admin = Util::getSetting('admin_on') == "true";
$api_keys;

if ($supportsSaml && !$supportsCPAuth) {
  $USER_EMAIL = GetSamlEmail();
  $saml_user = new User();
  $saml_user->setEmail($USER_EMAIL);
} elseif( isset($_COOKIE['google_email']) && isset($_COOKIE['google_id']) ) {
  $USER_EMAIL = $_COOKIE['google_email'];
}

if (!$admin && !$supportsCPAuth) {
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
            if ($supportsSaml) {
              $saml_user->setAdmin(true);
            }
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
if ($supportsSaml && !$supportsCPAuth) {
  $isFirstVisit = false;
  $owner = GetSamlAccount();
  $saml_user->setOwnerId($owner);
}
if (!$owner) {
  if( isset($_COOKIE['google_id']) && strlen($_COOKIE['google_id']) ) {
    $isFirstVisit = false;
    $owner = $_COOKIE['google_id'];
  } elseif(isset($_COOKIE['o']) && strlen($_COOKIE['o']) ){
    $isFirstVisit = false;
    $owner = $_COOKIE['o'];
  }
}

if (!isset($owner)) {
  $owner = sha1(uniqid(uniqid('', true), true));
}
// Sanitize the owner string
$owner = preg_replace('/[^a-zA-Z0-9]/', '', $owner);
if ($privateInstall) {
  setcookie('o', $owner, time()+60*60*24*365, '/');
} else {
  setcookie('o', $owner, time()+60*60*24*365, '/', 'webpagetest.org');
}



// set their color selection as a cookie
if (isset($_REQUEST['color'])) {
    setcookie('color', $_REQUEST['color'], time()+60*60*24*365, '/');
    $_REQUEST['color'] = $_REQUEST['color'];
}

if ($supportsSaml && !$supportsCPAuth) {
  $request_context->setUser($saml_user);
}

/**
 * Load app specific middleware
 */
if ($supportsCPAuth) {
  require_once __DIR__ . '/common/AttachClient.php';
  require_once __DIR__ . '/common/AttachUser.php';
  require_once __DIR__ . '/common/AttachSignupClient.php';
  require_once __DIR__ . '/common/CheckCSRF.php';
}

// Load the test-specific data
$id = '';
if (isset($_REQUEST['test']) && preg_match('/^[a-zA-Z0-9_]+$/', @$_REQUEST['test'])) {
    $id = $_REQUEST['test'];
}

$median_metric = GetSetting('medianMetric') ? GetSetting('medianMetric') : 'loadTime';
$testLabel = '';
$page_title = 'WebPageTest Test';
$test_is_private = false;

if (strlen($id)) {
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
      if( array_key_exists('completed', $test['testinfo'])) {
          $testDate = strftime('%x %X', (int)$test['testinfo']['completed'] + ($tz_offset * 60));
      }

      // $owner is set by CP details in AttachUser middleware if loaded
      $owner_id_matches_test = array_key_exists('owner', $test['testinfo']) && strlen($owner) && $owner == $test['testinfo']['owner'];
      $uid_matches_test = array_key_exists('uid', $test['testinfo']) && isset($uid) && strlen($uid) && $uid == $test['testinfo']['uid'];

      $isOwner = $owner_id_matches_test || $uid_matches_test;
      $test_is_private = array_key_exists('private', $test['testinfo']) && !!$test['testinfo']['private'];

      if ($test_is_private && !$isOwner) {
        throw new ForbiddenException();
      }

      $url = array_key_exists('url', $test['testinfo']) ? htmlspecialchars($test['testinfo']['url']) : null;
      $dom = array_key_exists('domElement', $test['testinfo']) ? htmlspecialchars($test['testinfo']['domElement']) : null;
      $login = array_key_exists('login', $test['testinfo']) ? htmlspecialchars($test['testinfo']['login']) : null;
      $blockString = array_key_exists('block', $test['testinfo']) ? htmlspecialchars($test['testinfo']['block']) : null;
      // there could be some domains blocked by default, mostly crytpo-miner stuff (this is why we can't have nice things)
      // so we need to compare what our domain string is to what our default list is
      $blockDomains = GetSetting('blockDomains');
      $blockDomainsString = array_key_exists('blockDomains', $test['testinfo']) ? htmlspecialchars($test['testinfo']['blockDomains']) : null;
      if (strlen($blockDomainsString) && strlen($blockDomains)) {
        $blockDomainsString = str_replace($blockDomains, '', $blockDomainsString);
      }
      $label = array_key_exists('label', $test['testinfo']) ? htmlspecialchars($test['testinfo']['label']) : null;
      $browser = array_key_exists('browser', $test['testinfo']) ? htmlspecialchars($test['testinfo']['browser']) : null;
      $connectivity = array_key_exists('connectivity', $test['testinfo']) ? htmlspecialchars($test['testinfo']['connectivity']) : null;
      $locationLabel = array_key_exists('locationLabel', $test['testinfo']) ? htmlspecialchars($test['testinfo']['locationLabel']) : null;
    }

    // build a common label and title to add to the each of the results pages
    if (isset($test["test"]) && isset($test["test"]["location"])) {
        $locs = preg_replace('/<.*>/U', '', $test["test"]["location"]);
        $locscitypos =  strpos($locs, ",");
        if ($locscitypos)
            $locs = substr($locs,0,strpos($locs, ","));
        $url_temp = $url;
        if (substr($url,0,7) == 'http://') {
            $url_temp = substr($url,7);
        } elseif (substr($url,0,8) == 'https://') {
            $url_temp = substr($url,8);
        }

        $url_hostname = parse_url($url, PHP_URL_HOST);
        if (substr($url_hostname, 0, 4) == 'www.') {
            $url_hostname = substr($url_hostname,4);
        }

        if ($label)
            $label = $label . " : ";
        $testLabel = FitText(' - ' . $locs . ' : ' . $label . $url_temp, 40);
        if ($label) {
          $page_title = FitText($label . $url_hostname, 40);
        } else {
          $page_title = FitText($url_hostname . ' : ' . $browser . ' - ' . $connectivity . ' : ' . $locationLabel, 40);
        }
        if( isset($testDate) && strlen($testDate) ) {
            $testLabel .= " - $testDate";
        }
    }

    if (!isset($test)) {
        $test = array();
    }

    if (!array_key_exists('testinfo', $test)) {
        $test['testinfo'] = array();
    }


    $experiment = false;
    if( $test['testinfo'] ){
      $testTestInfo = $test['testinfo'];
      $metaInfo = $testTestInfo['metadata'];
      if( $metaInfo ){
        $metaInfo = json_decode($metaInfo, true);
        if( $metaInfo['experiment'] && $metaInfo['experiment']['control'] === false ){
          $experiment = true;

          require_once __DIR__ . '/include/UrlGenerator.php';

          $experimentOriginalTestUrlGenerator = UrlGenerator::create(FRIENDLY_URLS, "", $metaInfo['experiment']['source_id'], 0, 0 );
          $experimentOriginalTestHref = $experimentOriginalTestUrlGenerator->resultSummary();
          $experimentOriginalExperimentsHref = $experimentOriginalTestUrlGenerator->resultPage("experiments");

          $controlTestUrlGenerator = UrlGenerator::create(FRIENDLY_URLS, "", $metaInfo['experiment']['control_id'], 0, 0 );
          $controlTestHref = $controlTestUrlGenerator->resultSummary();

          $experimentResultsHref = "/video/compare.php?tests=" . $id . ',' . $metaInfo['experiment']['control_id'];
          $experimentTestHref = "/result/" . $id;

          $experimentOptsUrlGenerator= UrlGenerator::create(FRIENDLY_URLS, "", $id, 0, 0 );
          $experimentOptsHref = $experimentOptsUrlGenerator->resultPage("experiments");
        }
      }
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

