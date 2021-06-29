<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';

// load the secret key (if there is one)
$secret = GetServerSecret();
if (!isset($secret))
    $secret = '';

$connectivity_file = './settings/connectivity.ini.sample';
if (file_exists('./settings/connectivity.ini'))
    $connectivity_file = './settings/connectivity.ini';
if (file_exists('./settings/common/connectivity.ini'))
    $connectivity_file = './settings/common/connectivity.ini';
if (file_exists('./settings/server/connectivity.ini'))
    $connectivity_file = './settings/server/connectivity.ini';
$connectivity = parse_ini_file($connectivity_file, true);
$locations = LoadLocations();
$loc = ParseLocations($locations);
$page_keywords = array('Traceroute','WebPageTest','Website Speed Test','Test');
$page_description = "Test network path from multiple locations around the world (traceroute).";
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest - Traceroute diagnostic</title>
        <?php $gaTemplate = 'Traceroute'; include ('head.inc'); ?>
    </head>
    <body class="home<?php if ($COMPACT_MODE) {echo ' compact';} ?>">
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
            $tab = 'Home';
            include 'header.inc';
            ?>
            <h1 class="attention">Test. Optimize. Repeat.</h1>
            <form name="urlEntry" id="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return ValidateInput(this)">

            <input type="hidden" name="type" value="traceroute">
            <input type="hidden" name="vo" value="<?php echo htmlspecialchars($owner);?>">
            <?php
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
            ?>


            <div id="test_box-container">
                <ul class="ui-tabs-nav">
                    <li class="analytical_review"><a href="/"><?php echo file_get_contents('./images/icon-advanced-testing.svg'); ?>Advanced Testing</a></li>
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
                    <li class="visual_comparison"><a href="/video/"><?php echo file_get_contents('./images/icon-visual-comparison.svg'); ?>Visual Comparison</a></li>
                    <li class="traceroute ui-state-default ui-corner-top ui-tabs-selected ui-state-active"><a href="#"><?php echo file_get_contents('./images/icon-traceroute.svg'); ?>Traceroute</a></li>
                </ul>
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <li>
                        <label for="url" class="vis-hidden">Enter URL to test</label>    
                        <input type="text" name="url" id="url" required placeholder="Host Name/IP Address" class="text large" onkeypress="if (event.keyCode == 32) {return false;}">
                        <?php
                            if (strlen($siteKey)) {
                                echo "<button data-sitekey=\"$siteKey\" data-callback='onRecaptchaSubmit' class=\"g-recaptcha start_test\">Start Test &#8594;</button>";
                            } else {
                                echo '<input type="submit" name="submit" value="Start Test &#8594;" class="start_test">';
                            }
                            ?></li>
                        <li>
                            <label for="location">Test Location</label>
                            <select name="where" id="location">
                                <?php
                                foreach($loc['locations'] as &$location)
                                {
                                    $selected = '';
                                    if( $location['checked'] )
                                        $selected = 'selected';

                                    echo "<option value=\"{$location['name']}\" $selected>{$location['label']}</option>";
                                }
                                ?>
                            </select>
                            <?php if( GetSetting('map') ) { ?>
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
                        <li class="hidden">
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
                        </li>
                        <li>
                            <label for="number_of_tests">
                                Number of Tests to Run<br>
                                <small>Up to <?php echo GetSetting('maxruns', 9); ?></small>
                            </label>
                            <input id="number_of_tests" type="number"  class="text short" name="runs" value="3">
                        </li>
                    </ul>
                </div>
            </div>

            <div id="location-dialog" style="display:none;">
                <h3>Select Test Location</h3>
                <div id="map">
                </div>
                <p>
                    <select id="location2">
                        <?php
                        foreach($loc['locations'] as &$location)
                        {
                            $selected = '';
                            if( $location['checked'] )
                                $selected = 'SELECTED';

                            echo "<option value=\"{$location['name']}\" $selected>{$location['label']}</option>";
                        }
                        ?>
                    </select>
                    <input id="location-ok" type=button class="simplemodal-close" value="OK">
                </p>
            </div>
            </form>
            <?php
            include(__DIR__ . '/include/home-subsections.inc');
            ?>
            <?php include('footer.inc'); ?>
        </div>

        <script type="text/javascript">
        <?php
            $max_runs = GetSetting('maxruns', 9);
            echo "var maxRuns = $max_runs;\n";
            echo "var locations = " . json_encode($locations) . ";\n";
            echo "var connectivity = " . json_encode($connectivity) . ";\n";
            $maps_api_key = GetSetting('maps_api_key');
            if ($maps_api_key) {
                echo "var mapsApiKey = '$maps_api_key';";
            }
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
        if( isset($loc['key']) )
            unset( $loc['key'] );
        if( isset($loc['remoteDir']) )
            unset( $loc['remoteDir'] );
    }

    return $locations;
}

?>
