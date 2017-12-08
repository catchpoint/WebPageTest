<?php 
include 'common.inc';

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
$profiles = parse_ini_file('./settings/profiles.ini', true);
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Website Performance and Optimization Test</title>
        <?php $gaTemplate = 'Main'; include ('head.inc'); ?>
        <style>
        #description { min-height: 2em; padding-left: 170px; width:380px;}
        </style>
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
            ?>

            <h2 class="cufon-dincond_black">Test a website's performance</h2>

            <div id="test_box-container">
                <ul class="ui-tabs-nav">
                    <li class="analytical_review"><a href="/">Advanced Testing</a></li>
                    <li class="easy_mode ui-state-default ui-corner-top ui-tabs-selected ui-state-active"><a href="#">Simple Testing</a></li>
                    <li class="visual_comparison"><a href="/video/">Visual Comparison</a></li>
                    <li class="traceroute"><a href="/traceroute">Traceroute</a></li>
                </ul>
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <li><input type="text" name="url" id="url" value="<?php echo $url; ?>" class="text large" onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}" onkeypress="if (event.keyCode == 32) {return false;}"></li>
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
                        <li>
                        <div id="description"></div>
                        </li>
                        <li>
                            <label for="videoCheck">Include Repeat View:<br></label>
                            <input type="checkbox" name="rv" id="rv" class="checkbox" onclick="rvChanged()">(Loads the page, closes the browser and then loads the page again)
                        </li>
                        <li>
                            <label for="videoCheck">Run Lighthouse Audit:<br></label>
                            <input type="checkbox" name="lighthouse" id="lighthouse" class="checkbox" onclick="lighthouseChanged()">(Mobile devices only)
                        </li>
                    </ul>
                </div>
            </div>

            <div id="start_test-container">
                <p><input type="submit" name="submit" value="" class="start_test"></p>
            </div>
            <div class="cleared"></div>
            </form>
            
            <?php
            } // $headless
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
    </body>
</html>
