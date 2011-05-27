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

$page_keywords = array('PSS','Webpagetest','Website Speed Test','Page Speed');
$page_description = "PSS Test$testLabel.";
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - PSS Test</title>
        <?php $gaTemplate = 'PSS'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            include 'header.inc';
            ?>
            <form name="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return PreparePSSTest(this)">
            
            <input type="hidden" name="view" value="simple">
            <input type="hidden" name="label" value="">
            <input type="hidden" name="video" value="1">
            <input type="hidden" name="priority" value="0">
            <input type="hidden" name="runs" value="5">
            <input type="hidden" name="script" value="setDnsName&#09;%HOST%&#09;ghs.google.com&#10;overrideHost&#09;%HOST%&#09;instaweb.google.com&#10;navigate&#09;%URL%">
            <input type="hidden" name="bulkurls" value="">
            <input type="hidden" name="vo" value="<?php echo $owner;?>">
            <?php
            if( strlen($secret) ){
              $hashStr = $secret;
              $hashStr .= $_SERVER['HTTP_USER_AGENT'];
              $hashStr .= $owner;
              
              $now = date('c');
              echo "<input type=\"hidden\" name=\"vd\" value=\"$now\">\n";
              $hashStr .= $now;
              
              $hmac = sha1($hashStr);
              echo "<input type=\"hidden\" name=\"vh\" value=\"$hmac\">\n";
            }
            ?>

            <h2 class="cufon-dincond_black">PSS Test</h2>
            
            <div id="test_box-container">
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <li><input type="text" name="testurl" id="testurl" value="Enter a Website URL" class="text large" onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}"></li>
                        <li>
                            <label for="location">Test Location</label>
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
                            <input id="change-location-btn" type=button onclick="SelectLocation();" value="Change">
                            <?php } ?>
                            <span class="pending_tests hidden" id="pending_tests"><span id="backlog">0</span> Pending Tests</span>
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
            
            <?php include('footer.inc'); ?>
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
    BuildLocations($locations);
    
    FilterLocations( $locations );
    
    // strip out any sensitive information
    foreach( $locations as $index => &$loc )
    {
        // count the number of tests at each location
        if( isset($loc['localDir']) )
        {
            $loc['backlog'] = CountTests($loc['localDir']);
            unset( $loc['localDir'] );
        }
        
        if( isset($loc['key']) )
            unset( $loc['key'] );
        if( isset($loc['remoteDir']) )
            unset( $loc['remoteDir'] );
    }
    
    return $locations;
}

?>