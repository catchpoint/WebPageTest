<?php 
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';

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
if (!strlen($url)) {
  $url = 'Enter a Website URL';
}
if (file_exists('./settings/server/lighthouse.ini')) {
  $lighthouse = parse_ini_file('./settings/server/lighthouse.ini', true);  
} elseif (file_exists('./settings/common/lighthouse.ini')) {
  $lighthouse = parse_ini_file('./settings/common/lighthouse.ini', true);  
} else {
  $lighthouse = parse_ini_file('./settings/lighthouse.ini', true);
}
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPagetest - Lighthouse Test</title>
        <?php $gaTemplate = 'Main'; include ('head.inc'); ?>
        <style>
        #description { min-height: 2em; padding-left: 170px; width:380px;}
        </style>
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
            include 'header.inc';
            if (!$headless) {
            ?>
            <form name="urlEntry" id="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return ValidateInput(this)">
            
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
            ?>
            <input type="hidden" name="runs" value="1">
            <input type="hidden" name="fvonly" value="1">
            <input type="hidden" name="mobile" value="1">
            <input type="hidden" name="type" value="lighthouse">

            <h2 class="cufon-dincond_black">Run a Chrome Lighthouse Test</h2>
            <p>Run <a href="https://developers.google.com/web/tools/lighthouse/">Lighthouse</a> on an emulated mobile device on a 3G network. Running the test will give you the top level scores for all the categories Lighthouse runs on, as well as individual level reports.</p>

            <div id="test_box-container">
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <li><input type="text" name="url" id="url" value="<?php echo $url; ?>" class="text large" onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}" onkeypress="if (event.keyCode == 32) {return false;}">
                        <?php
                if (strlen($siteKey)) {
                  echo "<button data-sitekey=\"$siteKey\" data-callback='onRecaptchaSubmit' class=\"g-recaptcha start_test\">Start Test &#8594;</button>";
                } else {
                  echo '<input type="submit" name="submit" value="Start Test &#8594;" class="start_test">';
                }
                ?></li>
                        <li>
                            <label for="location">Test Location:</label>
                            <select name="location" id="location" onchange="profileChanged()">
                                <?php
                                if (isset($lighthouse) && is_array($lighthouse) && isset($lighthouse['locations']) && count($lighthouse['locations'])) {
                                  foreach($lighthouse['locations'] as $id => $label) {
                                    $selected = '';
                                    if ($id === $_COOKIE['lhloc'])
                                      $selected = 'selected';
                                    echo "<option value=\"$id\" $selected>{$label}</option>";
                                  }
                                  if (isset($lastGroup))
                                      echo "</optgroup>";
                                }
                                ?>
                            </select>
                        </li>
                    </ul>
                </div>

            </div>

            
            </form>
            <?php
            } // $headless
            ?>

            <?php include('footer.inc'); ?>
        </div>

        <script type="text/javascript">
        var maxRuns = 3;
        var profileChanged = function() {
          var sel = document.getElementById("location");
          var location = sel.options[sel.selectedIndex].value;
          var d = new Date();
          d.setTime(d.getTime() + (365*24*60*60*1000));
          document.cookie = "lhloc=" + location + ";" + "expires=" + d.toUTCString() + ";path=/";          
        };
        </script>
        <script type="text/javascript" src="<?php echo $GLOBALS['cdnPath']; ?>/js/test.js?v=<?php echo VER_JS_TEST;?>"></script> 
    </body>
</html>
