<?php
if( !defined('BARE_UI') )
    define('BARE_UI', true);
include 'common.inc';

// load the secret key (if there is one)
$secret = '';
$keys = parse_ini_file('./settings/keys.ini', true);
if( $keys && isset($keys['server']) && isset($keys['server']['secret']) )
  $secret = trim($keys['server']['secret']);
    
$connectivity = parse_ini_file('./settings/connectivity.ini', true);
$page_keywords = array('Comparison','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Comparison Test$testLabel.";
?>

<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Comparison Test</title>
        <?php $gaTemplate = 'PSS'; include ('head.inc'); ?>
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
                if (PreparePSSTest(form)) {
                  form.submit();
                } else {
                  grecaptcha.reset();
                }
              }
              </script>
              <?php
            }
            $navTabs = array('New Comparison' => '/optimized');
            if( array_key_exists('pssid', $_GET) && strlen($_GET['pssid']) ) {
                $pssid = htmlspecialchars($_GET['pssid']);
                $navTabs['Test Result'] = FRIENDLY_URLS ? "/result/$pssid/" : "/results.php?test=$pssid";
            }
            $tab = 'New Comparison';
            include 'header.inc';
            ?>
            <form id="urlEntry" name="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return PreparePSSTest(this)">
            
            <input type="hidden" name="private" value="1">
            <input type="hidden" name="view" value="weblite">
            <input type="hidden" name="label" value="">
            <input type="hidden" name="video" value="1">
            <input type="hidden" name="runs" value="1">
            <input type="hidden" name="priority" value="0">
            <input type="hidden" name="timeline" value="0">
            <input type="hidden" name="mobile" value="1">
            <input type="hidden" name="timeout" value="600">
            <input type="hidden" name="location" value="Dulles:Chrome.2G">
            <input type="hidden" name="web10" value="0">
            <input type="hidden" name="fvonly" value="1">
            <input type="hidden" name="bulkurls" value="">
            <input type="hidden" name="vo" value="<?php echo $owner;?>">
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
            <h2 class="cufon-dincond_black"><small>Measure your site performance when optimized by the Google <a href="http://googlewebmastercentral.blogspot.com/2015/04/faster-and-lighter-mobile-web-pages-for.html">optimized pages transcoder</a>.</small></h2>
            <p>Please be patient.  This test loads the page on a typical 2G connection <a href="https://github.com/facebook/augmented-traffic-control/blob/master/utils/profiles/2G-DevelopingUrban.json">(35Kbps, 1.3s RTT)</a> and can take 10 minutes to complete (longer if there are other tests running).</p>
            <div id="test_box-container">
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <?php
                        $default = 'Enter a Website URL';
                        $testurl = trim($_GET['url']);
                        if( strlen($testurl) ) {
                            echo "<li><input type=\"text\" name=\"testurl\" id=\"testurl\" value=\"" . htmlspecialchars($testurl) . "\" class=\"text large\"></li>\n";
                        } else {
                          echo "<li><input type=\"text\" name=\"testurl\" id=\"testurl\" value=\"$default\" class=\"text large\" onfocus=\"if (this.value == this.defaultValue) {this.value = '';}\" onblur=\"if (this.value == '') {this.value = this.defaultValue;}\"></li>\n";
                        }
                        ?>
                    </ul>
                </div>
            </div>

            <div id="start_test-container">
                <?php
                if (strlen($siteKey)) {
                  echo "<p><button id=\"start_test-button\" data-sitekey=\"$siteKey\" data-callback='onRecaptchaSubmit' class=\"g-recaptcha start_test\"></button></p>";
                } else {
                  echo '<p><input id="start_test-button" type="submit" name="submit" value="" class="start_test"></p>';
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
            function PreparePSSTest(form)
            {
                var url = form.testurl.value;
                if( url == "" || url == "Enter a Website URL" )
                {
                    alert( "Please enter an URL to test." );
                    form.testurl.focus();
                    return false;
                }
                
                if (url.substring(0, 4) != 'http')
                  url = 'http://' + url;
                form.label.value = 'Optimized Pages Comparison for ' + url;
                form.bulkurls.value = "Original=" + url + "\nOptimized by Google=http://icl.googleusercontent.com/?lite_url=" + encodeURIComponent(url);
                                
                return true;
            }
        <?php
        if (isset($_REQUEST['start']) && $_REQUEST['start'] && isset($_REQUEST['url'])) {
          echo "PreparePSSTest(document.getElementById('urlEntry'));\n";
          echo "document.getElementById('urlEntry').submit();\n";
        }
        ?>
        </script>
    </body>
</html>
