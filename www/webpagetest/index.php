<?php 
include 'common.inc';

// see if we are overriding the max runs
if( $_COOKIE['maxruns'] )
    $settings['maxruns'] = (int)$_GET['maxruns'];
if( $_GET['maxruns'] )
{
    $settings['maxruns'] = (int)$_GET['maxruns'];
    setcookie("maxruns", $settings['maxruns']);    
}
    
if( !$settings['maxruns'] )
    $settings['maxruns'] = 10;
if( $_REQUEST['map'] )
    $settings['map'] = 1;

// assign a unique ID to each person
$owner = null;
if( isset($_COOKIE['o']) && strlen($_COOKIE['o']) ){
  $owner = $_COOKIE['o'];
}else{
  $owner = sha1(uniqid(uniqid('', true), true));
}
setcookie('o', $owner, time()+60*60*24*365, '/');

// load the secret key (if there is one)
$secret = '';
$keys = parse_ini_file('./settings/keys.ini', true);
if( $keys && isset($keys['server']) && isset($keys['server']['secret']) )
  $secret = trim($keys['server']['secret']);
    
$connectivity = parse_ini_file('./settings/connectivity.ini', true);

// if they have custom bandwidth stored, remember it
if( isset($_COOKIE['u']) && isset($_COOKIE['d']) && isset($_COOKIE['l']) )
{
    $conn = array('label' => 'custom', 'bwIn' => (int)$_COOKIE['d'] * 1000, 'bwOut' => (int)$_COOKIE['u'] * 1000, 'latency' => (int)$_COOKIE['l']);
    if( isset($_COOKIE['p']) )
        $conn['plr'] = $_COOKIE['p'];
    else
        $conn['plr'] = 0;
    $connectivity['custom'] = $conn;
}

$locations = LoadLocations();
$loc = ParseLocations($locations);

?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest</title>
        <?php include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Home';
            include 'header.inc';
            ?>
            <form name="urlEntry" action="/runtest.php" method="POST" enctype="multipart/form-data" onsubmit="return ValidateInput(this)">
            
            <?php
            echo "<input type=\"hidden\" name=\"vo\" value=\"$owner\">\n";
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

            <h2 class="cufon-dincond_black">Test a website's performance</h2>
            
            <div id="test_box-container">
                <ul class="ui-tabs-nav">
                    <li class="analytical_review ui-state-default ui-corner-top ui-tabs-selected ui-state-active"><a href="javascript:void(0)">Analytical Review</a></li>
                    <li class="visual_comparison"><a href="/video/">Visual Comparison</a></li>
                </ul>
                <div id="analytical-review" class="test_box">
                    <ul class="input_fields">
                        <li><input type="text" name="url" id="url" value="Enter a Website URL" class="text large" onfocus="if (this.value == this.defaultValue) {this.value = '';}" onblur="if (this.value == '') {this.value = this.defaultValue;}"></li>
                        <li>
                            <label for="location">Test Location</label>
                            <select name="where" id="location">
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
                                        $selected = ' selected';
                                    echo "<option value=\"{$browser['key']}\"$selected>{$browser['label']}</option>\n";
                                }
                                ?>
                            </select>
                        </li>
                    </ul>

                    <?php
                    if( (int)$_COOKIE["as"] )
                    {
                        echo '<p><a href="javascript:void(0)" id="advanced_settings" class="extended">Advanced Settings <span class="arrow"></span></a><small id="settings_summary_label" class="hidden"><br><span id="settings_summary"></span></small></p>';
                        echo '<div id="advanced_settings-container">';
                    }
                    else
                    {
                        echo '<p><a href="javascript:void(0)" id="advanced_settings">Advanced Settings <span class="arrow"></span></a><small id="settings_summary_label"><br><span id="settings_summary"></span></small></p>';
                        echo '<div id="advanced_settings-container" class="hidden">';
                    }
                    ?>
                        <ul class="input_fields">
                            <li>
                                <label for="connection">Connection</label>
                                <select name="location" id="connection">
                                    <?php
                                    foreach( $loc['connections'] as $key => &$connection )
                                    {
                                        $selected = '';
                                        if( $connection['selected'] )
                                            $selected = ' selected';
                                        echo "<option value=\"{$connection['key']}\"$selected>{$connection['label']}</option>\n";
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
                                <label for="number_of_tests">
                                    Number of Tests to Run<br>
                                    <small>Up to <?php echo $settings['maxruns']; ?></small>
                                </label>
                                <?php
                                $runs = (int)$_COOKIE["runs"];
                                if( $runs < 1 || $runs > $settings['maxruns'] )
                                    $runs = 1;
                                ?>
                                <input id="number_of_tests" type="text" class="text short" name="runs" value=<?php echo "\"$runs\""; ?>>
                            </li>
                            <li>
                                <label for="viewBoth">
                                    Repeat View
                                </label>
                                <?php
                                $fvOnly = (int)$_COOKIE["testOptions"] & 2;
                                ?>
                                <input id="viewBoth" type="radio" name="fvonly" <?php if( !$fvOnly ) echo 'checked=checked'; ?> value="0">First View and Repeat View
                                <input id="viewFirst" type="radio" name="fvonly" <?php if( $fvOnly ) echo 'checked=checked'; ?> value="1">First View Only
                            </li>
                            <li>
                                <label for="keep_test_private">Keep Test Private</label>
                                <input type="checkbox" name="private" id="keep_test_private" class="checkbox" <?php if( ((int)$_COOKIE["testOptions"] & 1) || $_REQUEST['hidden'] ) echo " checked=checked"; ?>>
                            </li>
                            <li>
                                <label for="label">Label</label>
                                <input type="text" name="label" id="label">
                            </li>
                        </ul>

                        <div id="test_subbox-container">
                            <ul class="ui-tabs-nav">
                                <li><a href="#test-settings">Test Settings</a></li>
                                <li><a href="#auth">Auth</a></li>
                                <li><a href="#script">Script</a></li>
                                <li><a href="#block">Block</a></li>
                                <?php if($settings['enableVideo']) { ?>
                                <li><a href="#video">Video</a></li>
                                <?php } ?>
                                <?php if(!$settings['noBulk']) { ?>
                                <li><a href="#bulk">Bulk Testing</a></li>
                                <?php } ?>
                            </ul>
                            <div id="test-settings" class="test_subbox">
                                <ul class="input_fields">
                                    <li>
                                        <input type="checkbox" name="web10" id="stop_test_at_document_complete" class="checkbox before_label">
                                        <label for="stop_test_at_document_complete" class="auto_width">
                                            Stop Test at Document Complete<br>
                                            <small>Typically, tests run until all activity stops.</small>
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="ignoreSSL" id="ignore_ssl_cerificate_errors" class="checkbox" style="float: left;width: auto;">
                                        <label for="ignore_ssl_cerificate_errors" class="auto_width">
                                            Ignore SSL Certificate Errors<br>
                                            <small>e.g. Name mismatch, Self-signed certificates, etc.</small>
                                        </label>
                                    </li>
                                    <li>
                                        <input type="checkbox" name="tcpdump" id="tcpdump" class="checkbox" style="float: left;width: auto;">
                                        <label for="tcpdump" class="auto_width">
                                            Capture network packet trace (tcpdump)
                                        </label>
                                    </li>
                                    <li>
                                        <label for="dom_elements" class="auto_width">DOM Element</label>
                                        <input type="text" name="domelement" id="dom_elements" class="text">
                                        <div class="tooltip" style="display:none;">Waits for and records when the indicated DOM element becomes available on the page.  The DOM element 
                                        is identified in <b>attribute=value</b> format where "attribute" is the attribute to match on (id, className, name, innerText, etc.)
                                        and "value" is the value of that attribute (case sensitive).  For example, on SNS pages <b>name=loginId</b>
                                        would be the DOM element for the Screen Name entry field.<br><br>
                                        There are 3 special  attributes that will match on a HTTP request: <b>RequestEnd</b>, <b>RequestStart</b> and <b>RequestTTFB</b> will mark the End, Start or TTFB of the
                                        first request that contains the given value in the url. i.e. <b>RequestTTFB=favicon.ico</b> will mark the first byte time of the favicon.ico request.
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div id="auth" class="test_subbox">
                                <div class="notification-container">
                                    <div class="notification"><div class="warning">
                                        PLEASE USE A TEST ACCOUNT! as your credentials may be available to anyone viewing the results.<br><br>
                                        Utilizing this feature will make this test Private. Thus, it will not appear in Test History.
                                    </div></div>
                                </div>
                                
                                <ul class="input_fields">
                                    <li>
                                        <?php if($settings['enableSNS']) { ?>
                                        <input type="radio" name="authType" id="auth_type-aol_sns" value="1" class="radio" checked=checked>
                                        <label for="auth_type-aol_sns" class="inline">AOL SNS</label>
                                        <input type="radio" name="authType" id="auth_type-http_basic_auth" value="0" class="radio">
                                        <label for="auth_type-http_basic_auth" class="inline">HTTP Basic Auth</label>
                                        <?php } else { ?>
                                        HTTP Basic Authentication
                                        <?php } ?>
                                    </li>
                                    <li>
                                        <label for="username" style="width: auto;">Username</label>
                                        <input type="text" name="login" id="username" class="text" style="width: 200px;">
                                    </li>
                                    <li>
                                        <label for="password" style="width: auto;">Password</label>
                                        <input type="text" name="password" id="password" class="text" style="width: 200px;">
                                    </li>
                                </ul>
                            </div>

                            <div id="script" class="test_subbox">
                                <div>
                                    <div class="notification-container">
                                        <div class="notification"><div class="message">
                                            Check out <a href="http://www.webperformancecentral.com/wiki/WebPagetest/Hosted_Scripting">Hosted Scripting</a> for more information on this feature
                                        </div></div>
                                    </div>
                                    
                                    <p><label for="enter_script" class="full_width">Enter Script</label></p>
                                    <textarea name="script" id="enter_script" cols="0" rows="0"></textarea>
                                </div>
                                <br>
                                <input type="checkbox" name="sensitive" id="sensitive" class="checkbox" style="float: left;width: auto;">
                                <label for="sensitive" class="auto_width">
                                    Script includes sensitive data<br><small>The script will be discarded and the http headers will not be available in the results</small>
                                </label>
                            </div>

                            <div id="block" class="test_subbox">
                                <p>
                                    <label for="block_requests_containing" class="full_width">
                                        Block Requests Containing...<br>
                                        <small>Space separated list</small>
                                    </label>
                                </p>
                                <textarea name="block" id="block_requests_containing" cols="0" rows="0"></textarea>
                            </div>

                            <?php if($settings['enableVideo']) { ?>
                            <div id="video" class="test_subbox">
                                <div class="notification-container">
                                    <div class="notification"><div class="message">
                                        Video will appear in the Screenshot page of your results
                                    </div></div>
                                </div>
                                
                                <input type="checkbox" name="video" id="videoCheck" class="checkbox before_label">
                                <label for="videoCheck" class="auto_width">Capture Video</label>
                                <br>
                                <br>
                                <?php
                                if( $_GET['aft'] )
                                {
                                    echo '<input type="checkbox" name="aft" id="aftCheck" class="checkbox before_label">';
                                    echo '<label for="aftCheck" class="auto_width">Measure Above-the-fold rendering time<br><small>(alpha)</small></label>';
                                }
                                ?>
                            </div>
                            <?php } ?>

                            <?php if(!$settings['noBulk']) { ?>
                            <div id="bulk" class="test_subbox">
                                <p>
                                    <label for="bulkurls" class="full_width">
                                        List of urls to test (one URL per line)...
                                    </label>
                                </p>
                                <textarea name="bulkurls" id="bulkurls" cols="0" rows="0"></textarea><br>
                                <b>or</b><br>
                                upload list of Urls (one per line): <input type="file" name="bulkfile" size="40"> 
                            </div>
                            <?php } ?>

                        </div>
                    </div>
                </div>
            </div>

            <div id="start_test-container">
                <p><input type="submit" name="submit" value="" class="start_test"></p>
                <div id="sponsor">
                </div>
            </div>
            <div class="cleared"></div>

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
        <script type="text/javascript" src="<?php echo $GLOBALS['cdnPath']; ?>/js/test.js?v=9"></script> 
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

/**
* Run through the location selections and build the default selections (instead of doing this in javascript)
* 
* @param mixed $locations
*/
function ParseLocations(&$locations)
{
    global $connectivity;
    $loc = array();
    $loc['locations'] = array();

    // build the list of locations
    foreach($locations['locations'] as $index => $name)
    {
        if( is_numeric($index) )
        {
            if( !$locations[$name]['hidden'] || $_REQUEST['hidden'])
            {
                $location['label'] = $locations[$name]['label'];
                $location['comment'] = str_replace("'", '"', $locations[$name]['comment']);
                $location['name'] = $name;
                $loc['locations'][$name] = $location;
            }
        }
    }
    
    // see if they have a saved location from their cookie
    $currentLoc = GetLocationFromConfig($locations, $_COOKIE["cfg"] );
    if( !$currentLoc || !isset($loc['locations'][$currentLoc]) )
    {
        // nope, try thee default
        $currentLoc = $locations['locations']['default'];
    }
    if( !$currentLoc || !isset($loc['locations'][$currentLoc]) )
    {
        // if all else fails, just select the first one
        foreach( $loc['locations'] as $key => &$val )
        {
            $currentLoc = $key;
            break;
        }
    }
    
    // select the location
    $loc['locations'][$currentLoc]['checked'] = true;
    
    // build the list of browsers for the location
    $loc['browsers'] = array();
    foreach($locations[$currentLoc] as $index => $config)
    {
        if( is_numeric($index) )
        {
            $browser = $locations[$config]['browser'];
            $browserKey = str_replace(' ', '', $browser);
            if( strlen($browserKey) && strlen($browser) )
            {
                $b = array();
                $b['label'] = $browser;
                $b['key'] = $browserKey;
                $loc['browsers'][$browserKey] = $b;
            }
        }
    }
    
    // default to the browser from their saved cookie
    $currentBrowser;
    if( $_COOKIE["cfg"] && isset($locations[$_COOKIE["cfg"]]) )
    {
        $currentBrowser = str_replace(' ', '', $locations[$_COOKIE["cfg"]]['browser']);
        $currentConfig = $_COOKIE["cfg"];
    }
    if( !strlen($currentBrowser) || !isset($loc['browsers'][$currentBrowser]) )
    {
        // try the browser from the default config
        $cfg = $locations[$currentLoc]['default'];
        if( strlen($cfg) )
        {
            $currentBrowser = str_replace(' ', '', $locations[$cfg]['browser']);
            $currentConfig = $cfg;
        }
    }
    if( !strlen($currentBrowser) || !isset($loc['browsers'][$currentBrowser]) )
    {
        // just select the first one if all else fails
        foreach( $loc['browsers'] as $key => &$val )
        {
            $currentBrowser = $key;
            break;
        }
    }
    $loc['browsers'][$currentBrowser]['selected'] = true;
    
    // build the list of connection types
    $loc['bandwidth']['dynamic'] = false;
    $loc['connections'] = array();
    foreach($locations[$currentLoc] as $index => $config)
    {
        if( is_numeric($index) )
        {
            $browserKey = str_replace(' ', '', $locations[$config]['browser']);
            if( strlen($browserKey) && $browserKey == $currentBrowser )
            {
                if( isset($locations[$config]['connectivity']) )
                {
                    $connection = array();
                    $connection['key'] = $config;
                    $connection['label'] = $locations[$config]['connectivity'];
                    $loc['connections'][$config] = $connection;
                }
                else
                {
                    $loc['bandwidth']['dynamic'] = true;
                    $loc['bandwidth']['down'] = 1500;
                    $loc['bandwidth']['up'] = 384;
                    $loc['bandwidth']['latency'] = 50;
                    $loc['bandwidth']['plr'] = 0;

                    foreach( $connectivity as $key => &$conn )
                    {
                        $connKey = $config . '.' . $key;
                        if( !$currentConfig )
                            $currentConfig = $connKey;

                        $connection = array();
                        $connection['key'] = $connKey;
                        $connection['label'] = $conn['label'];
                        $loc['connections'][$connKey] = $connection;
                        
                        if( $currentConfig == $connKey )
                        {
                            $loc['bandwidth']['down'] = $conn['bwIn'] / 1000;
                            $loc['bandwidth']['up'] = $conn['bwOut'] / 1000;
                            $loc['bandwidth']['latency'] = $conn['latency'];
                            if( isset($conn['plr']) )
                                $loc['bandwidth']['plr'] = $conn['plr'];
                        }
                    }
                    
                    // add the custom config option
                    $connKey = $config . '.custom';
                    $connection = array();
                    $connection['key'] = $connKey;
                    $connection['label'] = 'Custom';
                    $loc['connections'][$connKey] = $connection;
                    
                    if( !$currentConfig )
                        $currentConfig = $connKey;
                }
            }
        }
    }
    
    // default to the first connection type if we don't have a better option
    if( !$currentConfig || !isset($loc['connections'][$currentConfig]) )
    {
        foreach( $loc['connections'] as $key => &$val )
        {
            $currentConfig = $key;
            break;
        }
    }
    $loc['connections'][$currentConfig]['selected'] = true;
    
    // figure out the bandwidth settings
    if( !$loc['bandwidth']['dynamic'] )
    {
        $loc['bandwidth']['down'] = $locations[$currentConfig]['down'] / 1000;
        $loc['bandwidth']['up'] = $locations[$currentConfig]['up'] / 1000;
        $loc['bandwidth']['latency'] = $locations[$currentConfig]['latency'];
        $loc['bandwidth']['plr'] = 0;
    }
    
    return $loc;
}

/**
* From a given configuration, figure out what location it is in
* 
* @param mixed $locations
* @param mixed $config
*/
function GetLocationFromConfig(&$locations, $config)
{
    $ret;
    
    foreach($locations as $location => &$values)
        foreach($values as $cfg)
            if( $cfg == $config )
            {
                $ret = $location;
                break 2;
            }
    
    return $ret;
}

/**
* Count the number of test files in the given directory
* 
* @param mixed $dir
* @param mixed $path
*/
function CountTests($path)
{
    $files = glob( $path . '/*.url', GLOB_NOSORT );
    $count = count($files);
    
    return $count;
}

/**
* Remove any locations that appear to be offline
* 
* @param mixed $locations
*/
function FilterLocations( &$locations )
{
    // drop the main index of any hidden locations so they don't show up in the map view
    foreach( $locations as $name => $loc )
    {
        if( $loc['hidden'] && !$_REQUEST['hidden'] )
            unset( $locations[$name] );
    }

    // only do it if we aren't displaying hidden locations and we're not running on Windows (busted filetime())
    if( !$_REQUEST['hidden'] && (PHP_OS!='WINNT' && PHP_OS!='WIN32' && PHP_OS!='Windows'))
    {
        // first remove any locations that haven't checked in for 30 minutes (could tighten this up in the future)
        foreach( $locations as $name => $loc )
        {
            if( isset($loc['browser']) )
            {
                $file = "./work/times/$name.tm";
                if( is_file($file) )
                {
                    $updated = filemtime($file);
                    $now = time();
                    $elapsed = 0;
                    if( $now > $updated )
                        $elapsed = $now - $updated;
                    $minutes = (int)($elapsed / 60);
                    if( $minutes > 30 )
                        unset($locations[$name]);
                }
            }
        }
    }
        
    // second pass, remove any top-level locations whose sub-locations have all been removed
    foreach( $locations as $name => $loc )
    {
        if( $name != 'locations' && !isset($loc['browser']) )
        {
            $ok = false;
            $newLoc = array();
            $default = null;
            
            // remove any of the child locations that don't exist
            $index = 0;
            foreach( $loc as $key => $val )
            {
                if( is_numeric($key) )
                {
                    if( isset($locations[$val]) )
                    {
                        $ok = true;
                        $index++;
                        $newLoc[$index] = $val;
                        if( isset($loc['default']) && $loc['default'] == $val )
                            $default = $val;
                    }
                    else
                    {
                        if( isset($loc['default']) && $loc['default'] == $val )
                            unset($loc['default']);
                    }
                }
                elseif( $key != 'default' )
                    $newLoc[$key] = $val;
            }
            
            if( $ok )
            {
                if( isset($default) )
                    $newLoc['default'] = $default;
                $locations[$name] = $newLoc;
            }
            else
                unset($locations[$name]);
            unset($newLoc);
        }
    }
    
    // final pass, remove the empty top-level locations from the locations list
    $newList = array();
    $default = null;
    $index = 0;
    foreach( $locations['locations'] as $key => $name )
    {
        if( is_numeric($key) )
        {
            if( isset( $locations[$name] ) )
            {
                $index++;
                $newList[$index] = $name;
                if( isset($locations['locations']['default']) && $locations['locations']['default'] == $name )
                    $default = $name;
            }
        }
        elseif( $key != 'default' )
            $newList[$key] = $name;
    }
    if( isset($default) )
        $newList['default'] = $default;
    $locations['locations'] = $newList;
}
?>
