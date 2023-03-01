<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
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
$placeholder = 'Enter a website URL...';
$lighthouse = [];
if (file_exists('./settings/server/lighthouse.ini')) {
    $lighthouse = parse_ini_file('./settings/server/lighthouse.ini', true);
} elseif (file_exists('./settings/common/lighthouse.ini')) {
    $lighthouse = parse_ini_file('./settings/common/lighthouse.ini', true);
} elseif (file_exists('./settings/lighthouse.ini')) {
    $lighthouse = parse_ini_file('./settings/lighthouse.ini', true);
}
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest - Lighthouse Test</title>
        <?php include('head.inc'); ?>
        <style>
        #description { min-height: 2em; padding-left: 170px; width:380px;}
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
            <input type="hidden" name="runs" value="1">
            <input type="hidden" name="fvonly" value="1">
            <input type="hidden" name="mobile" value="1">
            <input type="hidden" name="type" value="lighthouse">





            <div id="test_box-container" class="home_responsive_test">
                <?php
                $currNav = "Lighthouse";
                include("testTypesNav.php");
                ?>

                <div id="analytical-review" class="test_box">
                <p>Run <a href="https://developers.google.com/web/tools/lighthouse/" target="_blank" rel="noopener">Lighthouse</a> on an emulated mobile device on a 3G network. Running the test will give you the top level scores for all the categories Lighthouse runs on, as well as individual level reports.</p>

                    <ul class="input_fields home_responsive_test_top">
                        <li><input type="text" name="url" id="url" class="text large" <?php echo " placeholder='$placeholder'"; ?> onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}" onkeypress="if (event.keyCode == 32) {return false;}">
                        </li>
                        <li>

                        <li class="test_main_config">

                          <div class="test_presets">
                                <div class="fieldrow">
                                <label for="location">Test Location:</label>
                                  <select name="location" id="location" onchange="profileChanged()">
                                  <?php
                                    if (!empty($lighthouse['locations'])) {
                                        foreach ($lighthouse['locations'] as $id => $label) {
                                            $selected = '';
                                            if ($id === $_COOKIE['lhloc']) {
                                                $selected = 'selected';
                                            }
                                            echo "<option value=\"$id\" $selected>{$label}</option>";
                                        }
                                        if (isset($lastGroup)) {
                                            echo "</optgroup>";
                                        }
                                    }
                                    ?>
                                  </select>
                              </div>
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

            <?php include('footer.inc'); ?>
            </div><!--home_content_contain-->
        </div><!--home_content-->
        </div>

        <script>
        var maxRuns = 3;
        var profileChanged = function() {
          var sel = document.getElementById("location");
          var location = sel.options[sel.selectedIndex].value;
          var d = new Date();
          d.setTime(d.getTime() + (365*24*60*60*1000));
          document.cookie = "lhloc=" + location + ";" + "expires=" + d.toUTCString() + ";path=/";
        };
        </script>
        <script src="<?php echo $GLOBALS['cdnPath']; ?>/assets/js/test.js?v=<?php echo VER_JS_TEST;?>"></script>
    </body>
</html>