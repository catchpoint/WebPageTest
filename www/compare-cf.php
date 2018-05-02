<?php
if( !defined('BARE_UI') )
    define('BARE_UI', true);
include 'common.inc';

// load the secret key (if there is one)
$secret = '';
$keys = parse_ini_file('./settings/keys.ini', true);
if( $keys && isset($keys['server']) && isset($keys['server']['secret']) )
  $secret = trim($keys['server']['secret']);
    
$page_keywords = array('Comparison','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Cloudflare Comparison Test$testLabel.";
?>

<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Comparison Test</title>
        <?php $gaTemplate = 'CFCompare'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $siteKey = GetSetting("recaptcha_site_key", "");
            if (!isset($uid) && !isset($user) && !isset($this_user) && strlen($siteKey)) {
              echo "<script src=\"https://www.google.com/recaptcha/api.js\" async defer></script>\n";
              ?>
              <script>
              function onRecaptchaSubmit(token) {
                var form = document.getElementById("urlEntry");
                if (PrepareComparisonTest(form)) {
                  form.submit();
                } else {
                  grecaptcha.reset();
                }
              }
              </script>
              <?php
            }
            $navTabs = array('New Comparison' => FRIENDLY_URLS ? '/compare' : '/compare-cf.php' );
            if( isset($_GET['pssid']) && strlen($_GET['pssid']) ) {
                $pssid = htmlspecialchars($_GET['pssid']);
                $navTabs['Test Result'] = FRIENDLY_URLS ? "/result/$pssid/" : "/results.php?test=$pssid";
            }
            $tab = 'New Comparison';
            include 'header.inc';
            ?>
            <form name="urlEntry" id="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return PrepareComparisonTest(this)">
            
            <input type="hidden" name="private" value="1">
            <input type="hidden" name="view" value="cf">
            <input type="hidden" name="label" value="">
            <input type="hidden" name="video" value="1">
            <input type="hidden" name="shard" value="1">
            <input type="hidden" name="priority" value="0">
            <input type="hidden" name="timeline" value="0">
            <input type="hidden" name="mv" value="1">
            <input type="hidden" name="web10" value="0">
            <input type="hidden" name="fvonly" value="1">
            <input type="hidden" name="location" value="Dulles:Chrome.3G">
            <input type="hidden" name="mobile" value="1">
            <input type="hidden" name="runs" value="3">
            <input type="hidden" name="bulkurls" value="">
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
            <h2 class="cufon-dincond_black"><small>Evaluate the impact of <a href="https://www.cloudflare.com/">Cloudflare</a> on page load performance<br>(site must already be running on Cloudflare).</small></h2>
            <div id="test_box-container">
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        URL to Test: <br><br>
                        <?php
                        $default = 'Enter a Website URL';
                        $testurl = trim($_GET['url']);
                        if( strlen($testurl) )
                            $default = htmlspecialchars($testurl);
                        echo "<li><input type=\"text\" name=\"testurl\" id=\"testurl\" value=\"$default\" class=\"text large\" onfocus=\"if (this.value == this.defaultValue) {this.value = '';}\" onblur=\"if (this.value == '') {this.value = this.defaultValue;}\"></li>\n";
                        ?>
                    </ul>
                </div>
            </div>

            <div id="start_test-container">
                <?php
                if (strlen($siteKey)) {
                  echo "<p><button id=\"start_test-button\" data-sitekey=\"$siteKey\" data-callback='onRecaptchaSubmit' class=\"g-recaptcha start_test\"></button></p>";
                } else {
                  echo '<p><input type="submit"  id="start_test-button" name="submit" value="" class="start_test"></p>';
                }
                ?>
            </div>
            <div class="cleared"><br></div>
            </form>
            <?php
            include('footer.inc'); 
            ?>
        </div>

        <script type="text/javascript">
            var maxRuns=9;
            function PrepareComparisonTest(form) {
                var url = form.testurl.value;
                if( url == "" || url == "Enter a Website URL" )
                {
                    alert( "Please enter an URL to test." );
                    form.testurl.focus();
                    return false;
                }
                
                form.label.value = 'Cloudflare Performance Comparison for ' + url;
                if (form['mobile'] && !$("#morelocs").is(":visible")) {
                    if (form.mobile.checked) {
                        var loc = $('#connection').val();
                        if (loc.indexOf('.Cable') > 0) {
                            loc = loc.replace('.Cable', '.3G');
                            $('#connection').val(loc); 
                        }
                    }
                }
                var offUrl = url;
                if (url.indexOf("?") > 0)
                  offUrl = offUrl + "&";
                else
                  offUrl = offUrl + "?";
                offUrl += "cf=off";
                form.bulkurls.value = "Cloudflare Disabled=" + offUrl + "\n" +
                                      "Cloudflare Enabled=" + url + "\n";
                                
                return true;
            }
        </script>
    </body>
</html>
