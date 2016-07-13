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

$preview = false;
if( array_key_exists('preview', $_GET) && strlen($_GET['preview']) && $_GET['preview'] )
    $preview = true;
// Put it into mod_pagespeed mode all the time
$mps = true;

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
            if( array_key_exists('pssid', $_GET) && strlen($_GET['pssid']) )
                $navTabs['Test Result'] = FRIENDLY_URLS ? "/result/{$_GET['pssid']}/" : "/results.php?test={$_GET['pssid']}";
            $tab = 'New Comparison';
            include 'header.inc';
            ?>
            <form name="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return PreparePSSTest(this)">
            
            <input type="hidden" name="private" value="1">
            <input type="hidden" name="view" value="pss">
            <input type="hidden" name="label" value="">
            <input type="hidden" name="video" value="1">
            <input type="hidden" name="shard" value="1">
            <input type="hidden" name="priority" value="0">
            <input type="hidden" name="timeline" value="0">
            <input type="hidden" name="mv" value="1">
            <?php
                if ($mps || (array_key_exists('origin', $_GET) && strlen($_GET['origin']))) {
                    echo '<input type="hidden" name="web10" value="0">';
                } else {
                    echo '<input type="hidden" name="web10" value="1">';
                }
            ?>
            <input type="hidden" name="fvonly" value="1">
            <input type="hidden" name="sensitive" value="1">
            <?php
            if ($mps) {
                $script = '';
                echo "<input type=\"hidden\" name=\"runs\" value=\"7\">\n";
            } elseif ($preview) {
                $script = 'if\trun\t1\nif\tcached\t0\naddHeader\tX-PSA-Blocking-Rewrite: pss_blocking_rewrite\t%HOST_REGEX%\nendif\nendif\nsetCookie\thttp://%HOSTR%\t_GPSSPRVW=1\nnavigate\t%URL%';
                echo "<input type=\"hidden\" id=\"script\" name=\"script\" value=\"if&#09;run&#09;1&#10;if&#09;cached&#09;0&#10;addHeader&#09;X-PSA-Blocking-Rewrite: pss_blocking_rewrite&#09;%HOST_REGEX%&#10;endif&#10;endif&#10;setCookie&#09;http://%HOSTR%&#09;_GPSSPRVW=1&#10;navigate&#09;%URL%\">\n";
                echo "<input type=\"hidden\" name=\"runs\" value=\"8\">\n";
                echo "<input type=\"hidden\" name=\"discard\" value=\"1\">\n";
            } elseif( array_key_exists('origin', $_GET) && strlen($_GET['origin']) ) {
                $origin = htmlspecialchars($_GET['origin']);
                $script = 'setDnsName\t%HOSTR%\t' . $origin . '\nnavigate\t%URL%';
                echo "<input type=\"hidden\" id=\"script\" name=\"script\" value=\"setDnsName&#09;%HOSTR%&#09;$origin&#10;navigate&#09;%URL%\">\n";
                echo "<input type=\"hidden\" name=\"runs\" value=\"5\">\n";
            } else {
                $script = 'if\trun\t1\nif\tcached\t0\naddHeader\tX-PSA-Blocking-Rewrite: pss_blocking_rewrite\t%HOST_REGEX%\nendif\nendif\nsetDnsName\t%HOSTR%\tghs.google.com\noverrideHost\t%HOSTR%\tpsa.pssdemos.com\nnavigate\t%URL%';
                echo "<input type=\"hidden\" id=\"script\" name=\"script\" value=\"if&#09;run&#09;1&#10;if&#09;cached&#09;0&#10;addHeader&#09;X-PSA-Blocking-Rewrite: pss_blocking_rewrite&#09;%HOST_REGEX%&#10;endif&#10;endif&#10;setDnsName&#09;%HOSTR%&#09;ghs.google.com&#10;overrideHost&#09;%HOSTR%&#09;psa.pssdemos.com&#10;navigate&#09;%URL%\">\n";
                echo "<input type=\"hidden\" name=\"runs\" value=\"8\">\n";
                echo "<input type=\"hidden\" name=\"discard\" value=\"1\">\n";
            }
            echo "<script>\nvar originalScript = \"$script\";\n</script>";
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
              
              if ($mps) {
                echo '<h2 class="cufon-dincond_black"><small>Evaluate the impact of <a href="https://code.google.com/p/modpagespeed/">mod_pagespeed</a> (must be installed on the server)</small></h2>';
              } elseif ($preview) {
                echo '<h2 class="cufon-dincond_black"><small>Preview optimization changes for your site hosted on <a href="https://developers.google.com/speed/pagespeed/service">PageSpeed Service</a></small></h2>';
              } elseif( array_key_exists('origin', $_GET) && strlen($_GET['origin']) )
                echo '<h2 class="cufon-dincond_black"><small>Measure performance of original site vs optimized by <a href="https://developers.google.com/speed/pagespeed/service">PageSpeed Service</a></small></h2>';
              else
                echo '<h2 class="cufon-dincond_black"><small>Measure your site performance when optimized by <a href="https://developers.google.com/speed/pagespeed/service">PageSpeed Service</a></small></h2>';
            }
            ?>

            <div id="test_box-container">
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <?php
                        $default = 'Enter a Website URL';
                        $testurl = trim($_GET['url']);
                        if( strlen($testurl) )
                            $default = htmlspecialchars($testurl);
                        echo "<li><input type=\"text\" name=\"testurl\" id=\"testurl\" value=\"$default\" class=\"text large\" onfocus=\"if (this.value == this.defaultValue) {this.value = '';}\" onblur=\"if (this.value == '') {this.value = this.defaultValue;}\"></li>\n";
                        ?>
                    </ul>
                    <ul class="input_fields" id="morelocs">
                        <li>
                            <label for="location">Location</label>
                            <select name="where" id="location">
                                <?php
                                $lastGroup = null;
                                foreach($loc['locations'] as &$location)
                                {
                                    $selected = '';
                                    if( $location['checked'] )
                                        $selected = 'selected';
                                        
                                    if (array_key_exists('group', $location) && $location['group'] != $lastGroup) {
                                        if (isset($lastGroup))
                                            echo "</optgroup>";
                                        if (strlen($location['group'])) {
                                            $lastGroup = $location['group'];
                                            echo "<optgroup label=\"" . htmlspecialchars($lastGroup) . "\">";
                                        } else
                                            $lastGroup = null;
                                    }

                                    echo "<option value=\"{$location['name']}\" $selected>{$location['label']}</option>";
                                }
                                if (isset($lastGroup))
                                    echo "</optgroup>";
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
                            <label for="shardDomains">Shard Domains</label>
                            <select name="shardDomains" id="shardDomains">
                                <option value="1" selected>1 domain (default)</option>
                                <option value="2">2 domains</option>
                                <option value="3">3 domains</option>
                                <option value="4">4 domains</option>
                            </select>
                        </li>
                        <?php
                        } else {
                            echo "<input type=\"hidden\" name=\"shardDomains\" value=\"1\">\n";
                        }
                        ?>
                        <li>
                            <label for="bodies">Save Response Bodies<br><small>Text resources only</small></label>
                            <input type="checkbox" name="bodies" id="save_bodies" class="checkbox">
                        </li>
                        <li>
                            <?php
                            if (!$mps) {
                            ?>
                                <label for="pss_advanced"><a style="color:#fff;" href="https://developers.google.com/speed/docs/pss/PrioritizeAboveTheFold">Advanced Rewriters</a></label>
                                <?php
                                $checked = '';
                                if (array_key_exists('option', $_GET) && $_GET['option'] == 'prioritize_visible_content') {
                                    $checked = ' checked="checked"';
                                }
                                echo "<input type=\"checkbox\" name=\"pss_advanced\" id=\"pss_advanced\" class=\"checkbox\"$checked>\n";
                            } else {
                                echo "<input type=\"hidden\" name=\"pss_advanced\" id=\"pss_advanced\" value=\"0\">\n";
                            } // $mps
                            ?>
                        </li>
                    </ul>
                    <ul class="input_fields">
                        <li>
                            <?php
                            if (!$mps && !$preview && (!array_key_exists('origin', $_GET) || !strlen($_GET['origin']))) {
                                $prodSelected = '';
                                $aggressiveSelected = ' selected';
                                if (array_key_exists('aggressive', $_REQUEST) && !$_REQUEST['aggressive']) {
                                    $prodSelected = ' selected';
                                    $aggressiveSelected = '';
                                }
                                echo '<label for="backend">Optimization Settings</label>';
                                echo '<select name="backend" id="backend">';
                                echo "<option value=\"prod\"$prodSelected>Default (Safe)</option>";
                                echo "<option value=\"aggressive\"$aggressiveSelected>Aggressive</option>";
                                if( !$supportsAuth || ($admin || strpos($_COOKIE['google_email'], '@google.com') !== false) )
                                    echo '<option value="staging">Staging</option>';
                                echo '</select>';
                            } else {
                                echo "<input type=\"hidden\" name=\"backend\" id=\"backend\" value=\"prod\">\n";
                            }
                            ?>
                        </li>
                        <li>
                            <label for="mobile">Test Mobile Page<br><small>Chrome Only</small></label>
                            <?php
                            $checked = '';
                            if (array_key_exists('mobile', $_REQUEST) && $_REQUEST['mobile'])
                                $checked = ' checked="checked"';
                            echo "<input type=\"checkbox\" name=\"mobile\" id=\"mobile\" class=\"mobile\"$checked>";
                            ?>
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
                        $lastGroup = null;
                        foreach($loc['locations'] as &$location)
                        {
                            $selected = '';
                            if( $location['checked'] )
                                $selected = 'SELECTED';
                            if (array_key_exists('group', $location) && $location['group'] != $lastGroup) {
                                if (isset($lastGroup))
                                    echo "</optgroup>";
                                if (strlen($location['group'])) {
                                    $lastGroup = $location['group'];
                                    echo "<optgroup label=\"" . htmlspecialchars($lastGroup) . "\">";
                                } else
                                    $lastGroup = null;
                            }
                                
                            echo "<option value=\"{$location['name']}\" $selected>{$location['label']}</option>";
                        }
                        if (isset($lastGroup))
                            echo "</optgroup>";
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
            echo "var wptForgetSettings = true;\n";
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
            wptStorage['testBrowser'] = 'Chrome';
            function PreparePSSTest(form)
            {
                var url = form.testurl.value;
                if( url == "" || url == "Enter a Website URL" )
                {
                    alert( "Please enter an URL to test." );
                    form.testurl.focus();
                    return false;
                }
                if (url.match(/^https:\/\//i)) {
                    alert( "Testing of secure (https) pages is not supported.\r\nPlease enter a non-secure page for testing." );
                    form.testurl.focus();
                    return false;
                }
                var proto = url.substring(0, 6).toLowerCase();
                if (proto == 'https:') {
                    alert( "HTTPS sites are not currently supported" );
                    return false;
                }
                
                form.label.value = 'PageSpeed Service Comparison for ' + url;
                
                if (form['mobile'] && !$("#morelocs").is(":visible")) {
                    if (form.mobile.checked) {
                        var loc = $('#connection').val();
                        if (loc.indexOf('.Cable') > 0) {
                            loc = loc.replace('.Cable', '.3G');
                            $('#connection').val(loc); 
                        }
                    }
                }
                
                <?php
                // build the psuedo batch-url list
                if ($mps) {
                    echo 'var batch = "{test}\n'.
                                      '{script}\n' . 
                                      'label=mod_pagespeed Off\n' .
                                      'addHeader\tModPagespeed:off\n' .
                                      'navigate\t" + url + "\n' . 
                                      '{/script}\n' .
                                      '{/test}\n' .
                                      '{test}\n'.
                                      '{script}\n' . 
                                      'label=mod_pagespeed On\n' .
                                      'addHeader\tModPagespeed:on\n' .
                                      'navigate\t" + url + "\n' . 
                                      '{/script}\n' .
                                      '{/test}\n' . 
                                      '";' . "\n";
                } elseif( array_key_exists('origin', $_GET) && strlen($_GET['origin']) )
                    echo 'var batch = "Original=" + url + "\nOptimized=" + url + " noscript";' . "\n";
                else
                    echo 'var batch = "Original=" + url + " noscript\nOptimized=" + url;' . "\n";
                
                echo "form.bulkurls.value=batch;\n";
                
                if (!$mps) {
                ?>

                var shard = form.shardDomains.value;
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
                if (!$preview && (!array_key_exists('origin', $_GET) || !strlen($_GET['origin']))) {
                ?>
                var backend = form.backend.value;
                if (backend == 'aggressive') {
                    script = form.script.value;
                    script = "addHeader\tModPagespeedFilters:combine_css,rewrite_css,inline_import_to_link,extend_cache,combine_javascript,rewrite_javascript,resize_images,move_css_to_head,rewrite_style_attributes_with_url,convert_png_to_jpeg,convert_jpeg_to_webp,recompress_images,convert_jpeg_to_progressive,convert_meta_tags,inline_css,inline_images,inline_javascript,lazyload_images,flatten_css_imports,inline_preview_images,defer_javascript,defer_iframe,add_instrumentation,flush_subresources,fallback_rewrite_css_urls,insert_dns_prefetch,split_html,prioritize_critical_css,convert_to_webp_lossless,convert_gif_to_png\t%HOST_REGEX%\n" + script;
                    form.script.value = script;
                    form.web10.value = 0;
                } else if (backend == 'staging') {
                    script = form.script.value;
                    script = script.replace(/psa\.pssdemos\.com/g, 'demo.pssplayground.com');
                    script = script.replace(/pss_blocking_rewrite/g, 'pss_staging');
                    form.script.value = script;
                    form.web10.value = 0;
                    form.runs.value = 8;
                    form.discard.value = 1;
                }
                <?php
                }   // origin
                } // !mps
                ?>
                                
                return true;
            }
            
            LocationChanged();
            
            $('#script').val(originalScript);
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
            $testCount = 16;
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