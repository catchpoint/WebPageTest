<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once(__DIR__ . '/../vendor/autoload.php');

use WebPageTest\Util\CustomMetricFiles;

// see if we are loading the test settings from a profile
$profile_file = SETTINGS_PATH . '/profiles.ini';
if (file_exists(SETTINGS_PATH . '/common/profiles.ini')) {
    $profile_file = SETTINGS_PATH . '/common/profiles.ini';
}
if (file_exists(SETTINGS_PATH . '/server/profiles.ini')) {
    $profile_file = SETTINGS_PATH . '/server/profiles.ini';
}
// Note: here we're looking for a simpleadvanced flag to be marked as simple before using this profile, or if it's not there at all.
if (isset($_REQUEST['profile']) && (!isset($_REQUEST['simpleadvanced']) || $_REQUEST['simpleadvanced'] === 'simple') && is_file($profile_file)) {
    $profiles = parse_ini_file($profile_file, true);
    if (isset($profiles) && is_array($profiles) && isset($profiles[$_REQUEST['profile']])) {
        foreach ($profiles[$_REQUEST['profile']] as $key => $value) {
            if ($key !== 'label' && $key !== 'description') {
                $_REQUEST[$key] = $value;
                $_GET[$key] = $value;
            }
        }
    }
}
$wvprofile_file = SETTINGS_PATH . '/profiles_webvitals.ini';
if (file_exists(SETTINGS_PATH . '/common/profiles_webvitals.ini')) {
    $wvprofile_file = SETTINGS_PATH . '/common/profiles_webvitals.ini';
}
if (file_exists(SETTINGS_PATH . '/server/profiles_webvitals.ini')) {
    $wvprofile_file = SETTINGS_PATH . '/server/profiles_webvitals.ini';
}
if (isset($_REQUEST['webvital_profile']) && is_file($wvprofile_file)) {
    $profiles = parse_ini_file($wvprofile_file, true);
    if (isset($profiles) && is_array($profiles) && isset($profiles[$_REQUEST['webvital_profile']])) {
        foreach ($profiles[$_REQUEST['webvital_profile']] as $key => $value) {
            if ($key !== 'label' && $key !== 'description') {
                $_REQUEST[$key] = $value;
                $_GET[$key] = $value;
            }
        }
    }
}
require_once('common.inc');

use WebPageTest\Util;
use WebPageTest\Util\Cache;
use WebPageTest\Template;
use WebPageTest\RateLimiter;
use WebPageTest\Util\IniReader;

require_once(INCLUDES_PATH . '/ec2/ec2.inc.php');
require_once(INCLUDES_PATH . '/include/CrUX.php');

$experimentURL = Util::getSetting('experimentURL', null);
$ui_priority = !is_null($request_context->getUser()) ? $request_context->getUser()->getUserPriority() : 0;

set_time_limit(300);

$redirect_cache = array();
$error = null;
$xml = false;
$usingAPI = false;
$usingApi2 = false;
$forceValidate = false;
$runcount = 0;
$apiKey = null;
$is_mobile = false;
$isPaid = !is_null($request_context->getUser()) && $request_context->getUser()->isPaid();
$includePaid = $isPaid || $admin;
// load the secret key (if there is one)
$server_secret = Util::getServerSecret();
$api_keys = null;
$user_api_key = $request_context->getApiKeyInUse();

if (!empty($user_api_key)) {
    $keys_file = SETTINGS_PATH . '/keys.ini';
    if (file_exists(SETTINGS_PATH . '/common/keys.ini')) {
        $keys_file = SETTINGS_PATH . '/common/keys.ini';
    }
    if (file_exists(SETTINGS_PATH . '/server/keys.ini')) {
        $keys_file = SETTINGS_PATH . '/server/keys.ini';
    }
    $api_keys = parse_ini_file($keys_file, true);
}

if (isset($req_f) && !strcasecmp($req_f, 'xml')) {
    $xml = true;
}
$json = false;
if (isset($req_f) && !strcasecmp($req_f, 'json')) {
    $json = true;
}
$headless = false;
if (Util::getSetting('headless')) {
    $headless = true;
}
$is_bulk_test = false;

// Load the location information
$locations = LoadLocationsIni();
// See if we need to load a subset of the locations
if (!$privateInstall && !empty($user_api_key) && $user_api_key != GetServerKey() && isset($api_keys) && !isset($api_keys[$user_api_key])) {
    foreach ($locations as $name => $location) {
        if (isset($location['browser']) && isset($location['noapi'])) {
            unset($locations[$name]);
        }
    }
} elseif (!$includePaid) {
    //no key, so we need to look at user status for paid
    foreach ($locations as $name => $location) {
        if (isset($location['browser']) && isset($location['premium'])) {
            unset($locations[$name]);
        }
    }
}
BuildLocations($locations);
// Copy the lat/lng configurations to all of the child locations
foreach ($locations as $loc_name => $loc) {
    if (isset($loc['lat']) && isset($loc['lng']) && !isset($loc['browser'])) {
        foreach ($loc as $key => $child_loc) {
            if (is_numeric($key) && isset($locations[$child_loc])) {
                $locations[$child_loc]['lat'] = $loc['lat'];
                $locations[$child_loc]['lng'] = $loc['lng'];
                $separator = strpos($child_loc, ':');
                if ($separator > 0) {
                    $child_loc = substr($child_loc, 0, $separator);
                    if (isset($locations[$child_loc])) {
                        $locations[$child_loc]['lat'] = $loc['lat'];
                        $locations[$child_loc]['lng'] = $loc['lng'];
                    }
                }
            }
        }
    }
}

// See if we're re-running an existing test
if (isset($test)) {
    unset($test);
}
if (array_key_exists('resubmit', $_POST)) {
    $test = GetTestInfo(trim($_POST['resubmit']));
    if ($test) {
        unset($test['completed']);
        unset($test['started']);
        unset($test['tester']);
        unset($test['batch']);
        if (isset($req_block)) {
            $test['block'] .= ' ' . $req_block;
        }
        if (isset($req_spof)) {
            $test['spof'] .= ' ' . $req_spof;
        }
        if (isset($req_runs)) {
            $test['runs'] = isset($req_runs) ? (int)$req_runs : 1;
        }
        if (isset($req_keepua)) {
            $test['keepua'] = 1;
        }
        if (isset($req_blockDomains)) {
            $test['blockDomains'] .= ' ' . $req_blockDomains;
        }
        if (isset($req_label)) {
            $test['label'] = preg_replace('/[^\w\d \-_\.]/', '', trim($req_label));
        }
    } else {
        unset($test);
    }
}

// Pull in the test parameters
if (!isset($test)) {
    $test = array();
    $test['url'] = trim($req_url);
    $test['steps'] = 1;
    if (isset($req_domelement)) {
        $test['domElement'] = trim($req_domelement);
    }
    if (isset($req_login)) {
        $test['login'] = trim($req_login);
    }
    if (isset($req_password)) {
        $test['password'] = trim($req_password);
    }
    if (isset($req_customHeaders)) {
        $test['customHeaders'] = trim($req_customHeaders);
    }
    if (isset($_REQUEST['injectScript']) && strlen($_REQUEST['injectScript'])) {
        $test['injectScript'] = $_REQUEST['injectScript'];
    }
    $test['injectScriptAllFrames'] = isset($_REQUEST['injectScriptAllFrames']) && $_REQUEST['injectScriptAllFrames'] ? 1 : 0;
    $test['runs'] = isset($req_runs) ? (int)$req_runs : 0;
    $test['fvonly'] = isset($req_fvonly) ? (int)$req_fvonly : 0;
    if (isset($_REQUEST['rv'])) {
        $test['fvonly'] = $_REQUEST['rv'] ? 0 : 1;
    }
    $test['timeout'] = isset($req_timeout) ? (int)$req_timeout : 0;
    $maxTime = GetSetting('maxtime');
    if ($maxTime && $test['timeout'] > $maxTime) {
        $test['timeout'] = (int)$maxTime;
    }
    $run_time_limit = GetSetting('run_time_limit');
    if ($run_time_limit) {
        $test['run_time_limit'] = (int)$run_time_limit;
    }
    $test['connections'] = isset($req_connections) ? (int)$req_connections : 0;

    /**
     * True private tests are a paid feature (we formerly said we had
     * private tests, but they weren't actually private
     */
    $is_private = 0;

    $is_private_api_call = !empty($user_api_key) && !empty($req_private) &&
      ((int)$req_private == 1 || $req_private == 'true');
    $is_private_web_call = $isPaid && ($_POST['private'] == 'on');

    if ($is_private_api_call || $is_private_web_call) {
        $is_private = 1;
    }
    $test['private'] = $is_private;

    if (isset($req_web10)) {
        $test['web10'] = $req_web10;
    }
    if (isset($req_ignoreSSL)) {
        $test['ignoreSSL'] = $req_ignoreSSL;
    }
    if (isset($req_script)) {
        $test['script'] = trim($req_script);
    }
    if (isset($req_block)) {
        $test['block'] = $req_block;
    }
    $test['blockDomains'] = isset($req_blockDomains) ? $req_blockDomains : "";
    $blockDomains = GetSetting('blockDomains');
    if ($blockDomains && strlen($blockDomains)) {
        if (strlen($test['blockDomains'])) {
            $test['blockDomains'] .= ' ';
        }
        $test['blockDomains'] .= $blockDomains;
    }
    if (isset($req_notify)) {
        $test['notify'] = trim($req_notify);
    }
    $test['video'] = 1;
    if (isset($req_video)) {
        $test['video'] = $req_video;
    }
    if (isset($_REQUEST['disable_video']) && $_REQUEST['disable_video']) {
        $test['disable_video'] = 1;
    } elseif (GetSetting('strict_video')) {
        if (!isset($test['video']) || !$test['video']) {
            $test['disable_video'] = 1;
        }
    }
    $test['keepvideo'] = isset($req_keepvideo) && $req_keepvideo ? 1 : 0;
    $test['continuousVideo'] = isset($req_continuousVideo) && $req_continuousVideo ? 1 : 0;
    $test['renderVideo'] = isset($req_renderVideo) && $req_renderVideo ? 1 : 0;
    if (isset($req_label)) {
        $test['label'] = preg_replace('/[^\w\d \-_\.]/', '', trim($req_label));
    }
    $test['median_video'] = isset($req_mv) ? (int)$req_mv : 0;
    if (isset($req_addr)) {
        $test['ip'] = $req_addr;
    }
    $test['priority'] = isset($req_priority) ? (int)$req_priority : $ui_priority;
    if (isset($req_bwIn) && !isset($req_bwDown)) {
        $test['bwIn'] = (int)$req_bwIn;
    } else {
        $test['bwIn'] = (int)$req_bwDown;
    }
    if (isset($req_bwOut) && !isset($req_bwUp)) {
        $test['bwOut'] = (int)$req_bwOut;
    } else {
        $test['bwOut'] = isset($req_bwUp) ? (int)$req_bwUp : 0;
    }
    $test['latency'] = isset($req_latency) ? (int)$req_latency : 0;
    $test['testLatency'] = isset($req_latency) ? (int)$req_latency : 0;
    $test['plr'] = isset($req_plr) ? trim($req_plr) : 0;
    $test['shaperLimit'] = isset($req_shaperLimit) ? (int)$req_shaperLimit : 0;
    if (isset($req_pingback)) {
        $test['callback'] = $req_pingback;
    }
    if (!$json && !isset($req_pingback) && isset($req_callback)) {
        $test['callback'] = $req_callback;
    }
    if (!isset($test['callback']) && GetSetting('ping_back_url')) {
        $test['callback'] = GetSetting('ping_back_url');
    }
    if (isset($req_agent)) {
        $test['agent'] = $req_agent;
    }
    if (isset($req_tcpdump)) {
        $test['tcpdump'] = $req_tcpdump;
    }
    if (isset($req_lighthouse)) {
        $test['lighthouse'] = $req_lighthouse;
    }
    $test['lighthouseTrace'] = isset($_REQUEST['lighthouseTrace']) && $_REQUEST['lighthouseTrace'] ? 1 : 0;
    $test['lighthouseScreenshots'] = isset($_REQUEST['lighthouseScreenshots']) && $_REQUEST['lighthouseScreenshots'] === "0" ? 0 : 1;
    $test['lighthouseThrottle'] = isset($_REQUEST['lighthouseThrottle']) && $_REQUEST['lighthouseThrottle'] ? 1 : GetSetting('lighthouseThrottle', 0);
    if (isset($_REQUEST['lighthouseConfig']) && strlen($_REQUEST['lighthouseConfig'])) {
        $test['lighthouseConfig'] = $_REQUEST['lighthouseConfig'];
    }
    $test['timeline'] = 1;
    if (isset($req_timeline)) {
        $test['timeline'] = $req_timeline;
    }
    if (isset($_REQUEST['timeline_fps']) && $_REQUEST['timeline_fps']) {
        $test['timeline_fps'] = 1;
    }
    if (isset($_REQUEST['profiler']) && $_REQUEST['profiler']) {
        $test['profiler'] = 1;
    }
    if (isset($_REQUEST['discard_timeline']) && $_REQUEST['discard_timeline']) {
        $test['discard_timeline'] = 1;
    }
    $test['timelineStackDepth'] = array_key_exists('timelineStack', $_REQUEST) && $_REQUEST['timelineStack'] ? 5 : 0;
    if (isset($req_swrender)) {
        $test['swrender'] = $req_swrender;
    }
    $test['v8rcs'] = isset($_REQUEST['v8rcs']) && $_REQUEST['v8rcs'] ? 1 : 0;
    $test['trace'] = array_key_exists('trace', $_REQUEST) && $_REQUEST['trace'] ? 1 : 0;
    if (
        isset($_REQUEST['trace']) &&
        strlen($_REQUEST['traceCategories']) &&
        strpos($test['traceCategories'], "\n") === false &&
        trim($test['traceCategories']) != "*"
    ) {
        $test['traceCategories'] = $_REQUEST['traceCategories'];
    }
    if (isset($req_standards)) {
        $test['standards'] = $req_standards;
    }
    if (isset($req_netlog)) {
        $test['netlog'] = $req_netlog;
    }
    if (isset($_REQUEST['coverage'])) {
        $test['coverage'] = $_REQUEST['coverage'];
    }
    if (isset($req_spdy3)) {
        $test['spdy3'] = $req_spdy3;
    }
    if (isset($req_noscript)) {
        $test['noscript'] = $req_noscript;
    }
    if (isset($req_fullsizevideo)) {
        $test['fullsizevideo'] = $req_fullsizevideo;
    }
    $test['thumbsize'] = isset($_REQUEST['thumbsize']) ? min(max(intval($_REQUEST['thumbsize']), 100), 2000) : GetSetting('thumbsize', null);
    if (isset($req_blockads)) {
        $test['blockads'] = $req_blockads;
    }
    if (isset($req_sensitive)) {
        $test['sensitive'] = $req_sensitive;
    }
    if (isset($req_type)) {
        $test['type'] = trim($req_type);
    }
    if (isset($req_noopt)) {
        $test['noopt'] = trim($req_noopt);
    }
    if (isset($req_noimages)) {
        $test['noimages'] = trim($req_noimages);
    }
    if (isset($req_noheaders)) {
        $test['noheaders'] = trim($req_noheaders);
    }
    if (isset($req_view)) {
        $test['view'] = trim($req_view);
    }
    if (isset($req_discard)) {
        $test['discard'] = max(min((int)$req_discard, $test['runs'] - 1), 0);
    }
    $test['queue_limit'] = 0;
    $test['pngss'] = isset($req_pngss) ? (int)$req_pngss : 0;
    $test['fps'] = isset($req_fps) ? (int)$req_fps : null;
    $test['iq'] = isset($req_iq) ? (int)$req_iq : 0;
    $test['bodies'] = array_key_exists('bodies', $_REQUEST) && $_REQUEST['bodies'] ? 1 : 0;
    if (!array_key_exists('bodies', $_REQUEST) && GetSetting('bodies')) {
        $test['bodies'] = 1;
    }
    if (isset($req_htmlbody)) {
        $test['htmlbody'] = $req_htmlbody;
    }
    $test['time'] = isset($req_time) ? (int)$req_time : 0;
    $test['keepua'] = 0;
    $test['max_retries'] = isset($req_retry) ? min((int)$req_retry, 10) : 0;
    if (array_key_exists('keepua', $_REQUEST) && $_REQUEST['keepua']) {
        $test['keepua'] = 1;
    }
    $test['axe'] = 1;
    if (isset($req_pss_advanced)) {
        $test['pss_advanced'] = $req_pss_advanced;
    }
    $test['mobile'] = array_key_exists('mobile', $_REQUEST) && $_REQUEST['mobile'] ? 1 : 0;
    if (isset($_REQUEST['mobileDevice'])) {
        $test['mobileDevice'] = $_REQUEST['mobileDevice'];
    }
    $test['dpr'] = isset($_REQUEST['dpr']) && $_REQUEST['dpr'] > 0 ? $_REQUEST['dpr'] : 0;
    $test['width'] = isset($_REQUEST['width']) && $_REQUEST['width'] > 0 ? $_REQUEST['width'] : 0;
    $test['height'] = isset($_REQUEST['height']) && $_REQUEST['height'] > 0 ? $_REQUEST['height'] : 0;
    $test['browser_width'] = isset($_REQUEST['browser_width']) && $_REQUEST['browser_width'] > 0 ? $_REQUEST['browser_width'] : 0;
    $test['browser_height'] = isset($_REQUEST['browser_height']) && $_REQUEST['browser_height'] > 0 ? $_REQUEST['browser_height'] : 0;
    $test['clearcerts'] = array_key_exists('clearcerts', $_REQUEST) && $_REQUEST['clearcerts'] ? 1 : 0;
    $test['orientation'] = array_key_exists('orientation', $_REQUEST) ? trim($_REQUEST['orientation']) : 'default';
    $test['responsive'] = array_key_exists('responsive', $_REQUEST) && $_REQUEST['responsive'] ? 1 : 0;
    $test['minimalResults'] = array_key_exists('minimal', $_REQUEST) && $_REQUEST['minimal'] ? 1 : 0;
    $test['debug'] = isset($_REQUEST['debug']) && $_REQUEST['debug'] ? 1 : 0;
    $test['disableAVIF'] = isset($_REQUEST['disableAVIF']) && $_REQUEST['disableAVIF'] ? 1 : 0;
    $test['disableWEBP'] = isset($_REQUEST['disableWEBP']) && $_REQUEST['disableWEBP'] ? 1 : 0;
    $test['disableJXL'] = isset($_REQUEST['disableJXL']) && $_REQUEST['disableJXL'] ? 1 : 0;
    $test['dtShaper'] = isset($_REQUEST['dtShaper']) && $_REQUEST['dtShaper'] ? 1 : 0;
    $test['axe'] = isset($_REQUEST['axe']) && $_REQUEST['axe'] ? 1 : 0;
    if (isset($_REQUEST['warmup']) && $_REQUEST['warmup'] > 0) {
        $test['warmup'] = min(intval($_REQUEST['warmup']), 3);
    }
    if (isset($_REQUEST['medianMetric'])) {
        $test['medianMetric'] = $_REQUEST['medianMetric'];
    }
    if (isset($_REQUEST['throttle_cpu'])) {
        $test['throttle_cpu'] = $_REQUEST['throttle_cpu'];
    }
    if (isset($_REQUEST['bypass_cpu_normalization'])) {
        $test['bypass_cpu_normalization'] = $_REQUEST['bypass_cpu_normalization'] ? 1 : 0;
    }
    if (GetSetting('securityInsights') || (isset($_REQUEST['securityInsights']) && $_REQUEST['securityInsights'])) {
        $test['securityInsights'] = 1;
    }

    if (array_key_exists('affinity', $_REQUEST)) {
        $test['affinity'] = hexdec(substr(sha1($_REQUEST['affinity']), 0, 8));
    }
    if (array_key_exists('tester', $_REQUEST) && preg_match('/[a-zA-Z0-9\-_]+/', $_REQUEST['tester'])) {
        $test['affinity'] = 'Tester' . $_REQUEST['tester'];
    }

    // custom options
    $test['cmdLine'] = '';
    if (isset($req_cmdline)) {
        ValidateCommandLine($req_cmdline, $error);
        $test['addCmdLine'] = $req_cmdline;
    }
    if (isset($req_disableThreadedParser) && $req_disableThreadedParser) {
        if (strlen($test['addCmdLine'])) {
            $test['addCmdLine'] .= ' ';
        }
        $test['addCmdLine'] .= '--disable-threaded-html-parser';
    }
    if (isset($req_spdyNoSSL) && $req_spdyNoSSL) {
        if (strlen($test['addCmdLine'])) {
            $test['addCmdLine'] .= ' ';
        }
        $test['addCmdLine'] .= '--use-spdy=no-ssl';
    }
    if (isset($req_dataReduction) && $req_dataReduction) {
        if (strlen($test['addCmdLine'])) {
            $test['addCmdLine'] .= ' ';
        }
        $test['addCmdLine'] .= '--enable-spdy-proxy-auth';
    }
    if (isset($req_uastring) && strlen($req_uastring)) {
        if (strpos($req_uastring, '"') !== false) {
            $error = 'Invalid User Agent String: "' . htmlspecialchars($req_uastring) . '"';
        } else {
            $test['uastring'] = $req_uastring;
        }
    }
    if (isset($req_UAModifier) && strlen($req_UAModifier)) {
        if (strpos($req_UAModifier, '"') !== false) {
            $error = 'Invalid User Agent Modifier: "' . htmlspecialchars($req_UAModifier) . '"';
        } else {
            $test['UAModifier'] = $req_UAModifier;
        }
    } else {
        $UAModifier = GetSetting('UAModifier');
        if ($UAModifier && strlen($UAModifier)) {
            $test['UAModifier'] = $UAModifier;
        }
    }
    if (isset($req_appendua) && strlen($req_appendua)) {
        if (strpos($req_appendua, '"') !== false) {
            $error = 'Invalid User Agent String: "' . htmlspecialchars($req_appendua) . '"';
        } else {
            $test['appendua'] = $req_appendua;
        }
    }
    if (isset($req_wprDesktop) && $req_wprDesktop) {
        $wprDesktop = GetSetting('wprDesktop');
        if ($wprDesktop) {
            if (strlen($test['addCmdLine'])) {
                $test['addCmdLine'] .= ' ';
            }
            $test['addCmdLine'] .= "--host-resolver-rules=\"MAP * $wprDesktop,EXCLUDE localhost,EXCLUDE 127.0.0.1\"";
            $test['ignoreSSL'] = 1;
        }
    } elseif (isset($req_wprMobile) && $req_wprMobile) {
        $wprMobile = GetSetting('wprMobile');
        if ($wprMobile) {
            if (strlen($test['addCmdLine'])) {
                $test['addCmdLine'] .= ' ';
            }
            $test['addCmdLine'] .= "--host-resolver-rules=\"MAP * $wprMobile,EXCLUDE localhost,EXCLUDE 127.0.0.1\"";
            $test['ignoreSSL'] = 1;
        }
    }
    if (isset($req_hostResolverRules) && preg_match('/^[a-zA-Z0-9 \.\:\*,]+$/i', $req_hostResolverRules)) {
        if (strlen($test['addCmdLine'])) {
            $test['addCmdLine'] .= ' ';
        }
        $test['addCmdLine'] .= "--host-resolver-rules=\"$req_hostResolverRules,EXCLUDE localhost,EXCLUDE 127.0.0.1\"";
    }

    if (isset($_REQUEST['extensions']) && is_string($_REQUEST['extensions']) && strlen($_REQUEST['extensions']) == 32) {
        $extensions = IniReader::getExtensions();
        $requested = $_REQUEST['extensions'];
        if (array_key_exists($requested, $extensions)) {
            $test['extensions'] = $_REQUEST['extensions'];
            $test['extensionName'] = $extensions[$requested];
        }
    }

    // Store an opaque metadata string/JSON object if one was provided (up to 10KB)
    if (isset($_REQUEST['metadata']) && is_string($_REQUEST['metadata']) && strlen($_REQUEST['metadata'] <= 10240)) {
        $metadata = $_REQUEST['metadata'];
        $metadata_json = json_decode($metadata, true);
        if (isset($metadata_json) && is_array($metadata_json)) {
            $metadata = $metadata_json;
        }
        $test['metadata'] = $metadata;
    }

    // see if we need to process a template for these requests
    if (!empty($user_api_key) && isset($api_keys)) {
        if (count($api_keys) && array_key_exists($user_api_key, $api_keys) && array_key_exists('template', $api_keys[$user_api_key])) {
            $template = $api_keys[$user_api_key]['template'];
            if (is_file("./settings/common/templates/$template.php")) {
                include("./settings/common/templates/$template.php");
            }
        }
    }

    // Extract the location, browser and connectivity.
    // location:browser.connectivity
    if (
        preg_match('/([^\.:]+)[:]*(.*)[\.]+([^\.]*)/i', trim($req_location), $matches) ||
        preg_match('/([^\.:]+)[:]*(.*)/i', trim($req_location), $matches)
    ) {
        $test['location'] = trim($matches[1]);
        if (strlen(trim($matches[2]))) {
            $parts = explode(';', $matches[2]);
            $test['browser'] = trim($parts[0]);
            if (count($parts) > 1 && strlen($parts[1])) {
                $test['mobile'] = 1;
                $test['mobileDevice'] = $parts[1];
            }
        }
        if (
            strlen(trim($matches[3])) &&
            empty($locations[$test['location']]['connectivity'])
        ) {
            $test['connectivity'] = trim($matches[3]);
            $test['requested_connectivity'] = $test['connectivity'];
        }
    } else {
        $test['location'] = trim($req_location);
    }
    if (isset($locations[$test['location']]['ami'])) {
        $test['ami'] = $locations[$test['location']]['ami'];
    }
    if (isset($locations[$test['location']]['shardID'])) {
        $test['locationShard'] = $locations[$test['location']]['shardID'];
    }

    // set the browser to the default if one wasn't specified
    if (
        (!array_key_exists('browser', $test) ||
            !strlen($test['browser'])) &&
        array_key_exists($test['location'], $locations) &&
        array_key_exists('browser', $locations[$test['location']]) &&
        strlen($locations[$test['location']]['browser'])
    ) {
        $browsers = explode(',', $locations[$test['location']]['browser']);
        if (isset($browsers) && is_array($browsers) && count($browsers)) {
            $test['browser'] = trim($browsers[0]);
        }
    }

    if (isset($test['browser'])) {
        if (substr($test['browser'], 0, 0) == 'iPhone' || substr($test['browser'], 0, 0) == 'iPod') {
            $is_mobile = true;
        }
    }

    if (isset($locations[$test['location']]['mobile']) && $locations[$test['location']]['mobile']) {
        $is_mobile = true;
    }

    // Extract the multiple locations.
    if (isset($req_multiple_locations)) {
        $test['multiple_locations'] = array();
        foreach ($req_multiple_locations as $location_string) {
            array_push($test['multiple_locations'], $location_string);
        }
        $test['batch_locations'] = 1;
    }

    // modify the script to include additional headers (if appropriate)
    if (isset($req_addheaders) && strlen($req_addheaders) && strlen($test['script'])) {
        $headers = explode("\n", $req_addheaders);
        foreach ($headers as $header) {
            $header = trim($header);
            if (strpos($header, ':')) {
                $test['script'] = "addHeader\t$header\r\n" . $test['script'];
            }
        }
    }

    // see if it is a batch test
    $test['batch'] = 0;
    if (
        (isset($req_bulkurls) && strlen($req_bulkurls)) ||
        (isset($_FILES['bulkfile']) && isset($_FILES['bulkfile']['tmp_name']) && strlen($_FILES['bulkfile']['tmp_name']))
    ) {
        $test['batch'] = 1;
        $is_bulk_test = true;
    }

    if (!$test['mobile'] && (!$test['browser_width'] || !$test['browser_height']) && isset($_REQUEST['resolution'])) {
        $resolution = $_REQUEST['resolution'];
        $parts = explode('x', $resolution);
        if (count($parts) == 2) {
            $width = $parts[0];
            $height = $parts[1];
            if ($width > 0 && $width <= 1920 && $height > 0 && $height <= 1200) {
                $test['browser_width'] = $width;
                $test['browser_height'] = $height;
            }
        }
    }

    if (!$test['mobile'] && (!$test['browser_width'] || !$test['browser_height'])) {
        $browser_size = GetSetting('default_browser_size');
        if ($browser_size) {
            $parts = explode('x', $browser_size);
            if (count($parts) == 2) {
                $browser_width = intval($parts[0]);
                $browser_height = intval($parts[1]);
                if ($browser_width > 0 && $browser_height > 0) {
                    $test['browser_width'] = $browser_width;
                    $test['browser_height'] = $browser_height;
                }
            }
        }
    }

    // default batch and API requests to a lower priority
    if (!isset($req_priority)) {
        if ((isset($test['batch']) && $test['batch']) || (isset($test['batch_locations']) && $test['batch_locations'])) {
            $test['priority'] = intval(GetSetting('bulk_priority', 7));
        } elseif ($_SERVER['REQUEST_METHOD'] == 'GET' || $xml || $json) {
            $test['priority'] =  intval(GetSetting('api_priority', 5));
        }
    }

    // take the ad-blocking request and create a custom block from it
    if (isset($req_ads) && $req_ads == 'blocked') {
        $test['block'] .= ' adsWrapper.js adsWrapperAT.js adsonar.js sponsored_links1.js switcher.dmn.aol.com';
    }

    $conditionalMetrics = $test['bodies'] ? ['generated-html'] : [];
    $test['customMetrics'] = CustomMetricFiles::get($conditionalMetrics);

    if (array_key_exists('custom', $_REQUEST)) {
        $metric = null;
        $code = '';
        $lines = explode("\n", $_REQUEST['custom']);
        foreach ($lines as $line) {
            $line = trim($line);
            if (strlen($line)) {
                if (preg_match('/^\[(?P<metric>[^\[\]]+)\]$/', $line, $matches)) {
                    if (isset($metric) && strlen($metric) && strlen($code)) {
                        if (!array_key_exists('customMetrics', $test)) {
                            $test['customMetrics'] = array();
                        }
                        $test['customMetrics'][$metric] = $code;
                    }
                    $code = '';
                    $metric = $matches['metric'];
                } else {
                    $code .= $line . "\n";
                }
            }
        }
        if (isset($metric) && strlen($metric) && strlen($code)) {
            if (!array_key_exists('customMetrics', $test)) {
                $test['customMetrics'] = array();
            }
            $test['customMetrics'][$metric] = $code;
        }
    }

    // Force some test options when running a Lighthouse-only test
    if (isset($test['type']) && $test['type'] == 'lighthouse') {
        $test['lighthouse'] = 1;
        $test['runs'] = 1;
        $test['fvonly'] = 1;
    }
} else {
    // don't inherit some settings from the stored test
    unset($test['id']);
    unset($test['ip']);
    unset($test['uid']);
    unset($test['user']);
    if (array_key_exists('last_updated', $test)) {
        unset($test['last_updated']);
    }
    if (array_key_exists('started', $test)) {
        unset($test['started']);
    }
    if (array_key_exists('completed', $test)) {
        unset($test['completed']);
    }
    if (array_key_exists('medianRun', $test)) {
        unset($test['medianRun']);
    }
    if (array_key_exists('retries', $test)) {
        unset($test['retries']);
    }
    if (array_key_exists('job_file', $test)) {
        unset($test['job_file']);
    }
    if (array_key_exists('job', $test)) {
        unset($test['job']);
    }
    if (array_key_exists('test_error', $test)) {
        unset($test['test_error']);
    }
    if (array_key_exists('errors', $test)) {
        unset($test['errors']);
    }
    if (array_key_exists('test_runs', $test)) {
        unset($test['test_runs']);
    }
    if (array_key_exists('shards_finished', $test)) {
        unset($test['shards_finished']);
    }
    if (array_key_exists('path', $test)) {
        unset($test['path']);
    }
    if (array_key_exists('spam', $test)) {
        unset($test['spam']);
    }
    $test['priority'] = $ui_priority;
}

if ($test['mobile']) {
    $devices = LoadMobileDevices();
    $is_mobile = true;
    if ($devices) {
        if (isset($test['mobileDevice'])) {
            setcookie('mdev', $test['mobileDevice'], time() + 60 * 60 * 24 * 365, '/');
        }
        if (!isset($test['mobileDevice']) || !isset($devices[$test['mobileDevice']])) {
            // Grab the first device from the list
            $test['mobileDevice'] = key($devices);
        }
        $test['mobileDeviceLabel'] = isset($devices[$test['mobileDevice']]['label']) ? $devices[$test['mobileDevice']]['label'] : $test['mobileDevice'];
        if (!$test['width'] && isset($devices[$test['mobileDevice']]['width'])) {
            $test['width'] = $devices[$test['mobileDevice']]['width'];
        }
        if (!$test['height'] && isset($devices[$test['mobileDevice']]['height'])) {
            $test['height'] = $devices[$test['mobileDevice']]['height'];
        }
        if (!$test['dpr'] && isset($devices[$test['mobileDevice']]['dpr'])) {
            $test['dpr'] = $devices[$test['mobileDevice']]['dpr'];
        }
        if (!isset($test['uastring']) && isset($devices[$test['mobileDevice']]['ua'])) {
            $test['uastring'] = $devices[$test['mobileDevice']]['ua'];
        }
        if (!isset($test['throttle_cpu']) && isset($devices[$test['mobileDevice']]['throttle_cpu'])) {
            $test['throttle_cpu'] = $devices[$test['mobileDevice']]['throttle_cpu'];
        }
    }
}

$test['created'] = time();

// the API key requirements are for all test paths
$test['vd'] = isset($req_vd) ? $req_vd : '';
$test['vh'] = isset($req_vh) ? $req_vh : '';
if ($headless) {
    $test['vd'] = '';
    $test['vh'] = '';
}
if (isset($req_vo)) {
    $test['owner'] = $req_vo;
}
if (!empty($user_api_key)) {
    $test['key'] = $user_api_key;
    $test['owner'] = $request_context->getUser()->getOwnerId();
}

$creator_id = 0;
if (!is_null($request_context->getUser())) {
    $creator_id = $request_context->getUser()->getUserId() ?? 0;
}
if ($creator_id != 0) {
    $test["creator"] = $creator_id;
}

if (isset($user) && !array_key_exists('user', $test)) {
    $test['user'] = $user;
}

if (isset($uid) && !array_key_exists('uid', $test)) {
    $test['uid'] = $uid;
}

// create an owner string (if one is not yet set for some reason. API users and form users should've already been set)
if (!isset($test['owner']) || !strlen($test['owner']) || !preg_match("/^[\w @\.]+$/", $test['owner'])) {
    $test['owner'] = sha1(uniqid(uniqid('', true), true));
}

// special case locations
$use_closest = false;
if ($test['location'] == 'closest' && is_file('./settings/closest.ini')) {
    $use_closest = true;
}

// populate the IP address of the user who submitted it
if (!array_key_exists('ip', $test) || !strlen($test['ip'])) {
    $test['ip'] = $_SERVER['REMOTE_ADDR'];
    if ($test['ip'] == '127.0.0.1') {
        $test['ip'] = @getenv("HTTP_X_FORWARDED_FOR");
    }
}

if (!strlen($error) && (!isset($test['batch']) || !$test['batch'])) {
    ValidateParameters($test, $locations, $error);
}
// Make sure we aren't blocking the tester
// TODO: remove the allowance for high-priority after API keys are implemented
if (!strlen($error)) {
    ValidateKey($test, $error);
}

function buildSpofTest($hosts)
{
    $spofScript = "";
    foreach ($hosts as $host) {
        $host = trim($host);
        if (strlen($host)) {
            $spofScript .= "setDnsName\t$host\tblackhole.webpagetest.org\r\n";
        }
    }

    if (strlen($spofScript)) {
        $spofScript .= "setTimeout\t240\r\n";
    }

    return $spofScript;
}

function buildSelfHost($hosts)
{
    global $experimentURL;
    $selfHostScript = "";
    foreach ($hosts as $host) {
        $host = trim($host);
        if (strlen($host)) {
            $selfHostScript .= "overrideHost\t$host\t$experimentURL\r\n";
        }
    }

    return $selfHostScript;
}


if (!strlen($error) && CheckIp($test) && CheckUrl($test['url']) && CheckRateLimit($test, $error)) {
    $total_runs = Util::getRunCount($test['runs'], $test['fvonly'], $test['lighthouse'], $test['type']);
    $hasRunsAvailable = !is_null($request_context->getUser()) && $request_context->getUser()->hasEnoughRemainingRuns($total_runs);
    $isAnon = !is_null($request_context->getUser()) && $request_context->getUser()->isAnon();

    if (!$hasRunsAvailable && !$isAnon && !is_null($request_context->getUser())) {
        $error = "Not enough runs available";
    }

    if (!array_key_exists('id', $test)) {
        // see if we are doing a SPOF test (if so, we need to build the 2 tests and
        // redirect to the comparison page
        if (isset($req_spof) && strlen(trim($req_spof))) {
            $spofTests = array();
            $test['video'] = 1;
            $test['label'] = 'Original';
            $id = CreateTest($test, $test['url']);
            if (isset($id)) {
                $spofTests[] = $id;
                $test['label'] = 'SPOF';
                $script = '';
                $hosts = explode("\n", $req_spof);
                $script = buildSpofTest($hosts);

                if (strlen($script)) {
                    if (strlen($test['script'])) {
                        $test['script'] = $script . $test['script'];
                    } else {
                        $test['script'] = $script . "navigate\t{$test['url']}\r\n";
                    }
                    $id = CreateTest($test, $test['url']);
                    if (isset($id)) {
                        $spofTests[] = $id;
                    }
                }
            }
        } elseif (isset($req_recipes) && count($req_recipes) > 0) {
            global $experiments_paid;
            global $experiments_logged_in;
            // we allow experiment runs on the metric times without paid permissions
            $experimentUrlException = !is_null(strpos($test['url'], 'webpagetest.org/themetrictimes'));

            if (!$experiments_logged_in && !$experimentUrlException) {
                $error = "Must be logged in to use experiments.";
            } else {
                // the first non-redirect host is passed in from experiments
                $hostToUse = isset($req_initialHostNonRedirect) ? $req_initialHostNonRedirect : '%HOST%';
                $originToUse = $req_initialOriginNonRedirect ?? '%ORIGIN%';
                $test['script'] = "overrideHost\t" . $hostToUse . "\t$experimentURL\r\n";
                $scriptNavigate = "navigate\t%URL%\r\n";
                $test['script'] .= $scriptNavigate;

                $experimentMetadata = array(
                    "experiment" => array(
                        "source_id" => $id,
                        "control_id" => "",
                        "control" => true,
                        "recipes" => array(),
                        "assessment" => isset($_REQUEST["assessment"]) ? json_decode(urldecode($_REQUEST["assessment"])) : null
                    )
                );

                // this is for re-running a test with recipes enabled
                $recipeScript = '';
                $experimentSpof = "";
                $experimentBlock = "";
                $allowedFreeExperimentIds = array('001', '020');
                foreach ($req_recipes as $key => $value) {
                    // optional, but the experiments page prefixes recipe names with an index and a dash to keep ingredients paired with an opportunity's recipe name
                    // also, for wpt params (liks spof, block) meant to run on only experiment runs, there's a experiment- prefix after the number
                    $recipeSansId = $value;
                    $experimentId = "";
                    $splitValue = explode("-", $value);
                    if (count($splitValue) > 1) {
                        $experimentId = $splitValue[0];
                        if ($splitValue[1] === "experiment") {
                            $recipeSansId = $splitValue[2];
                        } else {
                            $recipeSansId = $splitValue[1];
                        }
                    }
                    // if user isn't pro-access
                    if (
                        !$experiments_paid
                        // and the experimentID is not in the allowed array
                        && !in_array($experimentId, $allowedFreeExperimentIds)
                        // and it's not the exception url
                        && !$experimentUrlException
                    ) {
                        $error = "Attempt to use unauthorized experiments feature.";
                    } else {
                        $experimentSpof = array();
                        $experimentBlock = array();
                        $experimentOverrideHost = array();
                        $experimentRunURL = null;
                        // TODO should this be $req_$value instead, essentially?
                        if ($_REQUEST[$value]) {
                            $ingredients = $_REQUEST[$value];
                            $experimentMetadata["experiment"]["recipes"][] = array($experimentId => $ingredients);
                            if (is_array($ingredients)) {
                                if ($recipeSansId === "spof") {
                                    $experimentSpof = $ingredients;
                                }
                                if ($recipeSansId === "block") {
                                    $experimentBlock = $ingredients;
                                }
                                if ($recipeSansId === "overrideHost") {
                                    $experimentOverrideHost = $ingredients;
                                }
                                if ($recipeSansId === "setinitialurl") {
                                    $experimentRunURL = $ingredients;
                                }
                                if ($recipeSansId === "findreplace") {
                                    // findreplace is used in the form to submit the pieces for a swap experiment.
                                    // we don't need that term from here. we'll build the swap.
                                    $recipeSansId = "swap";
                                    if ($ingredients[0]) {
                                        $ingredients[0] = rawurlencode($ingredients[0]);
                                    }
                                    if ($ingredients[1]) {
                                        $ingredients[1] = rawurlencode($ingredients[1]);
                                    }
                                    if ($ingredients[2]) {
                                        $ingredients[2] = true;
                                    }
                                    $ingredients = array(implode("|", $ingredients));
                                }
                                $ingredients = implode(",", $ingredients);
                            }
                            if ($recipeSansId === "editresponsehtml") {
                                // striking out the ingredients here because it's too much to send in a cookie
                                $ingredients = "";
                            }
                            // these recipes need encoded values. they all do afterwards! TODO
                            if (
                                $recipeSansId === "insertheadstart"
                                || $recipeSansId === "insertheadend"
                                || $recipeSansId === "insertbodyend"
                            ) {
                                $ingredients = rawurlencode($ingredients);
                            }
                            $recipeScript .= "$recipeSansId:=" . $ingredients;
                        }
                        $recipeScript .= ";";
                    }
                }

                // Handle HTTP Basic Auth
                // TODO centralize this logic as it's borrowed from above temporarily
                if ((isset($test['login']) && strlen($test['login'])) || (isset($test['password']) && strlen($test['password']))) {
                    $header = "Authorization: Basic " . base64_encode("{$test['login']}:{$test['password']}");
                    if (!isset($script) || !strlen($script)) {
                        $script = "navigate\t$url";
                    }
                    $script = "addHeader\t$header\r\n" . $script;
                }
                // Add custom headers
                if (isset($test['customHeaders']) && strlen($test['customHeaders'])) {
                    if (!isset($script) || !strlen($script)) {
                        $script = "navigate\t$url";
                    }
                    $headers = preg_split("/\r\n|\n|\r/", $test['customHeaders']);
                    $headerCommands = "";
                    foreach ($headers as $header) {
                        $headerCommands = $headerCommands . "addHeader\t" . $header . "\r\n";
                    }
                    $script = $headerCommands . $script;
                }
                // END TODO centralize this logic as it's borrowed from above temporarily



                // Recipes need a control to compare to.
                // The control runs over the proxy without any recipes.
                // We need to build the 2 tests and
                // redirect to the comparison page

                if (strlen($recipeScript) > 0) {
                    $recipeTests = array();
                    $test['video'] = 1;
                    $test['label'] = 'Original (Control Run)';
                    $test['metadata'] = json_encode($experimentMetadata);
                    $id = CreateTest($test, $test['url']);

                    if (isset($id)) {
                        $recipeTests[] = $id;
                        $experimentMetadata["experiment"]["control_id"] = $id;
                        $experimentMetadata["experiment"]["control"] = false;
                        $test['metadata'] = json_encode($experimentMetadata);
                        $test['label'] = 'Experiment';

                        // Default WPT test settings that are meant to be used for the experiment will have a experiment- prefix
                        // if experimentSpof is set...

                        if ($experimentSpof) {
                            $spofScript = buildSpofTest($experimentSpof);
                            $test['script'] = $spofScript . "\n" . $test['script'];
                            $test['spof'] .= ' ' . $experimentSpof;
                        }

                        if ($experimentOverrideHost) {
                            $overrideHostScript = buildSelfHost($experimentOverrideHost);
                            $test['script'] = $overrideHostScript . "\n" . $test['script'];
                        }

                        if ($experimentRunURL) {
                            $test['url'] = urldecode(implode($experimentRunURL));
                        }

                        // if experimentBlock is set...
                        if ($experimentBlock) {
                            // if spof is passed as an array, join it by \n
                            if (count($experimentBlock)) {
                                $experimentBlock = implode("\n", $experimentBlock);
                            }
                            $test['block'] .= ' ' . $experimentBlock;
                        }



                        //replace last step with last step plus recipes
                        $test['script'] = str_replace($scriptNavigate, "setCookie\t" . $originToUse . "\twpt-experiments=" . urlencode($recipeScript) . "\r\n" . "setCookie\t" . $originToUse . "\twpt-testid=" . urlencode($id) . "\r\n" . $scriptNavigate, $test['script']);


                        $id = CreateTest($test, $test['url']);
                        if (isset($id)) {
                            $recipeTests[] = $id;
                        }
                    }
                }
            } // if logged in or exception url
        } elseif (isset($test['batch_locations']) && $test['batch_locations'] && count($test['multiple_locations'])) {
            $test['id'] = CreateTest($test, $test['url'], 0, 1);
            $test['batch_id'] = $test['id'];

            $test['tests'] = array();
            foreach ($test['multiple_locations'] as $location_string) {
                $testData = $test;
                // Create a test with the given location and applicable connectivity.
                UpdateLocation($testData, $locations, $location_string, $error);
                if (strlen($error)) {
                    break;
                }

                $id = CreateTest($testData, $testData['url']);
                if (isset($id)) {
                    $test['tests'][] = array('url' => $test['url'], 'id' => $id);
                }
            }

            // write out the list of URLs and the test ID for each
            if (!strlen($error)) {
                if (count($test['tests'])) {
                    $path = GetTestPath($test['id']);
                    file_put_contents("./$path/tests.json", json_encode($test['tests']));
                } else {
                    $error = 'Locations could not be submitted for testing';
                }
            }
        } elseif (isset($test['batch']) && $test['batch']) {
            //first, we see if they're a paid user
            if ($isPaid || $admin) {
                // build up the full list of URLs
                $bulk = array();
                $bulk['urls'] = array();
                $bulk['variations'] = array();
                $bulkUrls = '';
                if (isset($req_bulkurls) && strlen($req_bulkurls)) {
                    $bulkUrls = $req_bulkurls . "\n";
                }
                if (isset($_FILES['bulkfile']) && isset($_FILES['bulkfile']['tmp_name']) && strlen($_FILES['bulkfile']['tmp_name'])) {
                    $bulkUrls .= file_get_contents($_FILES['bulkfile']['tmp_name']);
                }

                $current_mode = 'urls';
                if (strlen($bulkUrls)) {
                    $script = null;
                    $lines = explode("\n", $bulkUrls);
                    foreach ($lines as $line) {
                        $line = trim($line);
                        if (strlen($line)) {
                            if (substr($line, 0, 1) == '<' || substr($line, 0, 1) == '{') {
                                if (!strcasecmp($line, '<test>') || !strcasecmp($line, '{test}')) {
                                    $entry = array();
                                    $current_mode = 'test';
                                } elseif (!strcasecmp($line, '</test>') || !strcasecmp($line, '{/test}')) {
                                    $bulk['urls'][] = $entry;
                                    unset($entry);
                                } elseif (!strcasecmp($line, '<script>') || !strcasecmp($line, '{script}')) {
                                    $script = array();
                                    $current_mode = 'test_script';
                                } elseif (!strcasecmp($line, '</script>') || !strcasecmp($line, '{/script}')) {
                                    $current_mode = 'test';
                                    $entry = ParseBulkScript($script, $entry);
                                    unset($script);
                                }
                            } elseif ($current_mode == 'test') {
                                $split = strpos($line, '=');
                                if ($split > 0) {
                                    $key = substr($line, 0, $split);
                                    $value = substr($line, $split + 1);
                                    if ($key == 'label') {
                                        $entry['l'] = $value;
                                    }
                                }
                            } elseif ($current_mode == 'test_script') {
                                $script[] = $line;
                            } else {
                                if (substr($line, 0, 1) == '[') {
                                    if (isset($script) && count($script)) {
                                        $entry = ParseBulkScript($script);
                                        if ($entry) {
                                            $bulk['urls'][] = $entry;
                                        }
                                        unset($script);
                                    }

                                    if (!strcasecmp($line, '[urls]')) {
                                        $current_mode = 'urls';
                                    } elseif (!strcasecmp($line, '[variations]')) {
                                        $current_mode = 'variations';
                                    } elseif (!strcasecmp($line, '[script]')) {
                                        $script = array();
                                        $current_mode = 'script';
                                    } else {
                                        $current_mode = '';
                                    }
                                } elseif ($current_mode == 'urls') {
                                    $entry = ParseBulkUrl($line);
                                    if ($entry) {
                                        $bulk['urls'][] = $entry;
                                    }
                                } elseif ($current_mode == 'variations') {
                                    $entry = ParseBulkVariation($line);
                                    if ($entry) {
                                        $bulk['variations'][] = $entry;
                                    }
                                } elseif ($current_mode == 'script') {
                                    $script[] = $line;
                                }
                            }
                        }
                    }

                    if (count($script)) {
                        $entry = ParseBulkScript($script);
                        if ($entry) {
                            $bulk['urls'][] = $entry;
                        }
                        unset($script);
                    }
                }

                if (count($bulk['urls'])) {
                    //recheck test balance to make sure they have enough remaining runs for the bulk test
                    $hasRunsAvailable = !is_null($request_context->getUser()) && $request_context->getUser()->hasEnoughRemainingRuns($total_runs * count($bulk['urls']));
                    if (!$hasRunsAvailable) {
                        $error = "Not enough runs available";
                    } else {
                        //enough runs, let's continue by submitting the tests
                        $test['id'] = CreateTest($test, $test['url'], 1);
                        $test['batch_id'] = $test['id'];

                        $testCount = 0;
                        foreach ($bulk['urls'] as &$entry) {
                            $testData = $test;
                            if (isset($entry['l']) && strlen($entry['l'])) {
                                $testData['label'] = $entry['l'];
                            }
                            if ($entry['ns']) {
                                unset($testData['script']);
                                if ($testData['discard']) {
                                    $testData['runs'] = max(1, $testData['runs'] - $testData['discard']);
                                    $testData['discard'] = 0;
                                }
                            }
                            if ($entry['s']) {
                                $testData['script'] = $entry['s'];
                            }

                            ValidateParameters($testData, $locations, $error, $entry['u']);
                            $entry['id'] = CreateTest($testData, $entry['u']);
                            if ($entry['id']) {
                                $entry['v'] = array();
                                foreach ($bulk['variations'] as $variation_index => &$variation) {
                                    if (strlen($test['label']) && strlen($variation['l'])) {
                                        $test['label'] .= ' - ' . $variation['l'];
                                    }
                                    $url = CreateUrlVariation($entry['u'], $variation['q']);
                                    if ($url) {
                                        ValidateParameters($testData, $locations, $error, $url);
                                        $entry['v'][$variation_index] = CreateTest($testData, $url);
                                    }
                                }
                                $testCount++;
                            }
                        }

                        // write out the list of URLs and the test ID for each
                        if ($testCount) {
                            $path = GetTestPath($test['id']);
                            gz_file_put_contents("./$path/bulk.json", json_encode($bulk));
                        } else {
                            $error = 'URLs could not be submitted for testing';
                        }
                    }
                } else {
                    $error = "No valid URLs submitted for bulk testing";
                }
            } else {
                $error = 'Bulk testing is only available for WebPageTest Pro subscribers.';
            }
        } else {
            $test['id'] = CreateTest($test, $test['url']);
            if (!$test['id'] && !strlen($error)) {
                $error = 'Error submitting URL for testing';
            }
        }
    }

    // redirect the browser to the test results page
    if (!strlen($error)) {
        if (array_key_exists('submit_callback', $test)) {
            $test['submit_callback']($test);
        }
        $protocol = getUrlProtocol();
        $host  = $_SERVER['HTTP_HOST'];
        $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');

        if ($xml) {
            header('Content-type: text/xml');
            echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
            echo "<response>\n";
            echo "<statusCode>200</statusCode>\n";
            echo "<statusText>Ok</statusText>\n";
            if (strlen($req_r)) {
                echo "<requestId>{$req_r}</requestId>\n";
            }
            echo "<data>\n";
            echo "<testId>{$test['id']}</testId>\n";
            if (FRIENDLY_URLS) {
                echo "<xmlUrl>$protocol://$host$uri/xmlResult/{$test['id']}/</xmlUrl>\n";
                echo "<userUrl>$protocol://$host$uri/result/{$test['id']}/</userUrl>\n";
                echo "<summaryCSV>$protocol://$host$uri/result/{$test['id']}/page_data.csv</summaryCSV>\n";
                echo "<detailCSV>$protocol://$host$uri/result/{$test['id']}/requests.csv</detailCSV>\n";
            } else {
                echo "<xmlUrl>$protocol://$host$uri/xmlResult.php?test={$test['id']}</xmlUrl>\n";
                echo "<userUrl>$protocol://$host$uri/results.php?test={$test['id']}</userUrl>\n";
                echo "<summaryCSV>$protocol://$host$uri/csv.php?test={$test['id']}</summaryCSV>\n";
                echo "<detailCSV>$protocol://$host$uri/csv.php?test={$test['id']}&amp;requests=1</detailCSV>\n";
            }
            echo "<jsonUrl>$protocol://$host$uri/jsonResult.php?test={$test['id']}</jsonUrl>\n";
            echo "</data>\n";
            echo "</response>\n";
        } elseif ($json) {
            $ret = array();
            $ret['statusCode'] = 200;
            $ret['statusText'] = 'Ok';
            $ret['data'] = array();
            $ret['data']['testId'] = $test['id'];
            $ret['data']['jsonUrl'] = "$protocol://$host$uri/results.php?test={$test['id']}&f=json";
            if (FRIENDLY_URLS) {
                $ret['data']['xmlUrl'] = "$protocol://$host$uri/xmlResult/{$test['id']}/";
                $ret['data']['userUrl'] = "$protocol://$host$uri/result/{$test['id']}/";
                $ret['data']['summaryCSV'] = "$protocol://$host$uri/result/{$test['id']}/page_data.csv";
                $ret['data']['detailCSV'] = "$protocol://$host$uri/result/{$test['id']}/requests.csv";
            } else {
                $ret['data']['xmlUrl'] = "$protocol://$host$uri/xmlResult.php?test={$test['id']}";
                $ret['data']['userUrl'] = "$protocol://$host$uri/results.php?test={$test['id']}";
                $ret['data']['summaryCSV'] = "$protocol://$host$uri/csv.php?test={$test['id']}";
                $ret['data']['detailCSV'] = "$protocol://$host$uri/csv.php?test={$test['id']}&amp;requests=1";
            }
            $ret['data']['jsonUrl'] = "$protocol://$host$uri/jsonResult.php?test={$test['id']}";
            json_response($ret);
        } else {
            if (isset($spofTests) && count($spofTests) > 1) {
                header("Location: $protocol://$host$uri/video/compare.php?tests=" . implode(',', $spofTests));
            } elseif (isset($recipeTests) && count($recipeTests) > 1) {
                header("Location: $protocol://$host$uri/video/compare.php?tests=" . $recipeTests[1] . ',' . $recipeTests[0]);
            } else {
                // redirect regardless if it is a bulk test or not
                $view = '';
                if (isset($_REQUEST['webvital_profile'])) {
                    $view = FRIENDLY_URLS ? '?view=webvitals' : '&view=webvitals';
                }
                if (FRIENDLY_URLS) {
                    header("Location: $protocol://$host$uri/result/{$test['id']}/$view");
                } else {
                    header("Location: $protocol://$host$uri/results.php?test={$test['id']}$view");
                }
            }
        }
    } else {
        if ($xml) {
            header('Content-type: text/xml');
            header("Cache-Control: no-cache, must-revalidate", true);
            header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
            echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
            echo "<response>\n";
            echo "<statusCode>400</statusCode>\n";
            echo "<statusText>" . $error . "</statusText>\n";
            if (strlen($req_r)) {
                echo "<requestId>" . $req_r . "</requestId>\n";
            }
            echo "</response>\n";
        } elseif ($json) {
            $ret = array();
            $ret['statusCode'] = 400;
            $ret['statusText'] = $error;
            if (strlen($req_r)) {
                $ret['requestId'] = $req_r;
            }
            header("Content-type: application/json");
            header("Cache-Control: no-cache, must-revalidate", true);
            header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
            echo json_encode($ret);
        } else {
            $tpl = new Template('errors');
            if ($error == 'Not enough runs available') {
                echo $tpl->render('runlimit');
            } else {
                echo $tpl->render('runtest', array(
                    'error' => $error
                ));
            }
        }
    }
} else {
    if ($xml) {
        if (!strlen($error)) {
            $error = 'Your test request was intercepted by our spam filters (or because we need to talk to you about how you are submitting tests)';
        }
        header('Content-type: text/xml');
        echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        echo "<response>\n";
        echo "<statusCode>400</statusCode>\n";
        echo "<statusText>$error</statusText>\n";
        echo "</response>\n";
    } elseif ($json) {
        if (!strlen($error)) {
            $error = 'Your test request was intercepted by our spam filters (or because we need to talk to you about how you are submitting tests)';
        }
        $ret = array();
        $ret['statusCode'] = 400;
        $ret['statusText'] = $error;
        header("Content-type: application/json");
        echo json_encode($ret);
    } elseif (strlen($error)) {
        $tpl = new Template('errors');
        if ($error == 'Not enough runs available') {
            echo $tpl->render('runlimit');
        } else {
            echo $tpl->render('runtest', array(
                'error' => $error
            ));
        }
    } else {
        include 'blocked.php';
    }
}

/**
 * Update the given location into the Test variable. This is needed for
 * submitting multiple-locations tests in one-shot.
 *   This also involves updating the locationText, browser and connectivity
 * values that are applicable for the new location.
 *
 * @param mixed $test
 * @param mixed $new_location
 */
function UpdateLocation(&$test, &$locations, $new_location, &$error)
{
    // Update the location.
    $test['location'] = $new_location;

    // see if we need to override the browser
    if (isset($locations[$test['location']]['browserExe']) && strlen($locations[$test['location']]['browserExe'])) {
        $test['browserExe'] = $locations[$test['location']]['browserExe'];
    }

    // figure out what the location working directory and friendly name are
    $test['locationText'] = $locations[$test['location']]['label'];
    $test['locationLabel'] = $locations[$test['location']]['label'];
    $test['workdir'] = $locations[$test['location']]['localDir'];
    $test['remoteUrl']  = $locations[$test['location']]['remoteUrl'];
    $test['remoteLocation'] = $locations[$test['location']]['remoteLocation'];
    if (!strlen($test['workdir']) && !strlen($test['remoteUrl'])) {
        $error = "Invalid Location, please try submitting your test request again.";
    }

    // see if we need to pick the default connectivity
    if (
        array_key_exists('connectivity', $locations[$test['location']]) &&
        strlen($locations[$test['location']]['connectivity']) &&
        array_key_exists('connectivity', $test)
    ) {
        unset($test['connectivity']);
    } elseif (empty($locations[$test['location']]['connectivity']) && !isset($test['connectivity'])) {
        if (!empty($locations[$test['location']]['default_connectivity'])) {
            $test['connectivity'] = $locations[$test['location']]['default_connectivity'];
        } else {
            $test['connectivity'] = 'Cable';
        }
    }

    if (isset($test['browser']) && strlen($test['browser'])) {
        $test['locationText'] .= " - <b>{$test['browser']}</b>";
    }
    if (isset($test['mobileDeviceLabel']) && $test['mobile']) {
        $test['locationText'] .= " - <b>Emulated {$test['mobileDeviceLabel']}</b>";
    }
    if (isset($test['connectivity'])) {
        $test['locationText'] .= " - <b>{$test['connectivity']}</b>";
        $connectivity_file = './settings/connectivity.ini.sample';
        if (file_exists('./settings/connectivity.ini')) {
            $connectivity_file = './settings/connectivity.ini';
        }
        if (file_exists('./settings/common/connectivity.ini')) {
            $connectivity_file = './settings/common/connectivity.ini';
        }
        if (file_exists('./settings/server/connectivity.ini')) {
            $connectivity_file = './settings/server/connectivity.ini';
        }
        $connectivity = parse_ini_file($connectivity_file, true);
        if (isset($connectivity[$test['connectivity']])) {
            $test['bwIn'] = (int)$connectivity[$test['connectivity']]['bwIn'] / 1000;
            $test['bwOut'] = (int)$connectivity[$test['connectivity']]['bwOut'] / 1000;
            $test['latency'] = (int)$connectivity[$test['connectivity']]['latency'];
            $test['testLatency'] = (int)$connectivity[$test['connectivity']]['latency'];
            $test['plr'] = $connectivity[$test['connectivity']]['plr'];
            if (!$test['timeout'] && isset($connectivity[$test['connectivity']]['timeout'])) {
                $test['timeout'] = $connectivity[$test['connectivity']]['timeout'];
            }

            if (isset($connectivity[$test['connectivity']]['aftCutoff']) && !$test['aftEarlyCutoff']) {
                $test['aftEarlyCutoff'] = $connectivity[$test['connectivity']]['aftCutoff'];
            }
        } elseif (
            (!isset($test['bwIn']) || !$test['bwIn']) &&
            (!isset($test['bwOut']) || !$test['bwOut']) &&
            (!isset($test['latency']) || !$test['latency'])
        ) {
            $error = 'Unknown connectivity type: ' . htmlspecialchars($test['connectivity']);
        }
    }

    // adjust the latency for any last-mile latency at the location
    if (isset($test['latency']) && $locations[$test['location']]['latency']) {
        $test['testLatency'] = max(0, $test['latency'] - $locations[$test['location']]['latency']);
    }
}


/**
 * See if we are requiring key validation and if so, enforce the restrictions
 *
 * @param mixed $test
 * @param mixed $error
 */
function ValidateKey(&$test, &$error, $key = null)
{
    global $admin;
    global $uid;
    global $user;
    global $USER_EMAIL;
    global $apiKey;
    global $forceValidate;
    global $server_secret;
    $invalid_key_message = 'Invalid API key. To continue running tests via the WebPageTest API, you\'ll need to update your current key for the enhanced WebPageTest API. Read more here: https://product.webpagetest.org/api';
    if (isset($privateInstall) && $privateInstall) {
        $invalid_key_message = 'Invalid API key.';
    }

    if (strlen($server_secret)) {
        // ok, we require key validation, see if they have an hmac (user with form)
        // or API key
        if (!isset($key) && isset($test['vh']) && strlen($test['vh'])) {
            // validate the hash
            $hashStr = $server_secret;
            $hashStr .= $_SERVER['HTTP_USER_AGENT'];
            $hashStr .= $test['owner'];
            $hashStr .= $test['vd'];
            $hmac = sha1($hashStr);

            // check the elapsed time since the hmac was issued
            $now = time();
            $origTime = strtotime($test['vd']);
            $elapsed = abs($now - $origTime);

            if ($hmac != $test['vh'] || $elapsed > 86400) {
                $error = 'Your test request could not be validated (this can happen if you leave the browser window open for over a day before submitting a test).  Please try submitting it again.';
            }
        } elseif (isset($key) || (isset($test['key']) && strlen($test['key']))) {
            if (isset($test['key']) && strlen($test['key']) && !isset($key)) {
                $key = $test['key'];
            }
            $apiKey = $key;

            if ($key == GetServerKey()) {
                return;
            }

            $keys_file = SETTINGS_PATH . '/keys.ini';
            if (file_exists(SETTINGS_PATH . '/common/keys.ini')) {
                $keys_file = SETTINGS_PATH . '/common/keys.ini';
            }
            if (file_exists(SETTINGS_PATH . '/server/keys.ini')) {
                $keys_file = SETTINGS_PATH . '/server/keys.ini';
            }
            $keys = parse_ini_file($keys_file, true);

            $runcount = Util::getRunCount($test['runs'], $test['fvonly'], $test['lighthouse'], $test['type']);
            //if (array_key_exists('navigateCount', $test) && $test['navigateCount'] > 0)
            //  $runcount *= $test['navigateCount'];

            // validate their API key and enforce any rate limits
            if (array_key_exists($key, $keys)) {
                if (
                    array_key_exists('default location', $keys[$key]) &&
                    strlen($keys[$key]['default location']) &&
                    !strlen($test['location'])
                ) {
                    $test['location'] = $keys[$key]['default location'];
                }
                $api_priority = intval(GetSetting('api_priority', 5));
                $test['priority'] = $api_priority;
                if (isset($keys[$key]['priority'])) {
                    $test['priority'] = intval($keys[$key]['priority']);
                }
                if (isset($keys[$key]['max-priority'])) {
                    $test['priority'] = max($keys[$key]['max-priority'], $test['priority']);
                }
                if (isset($keys[$key]['forceValidate'])) {
                    $forceValidate = true;
                }
                if (isset($keys[$key]['location']) && $test['location'] !== $keys[$key]['location']) {
                    $error = "Invalid location.  The API key used is restricted to {$keys[$key]['location']}";
                }
                if (!strlen($error) && isset($keys[$key]['limit'])) {
                    $limit = (int)$keys[$key]['limit'];

                    // update the number of tests they have submitted today
                    if (!is_dir('./dat')) {
                        mkdir('./dat', 0777, true);
                    }

                    $lock = Lock("API Keys");
                    if (isset($lock)) {
                        $keyfile = './dat/keys_' . gmdate('Ymd') . '.dat';
                        $usage = null;
                        if (is_file($keyfile)) {
                            $usage = json_decode(file_get_contents($keyfile), true);
                        }
                        if (!isset($usage)) {
                            $usage = array();
                        }
                        if (isset($usage[$key])) {
                            $used = (int)$usage[$key];
                        } else {
                            $used = 0;
                        }

                        if ($limit > 0) {
                            if ($used + $runcount <= $limit) {
                                $used += $runcount;
                                $usage[$key] = $used;
                            } else {
                                $error = 'The test request will exceed the daily test limit for the given API key';
                            }
                        } else {
                            $used += $runcount;
                            $usage[$key] = $used;
                        }
                        if (!strlen($error)) {
                            file_put_contents($keyfile, json_encode($usage));
                        }
                        Unlock($lock);
                    }
                }
                // check to see if we need to limit queue lengths from this API key
                if (isset($keys[$key]['queue_limit']) && $keys[$key]['queue_limit']) {
                    $test['queue_limit'] = $keys[$key]['queue_limit'];
                }
                // Make sure API keys don't exceed the max configured priority
                $test['priority'] = max($test['priority'], $api_priority);
            } elseif ($redis_server = GetSetting('redis_api_keys')) {
                // Check the redis-based API keys if it wasn't a local key
                try {
                    $redis = new Redis();
                    if ($redis->connect($redis_server, 6379, 30)) {
                        $account = CacheFetch("APIkey_$key");
                        if (!isset($account)) {
                            $response = $redis->get("API_$key");
                            if ($response && strlen($response)) {
                                $account = json_decode($response, true);
                                if (isset($account) && is_array($account)) {
                                    CacheStore("APIkey_$key", $account, 60);
                                }
                            }
                        }
                        if ($account && is_array($account) && isset($account['accountId']) && isset($account['expiration'])) {
                            // Check the expiration (with a 2-day buffer)
                            if (time() <= $account['expiration'] + 172800) {
                                // Check the balance
                                $response = $redis->get("C_{$account['accountId']}");
                                if (isset($response) && $response !== false && is_string($response) && strlen($response) && is_numeric($response)) {
                                    if ($runcount <= intval($response)) {
                                        global $usingApi2;
                                        $usingApi2 = true;
                                        // Store the account info with the test
                                        $test['accountId'] = $account['accountId'];
                                        $test['contactId'] = $account['contactId'];
                                        // success.  See if there is a priority override for redis-based API tests
                                        if (Util::getSetting('paid_priority')) {
                                            $test['priority'] = intval(Util::getSetting('paid_priority'));
                                        }
                                    } else {
                                        $error = 'The test request will exceed the remaining test balance for the given API key';
                                    }
                                } else {
                                    $error = 'Error validating API Key Account';
                                }
                            } else {
                                $error = 'API key expired';
                            }
                        } else {
                            $error = $invalid_key_message;
                        }
                    } else {
                        $error = 'Error validating API Key';
                    }
                } catch (Exception $e) {
                    $error = 'Error validating API Key';
                }
            } else {
                $error = $invalid_key_message;
            }
            if (!strlen($error) && $key != $keys['server']['key']) {
                global $usingAPI;
                $usingAPI = true;
            }
        } elseif (!isset($admin) || !$admin) {
            if (isset($privateInstall) && $privateInstall) {
                $error = 'An error occurred processing your request (missing API key).';
            } else {
                $error = 'An error occurred processing your request (missing API key). If you do not have an API key you can purchase one here: https://product.webpagetest.org/api';
            }
        }
    }
}

/**
 * Validate the test options and set intelligent defaults
 *
 * @param mixed $test
 * @param mixed $locations
 */
function ValidateParameters(&$test, $locations, &$error, $destination_url = null)
{
    global $use_closest;
    global $admin;
    global $experiments_paid;
    global $experiments_logged_in;
    global $experimentURL;

    if (isset($test['script']) && strlen($test['script'])) {
        $url = ValidateScript($test['script'], $error);
        if (isset($url)) {
            $test['url'] = $url;
        }
    }

    if (strlen($test['url']) || $test['batch']) {
        if (
            isset($experimentURL) && (stripos($test['url'], $experimentURL) !== false)
            && (!($admin || $experiments_paid))
        ) {
            $error = "Experiments are only available for WebPageTest Pro subscribers.";
        } else {
            $maxruns = (int)Util::getSetting('maxruns', 0);
            if (isset($_COOKIE['maxruns']) && $_COOKIE['maxruns']) {
                $maxruns = (int)$_COOKIE['maxruns'];
            } elseif (isset($_REQUEST['maxruns']) && $_REQUEST['maxruns']) {
                $maxruns = (int)$_REQUEST['maxruns'];
            }
            if (!$maxruns) {
                $maxruns = 10;
            }

            if (!Util::getSetting('fullSizeVideoOn')) {
                //overwrite the Full Size Video flag with 0 if feature disabled in the settings
                $test['fullsizevideo'] = 0;
            }

            if (!isset($test['batch']) || !$test['batch']) {
                ValidateURL($test['url'], $error);
            }

            if (!$error) {
                if ($use_closest) {
                    if (!isset($destination_url)) {
                        $destination_url = $test['url'];
                    }
                    $test['location'] = GetClosestLocation($destination_url, $test['browser']);
                }

                // make sure the test runs are between 1 and the max
                if ($test['runs'] > $maxruns) {
                    $test['runs'] = $maxruns;
                } elseif ($test['runs'] < 1) {
                    $test['runs'] = 1;
                }

                // if fvonly is set, make sure it is to an explicit value of 1
                if ($test['fvonly'] > 0) {
                    $test['fvonly'] = 1;
                }

                // make sure on/off options are explicitly 1 or 0
                $values = array(
                    'private', 'web10', 'ignoreSSL', 'tcpdump', 'standards', 'lighthouse',
                    'timeline', 'swrender', 'netlog', 'spdy3', 'noscript', 'fullsizevideo',
                    'blockads', 'sensitive', 'pngss', 'bodies', 'htmlbody', 'pss_advanced',
                    'noheaders'
                );
                foreach ($values as $value) {
                    if (isset($test[$value]) && $test[$value]) {
                        $test[$value] = 1;
                    } else {
                        $test[$value] = 0;
                    }
                }
                $test['aft'] = 0;

                // use the default location if one wasn't specified
                if (!strlen($test['location'])) {
                    $def = $locations['locations']['default'];
                    if (!$def) {
                        $def = $locations['locations']['1'];
                    }
                    // $loc = $locations[$def]['default'];
                    $loc = $locations[$locations[$def]['default']]['location'];
                    if (!$loc) {
                        $loc = $locations[$locations[$def]['1']]['location'];
                    }
                    //    $loc = $locations[$def]['1'];
                    $test['location'] = $loc;
                }

                // Pull the lat and lng from the location if available
                $test_loc = $locations[$test['location']];
                if (isset($_REQUEST['lat']) && floatval($_REQUEST['lat']) != 0) {
                    $test['lat'] = floatval($_REQUEST['lat']);
                }
                if (isset($_REQUEST['lng']) && floatval($_REQUEST['lng']) != 0) {
                    $test['lng'] = floatval($_REQUEST['lng']);
                }
                if (
                    !isset($test['lat']) && !isset($test['lng']) &&
                    isset($test_loc['lat']) && isset($test_loc['lng'])
                ) {
                    $test['lat'] = floatval($test_loc['lat']);
                    $test['lng'] = floatval($test_loc['lng']);
                }

                // Use the default browser if one wasn't specified
                if ((!isset($test['browser']) || !strlen($test['browser'])) && isset($locations[$test['location']]['browser'])) {
                    $browsers = explode(',', $locations[$test['location']]['browser']);
                    if (isset($browsers) && is_array($browsers) && count($browsers)) {
                        $test['browser'] = $browsers[0];
                    }
                }

                // see if we are blocking API access at the given location
                if (
                    isset($locations[$test['location']]['noscript']) &&
                    $locations[$test['location']]['noscript'] &&
                    isset($test['priority']) &&
                    $test['priority']
                ) {
                    $error = 'API Automation is currently disabled for that location.';
                }

                // see if we need to override the browser
                if (isset($locations[$test['location']]['browserExe']) && strlen($locations[$test['location']]['browserExe'])) {
                    $test['browserExe'] = $locations[$test['location']]['browserExe'];
                }

                // See if we need to force mobile emulation
                if (!$test['mobile'] && isset($locations[$test['location']]['force_mobile']) && $locations[$test['location']]['force_mobile']) {
                    $test['mobile'] = 1;
                }

                // See if the location carries a timeout override
                if (!isset($test['timeout']) && isset($locations[$test['location']]['timeout']) && $locations[$test['location']]['timeout'] > 0) {
                    $test['timeout'] = intval($locations[$test['location']]['timeout']);
                }

                // figure out what the location working directory and friendly name are
                $test['locationText'] = $locations[$test['location']]['label'];

                if (isset($locations[$test['location']]['label'])) {
                    $test['locationLabel'] = $locations[$test['location']]['label'];
                }
                if (isset($locations[$test['location']]['localDir'])) {
                    $test['workdir'] = $locations[$test['location']]['localDir'];
                }
                if (isset($locations[$test['location']]['remoteUrl'])) {
                    $test['remoteUrl']  = $locations[$test['location']]['remoteUrl'];
                }
                if (isset($locations[$test['location']]['remoteLocation'])) {
                    $test['remoteLocation'] = $locations[$test['location']]['remoteLocation'];
                }
                if (!isset($test['workdir']) && !isset($test['remoteUrl'])) {
                    $error = "Invalid Location, please try submitting your test request again.";
                }

                if (isset($test['type']) && strlen($test['type']) && $test['type'] === 'traceroute') {
                    // make sure we're just passing a host name
                    $parts = parse_url($test['url']);
                    $test['url'] = $parts['host'];
                } else {
                    // see if we need to pick the default connectivity
                    if (empty($locations[$test['location']]['connectivity']) && !isset($test['connectivity'])) {
                        if (!empty($locations[$test['location']]['default_connectivity'])) {
                            $test['connectivity'] = $locations[$test['location']]['default_connectivity'];
                        } else {
                            $test['connectivity'] = 'Cable';
                        }
                    }

                    if (isset($test['browser']) && strlen($test['browser'])) {
                        $test['locationText'] .= " - <b>{$test['browser']}</b>";
                    }
                    if (isset($test['mobileDeviceLabel']) && $test['mobile']) {
                        $test['locationText'] .= " - <b>Emulated {$test['mobileDeviceLabel']}</b>";
                    }
                    if (isset($test['connectivity'])) {
                        $test['locationText'] .= " - <b>{$test['connectivity']}</b>";
                        $connectivity_file = './settings/connectivity.ini.sample';
                        if (file_exists('./settings/connectivity.ini')) {
                            $connectivity_file = './settings/connectivity.ini';
                        }
                        if (file_exists('./settings/common/connectivity.ini')) {
                            $connectivity_file = './settings/common/connectivity.ini';
                        }
                        if (file_exists('./settings/server/connectivity.ini')) {
                            $connectivity_file = './settings/server/connectivity.ini';
                        }
                        $connectivity = parse_ini_file($connectivity_file, true);
                        if (isset($connectivity[$test['connectivity']])) {
                            $test['bwIn'] = (int)$connectivity[$test['connectivity']]['bwIn'] / 1000;
                            $test['bwOut'] = (int)$connectivity[$test['connectivity']]['bwOut'] / 1000;
                            $test['latency'] = (int)$connectivity[$test['connectivity']]['latency'];
                            $test['testLatency'] = (int)$connectivity[$test['connectivity']]['latency'];
                            $test['plr'] = $connectivity[$test['connectivity']]['plr'];
                            if (!$test['timeout'] && isset($connectivity[$test['connectivity']]['timeout'])) {
                                $test['timeout'] = $connectivity[$test['connectivity']]['timeout'];
                            }
                        } elseif (
                            (!isset($test['bwIn']) || !$test['bwIn']) &&
                            (!isset($test['bwOut']) || !$test['bwOut']) &&
                            (!isset($test['latency']) || !$test['latency'])
                        ) {
                            $error = 'Unknown connectivity type: ' . htmlspecialchars($test['connectivity']);
                        }
                    }

                    // adjust the latency for any last-mile latency at the location
                    if (isset($test['latency']) && isset($locations[$test['location']]['latency']) && $locations[$test['location']]['latency']) {
                        $test['testLatency'] = max(0, $test['latency'] - $locations[$test['location']]['latency']);
                    }
                }
            }
        }
    } elseif (!strlen($error)) {
        $error = "Invalid URL, please try submitting your test request again.";
    }
}

/**
 * Validate the uploaded script to make sure it should be run
 *
 * @param mixed $test
 * @param mixed $error
 */
function ValidateScript(&$script, &$error)
{
    global $test;
    global $admin;
    global $experiments_paid;
    global $experiments_logged_in;
    global $experimentURL;

    $url = null;
    if (stripos($script, 'webdriver.Builder(') === false) {
        global $test;
        FixScript($test, $script);

        $stepCount = 0;
        $loggingData = true;
        $navigateCount = 0;
        $ok = false;
        $lines = explode("\n", $script);
        foreach ($lines as $line) {
            $tokens = explode("\t", $line);
            $command = trim($tokens[0]);
            if (!strcasecmp($command, 'navigate')) {
                $navigateCount++;
                if ($loggingData) {
                    $stepCount++;
                }
                $ok = true;
                $url = trim($tokens[1]);
                if (
                    stripos($url, '%URL%') !== false ||
                    stripos($url, '%ORIGIN%') !== false ||
                    stripos($url, '%HOST%') !== false ||
                    stripos($url, '%HOSTR%') !== false ||
                    stripos($url, '%HOST_REGEX%') !== false
                ) {
                    $url = null;
                } else {
                    CheckUrl($url);
                }
            } elseif (!strcasecmp($command, 'submitForm')) {
                $navigateCount++;
                if ($loggingData) {
                    $stepCount++;
                }
            } elseif (!strcasecmp($command, 'loadVariables')) {
                $error = "loadVariables is not a supported command for uploaded scripts.";
            } elseif (!strcasecmp($command, 'loadFile')) {
                $error = "loadFile is not a supported command for uploaded scripts.";
            } elseif (!strcasecmp($command, 'fileDialog')) {
                $error = "fileDialog is not a supported command for uploaded scripts.";
            } elseif (!strcasecmp($command, 'logData')) {
                if (isset($tokens[1])) {
                    if (trim($tokens[1]) == '0') {
                        $loggingData = false;
                    } elseif (trim($tokens[1]) == '1') {
                        $loggingData = true;
                    }
                }
            } elseif (stripos($command, 'AndWait') !== false) {
                $navigateCount++;
                if ($loggingData) {
                    $stepCount++;
                }
            } elseif (!strcasecmp($command, 'overrideHost')) {
                //check if experiment URL is being used
                if (
                    stripos($tokens[2], $experimentURL) !== false
                    && (!($admin || $experiments_paid))
                ) {
                    $error = "Experiments are only available for WebPageTest Pro subscribers.";
                }
            }
        }
        if (!isset($test['steps']) || $stepCount > $test['steps']) {
            $test['steps'] = $stepCount;
        }

        $test['navigateCount'] = $navigateCount;

        $maxNavigateCount = Util::getSetting("maxNavigateCount");
        if (!$maxNavigateCount) {
            $maxNavigateCount = 20;
        }

        if (!$ok) {
            $error = "Invalid Script (make sure there is at least one navigate command and that the commands are tab-delimited).  Please contact us if you need help with your test script.";
        } elseif ($navigateCount > $maxNavigateCount) {
            $error = "Sorry, your test has been blocked.  Please contact us if you have any questions";
        }

        if (strlen($error)) {
            unset($url);
        }
    }

    return $url;
}

/**
 * Extract the server side configuration.
 * Try to automaticaly fix a script that used spaces instead of tabs.
 *
 * @param mixed $script
 */
function FixScript(&$test, &$script)
{
    if (strlen($script)) {
        $newScript = '';
        $lines = explode("\n", $script);
        foreach ($lines as $line) {
            $line = trim($line);
            if (strlen($line)) {
                if (strpos($line, "\t") !== false) {
                    $newScript .= "$line\r\n";
                } else {
                    $command = strtok(trim($line), " \t\r\n");
                    if ($command !== false) {
                        $newScript .= $command;
                        $expected = ScriptParameterCount($command);
                        if ($expected == 2) {
                            $target = strtok("\r\n");
                            if ($target !== false) {
                                $newScript .= "\t$target";
                            }
                        } elseif ($expected = 3) {
                            $target = strtok(" \t\r\n");
                            if ($target !== false) {
                                $newScript .= "\t$target";
                                $value = strtok("\r\n");
                                if ($value !== false) {
                                    $newScript .= "\t$value";
                                }
                            }
                        }
                        $newScript .= "\r\n";
                    }
                }
            }
        }

        $script = $newScript;
    }
}

/**
 * Figure out how many parameters are expected for the given script step
 * in case we're trying to fix a script with no tabs the command count
 * will help us allow commands with spaces in them
 *
 * @param mixed $command
 */
function ScriptParameterCount($command)
{
    // default to 2 - 3 is the special case
    $count = 2;

    if (
        !strcasecmp($command, 'setDOMRequest') ||
        !strcasecmp($command, 'setValue') ||
        !strcasecmp($command, 'setInnerText') ||
        !strcasecmp($command, 'setInnerHTML') ||
        !strcasecmp($command, 'selectValue') ||
        !strcasecmp($command, 'loadFile') ||
        !strcasecmp($command, 'fileDialog') ||
        !strcasecmp($command, 'sendKeyPress') ||
        !strcasecmp($command, 'sendKeyPressAndWait') ||
        !strcasecmp($command, 'sendKeyDown') ||
        !strcasecmp($command, 'sendKeyDownAndWait') ||
        !strcasecmp($command, 'sendKeyUp') ||
        !strcasecmp($command, 'sendKeyUpAndWait') ||
        !strcasecmp($command, 'sendCommand') ||
        !strcasecmp($command, 'sendCommandAndWait') ||
        !strcasecmp($command, 'setCookie') ||
        !strcasecmp($command, 'setDNS') ||
        !strcasecmp($command, 'setDnsName') ||
        !strcasecmp($command, 'setBrowserSize') ||
        !strcasecmp($command, 'setViewportSize') ||
        !strcasecmp($command, 'overrideHost') ||
        !strcasecmp($command, 'addCustomRule') ||
        !strcasecmp($command, 'firefoxPref') ||
        !strcasecmp($command, 'overrideHostUrl')
    ) {
        $count = 3;
    }

    return $count;
}

/**
 * Make sure the URL they requested looks valid
 *
 * @param mixed $test
 * @param mixed $error
 */
function ValidateURL(&$url, &$error)
{
    $ret = false;

    // make sure the url starts with http://
    if (strncasecmp($url, 'http:', 5) && strncasecmp($url, 'https:', 6)) {
        $url = 'https://' . $url;
    }

    $parts = parse_url($url);
    $host = $parts['host'];

    if (strpos($url, ' ') !== false || strpos($url, '>') !== false || strpos($url, '<') !== false) {
        $error = "Please enter a Valid URL.  <b>" . htmlspecialchars($url) . "</b> is not a valid URL";
    } elseif (strpos($host, '.') === false && !GetSetting('allowNonFQDN')) {
        $error = "Please enter a Valid URL.  <b>" . htmlspecialchars($host) . "</b> is not a valid Internet host name";
    } elseif (
        preg_match('/\d+\.\d+\.\d+\.\d+/', $host) && !GetSetting('allowPrivate') &&
        (!strcmp($host, "127.0.0.1") || !strncmp($host, "192.168.", 8)  || !strncmp($host, "169.254.", 8) || !strncmp($host, "10.", 3))
    ) {
        $error = "You can not test <b>" . htmlspecialchars($host) . "</b> from the public Internet.  Your web site needs to be hosted on the public Internet for testing";
    } elseif (!strcmp($host, "169.254.169.254")) {
        $error = "Sorry, " . htmlspecialchars($host) . " is blocked from testing";
    } elseif (!strcasecmp(substr($url, -4), '.pdf')) {
        $error = "You can not test PDF files with WebPagetest";
    } else {
        $ret = true;
    }

    return $ret;
}

/**
 * Submit the test request file to the server
 *
 * @param mixed $run
 * @param mixed $testRun
 * @param mixed $test
 */
function SubmitUrl($testId, $job, &$test, $url)
{
    $ret = false;
    global $error;
    global $locations;

    $job['Test ID'] = $testId;
    $job['url'] = $url;
    $script = ProcessTestScript($url, $test);
    if (isset($script) && strlen($script)) {
        $job['script'] = $script;
    }

    $location = $test['location'];
    $ret = WriteJob($location, $test, json_encode($job), $testId);
    if (isset($test['ami'])) {
        EC2_StartInstanceIfNeeded($test['ami']);
    }

    return $ret;
}

/**
 * Write out the actual job file
 */
function WriteJob($location, &$test, &$job, $testId)
{
    $ret = false;
    global $error;
    global $locations;

    // Submit the job locally
    if (AddTestJob($location, $job, $test, $testId)) {
        $ret = true;
    } else {
        $error = "Sorry, that test location appears to be unavailable.  Please try again later.";
    }

    if ($ret) {
        ReportAnalytics($test, $testId);
    }

    return $ret;
}

/**
 * Detect if the given URL redirects to another host
 */
function GetRedirect($url, &$rhost, &$rurl)
{
    global $redirect_cache;
    $redirected = false;
    $rhost = '';
    $rurl = '';

    if (strlen($url)) {
        if (strncasecmp($url, 'http:', 5) && strncasecmp($url, 'https:', 6)) {
            $url = 'https://' . $url;
        }
        if (array_key_exists($url, $redirect_cache)) {
            $rhost = $redirect_cache[$url]['host'];
            $rurl = $redirect_cache[$url]['url'];
        } elseif (function_exists('curl_init')) {
            $cache_key = md5($url);
            $redirect_info = CacheFetch($cache_key);
            if (isset($redirect_info) && isset($redirect_info['host']) && isset($redirect_info['url'])) {
                $rhost = $redirect_info['host'];
                $rurl = $redirect_info['url'];
            } else {
                $parts = parse_url($url);
                $original = $parts['host'];
                $host = '';
                $curl = curl_init();
                curl_setopt($curl, CURLOPT_URL, $url);
                curl_setopt($curl, CURLOPT_USERAGENT, 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; PTST 2.295)');
                curl_setopt($curl, CURLOPT_FILETIME, true);
                curl_setopt($curl, CURLOPT_NOBODY, true);
                curl_setopt($curl, CURLOPT_HEADER, true);
                curl_setopt($curl, CURLOPT_FAILONERROR, true);
                curl_setopt($curl, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 20);
                curl_setopt($curl, CURLOPT_DNS_CACHE_TIMEOUT, 20);
                curl_setopt($curl, CURLOPT_MAXREDIRS, 10);
                curl_setopt($curl, CURLOPT_TIMEOUT, 20);
                curl_setopt($curl, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
                curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
                $headers = curl_exec($curl);
                curl_close($curl);
                $lines = explode("\n", $headers);
                foreach ($lines as $line) {
                    $line = trim($line);
                    $split = strpos($line, ':');
                    if ($split > 0) {
                        $key = trim(substr($line, 0, $split));
                        $value = trim(substr($line, $split + 1));
                        if (!strcasecmp($key, 'Location')) {
                            $rurl = $value;
                            $parts = parse_url($rurl);
                            $host = trim($parts['host']);
                        }
                    }
                }
            }

            if (strlen($host) && $original !== $host) {
                $rhost = $host;
            }

            // Cache the redirct info
            $redirect_info = array('host' => $rhost, 'url' => $rurl);
            $redirect_cache[$url] = $redirect_info;
            CacheStore($cache_key, $redirect_info, 3600);
        }
    }
    if (strlen($rhost)) {
        $redirected = true;
    }
    return $redirected;
}

/**
 * Log the actual test in the test log file
 *
 * @param mixed $test
 */
function LogTest(&$test, $testId, $url)
{
    global $apiKey;
    global $USER_EMAIL;
    global $supportsCPAuth;
    global $request_context;
    global $supportsSaml;
    $runcount = null;

    if (GetSetting('logging_off')) {
        server_sync($apiKey, $runcount, null);
        return;
    }

    $host = parse_url($url, PHP_URL_HOST);
    $exempt_host = parse_url(Util::getExemptHost(), PHP_URL_HOST);
    $runcount = ($host == $exempt_host) ? 0 : Util::getRunCount($test['runs'], $test['fvonly'], $test['lighthouse'], $test['type']);

    if (!is_dir('./logs')) {
        mkdir('./logs', 0777, true);
    }

    // open the log file
    $filename = "./logs/" . gmdate("Ymd") . ".log";
    $video = 0;
    if (isset($test['video']) && strlen($test['video'])) {
        $video = 1;
    }
    $ip = $_SERVER['REMOTE_ADDR'];
    if (array_key_exists('ip', $test) && strlen($test['ip'])) {
        $ip = $test['ip'];
    }
    $pageLoads = $test['runs'];
    if (!$test['fvonly']) {
        $pageLoads *= 2;
    }
    //if (array_key_exists('navigateCount', $test) && $test['navigateCount'] > 0)
    //    $pageLoads *= $test['navigateCount'];

    $user_info = '';
    $client_id = null;
    $create_contact_id = null;
    if ($supportsCPAuth && isset($request_context) && !is_null($request_context->getUser())) {
        $user_info = $request_context->getUser()->getEmail();
        $client_id = $request_context->getUser()->getOwnerId();
        $create_contact_id = $request_context->getUser()->getUserId();
    } elseif ($supportsSaml) {
        $saml_email = GetSamlEmail();
        $client_id = GetSamlAccount();
        $create_contact_id = GetSamlContact();
        if (isset($saml_email)) {
            $user_info = $saml_email;
        }
    } elseif (isset($test['user']) && strlen($test['user'])) {
        $user_info = $test['user'];
    } elseif (isset($_COOKIE['google_email']) && strlen($_COOKIE['google_email']) && isset($_COOKIE['google_id'])) {
        $user_info = $_COOKIE['google_email'];
    } else {
        $user_info = $USER_EMAIL;
    }

    $redis_server = Util::getSetting('redis_test_history');

    $key = isset($test['key']) ? $test['key'] : null;
    if ($key == GetServerKey()) {
        $key = null;
    }
    $line_data = array(
        'date' => gmdate("Y-m-d G:i:s"),
        'ip' => @$ip,
        'guid' => @$testId,
        'url' => @$url,
        'location' => @$test['locationText'],
        'private' => $test['private'],
        'testUID' => @$test['uid'],
        'testUser' => $user_info,
        'video' => @$video,
        'label' => @$test['label'],
        'owner' => @$test['owner'],
        'key' => $key,
        'count' => @$runcount,
        'priority' => @$test['priority'],
        'email' => $user_info,
        'redis' => $redis_server ? '1' : '0',
        'lighthouse' => @$test['lighthouse']
    );

    $log = makeLogLine($line_data);

    error_log($log, 3, $filename);
    server_sync($apiKey, $runcount, rtrim($log, "\r\n"));

    // Log the test history record to redis if configured
    if ($redis_server) {
        $logEntry = array(
            'date' => gmdate("Y-m-d G:i:s"),
            'ip' => @$ip,
            'guid' => @$testId,
            'url' => @$url,
            'location' => @$test['locationText'],
            'private' => $test['private'],
            'testUID' => @$test['uid'],
            'testUser' => $user_info,
            'video' => @$video,
            'label' => @$test['label'],
            'owner' => @$test['owner'],
            'key' => $key,
            'count' => @$runcount,
            'runs' => @$runcount,
            'priority' => @$test['priority'],
            'clientId' => $client_id,
            'createContactId' => $create_contact_id,
            'lighthouse' => @$test['lighthouse']
        );
        if (isset($logEntry['location'])) {
            $logEntry['location'] = strip_tags($logEntry['location']);
        }
        if (isset($test['key']) && isset($test['accountId']) && isset($test['contactId'])) {
            $logEntry['testUser'] = '';
            $logEntry['clientId'] = intval($test['accountId']);
            $logEntry['createContactId'] = intval($test['contactId']);
        }
        LimitLogEntrySizes($logEntry);
        if (IsValidLogEntry($logEntry)) {
            $message = json_encode($logEntry);
            try {
                $redis = new Redis();
                if ($redis->connect($redis_server, 6379, 30)) {
                    $redis->multi(Redis::PIPELINE)
                        ->lPush('testHistory', $message)
                        ->publish('testHistoryAlert', 'wakeup')
                        ->exec();
                }
            } catch (Exception $e) {
            }
        }
    }
}

function LimitLogEntrySizes(&$logEntry)
{
    // keep string lengths to reasonable sizes
    static $max_sizes = array(
        'ip' => 50,
        'guid' => 64,
        'url' => 4000,
        'location' => 100,
        'testUID' => 150,
        'testUser' => 150,
        'label' => 250,
        'owner' => 150,
        'key' => 100
    );
    if (isset($logEntry) && is_array($logEntry)) {
        foreach ($max_sizes as $key => $len) {
            if (isset($logEntry[$key]) && is_string($logEntry[$key]) && $len > 0 && strlen($logEntry[$key]) > $len) {
                $logEntry[$key] = substr($logEntry[$key], 0, $len);
            }
        }
    }
}

function IsValidLogEntry($logEntry)
{
    // Check for required fields
    static $required_fields = array('guid', 'date', 'url', 'runs', 'location', 'private');
    foreach ($required_fields as $field) {
        if (!isset($logEntry[$field])) {
            return false;
        }
    }
    // Check for valid types
    return true;
}

/**
 * Make sure the requesting IP isn't on our block list
 *
 */
function CheckIp(&$test)
{
    global $admin;
    global $user;
    global $usingAPI;
    $ok = true;
    if (!$admin && !$usingAPI) {
        $date = gmdate("Ymd");
        $ip2 = @$test['ip'];
        $ip = $_SERVER['REMOTE_ADDR'];
        if (file_exists('./settings/server/blockip.txt')) {
            $blockIps = file('./settings/server/blockip.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        } elseif (file_exists('./settings/common/blockip.txt')) {
            $blockIps = file('./settings/common/blockip.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        } else {
            $blockIps = file('./settings/blockip.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        }
        if (isset($blockIps) && is_array($blockIps) && count($blockIps)) {
            foreach ($blockIps as $block) {
                $block = trim($block);
                if (strlen($block)) {
                    if (preg_match("/$block/", $ip)) {
                        logMsg("$ip: matched $block for url {$test['url']}", "./log/{$date}-blocked.log", true);
                        $ok = false;
                        break;
                    }

                    if ($ip2 && strlen($ip2) && preg_match("/$block/", $ip2)) {
                        logMsg("$ip2: matched(2) $block for url {$test['url']}", "./log/{$date}-blocked.log", true);
                        $ok = false;
                        break;
                    }
                }
            }
        }
    }

    return $ok;
}

/**
 * Make sure the url isn't on our block list
 *
 * @param mixed $url
 */
function CheckUrl($url)
{
    $ok = true;
    global $user;
    global $usingAPI;
    global $forceValidate;
    global $error;
    global $admin;
    global $is_bulk_test;
    $date = gmdate("Ymd");
    if (strncasecmp($url, 'http:', 5) && strncasecmp($url, 'https:', 6)) {
        $url = 'https://' . $url;
    }
    if ($forceValidate || (!$usingAPI && !$admin)) {
        if (file_exists('./settings/server/blockurl.txt')) {
            $blockUrls = file('./settings/server/blockurl.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        } elseif (file_exists('./settings/common/blockurl.txt')) {
            $blockUrls = file('./settings/common/blockurl.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        } else {
            $blockUrls = file('./settings/blockurl.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        }
        if (file_exists('./settings/server/blockdomains.txt')) {
            $blockHosts = file('./settings/server/blockdomains.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        } elseif (file_exists('./settings/common/blockdomains.txt')) {
            $blockHosts = file('./settings/common/blockdomains.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        } else {
            $blockHosts = file('./settings/blockdomains.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        }
        if (
            $blockUrls !== false && count($blockUrls) ||
            $blockHosts !== false && count($blockHosts)
        ) {
            // Follow redirects to see if they are obscuring the site being tested
            $rhost = '';
            $rurl = '';
            if (GetSetting('check_redirects') && !$is_bulk_test) {
                GetRedirect($url, $rhost, $rurl);
            }
            foreach ($blockUrls as $block) {
                $block = trim($block);
                if (strlen($block) && preg_match("/$block/i", $url)) {
                    logMsg("{$_SERVER['REMOTE_ADDR']}: url $url matched $block", "./log/{$date}-blocked.log", true);
                    $ok = false;
                    break;
                } elseif (strlen($block) && strlen($rurl) && preg_match("/$block/i", $rurl)) {
                    logMsg("{$_SERVER['REMOTE_ADDR']}: url $url redirected to $rurl matched $block", "./log/{$date}-blocked.log", true);
                    $ok = false;
                    break;
                }
            }
            if ($ok) {
                $parts = parse_url($url);
                $host = trim($parts['host']);
                foreach ($blockHosts as $block) {
                    $block = trim($block);
                    if (
                        strlen($block) &&
                        (!strcasecmp($host, $block) ||
                            !strcasecmp($host, "www.$block"))
                    ) {
                        logMsg("{$_SERVER['REMOTE_ADDR']}: $url matched $block", "./log/{$date}-blocked.log", true);
                        $ok = false;
                        break;
                    } elseif (
                        strlen($block) &&
                        (!strcasecmp($rhost, $block) ||
                            !strcasecmp($rhost, "www.$block"))
                    ) {
                        logMsg("{$_SERVER['REMOTE_ADDR']}: $url redirected to $rhost which matched $block", "./log/{$date}-blocked.log", true);
                        $ok = false;
                        break;
                    }
                }
            }
        }
    }

    return $ok;
}

/**
 * Create a single test and return the test ID
 *
 * @param mixed $test
 * @param mixed $url
 */
function CreateTest(&$test, $url, $batch = 0, $batch_locations = 0)
{
    global $server_secret;
    global $is_mobile;

    $testId = null;
    if (is_file('./settings/block.txt')) {
        $forceBlock = trim(file_get_contents('./settings/block.txt'));
    }

    if (CheckUrl($url) && WptHookValidateTest($test)) {
        $locationShard = isset($test['locationShard']) ? $test['locationShard'] : null;

        // generate the test ID
        $testId = GenerateTestID($test['private'], $locationShard);

        // if this is an experiment, and it's a control run, it needs its control_id field set to its own id
        if ($test['metadata']) {
            $meta = json_decode($test['metadata']);
            if (isset($meta) && is_array($meta) && $meta['experiment']) {
                if ($meta['control_id'] === "") {
                    $meta['control_id'] = $testId;
                    $test['metadata'] = json_encode($meta);
                }
            }
        }


        $test['path'] = './' . GetTestPath($testId);

        // create the folder for the test results
        if (!is_dir($test['path'])) {
            mkdir($test['path'], 0777, true);
        }

        // Fetch the CrUX data for the URL
        $crux_data = GetCruxDataForURL($url, $is_mobile);
        if (isset($crux_data) && strlen($crux_data)) {
            gz_file_put_contents("{$test['path']}/crux.json", $crux_data);
        }

        // Start with an initial state of waiting/submitted
        if (!$batch) {
            touch("{$test['path']}/test.waiting");
        }

        // write out the ini file
        $testInfo = "[test]\r\n";
        AddIniLine($testInfo, "fvonly", $test['fvonly']);
        $timeout = $test['timeout'];
        if (!$timeout) {
            $timeout = GetSetting('step_timeout', $timeout);
        }
        AddIniLine($testInfo, "timeout", $timeout);
        $resultRuns = isset($test['discard']) ? $test['runs'] - $test['discard'] : $test['runs'];
        AddIniLine($testInfo, "runs", $resultRuns);
        AddIniLine($testInfo, "location", "\"{$test['locationText']}\"");
        AddIniLine($testInfo, "loc", $test['location']);
        AddIniLine($testInfo, "id", $testId);
        AddIniLine($testInfo, "batch", $batch);
        AddIniLine($testInfo, "batch_locations", $batch_locations);
        AddIniLine($testInfo, "sensitive", $test['sensitive']);
        AddIniLine($testInfo, "private", $test['private']);
        if (isset($test['login']) && strlen($test['login'])) {
            AddIniLine($testInfo, "authenticated", "1");
        }
        AddIniLine($testInfo, "connections", $test['connections']);
        if (isset($test['script']) && strlen($test['script'])) {
            AddIniLine($testInfo, "script", "1");
        }
        if (isset($test['notify']) && strlen($test['notify'])) {
            AddIniLine($testInfo, "notify", $test['notify']);
        }
        if (isset($test['video']) && strlen($test['video'])) {
            AddIniLine($testInfo, "video", "1");
        }
        if (isset($test['disable_video'])) {
            AddIniLine($testInfo, "disable_video", $test['disable_video']);
        }
        if (isset($test['uid']) && strlen($test['uid'])) {
            AddIniLine($testInfo, "uid", $test['uid']);
        }
        if (isset($test['owner']) && strlen($test['owner'])) {
            AddIniLine($testInfo, "owner", $test['owner']);
        }
        if (!empty($test["creator"])) {
            AddIniLine($testInfo, "creator", $test["creator"]);
        }
        if (isset($test['type']) && strlen($test['type'])) {
            AddIniLine($testInfo, "type", $test['type']);
        }

        if (isset($test['connectivity'])) {
            AddIniLine($testInfo, "connectivity", $test['connectivity']);
            AddIniLine($testInfo, "bwIn", $test['bwIn']);
            AddIniLine($testInfo, "bwOut", $test['bwOut']);
            AddIniLine($testInfo, "latency", $test['latency']);
            AddIniLine($testInfo, "plr", $test['plr']);
        }

        $testInfo .= "\r\n[runs]\r\n";
        if (isset($test['median_video']) && $test['median_video']) {
            AddIniLine($testInfo, "median_video", "1");
        }

        file_put_contents("{$test['path']}/testinfo.ini", $testInfo);

        // for "batch" tests (the master) we don't need to submit an actual test request
        if (!$batch && !$batch_locations) {
            // build up the json test job
            $job = array();
            // build up the actual test commands
            if (isset($test['priority'])) {
                $job["priority"] = $test['priority'];
            }
            if (isset($test['fvonly']) && $test['fvonly']) {
                $job['fvonly'] = 1;
            } else {
                $job['fvonly'] = 0;
            }
            if ($timeout) {
                $job['timeout'] = intval($timeout);
            }
            if (isset($test['run_time_limit'])) {
                $job["run_time_limit"] = $test['run_time_limit'];
            }
            if (isset($test['web10']) && $test['web10']) {
                $job['web10'] = 1;
            }
            if (isset($test['ignoreSSL']) && $test['ignoreSSL']) {
                $job['ignoreSSL'] = 1;
            }
            if (isset($test['tcpdump']) && $test['tcpdump']) {
                $job['tcpdump'] = 1;
            }
            if (isset($test['standards']) && $test['standards']) {
                $job['standards'] = 1;
            }
            if (isset($test['timeline']) && $test['timeline']) {
                $job['timeline'] = 1;
                if (isset($test['discard_timeline']) && $test['discard_timeline']) {
                    $job['discard_timeline'] = 1;
                }
                if (isset($test['profiler']) && $test['profiler']) {
                    $job['profiler'] = 1;
                }
                if (isset($test['timeline_fps'])) {
                    $job['timeline_fps'] = intval($test['timeline_fps']);
                }
                if (isset($test['timelineStackDepth'])) {
                    $job['timelineStackDepth'] = intval($test['timelineStackDepth']);
                }
            }
            if (isset($test['trace']) && $test['trace']) {
                $job['trace'] = 1;
            }
            if (isset($test['traceCategories'])) {
                $job['traceCategories'] = $test['traceCategories'];
            }
            if (isset($test['swrender']) && $test['swrender']) {
                $job['swRender'] = 1;
            }
            if (isset($test['netlog']) && $test['netlog']) {
                $job['netlog'] = 1;
            }
            if (isset($test['spdy3']) && $test['spdy3']) {
                $job['spdy3'] = 1;
            }
            if (isset($test['noscript']) && $test['noscript']) {
                $job['noscript'] = 1;
            }
            if (isset($test['fullsizevideo']) && $test['fullsizevideo']) {
                $job['fullSizeVideo'] = 1;
            }
            if (isset($test['thumbsize'])) {
                $job['thumbsize'] = $test['thumbsize'];
            }
            if (isset($test['blockads']) && $test['blockads']) {
                $job['blockads'] = 1;
            }
            if (isset($test['video']) && $test['video']) {
                $job['Capture Video'] = 1;
            } else {
                $job['Capture Video'] = 0;
            }
            if (isset($test['disable_video']) && $test['disable_video']) {
                $job["disable_video"] = 1;
            }
            if (GetSetting('save_mp4') || (isset($test['keepvideo']) && $test['keepvideo'])) {
                $job['keepvideo'] = 1;
            }
            if (isset($test['renderVideo']) && $test['renderVideo']) {
                $job['renderVideo'] = 1;
            }
            if (isset($test['type']) && strlen($test['type'])) {
                $job['type'] = $test['type'];
            }
            if (isset($test['block']) && $test['block']) {
                $block = $test['block'];
                if (isset($forceBlock)) {
                    $block .= " $forceBlock";
                }
                $job['block'] = $block;
            } elseif (isset($forceBlock)) {
                $job['block'] = $forceBlock;
            }
            if (isset($test['blockDomains']) && strlen($test['blockDomains'])) {
                $job['blockDomains'] = $test['blockDomains'];
            }
            if (isset($test['injectScript'])) {
                $job['injectScript'] = $test['injectScript'];
            }
            if (isset($test['injectScriptAllFrames']) && $test['injectScriptAllFrames']) {
                $job['injectScriptAllFrames'] = 1;
            }
            if (isset($test['noopt']) && $test['noopt']) {
                $job['noopt'] = 1;
            }
            if (isset($test['noimages']) && $test['noimages']) {
                $job['noimages'] = 1;
            }
            if (isset($test['sensitive']) && $test['sensitive']) {
                $job['noheaders'] = 1;
            }
            if (isset($test['noheaders']) && $test['noheaders']) {
                $job['noheaders'] = 1;
            }
            if (isset($test['discard']) && $test['discard']) {
                $job['discard'] = intval($test['discard']);
            }
            $job['runs'] = intval($test['runs']);

            if (isset($test['connectivity'])) {
                $job['bwIn'] = intval($test['bwIn']);
                $job['bwOut'] = intval($test['bwOut']);
                $job['latency'] = intval($test['testLatency']);
                $job['plr'] = floatval($test['plr']);
                $job['shaperLimit'] = intval($test['shaperLimit']);
            }

            if (isset($test['browserExe']) && strlen($test['browserExe'])) {
                $job['browserExe'] = $test['browserExe'];
            }
            if (isset($test['browser']) && strlen($test['browser'])) {
                $job['browser'] = $test['browser'];
            }
            if ((isset($test['pngss']) && $test['pngss']) || GetSetting('pngss')) {
                $job['pngScreenShot'] = 1;
            }
            if (isset($test['fps']) && $test['fps'] > 0) {
                $job['fps'] = intval($test['fps']);
            }
            $iq = GetSetting('iq');
            if (isset($test['iq']) && $test['iq']) {
                $job['imageQuality'] = intval($test['iq']);
            } elseif ($iq) {
                $job['imageQuality'] = intval($iq);
            }
            if (isset($test['bodies']) && $test['bodies']) {
                $job['bodies'] = 1;
            }
            if (isset($test['htmlbody']) && $test['htmlbody']) {
                $job['htmlbody'] = 1;
            }
            if (isset($test['time']) && $test['time']) {
                $job['time'] = intval($test['time']);
            }
            if (isset($test['clear_rv']) && $test['clear_rv']) {
                $job['clearRV'] = 1;
            }
            if (isset($test['keepua']) && $test['keepua']) {
                $job['keepua'] = 1;
            }
            if (isset($test['axe']) && $test['axe']) {
                $job['axe'] = 1;
            }
            if (isset($test['mobile']) && $test['mobile']) {
                $job['mobile'] = 1;
            }
            if (isset($test['lighthouse']) && $test['lighthouse']) {
                $job['lighthouse'] = 1;
            }
            if (isset($test['lighthouseTrace']) && $test['lighthouseTrace']) {
                $job['lighthouseTrace'] = 1;
            }
            if (isset($test['lighthouseScreenshots']) && $test['lighthouseScreenshots']) {
                $job['lighthouseScreenshots'] = 1;
            }
            if (isset($test['v8rcs']) && $test['v8rcs']) {
                $job['v8rcs'] = 1;
            }
            if (isset($test['lighthouseThrottle']) && $test['lighthouseThrottle']) {
                $job['lighthouseThrottle'] = 1;
            }
            if (isset($test['lighthouseConfig'])) {
                $job['lighthouseConfig'] = $test['lighthouseConfig'];
            }
            if (isset($test['coverage']) && $test['coverage']) {
                $job['coverage'] = 1;
            }
            if (isset($test['debug']) && $test['debug']) {
                $job['debug'] = 1;
            }
            if (isset($test['warmup']) && $test['warmup']) {
                $job['warmup'] = intval($test['warmup']);
            }
            if (isset($test['throttle_cpu']) && $test['throttle_cpu'] > 0.0) {
                $job['throttle_cpu'] = floatval($test['throttle_cpu']);
            }
            if (isset($test['bypass_cpu_normalization']) && $test['bypass_cpu_normalization']) {
                $job['bypass_cpu_normalization'] = 1;
            }
            if (isset($test['securityInsights']) && $test['securityInsights']) {
                $job['securityInsights'] = 1;
            }
            if (isset($test['dpr']) && $test['dpr'] > 0) {
                $job['dpr'] = floatval($test['dpr']);
            }
            if (isset($test['width']) && $test['width'] > 0) {
                $job['width'] = intval($test['width']);
            }
            if (isset($test['height']) && $test['height'] > 0) {
                $job['height'] = intval($test['height']);
            }
            if (isset($test['browser_width']) && $test['browser_width'] > 0) {
                $job['browser_width'] = intval($test['browser_width']);
            }
            if (isset($test['browser_height']) && $test['browser_height'] > 0) {
                $job['browser_height'] = intval($test['browser_height']);
            }
            if (isset($test['clearcerts']) && $test['clearcerts']) {
                $job['clearcerts'] = 1;
            }
            if (isset($test['orientation']) && $test['orientation']) {
                $job['orientation'] = $test['orientation'];
            }
            if (array_key_exists('continuousVideo', $test) && $test['continuousVideo']) {
                $job['continuousVideo'] = 1;
            }
            if (array_key_exists('responsive', $test) && $test['responsive']) {
                $job['responsive'] = 1;
            }
            if (array_key_exists('minimalResults', $test) && $test['minimalResults']) {
                $job['minimalResults'] = 1;
            }
            if (array_key_exists('cmdLine', $test) && strlen($test['cmdLine'])) {
                $job['cmdLine'] = $test['cmdLine'];
            }
            if (array_key_exists('addCmdLine', $test) && strlen($test['addCmdLine'])) {
                $job['addCmdLine'] = $test['addCmdLine'];
            }
            if (array_key_exists('extensions', $test) && strlen($test['extensions'])) {
                $job['extensions'] = $test['extensions'];
            }
            if (array_key_exists('extensionName', $test) && strlen($test['extensionName'])) {
                $job['extensionName'] = $test['extensionName'];
            }
            if (isset($test['uastring'])) {
                $job['uastring'] = $test['uastring'];
            }
            if (isset($test['UAModifier']) && strlen($test['UAModifier'])) {
                $job['UAModifier'] = $test['UAModifier'];
            }
            if (isset($test['appendua'])) {
                $job['AppendUA'] = $test['appendua'];
            }
            if (isset($test['key']) && strlen($test['key'])) {
                $job['APIKey'] = $test['key'];
            }
            if (isset($test['ip']) && strlen($test['ip'])) {
                $job['IPAddr'] = $test['ip'];
            }
            if (isset($test['lat']) && strlen($test['lat'])) {
                $job['lat'] = $test['lat'];
            }
            if (isset($test['lng']) && strlen($test['lng'])) {
                $job['lng'] = $test['lng'];
            }
            if (isset($test['disableAVIF']) && $test['disableAVIF']) {
                $job['disableAVIF'] = 1;
            }
            if (isset($test['disableWEBP']) && $test['disableWEBP']) {
                $job['disableWEBP'] = 1;
            }
            if (isset($test['disableJXL']) && $test['disableJXL']) {
                $job['disableJXL'] = 1;
            }
            if (isset($test['dtShaper']) && $test['dtShaper']) {
                $job['dtShaper'] = 1;
            }
            if (isset($test['axe']) && $test['axe']) {
                $job['axe'] = 1;
            }
            // Pass the WPT server hostname to the agent
            $hostname = GetSetting('host');
            if (isset($hostname) && is_string($hostname) && strlen($hostname)) {
                $job['wpthost'] = $hostname;
            } elseif (isset($_SERVER['HTTP_HOST']) && strlen($_SERVER['HTTP_HOST'])) {
                $job['wpthost'] = $_SERVER['HTTP_HOST'];
            }
            if (isset($server_secret) && strlen($server_secret)) {
                $job['signature'] = sha1("$testId$server_secret");
            }
            $work_server = GetSetting('work_server');
            if ($work_server) {
                $job['work_server'] = $work_server;
            }
            // Add custom metrics
            if (array_key_exists('customMetrics', $test)) {
                $job['customMetrics'] = $test['customMetrics'];
            }
            $max_requests = GetSetting('max_requests');
            if ($max_requests) {
                $job['max_requests'] = $max_requests;
            }
            $crux_keys = GetSetting('crux_agent_api_keys');
            if ($crux_keys && strlen($crux_keys)) {
                $crux_key = explode(',', $crux_keys);
                $job['crux_api_key'] = trim($crux_key[array_rand($crux_key)]);
            }
            if (isset($test['metadata'])) {
                $job['metadata'] = $test['metadata'];
            }
            $extensions_cache_time = GetSetting('extensions_cache_time');
            if ($extensions_cache_time && strlen($extensions_cache_time)) {
                $job['extensions_cache_time'] = $extensions_cache_time;
            }
            // Generate the job file name
            $ext = 'url';
            if ($test['priority']) {
                $ext = "p{$test['priority']}";
            }
            $test['job'] = "$testId.$ext";

            // Write out the json before submitting the test to the queue
            $oldUrl = @$test['url'];
            $test['url'] = $url;
            $test['id'] = $testId;
            SaveTestInfo($testId, $test);
            $test['url'] = $oldUrl;

            if (!SubmitUrl($testId, $job, $test, $url)) {
                $testId = null;
            }
        } elseif (isset($testId)) {
            $oldUrl = @$test['url'];
            $test['url'] = $url;
            $test['id'] = $testId;
            SaveTestInfo($testId, $test);
            $test['url'] = $oldUrl;
        }

        // log the test
        if (isset($testId)) {
            logTestMsg($testId, "Test Created");

            if ($batch_locations) {
                LogTest($test, $testId, 'Multiple Locations test');
            } elseif ($batch) {
                LogTest($test, $testId, 'Bulk Test');
            } else {
                LogTest($test, $testId, $url);
            }
        } else {
            // delete the test if we didn't really submit it
            delTree("{$test['path']}/");
        }
    } else {
        global $error;
        $error = 'Your test request was intercepted by our spam filters (or because we need to talk to you about how you are submitting tests)';
    }

    return $testId;
}

/**
 * Parse an URL from bulk input which can optionally have a label
 * <url>
 * or
 * <label>=<url>
 *
 * @param mixed $line
 */
function ParseBulkUrl($line)
{
    $entry = null;
    $err = null;
    $noscript = 0;

    $pos = stripos($line, 'noscript');
    if ($pos !== false) {
        $line = trim(substr($line, 0, $pos));
        $noscript = 1;
    }

    $equals = strpos($line, '=');
    $query = strpos($line, '?');
    $slash = strpos($line, '/');
    $label = null;
    $url = null;
    if ($equals === false || ($query !== false && $query < $equals) || ($slash !== false && $slash < $equals)) {
        $url = $line;
    } else {
        $label = trim(substr($line, 0, $equals));
        $url = trim(substr($line, $equals + 1));
    }

    if ($url && ValidateURL($url, $err)) {
        $entry = array();
        $entry['u'] = $url;
        if ($label) {
            $entry['l'] = $label;
        }
        $entry['ns'] = $noscript;
    }

    return $entry;
}

/**
 * Parse the URL variation from the bulk data
 * in the format:
 * <label>=<query param>
 *
 * @param mixed $line
 */
function ParseBulkVariation($line)
{
    $entry = null;
    $equals = strpos($line, '=');

    if ($equals !== false) {
        $label = trim(substr($line, 0, $equals));
        $query = trim(substr($line, $equals + 1));
        if (strlen($label) && strlen($query)) {
            $entry = array('l' => $label, 'q' => $query);
        }
    }

    return $entry;
}

/**
 * Parse a bulk script entry and create a test configuration from it
 *
 * @param mixed $script
 */
function ParseBulkScript(&$script, $current_entry = null)
{
    global $test;
    $entry = null;

    if (count($script)) {
        $s = '';
        if (isset($current_entry)) {
            $entry = $current_entry;
        } else {
            $entry = array();
        }
        foreach ($script as $line) {
            if (!strncasecmp($line, 'label=', 6)) {
                $entry['l'] = trim(substr($line, 6));
            } else {
                $s .= $line;
                $s .= "\r\n";
            }
        }

        $entry['u'] = ValidateScript($s, $error);
        if (strlen($entry['u'])) {
            $entry['s'] = $s;
        } else {
            unset($entry);
        }
    }

    return $entry;
}

/**
 * Find the closest location in the list to the destination server
 *
 * @param mixed $url
 */
function GetClosestLocation($url, $browser)
{
    $location = null;
    $locations = parse_ini_file('./settings/closest.ini', true);
    // filter the locations so only those that match the browser are included
    if (count($locations)) {
        foreach ($locations as $name => &$data) {
            if (strlen($browser)) {
                if (
                    !array_key_exists('browsers', $data) ||
                    stripos($data['browsers'], $browser) === false
                ) {
                    unset($locations[$name]);
                }
            } else {
                if (array_key_exists('browsers', $data)) {
                    unset($locations[$name]);
                }
            }
        }
    }
    if (count($locations)) {
        // figure out the IP address of the server
        if (strncasecmp($url, 'http:', 5) && strncasecmp($url, 'https:', 6)) {
            $url = 'https://' . $url;
        }
        $parts = parse_url($url);
        $host = $parts['host'];
        if (strlen($host)) {
            //first see if we have a domain-based match
            $tld = substr($host, strrpos($host, '.'));
            if (strlen($tld)) {
                foreach ($locations as $loc => $pos) {
                    if (array_key_exists('domains', $pos)) {
                        $domains = explode(',', $pos['domains']);
                        foreach ($domains as $d) {
                            if (strcasecmp($tld, ".$d") == 0) {
                                $location = $loc;
                                break 2;
                            }
                        }
                    }
                }
            }
            if (!isset($location)) {
                $ip = gethostbyname($host);
                if (is_file('./lib/maxmind/GeoLiteCity.dat')) {
                    try {
                        require_once('./lib/maxmind/GeoIP.php');
                        $geoip = Net_GeoIP::getInstance('./lib/maxmind/GeoLiteCity.dat', Net_GeoIP::MEMORY_CACHE);
                        if ($geoip) {
                            $host_location = $geoip->lookupLocation($ip);
                            if ($host_location) {
                                $lat = $host_location->latitude;
                                $lng = $host_location->longitude;

                                // calculate the distance to each location and see which is closest
                                $distance = 0;
                                foreach ($locations as $loc => $pos) {
                                    $r = 6371; // km
                                    $dLat = deg2rad($pos['lat'] - $lat);
                                    $dLon = deg2rad($pos['lng'] - $lng);
                                    $a = sin($dLat / 2) * sin($dLat / 2) + sin($dLon / 2) * sin($dLon / 2) * cos(deg2rad($lat)) * cos(deg2rad($pos['lat']));
                                    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
                                    $dist = $r * $c;
                                    if (!isset($location) || $dist < $distance) {
                                        $location = $loc;
                                        $distance = $dist;
                                    }
                                }
                            }
                        }
                    } catch (Exception $e) {
                    }
                }
            }
        }
        if (!isset($location)) {
            foreach ($locations as $loc => $pos) {
                $location = $loc;
                break;
            }
        }
    }
    return $location;
}

/**
 * Automatically create a script if we have test options that need to be translated
 *
 * @param mixed $test
 */
function ProcessTestScript($url, &$test)
{
    $script = null;
    // add the script data (if we're running a script)
    if (isset($test['script']) && strlen($test['script'])) {
        $script = trim($test['script']);
        if (strlen($url)) {
            if (strncasecmp($url, 'http:', 5) && strncasecmp($url, 'https:', 6)) {
                $url = 'https://' . $url;
            }
            $script = str_ireplace('%URL%', $url, $script);
            $parts = parse_url($url);
            $host = $parts['host'];
            if (strlen($host)) {
                $script = str_ireplace('%HOST%', $host, $script);

                $origin = $parts['scheme'] . '://' . $parts['host'];
                if ($parts['port']) {
                    $origin .= ':' . $parts['port'];
                }
                $script = str_ireplace('%ORIGIN%', $origin, $script);
                $script = str_ireplace('%TEST_ID%', $test['id'], $script);
                $script = str_ireplace('%HOST_REGEX%', str_replace('.', '\\.', $host), $script);
                if (stripos($script, '%HOSTR%') !== false) {
                    if (GetRedirect($url, $rhost, $rurl)) {
                        $lines = explode("\r\n", $script);
                        $script = '';
                        foreach ($lines as $line) {
                            if (stripos($line, '%HOSTR%') !== false) {
                                $script .= str_ireplace('%HOSTR%', $host, $line) . "\r\n";
                                $script .= str_ireplace('%HOSTR%', $rhost, $line) . "\r\n";
                            } else {
                                $script .= $line . "\r\n";
                            }
                        }
                    } else {
                        $script = str_ireplace('%HOSTR%', $host, $script);
                    }
                }
            }
        }
    }

    // Handle HTTP Basic Auth
    if ((isset($test['login']) && strlen($test['login'])) || (isset($test['password']) && strlen($test['password']))) {
        $header = "Authorization: Basic " . base64_encode("{$test['login']}:{$test['password']}");
        if (!isset($script) || !strlen($script)) {
            $script = "navigate\t$url";
        }
        $script = "addHeader\t$header\r\n" . $script;
    }
    // Add custom headers
    if (isset($test['customHeaders']) && strlen($test['customHeaders'])) {
        if (!isset($script) || !strlen($script)) {
            $script = "navigate\t$url";
        }
        $headers = preg_split("/\r\n|\n|\r/", $test['customHeaders']);
        $headerCommands = "";
        foreach ($headers as $header) {
            $headerCommands = $headerCommands . "addHeader\t" . $header . "\r\n";
        }
        $script = $headerCommands . $script;
    }
    return $script;
}

/**
 * Break up the supplied command-line string and make sure it isn't using
 * invalid characters that may cause system issues.
 *
 * @param mixed $cmd
 * @param mixed $error
 */
function ValidateCommandLine($cmd, &$error)
{
    if (isset($cmd) && strlen($cmd)) {
        $flags = explode(' ', $cmd);
        if ($flags && is_array($flags) && count($flags)) {
            foreach ($flags as $flag) {
                if (strlen($flag) && !preg_match('/^--(([a-zA-Z0-9\-\.\+=,_< "]+)|((data-reduction-proxy-http-proxies|data-reduction-proxy-config-url|proxy-server|proxy-pac-url|force-fieldtrials|force-fieldtrial-params|trusted-spdy-proxy|origin-to-force-quic-on|oauth2-refresh-token|unsafely-treat-insecure-origin-as-secure|user-data-dir|ignore-certificate-errors-spki-list|enable-features)=[a-zA-Z0-9\-\.\+=,_:\/"%]+))$/', $flag)) {
                    $error = 'Invalid command-line option: "' . htmlspecialchars($flag) . '"';
                }
            }
        }
    }
}

function gen_uuid()
{
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff)
    );
}

function ReportAnalytics(&$test, $testId)
{
    global $usingAPI;
    global $usingApi2;
    global $USER_EMAIL;
    $ga = GetSetting('analytics');

    if (
        $ga && function_exists('curl_init') &&
        isset($test['location']) && strlen($test['location'])
    ) {
        $ip = $_SERVER['REMOTE_ADDR'];
        if (array_key_exists('ip', $test) && strlen($test['ip'])) {
            $ip = $test['ip'];
        }

        $eventName = $usingAPI ? 'API' : 'Manual';
        if ($usingApi2) {
            $eventName = 'API2';
        }

        $data = array(
            'v' => '1',
            'tid' => $ga,
            'cid' => gen_uuid(),
            't' => 'event',
            'ds' => 'web',
            'ec' => 'Test',
            'ea' => $eventName,
            'el' => $test['location'],
            'uip' => $ip,
            'cd1' => $test['mobile'] ? 'MobileEM' : 'Native'
        );

        if (isset($USER_EMAIL)) {
            $data['uid'] = $USER_EMAIL;
        } elseif (isset($test['accountId'])) {
            $data['uid'] = $test['accountId'];
        }

        if (isset($test['url'])) {
            $data['dl'] = $test['url'];
        }
        if (isset($_SERVER['HTTP_HOST']) && isset($_SERVER['PHP_SELF'])) {
            $data['dr'] = getUrlProtocol() . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['PHP_SELF'];
        }

        if (isset($testId)) {
            $data['ti'] = $testId;
        }

        $payload = utf8_encode(http_build_query($data));

        $ua = 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; PTST 2.295)';
        if (isset($_SERVER['HTTP_USER_AGENT']) && strlen($_SERVER['HTTP_USER_AGENT'])) {
            $ua = $_SERVER['HTTP_USER_AGENT'];
        }

        $ga_url = "https://www.google-analytics.com/collect?" . $payload;

        // post the payload to the GA server with a relatively aggressive timeout
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $ga_url);
        curl_setopt($ch, CURLOPT_USERAGENT, $ua);
        curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_DNS_CACHE_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_exec($ch);
        curl_close($ch);
    }
}

function loggedOutLoginForm()
{
    $ret = <<<HTML
<ul class="testerror_login">
    <li><a href="/login">Login</a></li>
    <li><a class="pill" href="/signup">Sign-up</a></li>
</ul>
HTML;

    return $ret;
}

function loggedInPerks()
{
    $msg = <<<HTML
<ul class="testerror_loginperks">
    <li>Access to 13 months of saved tests, making it easier to compare tests and analyze trends.</li>
    <li>Ability to contribute to the <a href="https://forums.webpagetest.org/">WebPageTest Forum</a>.</li>
    <li>Access to upcoming betas and new features that will enhance your WebPageTest experience.</li>
</ul>
HTML;
    return $msg;
}

function CheckRateLimit($test, &$error)
{
    global $USER_EMAIL;
    global $supportsCPAuth;
    global $request_context;

    $ret = true;

    // Only check when we have a valid remote IP
    if (!isset($test['ip']) || $test['ip'] == '127.0.0.1') {
        return true;
    }

    // Allow API tests
    if (isset($test['key'])) {
        return true;
    }

    // let logged-in users pass
    if ($supportsCPAuth && isset($request_context) && !is_null($request_context->getUser())) {
        if ($request_context->getUser()->getEmail()) {
            return true;
        }
    }
    if (isset($USER_EMAIL) && strlen($USER_EMAIL)) {
        return true;
    }

    $total_runs = Util::getRunCount($test['runs'], $test['fvonly'], $test['lighthouse'], $test['type']);
    $monthly_limit = Util::getSetting('rate_limit_anon_monthly') ?: 50;
    $cmrl = new RateLimiter($test['ip'], $monthly_limit);
    $passesMonthly = $cmrl->check($total_runs);

    if (!$passesMonthly) {
        $error = "<p>You've reached the limit for logged-out tests this month, but don't worry! You can keep testing once you log in, which will give you access to other nice features like:</p>";
        $error .= <<<HTML
<script>
    var intervalId = setInterval(function () {
        if(window["_gaq"]) {
            clearInterval(intervalId);
            window["_gaq"].push("_trackEvent", "Error", "RateLimit", "MonthlyLimitHit");
        }
    }, 500);
</script>
HTML;
        $error .= loggedInPerks();
        $error .= loggedOutLoginForm();
        return false;
    }

    // Enforce per-IP rate limits for testing
    $limit = Util::getSetting('rate_limit_anon', null);
    if (isset($limit) && $limit > 0) {
        $cache_key = 'rladdr_' . $test['ip'];
        $count = Cache::fetch($cache_key);
        if (!isset($count)) {
            $count = 0;
        }
        if ($count < $limit) {
            $count += $total_runs;
            Cache::store($cache_key, $count, 1800);
        } else {
            $apiUrl = Util::getSetting('api_url');
            $error = '<p>You\'ve reached the limit for logged-out tests per hour, but don\'t worry! You can keep testing once you log in, which will give you access to other nice features like:</p>';
            $error .= <<<HTML
<script>
    var intervalId = setInterval(function () {
        if(window["_gaq"]) {
            clearInterval(intervalId);
            window["_gaq"].push("_trackEvent", "Error", "RateLimit", "HourlyLimitHit");
        }
    }, 500);
</script>
HTML;

            $error .= loggedInPerks();
            if ($apiUrl) {
                $error .= "<p>And also, if you need to run tests programmatically you might be interested in the <a href='$apiUrl'>WebPageTest API</a></p>";
            }
            $error .= loggedOutLoginForm();
            $ret = false;
        }
    }

    return $ret;
}
