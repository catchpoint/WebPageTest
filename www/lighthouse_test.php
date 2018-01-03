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
$lighthouse = parse_ini_file('./settings/lighthouse.ini', true);
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Lighthouse Test</title>
        <?php $gaTemplate = 'Main'; include ('head.inc'); ?>
        <style>
        #description { min-height: 2em; padding-left: 170px; width:380px;}
        </style>
    </head>
    <body>
        <div class="page">
            <?php
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
            <input type="hidden" name="runs" value="1">
            <input type="hidden" name="fvonly" value="1">
            <input type="hidden" name="mobile" value="1">
            <input type="hidden" name="type" value="lighthouse">

            <h2 class="cufon-dincond_black">Run a Chrome Lighthouse Test</h2>

            <div id="test_box-container">
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <li><input type="text" name="url" id="url" value="<?php echo $url; ?>" class="text large" onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}" onkeypress="if (event.keyCode == 32) {return false;}"></li>
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
        var profileChanged = function() {
          var sel = document.getElementById("location");
          var location = sel.options[sel.selectedIndex].value;
          var d = new Date();
          d.setTime(d.getTime() + (365*24*60*60*1000));
          document.cookie = "lhloc=" + location + ";" + "expires=" + d.toUTCString() + ";path=/";          
        };
        </script>
    </body>
</html>
