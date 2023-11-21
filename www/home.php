<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
//$REDIRECT_HTTPS = true;
include 'common.inc';

use WebPageTest\Util;
use WebPageTest\Util\SettingsFileReader;
use WebPageTest\Util\Timers;

$Timers = new Timers();
// see if we are overriding the max runs
$max_runs = GetSetting('maxruns', 9);
if (isset($_COOKIE['maxruns']) && (int)$_GET['maxruns'] > 0) {
    $max_runs = (int)$_GET['maxruns'];
}
if (isset($_GET['maxruns'])) {
    $max_runs = (int)$_GET['maxruns'];
    setcookie("maxruns", $max_runs);
}

if ($max_runs <= 0) {
    $max_runs = 9;
}
$headless = false;
if (GetSetting('headless')) {
    $headless = true;
}

$advancedFormDefault = false;
if (isset($_GET['advanced'])) {
    $advancedFormDefault = true;
}
// load the secret key (if there is one)
$secret = GetServerSecret();
if (!isset($secret)) {
    $secret = '';
}
$url = '';
if (isset($req_url)) {
    $url = htmlspecialchars($req_url);
}
$placeholder = 'Enter a website URL...';
$Timers->startTimer('init');
$profiles = SettingsFileReader::ini('profiles.ini', true);
$connectivity = SettingsFileReader::ini('connectivity.ini', true, true);

$mobile_devices = LoadMobileDevices();
$Timers->endTimer('init');
if (isset($_REQUEST['connection']) && isset($connectivity[$_REQUEST['connection']])) {
    // move it to the front of the list
    $insert = $connectivity[$_REQUEST['connection']];
    unset($connectivity[$_REQUEST['connection']]);
    $old = $connectivity;
    $connectivity = array($_REQUEST['connection'] => $insert);
    foreach ($old as $key => $values) {
        $connectivity[$key] = $values;
    }
}

// if they have custom bandwidth stored, remember it
if (isset($_COOKIE['u']) && isset($_COOKIE['d']) && isset($_COOKIE['l'])) {
    $conn = array('label' => 'custom', 'bwIn' => (int)$_COOKIE['d'] * 1000, 'bwOut' => (int)$_COOKIE['u'] * 1000, 'latency' => (int)$_COOKIE['l']);
    if (isset($_COOKIE['p'])) {
        $conn['plr'] = $_COOKIE['p'];
    } else {
        $conn['plr'] = 0;
    }
    $connectivity['custom'] = $conn;
}
$Timers->startTimer('loc');
$locations = LoadLocations();
$loc = ParseLocations($locations);
$Timers->endTimer('loc');

$Timers->startTimer('status');
// Is the user a logged in and paid user?
$is_paid = isset($request_context) && !is_null($request_context->getUser()) && $request_context->getUser()->isPaid();
$is_logged_in = Util::getSetting('cp_auth') && (!is_null($request_context->getClient()) && $request_context->getClient()->isAuthenticated());
$remaining_runs =  (isset($request_context) && !is_null($request_context->getUser())) ? $request_context->getUser()->getRemainingRuns() : 300;
$hasNoRunsLeft = $is_logged_in ? (int)$remaining_runs <= 0 : false;
$Timers->endTimer('status');

header('Server-Timing: ' . $Timers->getTimers());
?>
<!DOCTYPE html>
<html lang="en-us">

<head>
    <title>WebPageTest - Website Performance and Optimization Test</title>
    <?php
    $useScreenshot = true;
    require_once INCLUDES_PATH . '/head.inc';
    ?>
</head>

<?php
$homeclass = "feature-cc";
if (!is_null($request_context->getUser()) && $request_context->getUser()->isPaid() && !isset($req_cc)) {
    $homeclass = "feature-pro";
}
?>

<body class="home <?php echo $homeclass; ?>">
    <?php
    $tab = 'Start Test';
    include 'header.inc';
    ?>
    <?php if (true /* USER NOT LOGGED IN */) { ?>
        </div>

    <?php } /* END USER NOT LOGGED IN IF*/ ?>

    <?php include("home_header.php"); ?>

    <div class="home_content_contain">
        <div class="home_content">
            <?php
            if (!$headless) {
                ?>
                <form name="urlEntry" id="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return ValidateInput(this, <?= $remaining_runs; ?>)">
                    <input type="hidden" name="lighthouseTrace" value="1">
                    <input type="hidden" name="lighthouseScreenshots" value="1">

                    <?php if (isset($req_cc)) {
                        $ccInputState = " checked ";
                        ?>
                        <input type="hidden" name="carbon_control_redirect" value="1">
                    <?php } else {
                        $ccInputState = "";
                    } ?>

                    <?php
                    echo '<input type="hidden" name="vo" value="' . htmlspecialchars($owner) . "\">\n";
                    if (strlen($secret)) {
                        $hashStr = $secret;
                        $hashStr .= $_SERVER['HTTP_USER_AGENT'];
                        $hashStr .= $owner;

                        $now = gmdate('c');
                        echo "<input type=\"hidden\" name=\"vd\" value=\"$now\">\n";
                        $hashStr .= $now;

                        $hmac = sha1($hashStr);
                        echo "<input type=\"hidden\" name=\"vh\" value=\"$hmac\">\n";
                    }
                    if ($privateInstall || $user || $admin || $USER_EMAIL) {
                        if (array_key_exists('iq', $_REQUEST)) {
                            echo '<input type="hidden" name="iq" value="' . htmlspecialchars($_REQUEST['iq']) . "\">\n";
                        }
                        if (array_key_exists('pngss', $_REQUEST)) {
                            echo '<input type="hidden" name="pngss" value="' . htmlspecialchars($_REQUEST['pngss']) . "\">\n";
                        }
                        if (array_key_exists('shard', $_REQUEST)) {
                            echo '<input type="hidden" name="shard" value="' . htmlspecialchars($_REQUEST['shard']) . "\">\n";
                        }
                        if (array_key_exists('discard', $_REQUEST)) {
                            echo '<input type="hidden" name="discard" value="' . htmlspecialchars($_REQUEST['discard']) . "\">\n";
                        }
                        if (array_key_exists('timeout', $_REQUEST)) {
                            echo '<input type="hidden" name="timeout" value="' . htmlspecialchars($_REQUEST['timeout']) . "\">\n";
                        }
                        if (array_key_exists('appendua', $_REQUEST)) {
                            echo '<input type="hidden" name="appendua" value="' . htmlspecialchars($_REQUEST['appendua']) . "\">\n";
                        }
                        if (array_key_exists('keepvideo', $_REQUEST)) {
                            echo '<input type="hidden" name="keepvideo" value="' . htmlspecialchars($_REQUEST['keepvideo']) . "\">\n";
                        }
                        if (array_key_exists('medianMetric', $_REQUEST)) {
                            echo '<input type="hidden" name="medianMetric" value="' . htmlspecialchars($_REQUEST['medianMetric']) . "\">\n";
                        }
                        if (array_key_exists('affinity', $_REQUEST)) {
                            echo '<input type="hidden" name="affinity" value="' . htmlspecialchars($_REQUEST['affinity']) . "\">\n";
                        }
                        if (array_key_exists('tester', $_REQUEST)) {
                            echo '<input type="hidden" name="tester" value="' . htmlspecialchars($_REQUEST['tester']) . "\">\n";
                        }
                        if (array_key_exists('minimal', $_REQUEST)) {
                            echo '<input type="hidden" name="minimal" value="' . htmlspecialchars($_REQUEST['minimal']) . "\">\n";
                        }
                        if (isset($_REQUEST['noopt'])) {
                            echo '<input type="hidden" name="noopt" value="' . htmlspecialchars($_REQUEST['noopt']) . "\">\n";
                        }
                        if (isset($_REQUEST['debug'])) {
                            echo '<input type="hidden" name="debug" value="' . htmlspecialchars($_REQUEST['debug']) . "\">\n";
                        }
                        if (isset($_REQUEST['throttle_cpu'])) {
                            echo '<input type="hidden" name="throttle_cpu" value="' . htmlspecialchars($_REQUEST['throttle_cpu']) . "\">\n";
                        }
                        if (isset($_REQUEST['browser_width'])) {
                            echo '<input type="hidden" name="browser_width" value="' . htmlspecialchars($_REQUEST['browser_width']) . "\">\n";
                        }
                        if (isset($_REQUEST['browser_height'])) {
                            echo '<input type="hidden" name="browser_height" value="' . htmlspecialchars($_REQUEST['browser_height']) . "\">\n";
                        }
                        if (isset($_REQUEST['width'])) {
                            echo '<input type="hidden" name="width" value="' . htmlspecialchars($_REQUEST['width']) . "\">\n";
                        }
                        if (isset($_REQUEST['height'])) {
                            echo '<input type="hidden" name="height" value="' . htmlspecialchars($_REQUEST['height']) . "\">\n";
                        }
                        if (isset($_REQUEST['thumbsize'])) {
                            echo '<input type="hidden" name="thumbsize" value="' . htmlspecialchars($_REQUEST['thumbsize']) . "\">\n";
                        }
                        if (isset($_REQUEST['fps'])) {
                            echo '<input type="hidden" name="fps" value="' . htmlspecialchars($_REQUEST['fps']) . "\">\n";
                        }
                        if (isset($_REQUEST['timeline_fps'])) {
                            echo '<input type="hidden" name="timeline_fps" value="' . htmlspecialchars($_REQUEST['timeline_fps']) . "\">\n";
                        }
                        if (isset($_REQUEST['discard_timeline'])) {
                            echo '<input type="hidden" name="discard_timeline" value="' . htmlspecialchars($_REQUEST['discard_timeline']) . "\">\n";
                        }
                        if (isset($_REQUEST['htmlbody'])) {
                            echo '<input type="hidden" name="htmlbody" value="' . htmlspecialchars($_REQUEST['htmlbody']) . "\">\n";
                        }
                        if (isset($_REQUEST['disable_video'])) {
                            echo '<input type="hidden" name="disable_video" value="' . htmlspecialchars($_REQUEST['disable_video']) . "\">\n";
                        }
                        if (isset($_REQUEST['lighthouseThrottle'])) {
                            echo '<input type="hidden" name="lighthouseThrottle" value="' . htmlspecialchars($_REQUEST['lighthouseThrottle']) . "\">\n";
                        }
                        if (isset($_REQUEST['warmup'])) {
                            echo '<input type="hidden" name="warmup" value="' . htmlspecialchars($_REQUEST['warmup']) . "\">\n";
                        }
                    }
                    ?>
                    <div id="test_box-container" class="home_responsive_test">
                        <?php
                        $currNav = "Site Performance";
                        include("testTypesNav.php");
                        ?>
                        <div id="analytical-review" class="test_box">
                            <ul class="input_fields home_responsive_test_top">
                                <li>
                                    <label for="url" class="vis-hidden">Enter URL to test</label>
                                    <?php

                                    if (isset($_REQUEST['url']) && strlen($_REQUEST['url'])) {
                                        $url = urldecode($_REQUEST['url']);
                                        $url = htmlentities($_REQUEST['url']);
                                        echo "<input type='text' name='url' id='url' inputmode='url' placeholder='$placeholder' value='$url' class='text large' autocorrect='off' autocapitalize='off' onkeypress='if (event.keyCode == 32) {return false;}'>";
                                    } else {
                                        echo "<input type='text' name='url' id='url' inputmode='url' placeholder='$placeholder' class='text large' autocorrect='off' autocapitalize='off' onkeypress='if (event.keyCode == 32) {return false;}'>";
                                    }
                                    ?>
                                </li>
                            </ul>
                            <div class="simpleadvancedfields_contain">
                                <input type="radio" name="simpleadvanced" value="simple" id="simple" <?php echo !$advancedFormDefault ? "checked" : ""; ?>>
                                <label for="simple">Simple Configuration <em> 3 test runs from recommended location and browser presets</em></label>
                                <div class="simpleadvancedfields">
                                    <ul class="input_fields home_responsive_test_top">
                                        <li class="test_main_config">
                                            <div class="test_presets test_presets_easy">
                                                <div class="fieldrow fieldrow-profiles">
                                                    <div class="profiles">
                                                        <?php
                                                        if (isset($profiles) && count($profiles)) {
                                                            $pIndex = 0;
                                                            foreach ($profiles as $name => $profile) {
                                                                $selected = '';
                                                                if ($name == $_COOKIE['testProfile'] || (!$_COOKIE['testProfile'] && $pIndex == 0)) {
                                                                    $selected = 'checked';
                                                                }
                                                                echo "<label class=\"test_preset_profile test_preset_profile-$name\"><input type=\"radio\" name=\"profile\" aria-labelledby=\"tt-$name\" value=\"$name\" $selected><span>{$profile['label']}</span><span role=\"tooltip\" id=\"tt-$name\" class=\"test_preset_profile_tt\">{$profile['description']}</span></label>";
                                                                $pIndex++;
                                                            }
                                                        }
                                                        ?>
                                                    </div>
                                                </div>
                                                <div class="test_presets_easy_checks">
                                                    <div class="fieldrow" id="description"></div>
                                                    <div class="fieldrow">
                                                            <label for="inc-cc-simple"><input type="checkbox" name="carbon_control" id="inc-cc-simple" <?php echo $ccInputState; ?> class="checkbox"> Run Carbon Control <small>(Experimental: Measures carbon footprint. <em>Chromium browsers only</em>).</small></label>
                                                    </div>
                                                    <div class="fieldrow">
                                                        <label for="rv"><input type="checkbox" name="rv" id="rv" class="checkbox" onclick="rvChanged()"> Include Repeat View <small>(Loads the page, closes the browser and then loads the page again)</small></label>
                                                    </div>
                                                    <div class="fieldrow">
                                                        <label for="lighthouse-simple"><input type="checkbox" name="lighthouse" id="lighthouse-simple" class="checkbox"> Run Lighthouse Audit <small>(Runs on Chrome, emulated Moto G4 device, over simulated 3G Fast or 4G Fast connection)</small></label>
                                                        <script>
                                                            // show or hide simple lighthouse and cc fields depending on whether chrome test is running
                                                            let simplePresets = document.querySelector('.test_presets_easy');
                                                            let lhSimpleFields = document.querySelector('[for=lighthouse-simple]');
                                                            let ccSimpleField = document.querySelector('[for=inc-cc-simple]');
                                                            let lhSimpleCheck = lhSimpleFields.querySelector('input');
                                                            function enableDisableLHSimple(){
                                                              let checkedPreset = simplePresets.querySelector('input[type=radio]:checked');
                                                              if(checkedPreset.parentElement.querySelector('img[alt*="chrome"]') || checkedPreset.parentElement.querySelector('img[alt*="edge"]')){
                                                                  ccSimpleField.style.display = "block";
                                                                  lhSimpleFields.style.display = "block";
                                                                  lhSimpleCheck.disabled = false;
                                                              } else {
                                                                  ccSimpleField.style.display = "none";
                                                                  lhSimpleFields.style.display = "none";
                                                                  lhSimpleCheck.disabled = true;
                                                              }
                                                            }
                                                            enableDisableLHSimple();
                                                            simplePresets.addEventListener("click", enableDisableLHSimple);
                                                        </script>
                                                    </div>
                                                    <?php if ($is_paid) : ?>
                                                        <div class="fieldrow">
                                                            <label for="private-simple"><input type="checkbox" name="private" id="private-simple" class="checkbox"> Make Test Private <small>Private tests are only visible to your account</small></label>
                                                        </div>
                                                    <?php endif; ?>

                                                </div>
                                                <div class="test_presets_easy_submit">
                                                    <?php if ($is_logged_in) : ?>
                                                        <small class="test_runs <?= $hasNoRunsLeft  ? 'test_runs-warn' : ''; ?>"><span><?= $remaining_runs; ?> Runs Left</span> | <a href="/account">Upgrade</a></small>
                                                    <?php endif; ?>
                                                    <input type="submit" name="submit" value="Start Test &#8594;" class="start_test" <?= $hasNoRunsLeft ? 'aria-disabled disabled' : ''; ?>>
                                                </div>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div class="simpleadvancedfields_contain">
                                <input type="radio" name="simpleadvanced" value="advanced" id="advanced" <?php echo $advancedFormDefault ? "checked" : ""; ?>>
                                <label for="advanced">Advanced Configuration <em>Choose from all browser, location, &amp; device options</em></label>
                                <div class="simpleadvancedfields">
                                    <ul class="input_fields home_responsive_test_top">
                                        <li class="test_main_config">
                                            <div class="test_presets">
                                                <div class="fieldrow">
                                                    <label for="location">Test Location</label>
                                                    <select name="where" id="location">
                                                        <?php
                                                        $lastGroup = null;
                                                        foreach ($loc['locations'] as &$location) {
                                                            $selected = '';
                                                            if (isset($location['checked']) && $location['checked']) {
                                                                $selected = 'selected';
                                                            }
                                                            if (array_key_exists('group', $location) && $location['group'] != $lastGroup) {
                                                                if (isset($lastGroup)) {
                                                                    echo "</optgroup>";
                                                                }
                                                                if (strlen($location['group'])) {
                                                                    $lastGroup = $location['group'];
                                                                    echo "<optgroup label=\"" . htmlspecialchars($lastGroup) . "\">";
                                                                } else {
                                                                    $lastGroup = null;
                                                                }
                                                            }

                                                            echo "<option value=\"{$location['name']}\" $selected>{$location['label']}</option>";
                                                        }
                                                        if (isset($lastGroup)) {
                                                            echo "</optgroup>";
                                                        }
                                                        ?>
                                                    </select>
                                                    <?php if (GetSetting('map')) { ?>
                                                        <button id="change-location-btn" type=button onclick="SelectLocation();" title="Select from Map">Select from Map</button>
                                                    <?php } ?>
                                                </div>
                                                <div class="fieldrow">
                                                    <label for="browser">Browser</label>
                                                    <select name="browser" id="browser">
                                                        <?php
                                                        // Group the browsers by type
                                                        $browser_groups = array();
                                                        $ungrouped = array();
                                                        foreach ($loc['browsers'] as $key => $browser) {
                                                            if (isset($browser['group'])) {
                                                                if (!isset($browser_groups[$browser['group']])) {
                                                                    $browser_groups[$browser['group']] = array();
                                                                }
                                                                $browser_groups[$browser['group']][] = $browser;
                                                            } else {
                                                                $ungrouped[] = $browser;
                                                            }
                                                        }
                                                        foreach ($ungrouped as $browser) {
                                                            $selected = '';
                                                            if (isset($browser['selected']) && $browser['selected']) {
                                                                $selected = 'selected';
                                                            }
                                                            echo "<option value=\"{$browser['key']}\" $selected>{$browser['label']}</option>\n";
                                                        }
                                                        foreach ($browser_groups as $group => $browsers) {
                                                            echo "<optgroup label=\"" . htmlspecialchars($group) . "\">";
                                                            foreach ($browsers as $browser) {
                                                                $selected = '';
                                                                if (isset($browser['selected']) && $browser['selected']) {
                                                                    $selected = 'selected';
                                                                }
                                                                echo "<option value=\"{$browser['key']}\" $selected>{$browser['label']}</option>\n";
                                                            }
                                                            echo "</optgroup>";
                                                        }
                                                        ?>
                                                    </select>
                                                    <span class="pending_tests hidden" id="pending_tests"><span id="backlog">0</span> Pending Tests</span>
                                                    <span class="cleared"></span>
                                                </div>

                                            </div>
                                            <div>
                                                <?php if ($is_logged_in) : ?>
                                                    <small class="test_runs <?= $hasNoRunsLeft  ? 'test_runs-warn' : ''; ?>"><span><?= $remaining_runs; ?> Runs Left</span> | <a href="/account">Upgrade</a></small>
                                                <?php endif; ?>
                                                <input type="submit" name="submit" value="Start Test &#8594;" class="start_test" <?= $hasNoRunsLeft ? 'aria-disabled disabled' : ''; ?>>

                                            </div>
                                        </li>
                                    </ul>
                                    <?php if (GetSetting('multi_locations')) { ?>
                                        <a href="javascript:OpenMultipleLocations()">
                                            <font color="white">Multiple locations/browsers?</font>
                                        </a>
                                        <br>
                                        <div id="multiple-location-dialog" align=center style="display: none; color: white;">
                                            <p>
                                                <select name="multiple_locations[]" multiple id="multiple_locations[]">
                                                    <?php
                                                    foreach ($locations as $key => &$location_value) {
                                                        if (isset($location_value['browser'])) {
                                                            echo "<option value=\"{$key}\" $selected>{$location_value['label']}</option>";
                                                        }
                                                    }
                                                    ?>
                                                </select>
                                                <a href='javascript:CloseMultipleLocations()'>
                                                    <font color="white">Ok</font>
                                                </a>
                                            </p>
                                        </div>
                                        <br>
                                    <?php } ?>
                                    <?php
                                    if (isset($_COOKIE["as"]) && (int)$_COOKIE["as"]) {
                                        echo '<div id="advanced_settings-container">';
                                    } else {
                                        echo '<div id="advanced_settings-container">';
                                    }
                                    ?>

                                    <div id="test_subbox-container">
                                        <ul class="ui-tabs-nav ui-tabs-nav-advanced">
                                            <li><a href="#test-settings" id="ui-tab-settings">Test Settings</a></li>
                                            <li><a href="#advanced-settings" id="ui-tab-advanced">Advanced</a></li>
                                            <li><a href="#advanced-chrome" id="ui-tab-chromium">Chromium</a></li>
                                            <?php if (!GetSetting('no_basic_auth_ui') || isset($_GET['auth'])) { ?>
                                                <li><a href="#auth" id="ui-tab-auth">Auth</a></li>
                                            <?php } ?>
                                            <li><a href="#script" id="ui-tab-script">Script</a></li>
                                            <li><a href="#block" id="ui-tab-block">Block</a></li>
                                            <li><a href="#spof" id="ui-tab-spof">SPOF</a></li>
                                            <li><a href="#custom-metrics" id="ui-tab-custom-metrics">Custom</a></li>
                                            <?php if (ShowBulk()) { ?>
                                                <li><a href="#bulk" id="ui-tab-bulk">Bulk Testing</a></li>
                                            <?php } ?>
                                        </ul>
                                        <div id="test-settings" class="test_subbox">
                                            <ul class="input_fields">
                                                <li>
                                                    <label for="connection">Connection</label>
                                                    <select name="location" id="connection">
                                                        <?php
                                                        foreach ($loc['connections'] as $key => &$connection) {
                                                            $selected = '';
                                                            if (isset($connection['selected']) && $connection['selected']) {
                                                                $selected = 'selected';
                                                            }
                                                            echo "<option value=\"{$connection['key']}\" $selected>{$connection['label']}</option>\n";
                                                        }
                                                        ?>
                                                    </select>
                                                    <br>
                                                    <table class="configuration hidden" id="bwTable">
                                                        <tr>
                                                            <th><label for="bwDown">BW Down</label></th>
                                                            <th><label for="bwUp">BW Up</label></th>
                                                            <th><label for="latency">Latency</label></th>
                                                            <th><label for="plr">Packet Loss</label></th>
                                                        </tr>
                                                        <tr>
                                                            <?php
                                                            echo '<td class="value"><input id="bwDown" type="text" name="bwDown" style="width:3em; text-align: right;" value="' . $loc['bandwidth']['down'] . '"> Kbps</td>';
                                                            echo '<td class="value"><input id="bwUp" type="text" name="bwUp" style="width:3em; text-align: right;" value="' . $loc['bandwidth']['up'] . '"> Kbps</td>';
                                                            echo '<td class="value"><input id="latency" type="text" name="latency" style="width:3em; text-align: right;" value="' . $loc['bandwidth']['latency'] . '"> ms</td>';
                                                            echo '<td class="value"><input id="plr" type="text" name="plr" style="width:3em; text-align: right;" value="' . $loc['bandwidth']['plr'] . '"> %</td>';
                                                            ?>
                                                        </tr>
                                                    </table>
                                                </li>
                                                <li>
                                                    <label for="resolution">Desktop Browser Dimensions</label>
                                                    <select name="resolution" id="resolution">
                                                        <?php
                                                        $default_dimensions = GetSetting('default_browser_size', false);
                                                        if ($default_dimensions === false) {
                                                            $default_dimensions = "1366x768";
                                                        }
                                                        echo "<option value=\"default\" selected>default ($default_dimensions)</option>\n";
                                                        $resolutions = GetSetting('resolutions', '1024x768,1280x720,1280x1024,1366x768,1440x900,1600x900,1920x1080,1920x1200');
                                                        $res = explode(',', $resolutions);
                                                        foreach ($res as $r) {
                                                            echo "<option value=\"$r\">$r</option>\n";
                                                        }
                                                        ?>
                                                    </select>
                                                </li>
                                                <li>
                                                    <label for="number_of_tests">
                                                        Number of Tests to Run
                                                    </label>
                                                    <?php
                                                    $runs = 3;
                                                    if (isset($_COOKIE["runs"])) {
                                                        $runs = (int)@$_COOKIE["runs"];
                                                    }
                                                    if (isset($_REQUEST["runs"])) {
                                                        $runs = (int)@$_REQUEST["runs"];
                                                    }
                                                    if (isset($req_runs)) {
                                                        $runs = (int)$req_runs;
                                                    }
                                                    $runs = max(1, min($runs, $max_runs));
                                                    ?>
                                                    <select id="number_of_tests" class="text short" name="runs" value=<?php echo "\"$runs\""; ?> required>
                                                        <?php
                                                        for ($i = 1; $i <= $max_runs; $i++) {
                                                            echo '<option value="' . $i . '"' . ($i === $runs ? ' selected' : '') . '>' . $i . '</option>';
                                                        }
                                                        ?>
                                                    </select>
                                                </li>
                                                <li>
                                                    <fieldset>
                                                        <legend>Repeat View</legend>
                                                        <?php
                                                        $fvOnly = true;
                                                        if (isset($_COOKIE["testOptions"])) {
                                                            $fvOnly = (int)@$_COOKIE["testOptions"] & 2;
                                                        }
                                                        if (isset($_REQUEST['fvonly'])) {
                                                            $fvOnly = (int)$_REQUEST['fvonly'];
                                                        }
                                                        ?>
                                                        <label for="viewBoth"><input id="viewBoth" type="radio" name="fvonly" <?php if (!$fvOnly) {
                                                                                                                                    echo 'checked=checked';
                                                                                                                              } ?> value="0">First View and Repeat View</label>
                                                        <label for="viewFirst"><input id="viewFirst" type="radio" name="fvonly" <?php if ($fvOnly) {
                                                                                                                                    echo 'checked=checked';
                                                                                                                                } ?> value="1">First View Only</label>
                                                    </fieldset>
                                                </li>
                                                <?php if ($is_paid) : ?>
                                                    <li>
                                                        <label for="private-advanced"><input type="checkbox" name="private" id="private-advanced" class="checkbox"> Make Test Private</label>
                                                    </li>
                                                <?php endif; ?>
                                                <li>
                                                    <label for="label">Label</label>
                                                    <?php
                                                    $label = '';
                                                    if (array_key_exists('label', $_REQUEST)) {
                                                        $label = htmlspecialchars($_REQUEST['label']);
                                                    }
                                                    echo "<input type=\"text\" name=\"label\" id=\"label\" value=\"$label\">\n";
                                                    ?>
                                                </li>
                                            </ul>
                                        </div>
                                        <div id="advanced-settings" class="test_subbox ui-tabs-hide">
                                            <ul class="input_fields">
                                                <li><label for="stop_test_at_document_complete" class="auto_width">
                                                        <input type="checkbox" name="web10" id="stop_test_at_document_complete" class="checkbox before_label">
                                                        Stop Test at Document Complete<br>
                                                        <small>Typically, tests run until all activity stops.</small>
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="ignore_ssl_cerificate_errors" class="auto_width">
                                                        <input type="checkbox" name="ignoreSSL" id="ignore_ssl_cerificate_errors" class="checkbox" style="float: left;width: auto;">
                                                        Ignore SSL Certificate Errors<br>
                                                        <small>e.g. Name mismatch, Self-signed certificates, etc.</small>
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="tcpdump" class="auto_width">
                                                        <input type="checkbox" name="tcpdump" id="tcpdump" class="checkbox" style="float: left;width: auto;">
                                                        Capture network packet trace (tcpdump)
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="bodies" class="auto_width">
                                                        <input type="checkbox" name="bodies" id="bodies" class="checkbox" style="float: left;width: auto;">
                                                        Save response bodies<br>
                                                        <small>For text resources (HTML, CSS, etc.)</small>
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="keepua" class="auto_width">
                                                        <?php
                                                        $checked = '';
                                                        if (GetSetting('keepua') || (array_key_exists('keepua', $_REQUEST) && $_REQUEST['keepua'])) {
                                                            $checked = ' checked=checked';
                                                        }
                                                        echo "<input type=\"checkbox\" name=\"keepua\" id=\"keepua\" class=\"checkbox\" style=\"float: left;width: auto;\"$checked>\n";
                                                        ?>
                                                        Preserve original User Agent string<br>
                                                        <small>Do not add PTST to the browser UA string</small>
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="uastring">
                                                        User Agent String<br>
                                                        <small>(Custom UA String)</small>
                                                    </label>
                                                    <input type="text" name="uastring" id="uastring" class="text" style="width: 350px;">
                                                </li>
                                                <li>
                                                    <label for="appendua">
                                                        Append to UA String
                                                    </label>
                                                    <input type="text" name="appendua" id="appendua" class="text" style="width: 350px;">
                                                </li>
                                                <li>
                                                    <input type="checkbox" name="disableAVIF" id="disableAVIF" class="checkbox" style="float: left;width: auto;">
                                                    <label for="disableAVIF" class="auto_width">Disable AVIF image support<br />
                                                        <small>Firefox and Chromium-based browsers only</small>
                                                    </label>
                                                </li>
                                                <li>
                                                    <input type="checkbox" name="disableWEBP" id="disableWEBP" class="checkbox" style="float: left;width: auto;">
                                                    <label for="disableWEBP" class="auto_width">Disable WEBP image support<br />
                                                        <small>Firefox and Chromium-based browsers only</small>
                                                    </label>
                                                </li>
                                                <li>
                                                    <input type="checkbox" name="disableJXL" id="disableJXL" class="checkbox" style="float: left;width: auto;">
                                                    <label for="disableJXL" class="auto_width">Disable JPEG XL image support<br />
                                                        <small>Firefox and Chromium-based browsers only</small>
                                                    </label>
                                                </li>
                                                <?php if (GetSetting('fullSizeVideoOn')) { ?>
                                                    <li>
                                                        <label for="full_size_video" class="auto_width">
                                                            <input type="checkbox" name="fullsizevideo" id="full_size_video" class="checkbox" <?php if (GetSetting('fullSizeVideoDefault')) {
                                                                                                                                                    echo 'checked=checked';
                                                                                                                                              } ?> style="float: left;width: auto;">
                                                            Capture Full Size Video<br>
                                                            <small>Enables full size screenshots in the filmstrip</small>
                                                        </label>
                                                <?php } ?>
                                                    <li>
                                                        <label for="time">
                                                            Minimum test duration<br>
                                                            <small>Capture data for at least...</small>
                                                        </label>
                                                        <input id="time" type="number" class="text short" name="time" min="1" value=""> seconds
                                                    </li>
                                                    <li>
                                                        <label for="customHeaders" class="full">Custom headers</label>
                                                        <small>
                                                            Add custom headers to all network requests emitted from the browser
                                                            (type in or read <label for="customHeaders_file" class="linklike">from a text file</label>)
                                                        </small>
                                                        <input type="file" id="customHeaders_file" accept="text/*" class="a11y-hidden">
                                                        <script>
                                                            document.addEventListener('DOMContentLoaded', () => initFileReader('customHeaders_file', 'customHeaders'));
                                                        </script>
                                                        <textarea id="customHeaders" type="text" class="text" name="customHeaders" value=""></textarea>
                                                    </li>
                                                    <li>
                                                        <label for="injectScript" class="full">Inject Script</label>
                                                        <small>JavaScript to run after the document has started loading
                                                            (type in or read <label for="injectScript_file" class="linklike">from a text file</label>)
                                                        </small>
                                                        <input type="file" id="injectScript_file" accept="text/*" class="a11y-hidden">
                                                        <script>
                                                            document.addEventListener('DOMContentLoaded', () => initFileReader('injectScript_file', 'injectScript'));
                                                        </script>
                                                        </label>
                                                        <textarea class="large" id="injectScript" type="text" class="text" name="injectScript" value=""></textarea>
                                                    </li>
                                                    <li>
                                                        <input type="checkbox" name="injectScriptAllFrames" id="injectScriptAllFrames" class="checkbox" style="float: left;width: auto;">
                                                        <label for="injectScriptAllFrames" class="auto_width">Inject script into all frames and run before any page scripts run (Chrome-only)</label>
                                                    </li>

                                            </ul>
                                        </div>
                                        <div id="advanced-chrome" class="test_subbox ui-tabs-hide">
                                            <ul class="input_fields">
                                                <li>
                                                    <label for="inc-cc-advanced"><input type="checkbox" name="carbon_control" id="inc-cc-advanced"  <?php echo $ccInputState; ?> class="checkbox">Run Carbon Control <small>(Experimental: Measures carbon footprint.)</small></label>
                                                </li>
                                                <li>
                                                    <label for="lighthouse-advanced" class="auto_width">
                                                        <input type="checkbox" name="lighthouse" id="lighthouse-advanced" class="checkbox" style="float: left;width: auto;"> Run Lighthouse Audit <small>(Uses a "3G Fast" connection for mobile or "4G Fast" connection for desktop independent of test settings)</small>
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="timeline" class="auto_width">
                                                        <input type="checkbox" name="timeline" id="timeline" class="checkbox" checked=checked style="float: left;width: auto;">
                                                        Capture Dev Tools Timeline
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="profiler" class="auto_width">
                                                        <input type="checkbox" name="profiler" id="profiler" class="checkbox" style="float: left;width: auto;">
                                                        Enable v8 Sampling Profiler (much larger traces)
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="v8rcs" class="auto_width">
                                                        <input type="checkbox" name="v8rcs" id="v8rcs" class="checkbox" style="float: left;width: auto;">
                                                        Capture <a href="https://v8.dev/docs/rcs" target="_blank" rel="noopener">V8 Runtime Call Stats</a>
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="trace" class="auto_width">
                                                        <input type="checkbox" name="trace" id="trace" class="checkbox" style="float: left;width: auto;">
                                                        Capture Chrome Trace (about://tracing)
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="traceCategories">
                                                        Trace Categories<br>
                                                        <small>(when tracing is enabled)</small>
                                                    </label>
                                                    <input type="text" name="traceCategories" id="traceCategories" class="text" style="width: 400px;" value="blink,v8,cc,gpu,blink.net,netlog,disabled-by-default-v8.runtime_stats" autocomplete="off">
                                                </li>
                                                <li>
                                                    <label for="netlog" class="auto_width">
                                                        <input type="checkbox" name="netlog" id="netlog" class="checkbox" style="float: left;width: auto;">
                                                        Capture Network Log
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="dataReduction" class="auto_width">
                                                        <input type="checkbox" name="dataReduction" id="dataReduction" class="checkbox" style="float: left;width: auto;">
                                                        Enable Data Reduction<br>
                                                        <small>Chrome 34+ on Android</small>
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="dtShaper" class="auto_width"><input type="checkbox" name="dtShaper" id="dtShaper" class="checkbox"> Use Chrome dev tools traffic-shaping (not recommended)</label>
                                                </li>
                                                <?php
                                                if ($admin && GetSetting('wprDesktop')) {
                                                    ?>
                                                    <li>

                                                        <label for="wprDesktop" class="auto_width">
                                                            <input type="checkbox" name="wprDesktop" id="wprDesktop" class="checkbox" style="float: left;width: auto;">
                                                            Use Web Page Replay-recorded Desktop Page<br>
                                                            <small>Limited list of available <a href="/wprDesktop.txt">URLs</a></small>
                                                        </label>
                                                    </li>
                                                    <?php
                                                }
                                                if ($admin && GetSetting('wprMobile')) {
                                                    ?>
                                                    <li>
                                                        <label for="wprMobile" class="auto_width">
                                                            <input type="checkbox" name="wprMobile" id="wprMobile" class="checkbox">
                                                            Use Web Page Replay recorded Mobile Page<br>
                                                            <small>Limited list of available <a href="/wprMobile.txt">URLs</a></small>
                                                        </label>
                                                    </li>
                                                    <?php
                                                }
                                                ?>
                                                <li>
                                                    <label for="hostResolverRules">
                                                        <a href="https://peter.sh/experiments/chromium-command-line-switches/#host-resolver-rules" target="_blank" rel="noopener">Host Resolver Rules</a><br>
                                                        <small>i.e. MAP * 1.2.3.4</small>
                                                    </label>
                                                    <input type="text" name="hostResolverRules" id="hostResolverRules" class="text" style="width: 400px;" autocomplete="off">
                                                </li>
                                                <li>
                                                    <label for="cmdline">
                                                        Command-line<br>
                                                        <small>Custom options</small>
                                                    </label>
                                                    <input type="text" name="cmdline" id="cmdline" class="text" style="width: 400px;" autocomplete="off">
                                                </li>
                                                <?php
                                                $extensions = SettingsFileReader::getExtensions();
                                                if ($extensions) {
                                                    ?>
                                                    <li>
                                                        <label for="extensions">
                                                            Enable extension<br>
                                                        </label>
                                                        <select name="extensions" id="extensions">
                                                            <option>Pick an extension...</option>
                                                            <?php
                                                            foreach ($extensions as $id => $name) {
                                                                echo '<option value="' . $id . '">' . htmlspecialchars($name) . '</option>';
                                                            }
                                                            ?>
                                                            <select>
                                                    </li>
                                                    <?php
                                                }
                                                ?>
                                            </ul>
                                        </div>
                                        <?php if (!GetSetting('no_basic_auth_ui') || isset($_GET['auth'])) { ?>
                                            <div id="auth" class="test_subbox ui-tabs-hide">


                                                <ul class="input_fields">
                                                    <li>
                                                        HTTP Basic Authentication
                                                    </li>
                                                    <li>
                                                        <label for="username">Username</label>
                                                        <input type="text" name="login" id="username" class="text" autocomplete="off">
                                                    </li>
                                                    <li>
                                                        <label for="password">Password</label>
                                                        <input type="text" name="password" id="password" autocomplete="off" class="text" autocomplete="off">
                                                    </li>
                                                </ul>
                                                <div class="notification-container">
                                                    <div class="notification">
                                                        <div class="warning">PLEASE USE A TEST ACCOUNT! as your credentials may be available to anyone viewing the results.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        <?php } ?>
                                        <div id="script" class="test_subbox ui-tabs-hide">
                                            <div>
                                                <p>
                                                    <label for="enter_script">Enter Script</label>
                                                    <small>
                                                        (or read it <label for="script_file" class="linklike">from a text file</label>). Lighthouse does not perform per step reports for custom scripting, but will run a report on the final step
                                                    </small>
                                                    <input type="file" id="script_file" accept="text/*" class="a11y-hidden">
                                                    <script>
                                                        document.addEventListener('DOMContentLoaded', () => initFileReader('script_file', 'enter_script'));
                                                    </script>
                                                </p>
                                                <?php
                                                $script = '';
                                                if (array_key_exists('script', $_REQUEST)) {
                                                    $script = htmlspecialchars($_REQUEST['script']);
                                                }
                                                ?>
                                                <textarea class="large" name="script" id="enter_script" cols="0" rows="0"><?php echo $script; ?></textarea>
                                            </div>
                                            <br>
                                            <ul class="input_fields">
                                                <li>
                                                    <label for="sensitive" class="auto_width">
                                                        <input type="checkbox" name="sensitive" id="sensitive" class="checkbox" style="float: left;width: auto;">
                                                        Script includes sensitive data<br><small>The script will be discarded and the HTTP headers will not be available in the results</small>
                                                    </label>
                                                </li>
                                                <li>
                                                    <label for="noheaders" class="auto_width">
                                                        <input type="checkbox" name="noheaders" id="noheaders" class="checkbox" style="float: left;width: auto;">
                                                        Discard all HTTP headers
                                                    </label>
                                                </li>
                                            </ul>
                                            <div class="notification-container">
                                                <div class="notification">
                                                    <div class="message">
                                                        Check out <a href="https://docs.webpagetest.org/scripting/" target="_blank" rel="noopener">the documentation</a> for more information on this feature
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div id="block" class="test_subbox ui-tabs-hide">
                                            <p>
                                                <label for="block_requests_containing" class="full_width">
                                                    Block Requests Containing (URL substrings)...
                                                </label>
                                                <small>Space-separated list
                                                    (type in or read <label for="block_requests_containing_file" class="linklike">from a text file</label>)
                                                </small>
                                                <input type="file" id="block_requests_containing_file" accept="text/*" class="a11y-hidden">
                                                <script>
                                                    document.addEventListener('DOMContentLoaded', () => initFileReader('block_requests_containing_file', 'block_requests_containing'));
                                                </script>
                                                <textarea name="block" id="block_requests_containing" cols="0" rows="0"></textarea>
                                            </p>
                                            <p>
                                                <label for="block_domains" class="full_width">Block Domains (full host names)...</label>
                                                <small>Space-separated list of domains
                                                    (type in or read <label for="block_domains_file" class="linklike">from a text file</label>)
                                                </small>
                                                <input type="file" id="block_domains_file" accept="text/*" class="a11y-hidden">
                                                <script>
                                                    document.addEventListener('DOMContentLoaded', () => initFileReader('block_domains_file', 'block_domains'));
                                                </script>
                                                <textarea name="blockDomains" id="block_domains" cols="0" rows="0"></textarea>
                                            </p>
                                        </div>
                                        <div id="spof" class="test_subbox ui-tabs-hide">
                                            <p>
                                                Simulate failure of specified domains. This is done by re-routing all requests for
                                                the domains to <a href="https://blog.patrickmeenan.com/2011/10/testing-for-frontend-spof.html" target="_blank" rel="noopener">blackhole.webpagetest.org</a> which will silently drop all requests.
                                            </p>
                                            <p>
                                                <label for="spof_hosts" class="full_width">
                                                    Hosts to fail (one host per line)...
                                                </label>
                                                <small>
                                                    Type in or read <label for="spof_hosts_file" class="linklike">from a text file</label>
                                                </small>
                                                <input type="file" id="spof_hosts_file" accept="text/*" class="a11y-hidden">
                                                <script>
                                                    document.addEventListener('DOMContentLoaded', () => initFileReader('spof_hosts_file', 'spof_hosts'));
                                                </script>
                                            </p>
                                            <textarea name="spof" id="spof_hosts" cols="0" rows="0"><?php
                                            if (array_key_exists('spof', $_REQUEST)) {
                                                echo htmlspecialchars(str_replace(',', "\r\n", $_REQUEST['spof']));
                                            }
                                            ?></textarea>
                                        </div>

                                        <div id="custom-metrics" class="test_subbox ui-tabs-hide">
                                            <div>
                                                <p>
                                                    <label for="custom" class="full_width">Custom Metrics:</label>
                                                    <small>
                                                        Type in or read <label for="custom_metrics_file" class="linklike">from a text file</label>
                                                    </small>
                                                    <input type="file" id="custom_metrics_file" accept="text/*" class="a11y-hidden">
                                                    <script>
                                                        document.addEventListener('DOMContentLoaded', () => initFileReader('custom_metrics_file', 'custom'));
                                                    </script>
                                                </p>
                                                <textarea name="custom" class="large" id="custom" cols="0" rows="0" placeholder="[metricname]\nreturn code;"></textarea>
                                            </div>
                                            <div class="notification-container">
                                                <div class="notification">
                                                    <div class="message">
                                                        See <a href="https://docs.webpagetest.org/custom-metrics/" target="_blank" rel="noopener">the documentation</a> for details on how to specify custom metrics to be captured.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <?php if (ShowBulk()) { ?>
                                            <div id="bulk" class="test_subbox ui-tabs-hide">
                                                <p>
                                                    <label for="bulkurls" class="full_width">
                                                        List of URLs to test (one URL per line)...
                                                    </label>
                                                    <small>
                                                        Type in or read <label for="bulkurls_file" class="linklike">from a text file</label>
                                                    </small>
                                                    <input type="file" id="bulkurls_file" accept="text/*" class="a11y-hidden">
                                                    <script>
                                                        document.addEventListener('DOMContentLoaded', () => initFileReader('bulkurls_file', 'bulkurls'));
                                                    </script>
                                                </p>
                                                <textarea class="large" name="bulkurls" id="bulkurls" cols="0" rows="0"></textarea><br>
                                            </div>
                                        <?php } ?>
                                    </div>
                                </div>
                            </div>
                            <div id="location-dialog" style="display:none;">
                                <h3>Select Test Location</h3>
                                <div id="map">
                                </div>
                                <p>
                                    <select id="location2">
                                        <?php
                                        $lastGroup = null;
                                        foreach ($loc['locations'] as &$location) {
                                            $selected = '';
                                            if (isset($location['checked']) && $location['checked']) {
                                                $selected = 'selected';
                                            }

                                            if (array_key_exists('group', $location) && $location['group'] != $lastGroup) {
                                                if (isset($lastGroup)) {
                                                    echo "</optgroup>";
                                                }
                                                if (strlen($location['group'])) {
                                                    $lastGroup = $location['group'];
                                                    echo "<optgroup label=\"" . htmlspecialchars($lastGroup) . "\">";
                                                } else {
                                                    $lastGroup = null;
                                                }
                                            }

                                            echo "<option value=\"{$location['name']}\" $selected>{$location['label']}</option>";
                                        }
                                        if (isset($lastGroup)) {
                                            echo "</optgroup>";
                                        }
                                        ?>
                                    </select>
                                    <input id="location-ok" type=button class="simplemodal-close" value="OK">
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
                <?php
                if (is_file('settings/intro.inc')) {
                    include('settings/intro.inc');
                }
            } // $headless
            ?>
            <div class="home_content_contain">
                <div class="home_content">
                    <?php
                    include(INCLUDES_PATH . '/include/home-subsections.inc');
                    ?>
                </div>
                <!--home_content_contain-->
            </div>
            <!--home_content-->
            <?php include('footer.inc'); ?>
        </div>
    </div>
    <!--home_content_contain-->
    </div>
    <!--home_content-->

    <script>
        <?php
        echo "var maxRuns = $max_runs;\n";
        echo "var locations = " . json_encode($locations) . ";\n";
        echo "var connectivity = " . json_encode($connectivity) . ";\n";
        if (isset($mobile_devices)) {
            echo "var mobileDevices = " . json_encode($mobile_devices) . ";\n";
        } else {
            echo "var mobileDevices = {};\n";
        }
        $maps_api_key = GetSetting('maps_api_key');
        if ($maps_api_key) {
            echo "var mapsApiKey = '$maps_api_key';";
        }

        if (isset($_REQUEST['force']) && $_REQUEST['force']) {
            echo "var forgetSettings = true;\n";
        } else {
            echo "var forgetSettings = false;\n";
        }
        ?>
    </script>
    <script src="<?php echo $GLOBALS['cdnPath']; ?>/assets/js/test.js?v=<?php echo VER_JS_TEST; ?>"></script>
</body>

</html>
<?php
/**
 * Load the location information
 *
 */
function LoadLocations()
{
    global $request_context;
    global $admin;
    $isPaid =  !is_null($request_context->getUser()) && $request_context->getUser()->isPaid();
    $includePaid = $isPaid || $admin;
    $ui_priority = !is_null($request_context->getUser()) ? $request_context->getUser()->getUserPriority() : 0;

    $locations = LoadLocationsIni();
    FilterLocations($locations, $includePaid);

    // strip out any sensitive information
    foreach ($locations as &$loc) {
        // count the number of tests at each location
        if (isset($loc['scheduler_node'])) {
            $queues = GetQueueLengths($loc['location']);
            if (isset($queues) && is_array($queues) && isset($queues[0])) {
                // Sum up the queue lengths for anything higher priority than the UI priority
                $loc['backlog'] = 0;
                for ($p = 0; $p <= $ui_priority; $p++) {
                    if (isset($queues[$p])) {
                        $loc['backlog'] += $queues[$p];
                    }
                }
            }
        } elseif (isset($loc['localDir'])) {
            $loc['backlog'] = CountTests($loc['localDir']);
        }
        if (isset($loc['localDir'])) {
            unset($loc['localDir']);
        }

        if (isset($loc['key'])) {
            unset($loc['key']);
        }
        if (isset($loc['remoteDir'])) {
            unset($loc['remoteDir']);
        }
        if (isset($loc['notify'])) {
            unset($loc['notify']);
        }
    }
    return $locations;
}

// Determine if bulk testing should be shown
function ShowBulk()
{
    global $admin;
    global $USER_EMAIL;
    global $request_context;
    if ($admin) {
        return true;
    }
    if (!is_null($request_context->getUser()) && $request_context->getUser()->isPaid()) {
        return true;
    } elseif (!is_null($request_context->getUser())) {
        return false;
    }
    if (GetSetting('bulk_disabled')) {
        return false;
    }
    if (!GetSetting('noBulk')) {
        return true;
    }
    if (isset($USER_EMAIL) && is_string($USER_EMAIL) && strlen($USER_EMAIL) && isset($_REQUEST['bulk']) && $_REQUEST['bulk']) {
        return true;
    }
    return false;
}
?>