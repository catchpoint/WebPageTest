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
$locations = LoadLocations();
$loc = ParseLocations($locations);

$page_keywords = array('Comparison','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Comparison Test$testLabel.";
?>

<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Comparison Test</title>
        <?php $gaTemplate = 'PSS'; include ('head.inc'); ?>
        <style type="text/css">
            .test_box input.text.large {width: 300px; margin-right: 10px;}
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $navTabs = array(   'New Comparison' => FRIENDLY_URLS ? '/blink' : '/blink.php' );
            if( strlen($_GET['bid']) )
                $navTabs['Test Result'] = FRIENDLY_URLS ? "/result/{$_GET['bid']}/" : "/results.php?test={$_GET['bid']}";
            $tab = 'New Comparison';
            define('NAV_NO_SHARE', true);
            include 'header.inc';
            
            if( $supportsAuth && !($admin || strpos($_COOKIE['google_email'], '@google.com') !== false) )
            {
                echo '<h1 class="centered">Access Denied</h1>';
            }
            else
            {
            ?>
            <form name="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return PrepareBlinkTest(this)">
            
            <input type="hidden" name="private" value="1">
            <input type="hidden" name="view" value="blink">
            <input type="hidden" name="label" value="">
            <input type="hidden" name="video" value="1">
            <input type="hidden" name="priority" value="0">
            <input type="hidden" name="runs" value="5">
            <input type="hidden" name="bulkurls" value="">
            <input type="hidden" name="mv" value="1">
            <input type="hidden" name="fvonly" value="1">
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

            <h2 class="cufon-dincond_black">Comparison Test</h2>
            
            <div id="test_box-container">
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <li><input type="text" name="original_1" id="original_1" value="Enter original URL 1" class="text large" onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}">
                        <input type="text" name="blink_1" id="blink_1" value="Enter blink URL 1" class="text large" onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}"></li>
                        <li><input type="text" name="original_2" id="original_2" value="Enter original URL 2" class="text large" onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}">
                        <input type="text" name="blink_2" id="blink_2" value="Enter blink URL 2" class="text large" onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}"></li>
                        <li>
                            <label for="location">Test From</label>
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
                            <?php if( $settings['map'] ) { ?>
                            <input id="change-location-btn" type=button onclick="SelectLocation();" value="Select from Map">
                            <?php } ?>
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
                        <li>
                            <label for="location">Connection</label>
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
                            <br>
                            <table class="configuration hidden" id="bwTable">
                                <tr>
                                    <th>BW Down</th>
                                    <th>BW Up</th>
                                    <th>Latency</th>
                                    <th>Packet Loss</th>
                                </tr>
                                <tr>
                                    <?php
                                        echo '<td class="value"><input id="bwDown" type="text" name="bwDown" style="width:3em; text-align: right;" value="' . $loc['bandwidth']['down'] . '"> Kbps</td>';
                                        echo '<td class="value"><input id="bwUp" type="text" name="bwUp" style="width:3em; text-align: right;" value="' . $loc['bandwidth']['up'] . '"> Kbps</td>';
                                        echo '<td class="value"><input id="latency" type="text" name="latency" style="width:3em; text-align: right;" value="' . $loc['bandwidth']['latency'] . '"> ms</td>';
                                        echo '<td class="value"><input id="plr" type="text" name="plr" style="width:3em; text-align: right;" value="' . $loc['bandwidth']['plr'] . '"> %</td>';
                                    ?>
                                </tr>
                            </table>
                        </li>
                        <li>
                            <label for="wait">Expected Wait</label>
                            <span id="wait"></span>
                        </li>
                    </ul>
                </div>
            </div>

            <div id="start_test-container">
                <p><input type="submit" name="submit" value="" class="start_test"></p>
                </div>
            </div>
            <div class="cleared"><br></div>

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
            }
            include('footer.inc'); 
            ?>
        </div>

        <script type="text/javascript">
        <?php 
            echo "var maxRuns = {$settings['maxruns']};\n";
            echo "var locations = " . json_encode($locations) . ";\n";
            echo "var connectivity = " . json_encode($connectivity) . ";\n";

            $sponsors = parse_ini_file('./settings/sponsors.ini', true);
            if( strlen($GLOBALS['cdnPath']) )
            {
                foreach( $sponsors as &$sponsor )
                {
                    if( isset($sponsor['logo']) )
                        $sponsor['logo'] = $GLOBALS['cdnPath'] . $sponsor['logo'];
                    if( isset($sponsor['logo_big']) )
                        $sponsor['logo_big'] = $GLOBALS['cdnPath'] . $sponsor['logo_big'];
                }
            }
            echo "var sponsors = " . json_encode($sponsors) . ";\n";
        ?>
        </script>
        <script type="text/javascript" src="<?php echo $GLOBALS['cdnPath']; ?>/js/test.js?v=<?php echo VER_JS_TEST;?>"></script>
        <script type="text/javascript">
            function PrepareBlinkTest(form)
            {
                var o1 = form.original_1.value;
                var o2 = form.original_2.value;
                var b1 = form.blink_1.value;
                var b2 = form.blink_2.value;
                if( o1 == "" || o1.indexOf(' ') >= 0 )
                {
                    alert( "Please enter an original URL to test." );
                    form.original_1.focus();
                    return false;
                }
                if( o2 == "" || o2.indexOf(' ') >= 0 )
                {
                    alert( "Please enter an original URL to test." );
                    form.original_2.focus();
                    return false;
                }
                if( b1 == "" || b1.indexOf(' ') >= 0 )
                {
                    alert( "Please enter a blink URL to test." );
                    form.blink_1.focus();
                    return false;
                }
                if( b2 == "" || b2.indexOf(' ') >= 0 )
                {
                    alert( "Please enter a blink URL to test." );
                    form.blink_2.focus();
                    return false;
                }
                
                form.label.value = 'Blink Comparison';
                
                // build the batch-url list
                var batch = "[script]\nlabel=Optimized\nnavigate\t" + b1 +"\n";
                batch += "[script]\nlabel=Original\nnavigate\t" + o1 + "\n";
                batch += "[script]\nlabel=Optimized Cached\nlogdata\t0\nnavigate\t" + b1 + "\nlogdata\t1\nnavigate\t" + b2 +"\n";
                batch += "[script]\nlabel=Original Cached\nlogdata\t0\nnavigate\t" + o1 + "\nlogdata\t1\nnavigate\t" + o2 +"\n";
                form.bulkurls.value=batch;
                
                return true;
            }

        </script>
    </body>
</html>


<?php
/**
* Load the location information
* 
*/
function LoadLocations()
{
    $locations = parse_ini_file('./settings/locations.ini', true);
    FilterLocations( $locations, 'blink', array('IE', '6', '7', '8', '9', 'dynaTrace') );
    //FilterLocations( $locations);
    
    // strip out any sensitive information
    foreach( $locations as $index => &$loc )
    {
        if( isset($loc['browser']) )
        {
            GetPendingTests($index, $count, $avgTime);
            if( !$avgTime )
                $avgTime = 30;  // default to 30 seconds if we don't have any history
            $loc['backlog'] = $count;
            $loc['avgTime'] = $avgTime;
            $loc['testers'] = GetTesterCount($index);
            $loc['wait'] = -1;
            if( $loc['testers'] )
            {
                $testCount = 20;
                if( $loc['testers'] > 1 )
                    $testCount = 10;
                $loc['wait'] = ceil((($testCount + ($count / $loc['testers'])) * $avgTime) / 60);
            }
        }
        
        unset( $loc['localDir'] );
        unset( $loc['key'] );
        unset( $loc['remoteDir'] );
    }
    
    return $locations;
}

?>