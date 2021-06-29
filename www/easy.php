<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
//$REDIRECT_HTTPS = true;
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
$placeholder = 'Enter a Website URL';
$profile_file = __DIR__ . '/settings/profiles.ini';
if (file_exists(__DIR__ . '/settings/common/profiles.ini'))
  $profile_file = __DIR__ . '/settings/common/profiles.ini';
if (file_exists(__DIR__ . '/settings/server/profiles.ini'))
  $profile_file = __DIR__ . '/settings/server/profiles.ini';
$profiles = parse_ini_file($profile_file, true);
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest - Website Performance and Optimization Test</title>
        <?php $gaTemplate = 'Main'; include ('head.inc'); ?>
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
            if (!$headless) {
            ?>
            <h1 class="attention">Test. Optimize. Repeat.</h1>

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


            <div id="test_box-container">
                <ul class="ui-tabs-nav">
                    <li class="analytical_review">
                      <a href="/">
                        <?php echo file_get_contents('./images/icon-advanced-testing.svg'); ?>Advanced Testing</a>
                    </li>
                    <?php
                    if (file_exists(__DIR__ . '/settings/profiles_webvitals.ini') ||
                            file_exists(__DIR__ . '/settings/common/profiles_webvitals.ini') ||
                            file_exists(__DIR__ . '/settings/server/profiles_webvitals.ini')) {
                        echo "<li class=\"vitals\"><a href=\"/webvitals\">";
                        echo file_get_contents('./images/icon-webvitals-testing.svg');
                        echo "Web Vitals</a></li>";
                    }
                    ?>
                    <li class="easy_mode ui-state-default ui-corner-top ui-tabs-selected ui-state-active">
                      <a href="#">
                        <?php echo file_get_contents('./images/icon-simple-testing.svg'); ?>Simple Testing</a>
                    </li>
                    <li class="visual_comparison">
                      <a href="/video/">
                        <?php echo file_get_contents('./images/icon-visual-comparison.svg'); ?>Visual Comparison
                      </a></li>
                    <li class="traceroute">
                      <a href="/traceroute">
                        <?php echo file_get_contents('./images/icon-traceroute.svg'); ?>Traceroute
                      </a></li>
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
                              echo "<button data-sitekey=\"$siteKey\" data-callback='onRecaptchaSubmit' class=\"g-recaptcha start_test\">Start Test &#8594;</button>";
                            } else {
                              echo '<input type="submit" name="submit" value="Start Test &#8594;" class="start_test">';
                            }
                            ?>
                      </li>
                        <li>
                            <label for="profile">Test Configuration:</label>
                            <select name="profile" id="profile" onchange="profileChanged()">
                                <?php
                                if (isset($profiles) && count($profiles)) {
                                  foreach($profiles as $name => $profile) {
                                    $selected = '';
                                    if ($name == $_COOKIE['testProfile'])
                                      $selected = 'selected';
                                    echo "<option value=\"$name\" $selected>{$profile['label']}</option>";
                                  }
                                  if (isset($lastGroup))
                                      echo "</optgroup>";
                                }
                                ?>
                            </select>
                        </li>
                        <li id="description"></li>
                        <li>
                            <label for="rv">Include Repeat View:<br></label>
                            <input type="checkbox" name="rv" id="rv" class="checkbox" onclick="rvChanged()">(Loads the page, closes the browser and then loads the page again)
                        </li>
                        <li>
                            <label for="lighthouse">Run Lighthouse Audit:<br></label>
                            <input type="checkbox" name="lighthouse" id="lighthouse" class="checkbox" onclick="lighthouseChanged()">
                        </li>
                    </ul>
                </div>
            </div>


            </form>

            <?php
            } // $headless
            ?>
          <?php
          include(__DIR__ . '/include/home-subsections.inc');
          ?>
          <?php include('footer.inc'); ?>
        </div>

        <script type="text/javascript">
        <?php
          echo "var profiles = " . json_encode($profiles) . ";\n";
        ?>
        var wptStorage = window.localStorage || {};
        if (wptStorage['testrv'] != undefined)
          $('#rv').prop('checked', wptStorage['testrv']);
        if (wptStorage['lighthouse'] != undefined)
          $('#lighthouse').prop('checked', wptStorage['lighthouse']);
        var rvChanged = function() {
          wptStorage['testrv'] = $('#rv').is(':checked');
        }
        var lighthouseChanged = function() {
          wptStorage['lighthouse'] = $('#lighthouse').is(':checked');
        }

        var profileChanged = function() {
          var sel = document.getElementById("profile");
          var txt = document.getElementById("description");
          var profile = sel.options[sel.selectedIndex].value;
          var description = "";
          if (profiles[profile] !== undefined) {
            var d = new Date();
            d.setTime(d.getTime() + (365*24*60*60*1000));
            document.cookie = "testProfile=" + profile + ";" + "expires=" + d.toUTCString() + ";path=/";
            if (profiles[profile]['description'] !== undefined)
              description = profiles[profile]['description'];
          }
          txt.innerHTML = description;
        };
        profileChanged();
        </script>
        <script type="text/javascript" src="<?php echo $GLOBALS['cdnPath']; ?>/js/test.js?v=<?php echo VER_JS_TEST;?>"></script>
    </body>
</html>
