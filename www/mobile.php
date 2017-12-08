<?php
include 'common.inc';
$tid=$_GET['tid'];
$run=$_GET['run'];
$page_keywords = array('Mobile','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Run a free website speed test from around the globe using real mobile devices.";
?>

<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Mobile Test</title>
        <?php $gaTemplate = 'Mobile Test'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Home';
            $adLoc = 'Montreal_IE7';
            include 'header.inc';
            ?>
            <form name="mobileForm" action="http://mobitest.akamai.com/m/bg/runtest.cgi" method="POST" enctype="multipart/form-data" >

            <h2 class="cufon-dincond_black">Test a website's performance</h2>

            <div id="test_box-container">
                <ul class="ui-tabs-nav">
                    <li class="analytical_review"><a href="/">Analytical Review</a></li>
                    <li class="visual_comparison"><a href="/video/">Visual Comparison</a></li>
                    <li class="mobile_test ui-state-default ui-corner-top ui-tabs-selected ui-state-active"><a href="#">Mobile</a></li>
                    <li class="traceroute"><a href="/traceroute">Traceroute</a></li>
                </ul>
                <div id="mobile_test" class="test_box">
                    <p>Mobile testing is provided by <a href="http://mobitest.akamai.com/m/index.cgi">Mobitest</a> and you will be taken to the Akamai website for the results.</p>
                    <ul class="input_fields">
                        <li><input type="text" name="weburl" value="Enter Your Website URL"  id="url"  class="text large" onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}" /></li>
                    </ul>
                    <div id="mobile_options">
                        <ul class="input_fields">
                            <li><input type="hidden" name="source" value="webpagetest" /></li>
                            <li>
                                <select name="device">
                                <option value="">Select a device</option> 
                                <option value="iphone50-us">Cambridge, MA - iPhone 4 iOS 5</option>
                                <option value="munich-iphone1">Munich, Germany - iPhone 4 iOS 5</option>
                                <option value="ipad-us">Washington, DC iPad iOS 5</option>
                                <option value="isim50">Ohio iPhone Simulator, 3G Speed iOS 5</option>
                                <option value="pmeenan-nexus-s">Dulles, VA Nexus S Android 2.3</option>
                                </select>
                            </li>
                            <li>
                                <select name="numtest">
                                <option value="1">1 Run</option>
                                <option value="2">2 Runs</option>
                                <option value="3">3 Runs</option>
                                </select>
                            </li>
                            <li><input type="checkbox" name="video" value="1" /><label>Enable Video Capture?</label></li>
                            <li><input type="checkbox" name="private" value="private" /><label>Make Results Private?</label></li>
                        </ul>
                    </div>
                    <div id="mobile_logo">
                        <img src="<?php echo $GLOBALS['cdnPath']; ?>/images/mobitestlogo3.png">
                    </div>
                    <div class="cleared"></div>
                </div>
            </div>

            <div id="start_test-container">
                <p><input type="submit" name="submit" value="" class="start_test"></p>
            </div>
            <div class="cleared"></div>
                
            </form>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
