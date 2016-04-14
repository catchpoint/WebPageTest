<?php 
include 'common.inc';

if (array_key_exists('bulk', $_GET)) {
    $settings['noBulk'] = 0;
}
if (!array_key_exists('noBulk', $settings))
    $settings['noBulk'] = 0;

// see if we are overriding the max runs
if (isset($_COOKIE['maxruns']) && (int)$_GET['maxruns'] > 0) {
    $settings['maxruns'] = (int)$_GET['maxruns'];
}
if (isset($_GET['maxruns'])) {
    $settings['maxruns'] = (int)$_GET['maxruns'];
    setcookie("maxruns", $settings['maxruns']);    
}

if (!isset($settings['maxruns']) || $settings['maxruns'] <= 0) {
    $settings['maxruns'] = 10;
}
if (isset($_REQUEST['map'])) {
    $settings['map'] = 1;
}
$headless = false;
if (array_key_exists('headless', $settings) && $settings['headless']) {
    $headless = true;
}
// load the secret key (if there is one)
$secret = '';
if (is_file('./settings/keys.ini')) {
    $keys = parse_ini_file('./settings/keys.ini', true);
    if (is_array($keys) && array_key_exists('server', $keys) && array_key_exists('secret', $keys['server'])) {
      $secret = trim($keys['server']['secret']);
    }
}
$url = '';
if (isset($req_url)) {
  $url = htmlspecialchars($req_url);
}
if (!strlen($url)) {
    $url = 'Enter a Website URL';
}
$connectivity = parse_ini_file('./settings/connectivity.ini', true);

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
<html>
    <head>
        <title>WebPagetest - Website Performance and Optimization Test</title>
        <?php $gaTemplate = 'Main'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Home';
            include 'header.inc';
            if (!$headless) {
            ?>
            <form name="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return ValidateInput(this)">
            
            <?php
            echo "<input type=\"hidden\" name=\"vo\" value=\"$owner\">\n";
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
            ?>

            <h2 class="cufon-dincond_black">Test a website's performance</h2>

            <div id="test_box-container">
                <ul class="ui-tabs-nav">
                    <li class="analytical_review ui-state-default ui-corner-top ui-tabs-selected ui-state-active"><a href="#">Analytical Review</a></li>
                    <li class="visual_comparison"><a href="/video/">Visual Comparison</a></li>
                    <li class="traceroute"><a href="/traceroute">Traceroute</a></li>
                </ul>
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <li><input type="text" name="url" id="url" value="<?php echo $url; ?>" class="text large" onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}"></li>
                        <li>
                            <label for="location">Test Location</label>
                            <select name="where" id="location">
                                <?php
                                $lastGroup = null;
                                foreach($loc['locations'] as &$location)
                                {
                                    $selected = '';
                                    if( $location['checked'] )
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
                            <?php if (isset($settings['map'])) { ?>
                            <input id="change-location-btn" type=button onclick="SelectLocation();" value="Select from Map">
                            <?php } ?>
                            <span class="pending_tests hidden" id="pending_tests"><span id="backlog">0</span> Pending Tests</span>
                            <span class="cleared"></span>
                        </li>
                        <li>
                            <label for="browser">Browser</label>
                            <select name="browser" id="browser">
                                <?php
                                foreach( $loc['browsers'] as $key => &$browser )
                                {
                                    $selected = '';
                                    if( $browser['selected'] )
                                        $selected = 'selected';
                                    echo "<option value=\"{$browser['key']}\" $selected>{$browser['label']}</option>\n";
                                }
                                ?>
                            </select>
                        </li>
                    </ul>
                    <?php if (isset($settings['multi_locations'])) { ?>
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
                    if( (int)$_COOKIE["as"] )
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
                                <li><a href="#advanced-chrome">Chrome</a></li>
                                <li><a href="#auth">Auth</a></li>
                                <li><a href="#script">Script</a></li>
                                <li><a href="#block">Block</a></li>
                                <li><a href="#spof">SPOF</a></li>
                                <li><a href="#custom-metrics">Custom</a></li>
                                <?php if ($admin || !$settings['noBulk']) { ?>
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
                                                if( $connection['selected'] )
                                                    $selected = 'selected';
                                                echo "<option value=\"{$connection['key']}\" $selected>{$connection['label']}</option>\n";
                                            }
                                            ?>
                                        </select>
                                        <br>
                                        <table class="configuration hidden" id="bwTable">
                                            <tr>
                                                <th>BW Down</th>
                                                <th>BW Up</th>
                                                <th>Latency</th>
                                                <th>Packet Loss</th>
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
                                    <?php
                                    if ($admin) {
                                      echo '<li>';
                                      echo '<label for="custom_browser">';
                                      echo '<a href="/custom_browsers.php">Custom Browser</a>';
                                      echo '</label>';
                                      echo '<input id="custom_browser" type="text" class="text" name="custombrowser" value="">';
                                      echo '</li>';
                                    }
                                    ?>
                                    <li>
                                        <label for="number_of_tests">
                                            Number of Tests to Run<br>
                                            <small>Up to <?php echo $settings['maxruns']; ?></small>
                                        </label>
                                        <?php
                                        $runs = (int)@$_COOKIE["runs"];
                                        if( isset($req_runs) )
                                            $runs = (int)$req_runs;
                                        $runs = max(1, min($runs, $settings['maxruns']));
                                        ?>
                                        <input id="number_of_tests" type="number" class="text short" name="runs" value=<?php echo "\"$runs\""; ?>>
                                    </li>
                                    <li>
                                        <label for="viewBoth">
                                            Repeat View
                                        </label>
                                        <?php
                                        $fvOnly = (int)@$_COOKIE["testOptions"] & 2;
                                        if (array_key_exists('fvonly', $_REQUEST)) {
                                            $fvOnly = (int)$_REQUEST['fvonly'];
                                        }
                                        ?>
                                        <input id="viewBoth" type="radio" name="fvonly" <?php if( !$fvOnly ) echo 'checked=checked'; ?> value="0">First View and Repeat View
                                        <input id="viewFirst" type="radio" name="fvonly" <?php if( $fvOnly ) echo 'checked=checked'; ?> value="1">First View Only
                                    </li>
                                    <li>
                                      <label for="videoCheck">Capture Video</label>
                                      <?php
                                      $video = 0;
                                      if (array_key_exists('video', $_REQUEST))
                                          $video = (int)$_REQUEST['video'];
                                      ?>
                                      <input type="checkbox" name="video" id="videoCheck" class="checkbox" <?php if( $video ) echo 'checked=checked'; ?>>
                                    </li>
                                    <li>
                                        <label for="keep_test_private">Keep Test Private</label>
                                        <input type="checkbox" name="private" id="keep_test_private" class="checkbox" <?php if (((int)@$_COOKIE["testOptions"] & 1) || array_key_exists('hidden', $_REQUEST)) echo " checked=checked"; ?>>
                                    </li>
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
                                        <input type="checkbox" name="noscript" id="noscript" class="checkbox" style="float: left;width: auto;">
                                        <label for="noscript" class="auto_width">
                                            Disable Javascript
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="clearcerts" id="clearcerts" class="checkbox" style="float: left;width: auto;">
                                        <label for="clearcerts" class="auto_width">
                                            Clear SSL Certificate Caches<br>
                                            <small>Internet Explorer and Chrome</small>
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
                                        <input type="checkbox" name="standards" id="force_standards_mode" class="checkbox" style="float: left;width: auto;">
                                        <label for="force_standards_mode" class="auto_width">
                                            Disable Compatibility View (IE Only)<br>
                                            <small>Forces all pages to load in standards mode</small>
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
                                            <small>For text resources</small>
                                        </label>
                                    </li>
                                    <li>
                                        <?php
                                        $checked = '';
                                        if ((array_key_exists('keepua', $settings) && $settings['keepua']) ||
                                                (array_key_exists('keepua', $_REQUEST) && $_REQUEST['keepua']))
                                            $checked = ' checked=checked';
                                        echo "<input type=\"checkbox\" name=\"keepua\" id=\"keepua\" class=\"checkbox\" style=\"float: left;width: auto;\"$checked>\n";
                                        ?>
                                        <label for="keepua" class="auto_width">
                                            Preserve original User Agent string<br>
                                            <small>Do not add PTST to the browser UA string</small>
                                        </label>
                                    </li>
                                    <li>
                                        <label for="uastring" style="width: auto;">
                                        User Agent String<br>
                                        <small>(Custom UA String)</small>
                                        </label>
                                        <input type="text" name="uastring" id="uastring" class="text" style="width: 350px;">
                                    </li>
                                    <?php
                                    if ( isset($settings['fullSizeVideoOn']) && $settings['fullSizeVideoOn'] )
                                    { ?>
                                    <li>
                                        <input type="checkbox" name="fullsizevideo" id="full_size_video" class="checkbox" <?php if( isset($settings['fullSizeVideoDefault']) && $settings['fullSizeVideoDefault'] )  echo 'checked=checked'; ?> style="float: left;width: auto;">
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
                                        <label for="customHeaders">
                                            Custom headers<br>
                                            <small>Add custom headers to all network requests emitted from the browser</small>
                                        </label>
                                        <textarea id="customHeaders" type="text" class="text" name="customHeaders" value=""></textarea>
                                    </li>
                                </ul>
                            </div>
                            <div id="advanced-chrome" class="test_subbox ui-tabs-hide">
                                <p>Chrome-specific advanced settings:</p>
                                <ul class="input_fields">
                                    <li>
                                        <input type="checkbox" name="mobile" id="mobile" class="checkbox" style="float: left;width: auto;">
                                        <?php
                                        if (is_file('./settings/mobile_devices.ini')) {
                                          $devices = parse_ini_file('./settings/mobile_devices.ini', true);
                                          if ($devices && count($devices)) {
                                            $selectedDevice = null;
                                            if (isset($_COOKIE['mdev']) && isset($devices[$_COOKIE['mdev']]))
                                              $selectedDevice = $_COOKIE['mdev'];
                                            echo '<select name="mobileDevice" id="mobileDevice">';
                                            $lastGroup = null;
                                            foreach ($devices as $deviceName => $deviceInfo) {
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
                                        <label for="mobile" class="auto_width">
                                            Emulate Mobile Browser
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="timeline" id="timeline" class="checkbox" style="float: left;width: auto;">
                                        <label for="timeline" class="auto_width">
                                            Capture Dev Tools Timeline
                                        </label>
                                        <input type="checkbox" name="timelineStack" id="timelineStack" class="checkbox" style="float: left;width: auto;">
                                        <label for="timelineStack" class="auto_width">
                                            Include call stack (increases overhead)
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="trace" id="trace" class="checkbox" style="float: left;width: auto;">
                                        <label for="trace" class="auto_width">
                                            Capture Chrome Trace (about://tracing)
                                        </label>
                                    </li>
                                    <li>
                                        <label for="traceCategories" style="width: auto;">
                                        Trace Categories<br>
                                        <small>(when tracing is enabled)</small>
                                        </label>
                                        <input type="text" name="traceCategories" id="traceCategories" class="text" style="width: 400px;" value="*">
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
                                    <?php
                                    if ($admin && GetSetting('wprDesktop')) {
                                    ?>
                                    <li>
                                        <input type="checkbox" name="wprDesktop" id="wprDesktop" class="checkbox" style="float: left;width: auto;">
                                        <label for="wprDesktop" class="auto_width">
                                            Use Web Page Replay recorded Desktop Page<br>
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
                                        <label for="hostResolverRules" style="width: auto;">
                                        <a href="https://github.com/atom/electron/blob/master/docs/api/chrome-command-line-switches.md#--host-rulesrules">Host Rules</a><br>
                                        <small>i.e. MAP * 1.2.3.4</small>
                                        </label>
                                        <input type="text" name="hostResolverRules" id="hostResolverRules" class="text" style="width: 400px;">
                                    </li>
                                    <li>
                                        <label for="cmdline" style="width: auto;">
                                        Command-line<br>
                                        <small>Custom options</small>
                                        </label>
                                        <input type="text" name="cmdline" id="cmdline" class="text" style="width: 400px;">
                                    </li>
                                </ul>
                            </div>
                            <div id="auth" class="test_subbox ui-tabs-hide">
                                <div class="notification-container">
                                    <div class="notification"><div class="warning">
                                        PLEASE USE A TEST ACCOUNT! as your credentials may be available to anyone viewing the results.<br><br>
                                        Utilizing this feature will make this test Private. Thus, it will not appear in Test History.
                                    </div></div>
                                </div>
                                
                                <ul class="input_fields">
                                    <li>
                                        HTTP Basic Authentication
                                    </li>
                                    <li>
                                        <label for="username" style="width: auto;">Username</label>
                                        <input type="text" name="login" id="username" class="text" style="width: 200px;">
                                    </li>
                                    <li>
                                        <label for="password" style="width: auto;">Password</label>
                                        <input type="text" name="password" id="password" class="text" style="width: 200px;">
                                    </li>
                                </ul>
                            </div>

                            <div id="script" class="test_subbox ui-tabs-hide">
                                <div>
                                    <div class="notification-container">
                                        <div class="notification"><div class="message">
                                            Check out <a href="https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/scripting">the documentation</a> for more information on this feature
                                        </div></div>
                                    </div>
                                    
                                    <p><label for="enter_script" class="full_width">Enter Script</label></p>
                                    <?php
                                      $script = '';
                                      if (array_key_exists('script', $_REQUEST))
                                        $script = htmlspecialchars($_REQUEST['script']);
                                      echo "<textarea name=\"script\" id=\"enter_script\" cols=\"0\" rows=\"0\">$script</textarea>\n";
                                    ?>
                                </div>
                                <br>
                                <ul class="input_fields">
                                    <li>
                                        <input type="checkbox" name="sensitive" id="sensitive" class="checkbox" style="float: left;width: auto;">
                                        <label for="sensitive" class="auto_width">
                                            Script includes sensitive data<br><small>The script will be discarded and the http headers will not be available in the results</small>
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="noheaders" id="noheaders" class="checkbox" style="float: left;width: auto;">
                                        <label for="noheaders" class="auto_width">
                                            Discard all HTTP headers
                                        </label>
                                    </li>
                                </ul>
                            </div>

                            <div id="block" class="test_subbox ui-tabs-hide">
                                <p>
                                    <label for="block_requests_containing" class="full_width">
                                        Block Requests Containing...<br>
                                        <small>Space separated list</small>
                                    </label>
                                </p>
                                <textarea name="block" id="block_requests_containing" cols="0" rows="0"></textarea>
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
                                    <div class="notification-container">
                                        <div class="notification"><div class="message">
                                            See <a href="https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/custom-metrics">the documentation</a> for details on how to specify custom metrics to be captured.
                                        </div></div>
                                    </div>
                                    
                                    <p><label for="custom_metrics" class="full_width">Custom Metrics:</label></p>
                                    <textarea name="custom" id="custom_metrics" cols="0" rows="0"></textarea>
                                </div>
                            </div>

                            <?php if ($admin || !$settings['noBulk']) { ?>
                            <div id="bulk" class="test_subbox ui-tabs-hide">
                                <p>
                                    <label for="bulkurls" class="full_width">
                                        List of urls to test (one URL per line)...
                                    </label>
                                </p>
                                <textarea name="bulkurls" id="bulkurls" cols="0" rows="0"></textarea><br>
                                <b>or</b><br>
                                upload list of Urls (one per line): <input type="file" name="bulkfile" size="40"> 
                            </div>
                            <?php } ?>

                        </div>
                    </div>
                </div>
            </div>

            <div id="start_test-container">
                <p><input type="submit" name="submit" value="" class="start_test"></p>
                <div id="sponsor">
                </div>
            </div>
            <div class="cleared"></div>
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
                            if( $location['checked'] )
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

            <?php include('footer.inc'); ?>
        </div>

        <script type="text/javascript">
        <?php 
            echo "var maxRuns = {$settings['maxruns']};\n";
            echo "var locations = " . json_encode($locations) . ";\n";
            echo "var connectivity = " . json_encode($connectivity) . ";\n";

            $sponsors = parse_ini_file('./settings/sponsors.ini', true);
            foreach( $sponsors as &$sponsor )
            {
                if( strlen($GLOBALS['cdnPath']) )
                {
                    if( isset($sponsor['logo']) )
                        $sponsor['logo'] = $GLOBALS['cdnPath'] . $sponsor['logo'];
                    if( isset($sponsor['logo_big']) )
                        $sponsor['logo_big'] = $GLOBALS['cdnPath'] . $sponsor['logo_big'];
                }
                $offset = 0;
                if( $sponsor['index'] )
                    $offset = -40 * $sponsor['index'];
                $sponsor['offset'] = $offset;
            }
            echo "var sponsors = " . @json_encode($sponsors) . ";\n";
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
        if( isset($loc['localDir']) )
        {
            $loc['backlog'] = CountTests($loc['localDir']);
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
?>
