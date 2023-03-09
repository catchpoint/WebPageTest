<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
//$REDIRECT_HTTPS = true;
include 'common.inc';

$current_user = $request_context->getUser();
$is_paid = !is_null($current_user) ? $current_user->isPaid() : false;

$headless = false;
if (GetSetting('headless')) {
    $headless = true;
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
$placeholder = 'Enter a Website URL';
$profile_file = SETTINGS_PATH . '/profiles_webvitals.ini';
if (file_exists(SETTINGS_PATH . '/common/profiles_webvitals.ini')) {
    $profile_file = SETTINGS_PATH . '/common/profiles_webvitals.ini';
}
if (file_exists(SETTINGS_PATH . '/server/profiles_webvitals.ini')) {
    $profile_file = SETTINGS_PATH . '/server/profiles_webvitals.ini';
}
$profiles = parse_ini_file($profile_file, true);
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest - Website Performance and Optimization Test</title>
        <?php include('head.inc');?>
        <style>


        </style>
    </head>
    <body class="home feature-pro">
            <?php
            $tab = 'Start Test';
            include 'header.inc';
            if (!$headless) {
                ?>
                <?php include("home_header.php"); ?>

        <div class="home_content_contain">
        <div class="home_content">

            <form name="urlEntry" id="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return ValidateInput(this)">

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
                ?>


            <div id="test_box-container" class="home_responsive_test">
                <?php
                $currNav = "Core Web Vitals";
                include("testTypesNav.php");
                ?>

                <div id="analytical-review" class="test_box">
                    <ul class="input_fields home_responsive_test_top">
                        <li>
                        <label for="url" class="vis-hidden">Enter URL to test</label>
                        <?php
                        if (isset($_REQUEST['url']) && strlen($_REQUEST['url'])) {
                            echo "<input type='text' name='url' id='url' inputmode='url' placeholder='$placeholder' value='$url' class='text large' autocorrect='off' autocapitalize='off' onkeypress='if (event.keyCode == 32) {return false;}'>";
                        } else {
                            echo "<input type='text' name='url' id='url' inputmode='url' placeholder='$placeholder' class='text large' autocorrect='off' autocapitalize='off' onkeypress='if (event.keyCode == 32) {return false;}'>";
                        }
                        ?>
                        </li>
                        <li class="test_main_config">

                          <div class="test_presets">
                                <div class="fieldrow">
                                  <label for="webvital_profile">Test Configuration:</label>
                                  <select name="webvital_profile" id="webvital_profile" onchange="profileChanged()">
                                      <?php
                                        if (isset($profiles) && count($profiles)) {
                                            foreach ($profiles as $name => $profile) {
                                                $selected = '';
                                                if ($name == $_COOKIE['wvProfile']) {
                                                    $selected = 'selected';
                                                }
                                                echo "<option value=\"$name\" $selected>{$profile['label']}</option>";
                                            }
                                            if (isset($lastGroup)) {
                                                echo "</optgroup>";
                                            }
                                        }
                                        ?>
                                  </select>
                              </div>
                              <div class="fieldrow" id="description"></div>
                              <?php if ($is_paid) : ?>
                                  <div class="fieldrow">
                                      <label class="full" for="private"><input type="checkbox" name="private" id="private" class="checkbox"> Make Test Private <small>Private tests are only visible to your account</small></label>
                                  </div>
                              <?php endif; ?>
                            </div>
                            <div>
                              <input type="submit" name="submit" value="Start Test &#8594;" class="start_test">
                            </div>
                        </li>
                    </ul>
                </div>
            </div>


            </form>




                <?php
            } // $headless
            ?>

</div><!--home_content_contain-->
        </div><!--home_content-->

        <div class="home_content_contain">
          <iframe id="vitals-content" frameBorder="0" scrolling="no" height="3370" src="https://www.product.webpagetest.org/second"></iframe>
            </div><!--home_content_contain-->

            <div class="home_content_contain">
        <div class="home_content">

        <?php
          include('footer.inc');
        ?>
          </div><!--home_content_contain-->
        </div><!--home_content-->
        </div>
        <script>
        <?php
          echo "var profiles = " . json_encode($profiles) . ";\n";
        ?>
        var wptStorage = window.localStorage || {};

        var profileChanged = function() {
          var sel = document.getElementById("webvital_profile");
          var txt = document.getElementById("description");
          var profile = sel.options[sel.selectedIndex].value;
          var description = "";
          if (profiles[profile] !== undefined) {
            var d = new Date();
            d.setTime(d.getTime() + (365*24*60*60*1000));
            document.cookie = "wvProfile=" + profile + ";" + "expires=" + d.toUTCString() + ";path=/";
            if (profiles[profile]['description'] !== undefined)
              description = profiles[profile]['description'];
          }
          txt.innerHTML = description;
        };
        profileChanged();
        </script>
        <script src="<?php echo $GLOBALS['cdnPath']; ?>/assets/js/test.js?v=<?php echo VER_JS_TEST;?>"></script>
    </body>
</html>
