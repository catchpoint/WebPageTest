<?php
require_once('./common_lib.inc');
require_once('./plugins.php.inc');

// if any query parameter includes a .., exit right away - likely a hack attempt
foreach($_REQUEST as $key => $val) {
    if (is_string($val) && strlen($val) && strpos($val, '/../') !== false) {
        header('HTTP/1.1 403 Forbidden');
        echo "<html><body>Sorry, the request was blocked, please contact us for details";
        echo "<br>" . htmlspecialchars($key) . " - " . htmlspecialchars($val) . "</body></html>";
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

// add a CORS header
header('Access-Control-Allow-Origin: *');

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
    if (strlen($forwarded_ip))
        $_SERVER["REMOTE_ADDR"] = $forwarded_ip;
  }
}
if (array_key_exists('HTTP_MOD_REWRITE', $_SERVER) && $_SERVER['HTTP_MOD_REWRITE'] == 'On') {
    define('FRIENDLY_URLS', true);
    define('VER_TIMELINE', '28/');       // version of the timeline javascript
} else {
    define('FRIENDLY_URLS', false);
    define('VER_TIMELINE', '');       // Leave the timeline version empty
}

$userIsBot = false;
if (array_key_exists('HTTP_USER_AGENT', $_SERVER) &&
    strlen($_SERVER['HTTP_USER_AGENT']) &&
    preg_match('/robot|spider|crawler|indexer|WeSEE|AppEngine-Google|Googlebot|^$/i', $_SERVER['HTTP_USER_AGENT']))
  $userIsBot = true;

// constants
define('VER_WEBPAGETEST', '2.16');   // webpagetest version
define('VER_CSS', 67);           // version of the sitewide css file
define('VER_JS', 32);            // version of the sitewide javascript file
define('VER_JS_TEST', 30);       // version of the javascript specific to the test pages
define('VER_JS_RUNNING', 1);     // version of the javascript specific to the test running status page
define('UNKNOWN_TIME', -1);      // Value used as a flag for an unknown time.
                                 // To find code that fails to check that a time
                                 // is unknown, change this constant to a large
                                 // negative number.

// SEO stuff
$page_keywords = array('Webpagetest','Website Speed Test','Page Speed');
$page_description = "Run a free website speed test from around the globe using real browsers at consumer connection speeds with detailed optimization recommendations.";

$tempDir = './tmp';
if (!is_dir($tempDir))
    mkdir($tempDir, 0777, true);
$tempDir = realpath($tempDir) . '/';

if (isset($req_embed)) {
    define('EMBED', true);
    define('BARE_UI', true);
    define('NAV_NO_SHARE', true);
} elseif (isset($req_bare)) {
    define('BARE_UI', true);
    define('NAV_NO_SHARE', true);
    $noanalytics = true;
    if (extension_loaded('newrelic'))
      @newrelic_disable_autorum();
}
// load the install-specific settings
$settings = parse_ini_file('./settings/settings.ini');
if (!isset($settings) || !is_array($settings))
    $settings = array();
if (!array_key_exists('nogzip', $settings))
    $settings['nogzip'] = false;
if (!array_key_exists('nolinks', $settings))
    $settings['nolinks'] = 0;
if (!array_key_exists('shard_tests', $settings))
    $settings['shard_tests'] = 0;

$privateInstall = true;
if( array_key_exists('HTTP_HOST', $_SERVER) && stristr($_SERVER['HTTP_HOST'] , '.webpagetest.org') !== false )
    $privateInstall = false;

// override some settings from the URI
if (isset($req_bulk)) {
    $settings['noBulk'] = 0;
}
$is_ssl = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? true : false;
$GLOBALS['cdnPath'] = '';
if (isset($settings['cdn']) && !$is_ssl) {
    $GLOBALS['cdnPath'] = $settings['cdn'];
}
$GLOBALS['ptotocol'] = 'http';
if ($is_ssl) {
    $GLOBALS['ptotocol'] = 'https';
}
$median_metric = 'loadTime';
if (array_key_exists('medianMetric', $_REQUEST)) {
    $median_metric = $_REQUEST['medianMetric'];
}

$tz_offset = null;
if (isset($_COOKIE['tzo'])) {
    $tz_offset = (int)$_COOKIE['tzo'];
}
SetLocaleFromBrowser();

// some myBB integration to get the requesting user
$supportsAuth = false;
$uid = NULL;
$user = NULL;
$admin = false;
$api_keys;
if (is_dir('./forums') && (!array_key_exists('disableMybb', $settings) || !$settings['disableMybb'])) {
    ob_start();
    $supportsAuth = true;

    if (isset($_COOKIE['mybbuser'])) {
        $dir = getcwd();
        try {
            define("IN_MYBB",1);
            chdir('forums'); // path to MyBB
            include './global.php';

            $uid = $mybb->user['uid'];
            $user = $mybb->user['username'];
            if( $mybb->usergroup['cancp'] )
                $admin = true;
            unset($mybb);
        }
        catch(Exception $e) {
        }
        chdir($dir);
    }
    ob_end_clean();
}

// assign a unique ID to each person
$isOwner = false;
$owner = null;
if( isset($_COOKIE['google_id']) && strlen($_COOKIE['google_id']) ) {
  $owner = $_COOKIE['google_id'];
  if (!isset($user))
    $user = $owner;
}
else if( isset($_COOKIE['o']) && strlen($_COOKIE['o']) ){
  $owner = $_COOKIE['o'];
}else{
  $owner = sha1(uniqid(uniqid('', true), true));
}
setcookie('o', $owner, time()+60*60*24*365, '/');

if( $supportsAuth && ($admin || (array_key_exists('google_email', $_COOKIE) && strpos($_COOKIE['google_email'], '@google.com') !== false)) ) {
    $settings['enable_google_csi'] = true;
}

// set their color selection as a cookie
if (isset($req_color)) {
    setcookie('color', $req_color, time()+60*60*24*365, '/');
    $_REQUEST['color'] = $req_color;
}

// Load the test-specific data
$id = '';
if (preg_match('/^[a-zA-Z0-9_]+$/', @$req_test)) {
    $id = $req_test;
} elseif (preg_match('/^[a-zA-Z0-9_]+$/', @$_COOKIE['tid'])) {
    $id = $_COOKIE['tid'];
}

$testLabel = '';
if (strlen($id)) {
    if (@strlen($req_rkey)) {
        // We are serving a relay request, so munge the id accordingly.
        $id = trim(htmlspecialchars($req_rkey)) . ".$id";
    }
    if ($id !== @$_COOKIE['tid']) {
        setcookie('tid', $id);  // update session cookie
    }
    if (!$userIsBot)
      RestoreTest($id);   // restore the test if it is archived (and deleted)

    $testPath = './' . GetTestPath($id);

    $run = htmlspecialchars(@$req_run);
    if (!$run) {
        $run = (int)1;
    }
    $cached = @(int)$req_cached;  // define a global used in other files
    if (array_key_exists('run', $_REQUEST) && !strcasecmp($_REQUEST['run'], 'median')) {
      require_once('page_data.inc');
      $pageData = loadAllPageData($testPath, $options);
      $run = GetMedianRun($pageData, $cached);
    }
    $cachedText = $cached ? '_Cached' : '';
    $test = array();
    if (is_file("$testPath/testinfo.ini")) {
        $test = parse_ini_file("$testPath/testinfo.ini",true);
        if (!$userIsBot)
          touch("$testPath/testinfo.ini");
    }
    $testDate = null;
    $test['testinfo'] = GetTestInfo($id);
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
?>
