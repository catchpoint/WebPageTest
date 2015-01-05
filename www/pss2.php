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
    </head>
    <body>
        <div class="page">
            <?php
            $navTabs = array(   'New Comparison' => FRIENDLY_URLS ? '/compare' : '/pss.php' );
            if( strlen($_GET['pssid']) )
                $navTabs['Test Result'] = FRIENDLY_URLS ? "/result/{$_GET['pssid']}/" : "/results.php?test={$_GET['pssid']}";
            $navTabs += array(  'PageSpeed Service Home' => 'https://developers.google.com/speed/pagespeed/service');
            $tab = 'New Comparison';
            include 'header.inc';
            ?>
            <form name="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return PreparePSSTest(this)">
            
            <input type="hidden" name="private" value="1">
            <input type="hidden" name="view" value="pss_path">
            <input type="hidden" name="label" value="">
            <input type="hidden" name="video" value="1">
            <input type="hidden" name="priority" value="0">
            <input type="hidden" name="mv" value="1">
            <?php
                if( !array_key_exists('activity', $_REQUEST) )
                    echo '<input type="hidden" name="web10" value="1">';
            ?>
            <input type="hidden" name="fvonly" value="1">
            <input type="hidden" name="runs" value="8">
            <input type="hidden" name="discard" value="3">
            <input type="hidden" name="bodies" value="1">
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
              
              if( strlen($_GET['origin']) )
                echo '<h2 class="cufon-dincond_black"><small>Measure performance of original site vs optimized by <a href="https://developers.google.com/speed/pagespeed/service">PageSpeed Service</a></small></h2>';
              else
                echo '<h2 class="cufon-dincond_black"><small>Measure your site performance when optimized by <a href="https://developers.google.com/speed/pagespeed/service">PageSpeed Service</a></small></h2>';
            }
            ?>

            <div id="test_box-container">
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <?php
                        $default = 'URL to test';
                        $testurl = trim($_GET['url']);
                        if( strlen($testurl) )
                            $default = $testurl;
                        echo "<li><input type=\"text\" name=\"testurl\" id=\"testurl\" value=\"$default\" class=\"text large\" onfocus=\"if (this.value == this.defaultValue) {this.value = '';}\" onblur=\"if (this.value == '') {this.value = this.defaultValue;}\"></li>\n";
                        ?>
                        <li><input type="text" name="testurl_landing" id="testurl_landing" value="Landing Page" class="text large" onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}"></li>
                        <li>
                            <label for="location">Test From<br><small id="locinfo">(Using Chrome on DSL)</small></label>
                            <select name="pssloc" id="pssloc">
                                <option value="US_East" selected>US East (Virginia)</option>
                                <option value="US_West">US West (California)</option>
                                <option value="Brazil">South America (Brazil)</option>
                                <option value="Europe">Europe (Ireland)</option>
                                <option value="Asia_Singapore">Asia (Singapore)</option>
                                <option value="Asia_Tokyo">Asia (Tokyo)</option>
                                <option value="other">More Configurations...</option>
                            </select>
                        </li>
                    </ul>
                    <ul class="input_fields hidden" id="morelocs">
                        <li>
                            <label for="location">Location</label>
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
                    </ul>
                    <ul class="input_fields">
                        <li>
                            <label for="wait">Expected Wait</label>
                            <span id="wait"></span>
                        </li>
                        <?php
                        if( !$supportsAuth || ($admin || strpos($_COOKIE['google_email'], '@google.com') !== false) )
                        {
                        ?>
                        <li>
                            <label for="backend">Back-End</label>
                            <select name="backend" id="backend">
                                <option value="prod" selected>Production</option>
                                <option value="staging">Staging</option>
                                <option value="rahul">Rahul Playground</option>
                                <option value="ashish">Ashish Playground</option>
                                <option value="snagori">snagori@ Playground</option>
                            </select>
                        </li>
                        <li>
                            <label for="blank">New Blank Page<br><small>[host]/pss/wpt_blank</small></label>
                            <input type="checkbox" name="blank" id="blank" class="checkbox">
                        </li>
                        <li>
                            <label for="bodies">Save Response Bodies<br><small>Text resources only</small></label>
                            <input type="checkbox" name="bodies" id="save_bodies" class="checkbox">
                        </li>
                        <li>
                            <label for="addheaders">Custom HTTP Headers<br><br><small>One header per line in the format Header: Value.  i.e.<br><br>X-Expt-NumDomainShards: 2<br>X-MyOtherHeader: yes</small></label>
                            <textarea name="addheaders" id="addheaders" cols="0" rows="0"></textarea>
                        </li>
                        <?php
                        }
                        ?>
                    </ul>
                </div>
            </div>

            <div id="start_test-container">
                <p><input id="start_test-button" type="submit" name="submit" value="" class="start_test"></p>
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

            if( strlen($_GET['origin']) ) {
                echo "var wpt_origin=\"{$_GET['origin']}\";\n";
                echo "var wpt_use_origin=true;\n";
            } else
                echo "var wpt_use_origin=false;\n";
        ?>
        </script>
        <script type="text/javascript" src="<?php echo $GLOBALS['cdnPath']; ?>/js/test.js?v=<?php echo VER_JS_TEST;?>"></script> 
        <script type="text/javascript">
        // <![CDATA[
            function PreparePSSTest(form)
            {
                var url = form.testurl.value;
                if( url == "" || url == "Enter a Website URL" || url == "URL to test" )
                {
                    alert( "Please enter an URL to test." );
                    form.testurl.focus();
                    return false
                }
                var landing = form.testurl_landing.value;
                if( landing == "" || landing == "Landing Page" )
                {
                    alert( "Please enter a landing page to navigate from." );
                    form.testurl_landing.focus();
                    return false
                }
                var proto = url.substring(0, 6).toLowerCase();
                if (proto == 'https:') {
                    alert( "HTTPS sites are not currently supported" );
                    return false;
                }

                form.label.value = 'PageSpeed Service Comparison for ' + url;
                
                <?php
                // build the batch script
                if( strlen($_GET['origin']) ) {
                    echo 'var batch = "' .

                            '{test}\n' .
                            'label=Original\n' .
                            '{script}\n' .
                            'setDnsName\t%HOSTR%\t' . $_GET['origin'] . '\n'.
                            'navigate\t" + url + "\n' .
                            '{/script}\n' .
                            '{/test}\n' .

                            '{test}\n' .
                            'label=Optimized\n' .
                            '{script}\n' .
                            'overrideHost\t%HOSTR%\tpsa.pssdemos.com\n' .
                            'navigate\t" + url + "\n' .
                            '{/script}\n' .
                            '{/test}\n' .

                            '{test}\n' .
                            'label=Original Path\n' .
                            '{script}\n' .
                            'setDnsName\t%HOSTR%\t' . $_GET['origin'] . '\n'.
                            'logdata\t0\n' .
                            'navigate\t" + landing + "\n' .
                            'navigate\thttp://www.webpagetest.org/blank.html\n' .
                            'logdata\t1\n' .
                            'navigate\t" + url + "\n' .
                            '{/script}\n' .
                            '{/test}\n' .
                            
                            '{test}\n' .
                            'label=Optimized Path\n' .
                            '{script}\n' .
                            'logdata\t0\n' .
                            'overrideHost\t%HOSTR%\tpsa.pssdemos.com\n' .
                            'navigate\t" + landing + "\n' .
                            'navigate\tabout2\n' .
                            'logdata\t1\n' .
                            'navigate\t" + url + "\n' .
                            '{/script}\n' .
                            '{/test}\n' .
                            
                            "\";\n";
                } else {
                    echo 'var batch = "' .

                            '{test}\n' .
                            'label=Original\n' .
                            '{script}\n' .
                            'navigate\t" + url + "\n' .
                            '{/script}\n' .
                            '{/test}\n' .

                            '{test}\n' .
                            'label=Optimized\n' .
                            '{script}\n' .
                            'setDnsName\t%HOSTR%\tghs.google.com\n' .
                            'overrideHost\t%HOSTR%\tpsa.pssdemos.com\n' .
                            'navigate\t" + url + "\n' .
                            '{/script}\n' .
                            '{/test}\n' .

                            '{test}\n' .
                            'label=Original Path\n' .
                            '{script}\n' .
                            'logdata\t0\n' .
                            'navigate\t" + landing + "\n' .
                            'navigate\thttp://www.webpagetest.org/blank.html\n' .
                            'logdata\t1\n' .
                            'navigate\t" + url + "\n' .
                            '{/script}\n' .
                            '{/test}\n' .
                            
                            '{test}\n' .
                            'label=Optimized Path\n' .
                            '{script}\n' .
                            'setDnsName\t%HOSTR%\tghs.google.com\n' .
                            'overrideHost\t%HOSTR%\tpsa.pssdemos.com\n' .
                            'logdata\t0\n' .
                            'navigate\t" + landing + "\n' .
                            'navigate\tabout2\n' .
                            'logdata\t1\n' .
                            'navigate\t" + url + "\n' .
                            '{/script}\n' .
                            '{/test}\n' .
                            
                            "\";\n";
                }
                ?>
                
                  <?php
                if( !$supportsAuth || ($admin || strpos($_COOKIE['google_email'], '@google.com') !== false) )
                {
                ?>
                  var backend = form.backend.value;
                    if (backend == 'staging') {
                        batch = batch.replace(/psa\.pssdemos\.com/g, 'demo.pssplayground.com');
                    } else if (backend == 'rahul') {
                        batch = batch.replace(/psa\.pssdemos\.com/g, 'rahulbansal-wpt.pssplayground.com' + 
                            '\nsetDnsName\tproxy-rahulbansal-wpt.pssplayground.com\tghs.google.com' + 
                            '\nsetDnsName\t1-proxy-rahulbansal-wpt.pssplayground.com\tghs.google.com' + 
                            '\nsetDnsName\t2-proxy-rahulbansal-wpt.pssplayground.com\tghs.google.com' + 
                            '\nsetDnsName\t3-proxy-rahulbansal-wpt.pssplayground.com\tghs.google.com' + 
                            '\nsetDnsName\t4-proxy-rahulbansal-wpt.pssplayground.com\tghs.google.com');
                    } else if (backend == 'ashish') {
                        batch = batch.replace(/psa\.pssdemos\.com/g, 'guptaa-wpt.pssplayground.com' + 
                            '\nsetDnsName\tproxy-guptaa-wpt.pssplayground.com\tghs.google.com' + 
                            '\nsetDnsName\t1-proxy-guptaa-wpt.pssplayground.com\tghs.google.com' + 
                            '\nsetDnsName\t2-proxy-guptaa-wpt.pssplayground.com\tghs.google.com' + 
                            '\nsetDnsName\t3-proxy-guptaa-wpt.pssplayground.com\tghs.google.com' + 
                            '\nsetDnsName\t4-proxy-guptaa-wpt.pssplayground.com\tghs.google.com');
                    } else if (backend == 'snagori') {
                        batch = batch.replace(/psa\.pssdemos\.com/g, 'snagori-wpt.pssplayground.com' + 
                            '\nsetDnsName\tproxy-snagori-wpt.pssplayground.com\tghs.google.com' + 
                            '\nsetDnsName\t1-proxy-snagori-wpt.pssplayground.com\tghs.google.com' + 
                            '\nsetDnsName\t2-proxy-snagori-wpt.pssplayground.com\tghs.google.com' + 
                            '\nsetDnsName\t3-proxy-snagori-wpt.pssplayground.com\tghs.google.com' + 
                            '\nsetDnsName\t4-proxy-snagori-wpt.pssplayground.com\tghs.google.com');
                    }
                <?php
                }
                ?>
                batch = batch.replace(/about2/g, 'http://www.webpagetest.org/blank.html');

                form.bulkurls.value=batch;
                
                var shard = form.shard.value;
                if (shard != 1)
                {
                    var script = form.script.value;
                    script = "addHeader\tX-Expt-NumDomainShards: " + shard + "\n" + script;
                    form.script.value = script;
                }
                
                return true;
            }
            
            function PSSLocChanged(){
                var loc = $('#pssloc').val(); 
                if( loc == 'other' )
                {
                    $('#morelocs').show();
                    $('#locinfo').hide();
                }
                else
                {
                    $('#morelocs').hide();
                    $('#locinfo').show();
                    $('#location').val(loc); 
                    LocationChanged();
                }
            }
            PSSLocChanged();

            $("#pssloc").change(function(){
                PSSLocChanged();
            });
        // ]]>            
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
    $locations = LoadLocationsIni();
    FilterLocations( $locations, 'pss' );
    
    // strip out any sensitive information
    foreach( $locations as $index => &$loc )
    {
        if( isset($loc['browser']) )
        {
            $testCount = 26;
            if (array_key_exists('relayServer', $loc)) {
                $loc['backlog'] = 0;
                $loc['avgTime'] = 30;
                $loc['testers'] = 1;
                $loc['wait'] = ceil(($testCount * 30) / 60);
            } else {
                GetPendingTests($index, $count, $avgTime);
                if( !$avgTime )
                    $avgTime = 30;  // default to 30 seconds if we don't have any history
                $loc['backlog'] = $count;
                $loc['avgTime'] = $avgTime;
                $loc['testers'] = GetTesterCount($index);
                $loc['wait'] = -1;
                if( $loc['testers'] )
                {
                    if( $loc['testers'] > 1 )
                        $testCount = 16;
                    $loc['wait'] = ceil((($testCount + ($count / $loc['testers'])) * $avgTime) / 60);
                }
            }
        }
        
        unset( $loc['localDir'] );
        unset( $loc['key'] );
        unset( $loc['remoteDir'] );
        unset( $loc['relayKey'] );
    }
    
    return $locations;
}

?>