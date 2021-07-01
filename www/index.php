<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
//$REDIRECT_HTTPS = true;
include 'common.inc';

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
// load the secret key (if there is one)
$secret = GetServerSecret();
if (!isset($secret))
    $secret = '';
$url = '';
if (isset($req_url)) {
  $url = htmlspecialchars($req_url);
}
$placeholder = 'Enter a website URL...';
$connectivity_file = './settings/connectivity.ini.sample';
if (file_exists('./settings/connectivity.ini'))
    $connectivity_file = './settings/connectivity.ini';
if (file_exists('./settings/common/connectivity.ini'))
    $connectivity_file = './settings/common/connectivity.ini';
if (file_exists('./settings/server/connectivity.ini'))
    $connectivity_file = './settings/server/connectivity.ini';
$connectivity = parse_ini_file($connectivity_file, true);
$mobile_devices = LoadMobileDevices();

if (isset($_REQUEST['connection']) && isset($connectivity[$_REQUEST['connection']])) {
  // move it to the front of the list
  $insert = $connectivity[$_REQUEST['connection']];
  unset($connectivity[$_REQUEST['connection']]);
  $old = $connectivity;
  $connectivity = array($_REQUEST['connection'] => $insert);
  foreach ($old as $key => $values)
    $connectivity[$key] = $values;
}

// if they have custom bandwidth stored, remember it
if( isset($_COOKIE['u']) && isset($_COOKIE['d']) && isset($_COOKIE['l']) )
{
    $conn = array('label' => 'custom', 'bwIn' => (int)$_COOKIE['d'] * 1000, 'bwOut' => (int)$_COOKIE['u'] * 1000, 'latency' => (int)$_COOKIE['l']);
    if( isset($_COOKIE['p']) )
        $conn['plr'] = $_COOKIE['p'];
    else
        $conn['plr'] = 0;
    $connectivity['custom'] = $conn;
}

$locations = LoadLocations();
$loc = ParseLocations($locations);

?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest - Website Performance and Optimization Test</title>
        <?php $gaTemplate = 'Main'; include ('head.inc'); ?>
    </head>
    <body class="home<?php if ($COMPACT_MODE) {echo ' compact';} ?>">
        <?php 
            $tab = 'Home';
            include 'header.inc';
        ?>
        <h1 class="attention">Test. Optimize. Repeat.</h1>
        
        <?php
            $siteKey = GetSetting("recaptcha_site_key", "");
            if (!isset($uid) && !isset($user) && !isset($USER_EMAIL) && strlen($siteKey)) {
              echo "<script src=\"https://www.google.com/recaptcha/api.js\" async defer></script>\n";
              ?>
              <script>
              function onRecaptchaSubmit(token) {
                var form = document.getElementById("urlEntry");
                if (ValidateInput(form)) {
                  form.submit();
                } else {
                  grecaptcha.reset();
                }
              }
              </script>
              <?php
            }

            if (!$headless) {
            ?>
            <form name="urlEntry" id="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return ValidateInput(this)">
            <input type="hidden" name="lighthouseTrace" value="1">
            <input type="hidden" name="lighthouseScreenshots" value="0">

            <?php
            echo '<input type="hidden" name="vo" value="' . htmlspecialchars($owner) . "\">\n";
            if( strlen($secret) ){
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
              if (array_key_exists('iq', $_REQUEST))
                echo '<input type="hidden" name="iq" value="' . htmlspecialchars($_REQUEST['iq']) . "\">\n";
              if (array_key_exists('pngss', $_REQUEST))
                echo '<input type="hidden" name="pngss" value="' . htmlspecialchars($_REQUEST['pngss']) . "\">\n";
              if (array_key_exists('shard', $_REQUEST))
                echo '<input type="hidden" name="shard" value="' . htmlspecialchars($_REQUEST['shard']) . "\">\n";
              if (array_key_exists('discard', $_REQUEST))
                echo '<input type="hidden" name="discard" value="' . htmlspecialchars($_REQUEST['discard']) . "\">\n";
              if (array_key_exists('timeout', $_REQUEST))
                echo '<input type="hidden" name="timeout" value="' . htmlspecialchars($_REQUEST['timeout']) . "\">\n";
              if (array_key_exists('appendua', $_REQUEST))
                echo '<input type="hidden" name="appendua" value="' . htmlspecialchars($_REQUEST['appendua']) . "\">\n";
              if (array_key_exists('keepvideo', $_REQUEST))
                echo '<input type="hidden" name="keepvideo" value="' . htmlspecialchars($_REQUEST['keepvideo']) . "\">\n";
              if (array_key_exists('medianMetric', $_REQUEST))
                echo '<input type="hidden" name="medianMetric" value="' . htmlspecialchars($_REQUEST['medianMetric']) . "\">\n";
              if (array_key_exists('affinity', $_REQUEST))
                echo '<input type="hidden" name="affinity" value="' . htmlspecialchars($_REQUEST['affinity']) . "\">\n";
              if (array_key_exists('tester', $_REQUEST))
                echo '<input type="hidden" name="tester" value="' . htmlspecialchars($_REQUEST['tester']) . "\">\n";
              if (array_key_exists('minimal', $_REQUEST))
                echo '<input type="hidden" name="minimal" value="' . htmlspecialchars($_REQUEST['minimal']) . "\">\n";
              if (isset($_REQUEST['noopt']))
                echo '<input type="hidden" name="noopt" value="' . htmlspecialchars($_REQUEST['noopt']) . "\">\n";
              if (isset($_REQUEST['debug']))
                echo '<input type="hidden" name="debug" value="' . htmlspecialchars($_REQUEST['debug']) . "\">\n";
              if (isset($_REQUEST['throttle_cpu']))
                echo '<input type="hidden" name="throttle_cpu" value="' . htmlspecialchars($_REQUEST['throttle_cpu']) . "\">\n";
              if (isset($_REQUEST['browser_width']))
                echo '<input type="hidden" name="browser_width" value="' . htmlspecialchars($_REQUEST['browser_width']) . "\">\n";
              if (isset($_REQUEST['browser_height']))
                echo '<input type="hidden" name="browser_height" value="' . htmlspecialchars($_REQUEST['browser_height']) . "\">\n";
              if (isset($_REQUEST['width']))
                echo '<input type="hidden" name="width" value="' . htmlspecialchars($_REQUEST['width']) . "\">\n";
              if (isset($_REQUEST['height']))
                echo '<input type="hidden" name="height" value="' . htmlspecialchars($_REQUEST['height']) . "\">\n";
              if (isset($_REQUEST['thumbsize']))
                echo '<input type="hidden" name="thumbsize" value="' . htmlspecialchars($_REQUEST['thumbsize']) . "\">\n";
              if (isset($_REQUEST['fps']))
                echo '<input type="hidden" name="fps" value="' . htmlspecialchars($_REQUEST['fps']) . "\">\n";
              if (isset($_REQUEST['timeline_fps']))
                echo '<input type="hidden" name="timeline_fps" value="' . htmlspecialchars($_REQUEST['timeline_fps']) . "\">\n";
              if (isset($_REQUEST['discard_timeline']))
                echo '<input type="hidden" name="discard_timeline" value="' . htmlspecialchars($_REQUEST['discard_timeline']) . "\">\n";
              if (isset($_REQUEST['htmlbody']))
                echo '<input type="hidden" name="htmlbody" value="' . htmlspecialchars($_REQUEST['htmlbody']) . "\">\n";
              if (isset($_REQUEST['disable_video']))
                echo '<input type="hidden" name="disable_video" value="' . htmlspecialchars($_REQUEST['disable_video']) . "\">\n";
              if (isset($_REQUEST['lighthouseThrottle']))
                echo '<input type="hidden" name="lighthouseThrottle" value="' . htmlspecialchars($_REQUEST['lighthouseThrottle']) . "\">\n";
              if (isset($_REQUEST['warmup']))
                echo '<input type="hidden" name="warmup" value="' . htmlspecialchars($_REQUEST['warmup']) . "\">\n";
            }
            ?>


            <div id="test_box-container">
                <ul class="ui-tabs-nav">
                    <li class="analytical_review ui-state-default ui-corner-top ui-tabs-selected ui-state-active"><a href="#"><?php echo file_get_contents('./images/icon-advanced-testing.svg'); ?>Advanced Testing</a></li>
                    <?php
                    if (file_exists(__DIR__ . '/settings/profiles_webvitals.ini') ||
                            file_exists(__DIR__ . '/settings/common/profiles_webvitals.ini') ||
                            file_exists(__DIR__ . '/settings/server/profiles_webvitals.ini')) {
                        echo "<li class=\"vitals\"><a href=\"/webvitals\">";
                        echo file_get_contents('./images/icon-webvitals-testing.svg');
                        echo "Web Vitals</a></li>";
                    }
                    if (file_exists(__DIR__ . '/settings/profiles.ini') ||
                        file_exists(__DIR__ . '/settings/common/profiles.ini') ||
                        file_exists(__DIR__ . '/settings/server/profiles.ini')) {
                      echo "<li class=\"easy_mode\"><a href=\"/easy\">";
                      echo file_get_contents('./images/icon-simple-testing.svg');
                      echo "Simple Testing</a></li>";
                    }
                    ?>
                    <li class="visual_comparison"><a href="/video/">
                    <?php echo file_get_contents('./images/icon-visual-comparison.svg'); ?>Visual Comparison</a></li>
                    <li class="traceroute"><a href="/traceroute.php">
                    <?php echo file_get_contents('./images/icon-traceroute.svg'); ?>Traceroute</a></li>
                </ul>
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <li>
                            <label for="url" class="vis-hidden">Enter URL to test</label>
                            <?php
                            if (isset($_REQUEST['url']) && strlen($_REQUEST['url'])) {
                                echo "<input type='text' name='url' id='url' inputmode='url' placeholder='$placeholder' value='$url' class='text large' autocorrect='off' autocapitalize='off' onkeypress='if (event.keyCode == 32) {return false;}'>";
                            } else {
                                echo "<input type='text' name='url' id='url' inputmode='url' placeholder='$placeholder' class='text large' autocorrect='off' autocapitalize='off' onkeypress='if (event.keyCode == 32) {return false;}'>";
                            }
                            ?>
                        <?php
                            if (strlen($siteKey)) {
                            echo "<button data-sitekey=\"$siteKey\" data-callback=\"onRecaptchaSubmit\" class=\"g-recaptcha start_test\">Start Test &#8594;</button>";
                            } else {
                            echo '<input type="submit" name="submit" value="Start Test &#8594;" class="start_test">';
                            }
                            ?>
                    </li>
                        <li>
                            <label for="location">Test Location</label>
                            <select name="where" id="location">
                                <?php
                                $lastGroup = null;
                                foreach($loc['locations'] as &$location)
                                {
                                    $selected = '';
                                    if( isset($location['checked']) && $location['checked'] )
                                        $selected = 'selected';
                                    if (array_key_exists('group', $location) && $location['group'] != $lastGroup) {
                                        if (isset($lastGroup))
                                            echo "</optgroup>";
                                        if (strlen($location['group'])) {
                                            $lastGroup = $location['group'];
                                            echo "<optgroup label=\"" . htmlspecialchars($lastGroup) . "\">";
                                        } else
                                            $lastGroup = null;
                                    }

                                    echo "<option value=\"{$location['name']}\" $selected>{$location['label']}</option>";
                                }
                                if (isset($lastGroup))
                                    echo "</optgroup>";
                                ?>
                            </select>
                            <?php if (GetSetting('map')) { ?>
                            <input id="change-location-btn" type=button onclick="SelectLocation();" value="Select from Map">
                            <?php } ?>
                        </li>
                        <li>
                            <label for="browser">Browser</label>
                            <select name="browser" id="browser">
                                <?php
                                // Group the browsers by type
                                $browser_groups = array();
                                $ungrouped = array();
                                foreach( $loc['browsers'] as $key => $browser )
                                {
                                    if (isset($browser['group'])) {
                                        if (!isset($browser_groups[$browser['group']])) {
                                            $browser_groups[$browser['group']] = array();
                                        }
                                        $browser_groups[$browser['group']][] = $browser;
                                    } else {
                                        $ungrouped[] = $browser;
                                    }
                                }
                                foreach( $ungrouped as $browser )
                                {
                                    $selected = '';
                                    if( isset($browser['selected']) && $browser['selected'] )
                                        $selected = 'selected';
                                    echo "<option value=\"{$browser['key']}\" $selected>{$browser['label']}</option>\n";
                                }
                                foreach ($browser_groups as $group => $browsers) {
                                    echo "<optgroup label=\"" . htmlspecialchars($group) . "\">";
                                    foreach( $browsers as $browser )
                                    {
                                        $selected = '';
                                        if( isset($browser['selected']) && $browser['selected'] )
                                            $selected = 'selected';
                                        echo "<option value=\"{$browser['key']}\" $selected>{$browser['label']}</option>\n";
                                    }
                                    echo "</optgroup>";
                                }
                                ?>
                            </select>
                            <span class="pending_tests hidden" id="pending_tests"><span id="backlog">0</span> Pending Tests</span>
                            <span class="cleared"></span>
                        </li>
                    </ul>
                    <?php if (GetSetting('multi_locations')) { ?>
                    <a href="javascript:OpenMultipleLocations()"><font color="white">Multiple locations/browsers?</font></a>
                    <br>
                    <div id="multiple-location-dialog" align=center style="display: none; color: white;">
                        <p>
                            <select name="multiple_locations[]" multiple id="multiple_locations[]">
                                <?php
                                    foreach($locations as $key => &$location_value)
                                    {
                                        if( isset( $location_value['browser'] ) )
                                        {
                                            echo "<option value=\"{$key}\" $selected>{$location_value['label']}</option>";
                                        }
                                    }
                                ?>
                            </select>
                            <a href='javascript:CloseMultipleLocations()'><font color="white">Ok</font></a>
                        </p>
                    </div>
                    <br>
                    <?php } ?>
                   <?php
                    if( isset($_COOKIE["as"]) && (int)$_COOKIE["as"] )
                    {
                        echo '<p><a href="javascript:void(0)" id="advanced_settings" class="extended">Advanced Settings <span class="arrow"></span></a><small id="settings_summary_label" class="hidden"><br><span id="settings_summary"></span></small></p>';
                        echo '<div id="advanced_settings-container">';
                    }
                    else
                    {
                        echo '<p><a href="javascript:void(0)" id="advanced_settings">Advanced Settings <span class="arrow"></span></a><small id="settings_summary_label"><br><span id="settings_summary"></span></small></p>';
                        echo '<div id="advanced_settings-container" class="hidden">';
                    }
                    ?>

                        <div id="test_subbox-container">
                            <ul class="ui-tabs-nav">
                                <li><a href="#test-settings">Test Settings</a></li>
                                <li><a href="#advanced-settings">Advanced</a></li>
                                <li><a href="#advanced-chrome">Chromium</a></li>
                                <?php if (!GetSetting('no_basic_auth_ui') || isset($_GET['auth'])) { ?>
                                <li><a href="#auth">Auth</a></li>
                                <?php } ?>
                                <li><a href="#script">Script</a></li>
                                <li><a href="#block">Block</a></li>
                                <li><a href="#spof">SPOF</a></li>
                                <li><a href="#custom-metrics">Custom</a></li>
                                <?php if (ShowBulk()) { ?>
                                <li><a href="#bulk">Bulk Testing</a></li>
                                <?php } ?>
                            </ul>
                            <div id="test-settings" class="test_subbox">
                                <ul class="input_fields">
                                    <li>
                                        <label for="connection">Connection</label>
                                        <select name="location" id="connection">
                                            <?php
                                            foreach( $loc['connections'] as $key => &$connection )
                                            {
                                                $selected = '';
                                                if( isset($connection['selected']) && $connection['selected'] )
                                                    $selected = 'selected';
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
                                        $default_dimensions = GetSetting('default_browser_size', FALSE);
                                        if ($default_dimensions === FALSE) {
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
                                    <?php
                                    /*
                                    if ($admin) {
                                      echo '<li>';
                                      echo '<label for="custom_browser">';
                                      echo '<a href="/custom_browsers.php">Custom Browser</a>';
                                      echo '</label>';
                                      echo '<input id="custom_browser" type="text" class="text" name="custombrowser" value="">';
                                      echo '</li>';
                                    }
                                    */
                                    ?>
                                    <li>
                                        <label for="number_of_tests">
                                            Number of Tests to Run<br>
                                            <small>Up to <?php echo $max_runs; ?></small>
                                        </label>
                                        <?php
                                        $runs = 3;
                                        if (isset($_COOKIE["runs"]))
                                          $runs = (int)@$_COOKIE["runs"];
                                        if (isset($_REQUEST["runs"]))
                                          $runs = (int)@$_REQUEST["runs"];
                                        if( isset($req_runs) )
                                          $runs = (int)$req_runs;
                                        $runs = max(1, min($runs, $max_runs));
                                        ?>
                                        <input id="number_of_tests" type="number" min="1" max=<?php echo "\"$max_runs\""; ?> class="text short" name="runs" value=<?php echo "\"$runs\""; ?> required>
                                    </li>
                                    <li>
                                        <fieldset>
                                            <legend>Repeat View</legend>
                                        <?php
                                        $fvOnly = true;
                                        if (isset($_COOKIE["testOptions"]))
                                          $fvOnly = (int)@$_COOKIE["testOptions"] & 2;
                                        if (isset($_REQUEST['fvonly']))
                                          $fvOnly = (int)$_REQUEST['fvonly'];
                                        ?>
                                        <input id="viewBoth" type="radio" name="fvonly" <?php if( !$fvOnly ) echo 'checked=checked'; ?> value="0"><label for="viewBoth">First View and Repeat View</label>
                                        <input id="viewFirst" type="radio" name="fvonly" <?php if( $fvOnly ) echo 'checked=checked'; ?> value="1"><label for="viewFirst">First View Only</label>
                                        </fieldset>
                                    </li>
                                    <li>
                                      <label for="videoCheck">Capture Video</label>
                                      <input type="checkbox" name="video" id="videoCheck" class="checkbox" checked=checked>
                                    </li>
                                    <?php
                                    if (!GetSetting('forcePrivate')) {
                                    ?>
                                    <li>
                                        <label for="keep_test_private">Keep Test Private</label>
                                        <input type="checkbox" name="private" id="keep_test_private" class="checkbox" <?php if (((int)@$_COOKIE["testOptions"] & 1) || array_key_exists('hidden', $_REQUEST) || GetSetting('defaultPrivate')) echo " checked=checked"; ?>>
                                    </li>
                                    <?php
                                    } else {
                                      echo "<li>All test results are configured to be private by default.</li>";
                                    }
                                    ?>
                                    <li>
                                        <label for="label">Label</label>
                                        <?php
                                        $label = '';
                                        if (array_key_exists('label', $_REQUEST))
                                          $label = htmlspecialchars($_REQUEST['label']);
                                        echo "<input type=\"text\" name=\"label\" id=\"label\" value=\"$label\">\n";
                                        ?>
                                    </li>
                                </ul>
                            </div>
                            <div id="advanced-settings" class="test_subbox ui-tabs-hide">
                                <ul class="input_fields">
                                    <li>
                                        <input type="checkbox" name="web10" id="stop_test_at_document_complete" class="checkbox before_label">
                                        <label for="stop_test_at_document_complete" class="auto_width">
                                            Stop Test at Document Complete<br>
                                            <small>Typically, tests run until all activity stops.</small>
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="ignoreSSL" id="ignore_ssl_cerificate_errors" class="checkbox" style="float: left;width: auto;">
                                        <label for="ignore_ssl_cerificate_errors" class="auto_width">
                                            Ignore SSL Certificate Errors<br>
                                            <small>e.g. Name mismatch, Self-signed certificates, etc.</small>
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="tcpdump" id="tcpdump" class="checkbox" style="float: left;width: auto;">
                                        <label for="tcpdump" class="auto_width">
                                            Capture network packet trace (tcpdump)
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="bodies" id="bodies" class="checkbox" style="float: left;width: auto;">
                                        <label for="bodies" class="auto_width">
                                            Save response bodies<br>
                                            <small>For text resources (HTML, CSS, etc.)</small>
                                        </label>
                                    </li>
                                    <li>
                                        <?php
                                        $checked = '';
                                        if (GetSetting('keepua') || (array_key_exists('keepua', $_REQUEST) && $_REQUEST['keepua']))
                                            $checked = ' checked=checked';
                                        echo "<input type=\"checkbox\" name=\"keepua\" id=\"keepua\" class=\"checkbox\" style=\"float: left;width: auto;\"$checked>\n";
                                        ?>
                                        <label for="keepua" class="auto_width">
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
                                    <?php if ( GetSetting('fullSizeVideoOn') ) { ?>
                                    <li>
                                        <input type="checkbox" name="fullsizevideo" id="full_size_video" class="checkbox" <?php if( GetSetting('fullSizeVideoDefault') )  echo 'checked=checked'; ?> style="float: left;width: auto;">
                                        <label for="full_size_video" class="auto_width">
                                            Capture Full Size Video<br>
                                            <small>Enables full size screenshots in the filmstrip</small>
                                        </label>
                                    </li><?php } ?>
                                    <li>
                                        <label for="time">
                                            Minimum test duration<br>
                                            <small>Capture data for at least...</small>
                                        </label>
                                        <input id="time" type="number" class="text short" name="time" value=""> seconds
                                    </li>
                                    <li>
                                        <label for="customHeaders" class="full">
                                            Custom headers<br>
                                            <small>Add custom headers to all network requests emitted from the browser</small>
                                        </label>
                                        <textarea id="customHeaders" type="text" class="text" name="customHeaders" value=""></textarea>
                                    </li>
                                    <li>
                                        <label for="injectScript" class="full">
                                            Inject Script<br>
                                            <small>JavaScript to run after the document has started loading</small>
                                        </label>
                                        <textarea class="large" id="injectScript" type="text" class="text" name="injectScript" value=""></textarea>
                                    </li>
                                </ul>
                            </div>
                            <div id="advanced-chrome" class="test_subbox ui-tabs-hide">
                                <p>Chrome-specific advanced settings:</p>
                                <ul class="input_fields">
                                    <li>
                                        <input type="checkbox" name="lighthouse" id="lighthouse" class="checkbox" style="float: left;width: auto;">
                                        <label for="lighthouse" class="auto_width">
                                            Capture Lighthouse Report <small>(Uses a "3G Fast" connection independent of test settings)</small>
                                        </label>
                                    </li>
                                    <li>
                                        <?php
                                        $checked = '';
                                        if (isset($_REQUEST['mobile']) && $_REQUEST['mobile'])
                                          $checked = ' checked';
                                        echo "<input type=\"checkbox\" name=\"mobile\" id=\"mobile\" class=\"checkbox\" style=\"float: left;width: auto;\"$checked>";
                                        ?>
                                        <label for="mobile">
                                            Emulate Mobile Browser
                                        </label>
                                        <?php
                                        if (isset($mobile_devices)) {
                                          if (is_array($mobile_devices) && count($mobile_devices)) {
                                            $selectedDevice = null;
                                            if (isset($_COOKIE['mdev']) && isset($mobile_devices[$_COOKIE['mdev']]))
                                              $selectedDevice = $_COOKIE['mdev'];
                                            if (isset($_REQUEST['mdev']) && isset($mobile_devices[$_REQUEST['mdev']]))
                                              $selectedDevice = $_REQUEST['mdev'];
                                            echo '<select name="mobileDevice" id="mobileDevice">';
                                            $lastGroup = null;
                                            foreach ($mobile_devices as $deviceName => $deviceInfo) {
                                              if (isset($deviceInfo['label'])) {
                                                if (isset($deviceInfo['group']) && $deviceInfo['group'] != $lastGroup) {
                                                  if (isset($lastGroup))
                                                    echo "</optgroup>";
                                                  $lastGroup = $deviceInfo['group'];
                                                  echo "<optgroup label=\"" . htmlspecialchars($lastGroup) . "\">";
                                                }
                                                $selected = '';
                                                if (isset($selectedDevice) && $selectedDevice == $deviceName)
                                                  $selected = 'selected';
                                                echo "<option value=\"$deviceName\" $selected>" . htmlspecialchars($deviceInfo['label']) . "</option>\n";
                                              }
                                            }
                                            if (isset($lastGroup))
                                              echo "</optgroup>";
                                            echo '</select>';
                                          }
                                        }
                                        ?>
                                        
                                    </li>
                                    <li>
                                        <input type="checkbox" name="timeline" id="timeline" class="checkbox" checked=checked style="float: left;width: auto;">
                                        <label for="timeline" class="auto_width">
                                            Capture Dev Tools Timeline
                                        </label>
                                        
                                    </li>
                                    <li>
                                    <input type="checkbox" name="profiler" id="profiler" class="checkbox" style="float: left;width: auto;">
                                        <label for="profiler" class="auto_width">
                                            Enable v8 Sampling Profiler (much larger traces)
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="v8rcs" id="v8rcs" class="checkbox" style="float: left;width: auto;">
                                        <label for="v8rcs" class="auto_width">
                                            Capture <a href="https://v8.dev/docs/rcs">V8 Runtime Call Stats</a>
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="trace" id="trace" class="checkbox" style="float: left;width: auto;">
                                        <label for="trace" class="auto_width">
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
                                        <input type="checkbox" name="netlog" id="netlog" class="checkbox" style="float: left;width: auto;">
                                        <label for="netlog" class="auto_width">
                                            Capture Network Log
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="dataReduction" id="dataReduction" class="checkbox" style="float: left;width: auto;">
                                        <label for="dataReduction" class="auto_width">
                                            Enable Data Reduction<br>
                                            <small>Chrome 34+ on Android</small>
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="disableAVIF" id="disableAVIF" class="checkbox" style="float: left;width: auto;">
                                        <label for="disableAVIF" class="auto_width">Disable AVIF image support</label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="disableWEBP" id="disableWEBP" class="checkbox" style="float: left;width: auto;">
                                        <label for="disableWEBP" class="auto_width">Disable WEBP image support</label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="disableJXL" id="disableJXL" class="checkbox" style="float: left;width: auto;">
                                        <label for="disableJXL" class="auto_width">Disable JPEG XL image support</label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="dtShaper" id="dtShaper" class="checkbox" style="float: left;width: auto;">
                                        <label for="dtShaper" class="auto_width">Use Chrome dev tools traffic-shaping (not recommended)</label>
                                    </li>
                                    <?php
                                    if ($admin && GetSetting('wprDesktop')) {
                                    ?>
                                    <li>
                                        <input type="checkbox" name="wprDesktop" id="wprDesktop" class="checkbox" style="float: left;width: auto;">
                                        <label for="wprDesktop" class="auto_width">
                                            Use Web Page Replay-recorded Desktop Page<br>
                                            <small>Limited list of available <a href="/wprDesktop.txt">URLs</a></small>
                                        </label>
                                    </li>
                                    <?php
                                    }
                                    if ($admin && GetSetting('wprMobile')) {
                                    ?>
                                    <li>
                                        <input type="checkbox" name="wprMobile" id="wprMobile" class="checkbox" style="float: left;width: auto;">
                                        <label for="wprMobile" class="auto_width">
                                            Use Web Page Replay recorded Mobile Page<br>
                                            <small>Limited list of available <a href="/wprMobile.txt">URLs</a></small>
                                        </label>
                                    </li>
                                    <?php
                                    }
                                    ?>
                                    <li>
                                        <label for="hostResolverRules">
                                        <a href="https://peter.sh/experiments/chromium-command-line-switches/#host-resolver-rules">Host Resolver Rules</a><br>
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
                                    <div class="notification"><div class="warning">
                                        PLEASE USE A TEST ACCOUNT! as your credentials may be available to anyone viewing the results.<br><br>
                                        Using this feature will make this test Private. Thus, it will *not* appear in Test History.
                                    </div></div>
                                </div>
                            </div>
                            <?php } ?>

                            <div id="script" class="test_subbox ui-tabs-hide">
                                <div>
                                    

                                    <p><label for="enter_script" class="full_width">Enter Script</label></p>
                                    <?php
                                      $script = '';
                                      if (array_key_exists('script', $_REQUEST))
                                        $script = htmlspecialchars($_REQUEST['script']);
                                      echo "<textarea class=\"large\" name=\"script\" id=\"enter_script\" cols=\"0\" rows=\"0\">$script</textarea>\n";
                                    ?>
                                </div>
                                <br>
                                <ul class="input_fields">
                                    <li>
                                        <input type="checkbox" name="sensitive" id="sensitive" class="checkbox" style="float: left;width: auto;">
                                        <label for="sensitive" class="auto_width">
                                            Script includes sensitive data<br><small>The script will be discarded and the HTTP headers will not be available in the results</small>
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="noheaders" id="noheaders" class="checkbox" style="float: left;width: auto;">
                                        <label for="noheaders" class="auto_width">
                                            Discard all HTTP headers
                                        </label>
                                    </li>
                                </ul>
                                <div class="notification-container">
                                        <div class="notification"><div class="message">
                                            Check out <a href="https://docs.webpagetest.org/scripting/">the documentation</a> for more information on this feature
                                        </div></div>
                                    </div>
                            </div>

                            <div id="block" class="test_subbox ui-tabs-hide">
                                <p>
                                    <label for="block_requests_containing" class="full_width">
                                        Block Requests Containing (URL substrings)...<br>
                                        <small>Space-separated list</small>
                                    </label>
                                <textarea name="block" id="block_requests_containing" cols="0" rows="0"></textarea>
                                </p>
                                <p>
                                    <label for="block_domains" class="full_width">
                                        Block Domains (full host names)...<br>
                                        <small>Space-separated list of domains</small>
                                    </label>
                                <textarea name="blockDomains" id="block_domains" cols="0" rows="0"></textarea>
                                </p>
                            </div>

                            <div id="spof" class="test_subbox ui-tabs-hide">
                                <p>
                                    Simulate failure of specified domains.  This is done by re-routing all requests for
                                    the domains to <a href="http://blog.patrickmeenan.com/2011/10/testing-for-frontend-spof.html">blackhole.webpagetest.org</a> which will silently drop all requests.
                                </p>
                                <p>
                                    <label for="spof_hosts" class="full_width">
                                        Hosts to fail (one host per line)...
                                    </label>
                                </p>
                                <textarea name="spof" id="spof_hosts" cols="0" rows="0"><?php
                                    if (array_key_exists('spof', $_REQUEST)) {
                                        echo htmlspecialchars(str_replace(',', "\r\n", $_REQUEST['spof']));
                                    }
                                ?></textarea>
                            </div>

                            <div id="custom-metrics" class="test_subbox ui-tabs-hide">
                                <div>
                                    

                                    <p><label for="custom_metrics" class="full_width">Custom Metrics:</label></p>
                                    <textarea name="custom" class="large" id="custom_metrics" cols="0" rows="0"></textarea>
                                </div>
                                <div class="notification-container">
                                        <div class="notification"><div class="message">
                                            See <a href="https://docs.webpagetest.org/custom-metrics/">the documentation</a> for details on how to specify custom metrics to be captured.
                                        </div></div>
                                    </div>
                            </div>

                            <?php if (ShowBulk()) { ?>
                            <div id="bulk" class="test_subbox ui-tabs-hide">
                                <p>
                                    <label for="bulkurls" class="full_width">
                                        List of URLs to test (one URL per line)...
                                    </label>
                                </p>
                                <textarea class="large" name="bulkurls" id="bulkurls" cols="0" rows="0"></textarea><br>
                                <b>or</b><br>
                                upload list of URLs (one per line): <input type="file" name="bulkfile" size="40">
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
                        foreach($loc['locations'] as &$location)
                        {
                            $selected = '';
                            if( isset($location['checked']) && $location['checked'] )
                                $selected = 'selected';

                            if (array_key_exists('group', $location) && $location['group'] != $lastGroup) {
                                if (isset($lastGroup))
                                    echo "</optgroup>";
                                if (strlen($location['group'])) {
                                    $lastGroup = $location['group'];
                                    echo "<optgroup label=\"" . htmlspecialchars($lastGroup) . "\">";
                                } else
                                    $lastGroup = null;
                            }

                            echo "<option value=\"{$location['name']}\" $selected>{$location['label']}</option>";
                        }
                        if (isset($lastGroup))
                            echo "</optgroup>";
                        ?>
                    </select>
                    <input id="location-ok" type=button class="simplemodal-close" value="OK">
                </p>
            </div>
            </form>

            <?php
            if( is_file('settings/intro.inc') )
                include('settings/intro.inc');
            } // $headless
            ?>
            </div>
            <?php
            include(__DIR__ . '/include/home-subsections.inc');
            ?>
            <?php include('footer.inc'); ?>

        <script type="text/javascript">
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

            if (isset($_REQUEST['force']) && $_REQUEST['force'])
              echo "var forgetSettings = true;\n";
            else
              echo "var forgetSettings = false;\n";
        ?>
        </script>
        <script type="text/javascript" src="<?php echo $GLOBALS['cdnPath']; ?>/js/test.js?v=<?php echo VER_JS_TEST;?>"></script>
    </body>
</html>

<?php

/**
* Load the location information
*
*/
function LoadLocations()
{
    $locations = LoadLocationsIni();
    FilterLocations( $locations );

    // strip out any sensitive information
    foreach( $locations as $index => &$loc )
    {
        // count the number of tests at each location
        if (isset($loc['scheduler_node'])) {
            $queues = GetQueueLengths($loc['location']);
            if (isset($queues) && is_array($queues) && isset($queues[0])) {
                // Sum up the queue lengths for anything higher priority than the UI priority
                $loc['backlog'] = 0;
                $ui_priority = intval(GetSetting('user_priority', 0));
                for ($p = 0; $p <= $ui_priority; $p++) {
                    if (isset($queues[$p])) {
                        $loc['backlog'] += $queues[$p];
                    }
                }
            }
        } elseif( isset($loc['localDir']) ) {
            $loc['backlog'] = CountTests($loc['localDir']);
        }
        if (isset($loc['localDir'])) {
            unset( $loc['localDir'] );
        }

        if( isset($loc['key']) )
            unset( $loc['key'] );
        if( isset($loc['remoteDir']) )
            unset( $loc['remoteDir'] );
        if( isset($loc['notify']) )
            unset( $loc['notify'] );
    }

    return $locations;
}

// Determine if bulk testing should be shown
function ShowBulk() {
    global $admin;
    global $USER_EMAIL;
    if ($admin)
        return true;
    if (GetSetting('bulk_disabled'))
        return false;
    if (!GetSetting('noBulk'))
        return true;
    if (isset($USER_EMAIL) && is_string($USER_EMAIL) && strlen($USER_EMAIL) && isset($_REQUEST['bulk']) && $_REQUEST['bulk'])
        return true;
    return false;
}
?>