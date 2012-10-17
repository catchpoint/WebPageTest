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

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
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
            $navTabs += array(  'Page Speed Service Home' => 'http://code.google.com/speed/pss', 
                                'Sample Tests' => 'http://code.google.com/speed/pss/gallery.html',
                                'Sign Up!' => 'https://docs.google.com/a/google.com/spreadsheet/viewform?hl=en_US&formkey=dDdjcmNBZFZsX2c0SkJPQnR3aGdnd0E6MQ');
            $tab = 'New Comparison';
            include 'header.inc';
            ?>
            <form name="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return PreparePSSTest(this)">
            
            <input type="hidden" name="private" value="1">
            <input type="hidden" name="view" value="pss">
            <input type="hidden" name="label" value="">
            <input type="hidden" name="video" value="1">
            <input type="hidden" name="priority" value="0">
            <input type="hidden" name="mv" value="1">
            <input type="hidden" name="web10" value="1">
            <input type="hidden" name="fvonly" value="1">
            <input type="hidden" name="sensitive" value="1">
            <?php
            if( strlen($_GET['origin']) )
            {
                echo "<input type=\"hidden\" name=\"script\" value=\"setDnsName&#09;%HOSTR%&#09;{$_GET['origin']}&#10;navigate&#09;%URL%\">\n";
                echo "<input type=\"hidden\" name=\"runs\" value=\"5\">\n";
            }
            else
            {
                echo "<input type=\"hidden\" name=\"script\" value=\"if&#09;run&#09;1&#10;if&#09;cached&#09;0&#10;addHeader&#09;X-PSA-Blocking-Rewrite: pss_blocking_rewrite&#09;%HOST_REGEX%&#10;endif&#10;endif&#10;setDnsName&#09;%HOSTR%&#09;ghs.google.com&#10;overrideHost&#09;%HOSTR%&#09;psa.pssdemos.com&#10;navigate&#09;%URL%\">\n";
                echo "<input type=\"hidden\" name=\"runs\" value=\"8\">\n";
                echo "<input type=\"hidden\" name=\"discard\" value=\"1\">\n";
            }
            ?>
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
                echo '<h2 class="cufon-dincond_black"><small>Measure performance of original site vs optimized by <a href="http://code.google.com/speed/pss">Page Speed Service</a></small></h2>';
              else
                echo '<h2 class="cufon-dincond_black"><small>Measure your site performance when optimized by <a href="http://code.google.com/speed/pss">Page Speed Service</a></small></h2>';
            }
            ?>

            <div id="test_box-container">
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <?php
                        $default = 'Enter a Website URL';
                        $testurl = trim($_GET['url']);
                        if( strlen($testurl) )
                            $default = $testurl;
                        echo "<li><input type=\"text\" name=\"testurl\" id=\"testurl\" value=\"$default\" class=\"text large\" onfocus=\"if (this.value == this.defaultValue) {this.value = '';}\" onblur=\"if (this.value == '') {this.value = this.defaultValue;}\"></li>\n";
                        ?>
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
                        <?php
                        //if( !strlen($_GET['origin']) )
                        if (false)
                        {
                        ?>
                        <li>
                            <label for="shard">Shard Domains</label>
                            <select name="shard" id="shard">
                                <option value="1" selected>1 domain (default)</option>
                                <option value="2">2 domains</option>
                                <option value="3">3 domains</option>
                                <option value="4">4 domains</option>
                            </select>
                        </li>
                        <?php
                        } else {
                            echo "<input type=\"hidden\" name=\"shard\" value=\"1\">\n";
                        }
                        ?>
                        <li>
                            <label for="bodies">Save Response Bodies<br><small>Text resources only</small></label>
                            <input type="checkbox" name="bodies" id="save_bodies" class="checkbox">
                        </li>
                        <li>
                            <label for="pss_advanced"><a style="color:#fff;" href="https://developers.google.com/speed/docs/pss/PrioritizeAboveTheFold">Advanced Rewriters</a></label>
                            <?php
                            $checked = '';
                            if (array_key_exists('option', $_GET) && $_GET['option'] == 'prioritize_visible_content') {
                                $checked = ' checked="checked"';
                            }
                            echo "<input type=\"checkbox\" name=\"pss_advanced\" id=\"pss_advanced\" class=\"checkbox\"$checked>\n";
                            ?>
                        </li>
                    </ul>
                    <ul class="input_fields">
                        <li>
                            <label for="backend">Optimization Settings</label>
                            <select name="backend" id="backend">
                                <option value="prod" selected>Default (Safe)</option>
                                <option value="aggressive">Aggressive</option>
                                <?php
                                if( !$supportsAuth || ($admin || strpos($_COOKIE['google_email'], '@google.com') !== false) ) {
                                    echo '<option value="staging">Staging</option>';
                                }                                    
                                ?>
                            </select>
                        </li>
                        <li>
                            <label for="wait">Expected Wait</label>
                            <span id="wait"></span>
                        </li>
                        <?php
                        if( !$supportsAuth || ($admin || strpos($_COOKIE['google_email'], '@google.com') !== false) )
                        {
                        ?>
                        <li>
                            <label for="timeline">Record Timeline<br><small>(Chrome Only)</small></label>
                            <input type="checkbox" name="timeline" id="timeline" class="checkbox">
                        </li>
                        <li>
                            <label for="addheaders">Custom HTTP Headers<br><br><small>One header per line in the format Header: Value.  i.e.<br><br>ModPagespeedDomainShardCount: 2<br>X-MyOtherHeader: yes</small></label>
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
           
        ?>
        </script>
        <script type="text/javascript" src="<?php echo $GLOBALS['cdnPath']; ?>/js/test.js?v=<?php echo VER_JS_TEST;?>"></script> 
        <script type="text/javascript">
            function PreparePSSTest(form)
            {
                var url = form.testurl.value;
                if( url == "" || url == "Enter a Website URL" )
                {
                    alert( "Please enter an URL to test." );
                    form.url.focus();
                    return false
                }
                var proto = url.substring(0, 6).toLowerCase();
                if (proto == 'https:') {
                    alert( "HTTPS sites are not currently supported" );
                    return false;
                }
                
                form.label.value = 'Page Speed Service Comparison for ' + url;
                
                <?php
                // build the psuedo batch-url list
                if( strlen($_GET['origin']) )
                    echo 'var batch = "Original=" + url + "\nOptimized=" + url + " noscript";' . "\n";
                else
                    echo 'var batch = "Original=" + url + " noscript\nOptimized=" + url;' . "\n";
                ?>

                form.bulkurls.value=batch;
                
                var shard = form.shard.value;
                var script = '';
                if (shard != 1)
                {
                    script = form.script.value;
                    script = "addHeader\tModPagespeedDomainShardCount: " + shard + "\n" + script;
                    form.script.value = script;
                }
                
                if (form.pss_advanced.checked) {
                    form.web10.value = 0;
                    script = form.script.value;
                    script = "addHeader\tModPagespeedFilters:+prioritize_visible_content\t%HOST_REGEX%\n" + script;
                    form.script.value = script;
                }

                <?php
                if (!array_key_exists('origin', $_GET) || !strlen($_GET['origin'])) {
                ?>
                var backend = form.backend.value;
                if (backend == 'aggressive') {
                    script = form.script.value;
                    script = "addHeader\tModPagespeedFilters:combine_css,rewrite_css,inline_import_to_link,extend_cache,combine_javascript,rewrite_javascript,resize_images,move_css_to_head,rewrite_style_attributes_with_url,convert_png_to_jpeg,convert_jpeg_to_webp,recompress_images,convert_jpeg_to_progressive,convert_meta_tags,inline_css,inline_images,inline_javascript,lazyload_images,flatten_css_imports,inline_preview_images,defer_javascript,defer_iframe\t%HOST_REGEX%\n" + script;
                    form.script.value = script;
                    form.web10.value = 0;
                } else if (backend == 'staging') {
                    script = form.script.value;
                    script = script.replace(/psa\.pssdemos\.com/g, 'demo.pssplayground.com');
                    script = script.replace(/pss_blocking_rewrite/g, 'pss_staging');
                    form.script.value = script;
                    form.web10.value = 0;
                    form.runs.value = 10;
                    form.discard.value = 1;
                }
                <?php
                }   // origin
                ?>
                                
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