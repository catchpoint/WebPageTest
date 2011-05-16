<?php
    require_once('common.inc');
    require_once('unique.inc');
    import_request_variables('PG', 'req_');
     
    $xml = false;
    if( !strcasecmp($req_f, 'xml') )
        $xml = true;
    $json = false;
    if( !strcasecmp($req_f, 'json') )
        $json = true;

    // see if we're re-running an existing test
    if( isset($test) )
        unset($test);
    if( isset($_POST['resubmit']) )
    {
        $path = './' . GetTestPath(trim($_POST['resubmit']));
        $test = json_decode(gz_file_get_contents("$path/testinfo.json"), true);
        unset($test['completed']);
        unset($test['started']);
    }
    
    // pull in the test parameters
    if( !isset($test) )
    {
        $test = array();
        $test['url'] = trim($req_url);
        
        // Extract the location and connectivity.
        $parts = explode('.', trim($req_location));
        $test['location'] = $parts[0];
        $test['connectivity'] = $parts[1];
        
        // Extract the multiple locations.
        if ( isset($req_multiple_locations)) 
        {
            $test['multiple_locations'] = array();
            foreach ($req_multiple_locations as $location_string)
            {
                array_push($test['multiple_locations'], $location_string);
            }
            $test['batch_locations'] = 1;
        }
        
        $test['domElement'] = trim($req_domelement);
        $test['login'] = trim($req_login);
        $test['password'] = trim($req_password);
        $test['runs'] = (int)$req_runs;
        $test['fvonly'] = (int)$req_fvonly;
        $test['connections'] = (int)$req_connections;
        $test['private'] = $req_private;
        $test['web10'] = $req_web10;
        $test['ignoreSSL'] = $req_ignoreSSL;
        $test['script'] = trim($req_script);
        $test['block'] = $req_block;
        $test['authType'] = (int)$req_authType;
        $test['notify'] = trim($req_notify);
        $test['video'] = $req_video;
        $test['label'] = htmlspecialchars(trim($req_label));
        $test['industry'] = trim($req_ig);
        $test['industry_page'] = trim($req_ip);
        $test['median_video'] = (int)$req_mv;
        $test['ip'] = $req_addr;
        $test['uid'] = $req_uid;
        $test['user'] = $req_user;
        $test['priority'] = (int)$req_priority;
        if( isset($req_bwIn) && !isset($req_bwDown) )
            $test['bwIn'] = (int)$req_bwIn;
        else
            $test['bwIn'] = (int)$req_bwDown;
        if( isset($req_bwOut) && !isset($req_bwUp) )
            $test['bwOut'] = (int)$req_bwOut;
        else
            $test['bwOut'] = (int)$req_bwUp;
        $test['latency'] = (int)$req_latency;
        $test['testLatency'] = (int)$req_latency;
        $test['plr'] = trim($req_plr);
        $test['callback'] = $req_callback;
        $test['agent'] = $req_agent;
        $test['aft'] = $req_aft;
        $test['aftEarlyCutoff'] = (int)$req_aftec;
        $test['aftMinChanges'] = (int)$req_aftmc;
        $test['tcpdump'] = $req_tcpdump;
        $test['sensitive'] = $req_sensitive;
        $test['type'] = trim($req_type);
        $test['noopt'] = trim($req_noopt);
        $test['noimages'] = trim($req_noimages);
        $test['noheaders'] = trim($req_noheaders);
        
        // see if it is a batch test
        $test['batch'] = 0;
        if( (isset($req_bulkurls) && strlen($req_bulkurls)) || 
            (isset($_FILES['bulkfile']) && isset($_FILES['bulkfile']['tmp_name']) && strlen($_FILES['bulkfile']['tmp_name'])) )
            $test['batch'] = 1;

        // force the webperf contest entries to be private (hack)
        if( strstr( $test['url'], 'entries.webperf-contest.com') !== false )
            $test['private'] = 1;
        
        // login tests are forced to be private
        if( strlen($test['login']) )
            $test['private'] = 1;

        // default batch and API requests to a lower priority
        if( !isset($req_priority) )
        {
            if( $test['batch'] || $test['batch_locations'] )
                $test['priority'] =  7;
            elseif( $_SERVER['REQUEST_METHOD'] == 'GET' || $xml || $json )
                $test['priority'] =  5;
        }
        
        // do we need to force the priority to be ignored (needed for the AOL system currently?)
        if( $settings['noPriority'] )
            $test['priority'] =  0;
        
        // take the ad-blocking request and create a custom block from it
        if( $req_ads == 'blocked' )
            $test['block'] .= ' adsWrapper.js adsWrapperAT.js adsonar.js sponsored_links1.js switcher.dmn.aol.com';

        // see if they selected blank ads (AOL-specific)
        if( $req_ads == 'blank' )
        {
            if( strpos($test['url'], '?') === false )
                $test['url'] .= '?atwExc=blank';
            else
                $test['url'] .= '&atwExc=blank';
        }
    }
    else
    {
        // don't inherit some settings from the stored test
        unset($test['ip']);
        unset($test['uid']);
        unset($test['user']);
    }

    // the API key requirements are for all test paths
    $test['owner'] = $req_vo;
    $test['vd'] = $req_vd;
    $test['vh'] = $req_vh;
    $test['key'] = $req_k;
        
    // some myBB integration to get the requesting user
    if( isset($uid) && !$test['uid'] && !$test['user'] )
    {
        $test['uid'] = $uid;
        $test['user'] = $user;
    }

    // create an owner string (for API calls, this should already be set as a cookie for normal visitors)
    if( !isset($test['owner']) || !strlen($test['owner']) )
      $test['owner'] = sha1(uniqid(uniqid('', true), true));
      
    // Make sure we aren't blocking the tester
    // TODO: remove the allowance for high-priority after API keys are implemented
    if( CheckIp($test) && CheckUrl($test['url']) )
    {
        // load the location information
        $locations = parse_ini_file('./settings/locations.ini', true);
        BuildLocations($locations);
        
        $error = NULL;
        
        ValidateKey($test, $error);
    
        if( !$error )
          ValidateParameters($test, $locations, $error);
          
        if( !$error )
        {
            if( $test['batch_locations'] && count($test['multiple_locations']) )
            {
                $test['id'] = CreateTest($test, $test['url'], 0, 1);

                $test['tests'] = array();
                foreach( $test['multiple_locations'] as $location_string )
                {
                    // Create a test with the given location and applicable connectivity.
                    UpdateLocation($test, $locations, $location_string);
                    $id = CreateTest($test, $test['url']);
                    if( isset($id) )
                        $test['tests'][] = array('url' => $test['url'], 'id' => $id);
                }

                // write out the list of urls and the test ID for each
                if( count($test['tests']) )
                {
                    $path = GetTestPath($test['id']);
                    file_put_contents("./$path/tests.json", json_encode($test['tests']));
                }
                else
                    $error = 'Locations could not be submitted for testing';
            }
            elseif( $test['batch'] )
            {
                // build up the full list of urls
                $bulk = array();
                $bulk['urls'] = array();
                $bulk['variations'] = array();
                $bulkUrls = '';
                if( isset($req_bulkurls) && strlen($req_bulkurls) )
                    $bulkUrls = $req_bulkurls . "\n";
                if( isset($_FILES['bulkfile']) && isset($_FILES['bulkfile']['tmp_name']) && strlen($_FILES['bulkfile']['tmp_name']) )
                    $bulkUrls .= file_get_contents($_FILES['bulkfile']['tmp_name']);
                
                $current_mode = 'urls';
                if( strlen($bulkUrls) )
                {
                    $lines = explode("\n", $bulkUrls);
                    foreach( $lines as $line )
                    {
                        $line = trim($line);
                        if( strlen($line) )
                        {
                            if( substr($line, 0, 1) == '[' )
                            {
                                if( !strcasecmp($line, '[urls]') )
                                    $current_mode = 'urls';
                                elseif(!strcasecmp($line, '[variations]'))
                                    $current_mode = 'variations';
                                else
                                    $current_mode = '';
                            }
                            elseif( $current_mode == 'urls' )
                            {
                                $entry = ParseBulkUrl($line);
                                if( $entry )
                                    $bulk['urls'][] = $entry;
                            }
                            elseif( $current_mode == 'variations' )
                            {
                                $entry = ParseBulkVariation($line);
                                if( $entry )
                                    $bulk['variations'][] = $entry;
                            }
                        }
                    }
                }
                
                if( count($bulk['urls']) )
                {
                    $test['id'] = CreateTest($test, $test['url'], 1);
                    
                    $testCount = 0;
                    foreach( $bulk['urls'] as &$entry )
                    {
                        $entry['id'] = CreateTest($test, $entry['u']);
                        if( $entry['id'] )
                        {
                            $entry['v'] = array();
                            foreach( $bulk['variations'] as $variation_index => &$variation )
                            {
                                $url = CreateUrlVariation($entry['u'], $variation['q']);
                                if( $url )
                                    $entry['v'][$variation_index] = CreateTest($test, $url);
                            }
                            $testCount++;
                        }
                    }
                    
                    // write out the list of urls and the test ID for each
                    if( $testCount )
                    {
                        $path = GetTestPath($test['id']);
                        gz_file_put_contents("./$path/bulk.json", json_encode($bulk));
                    }
                    else
                        $error = 'Urls could not be submitted for testing';
                }
                else
                    $error = "No valid urls submitted for bulk testing";
            }
            else
            {
                $test['id'] = CreateTest($test, $test['url']);
                if( !$test['id'] )
                    $error = 'Error submitting url for testing';
            }
        }
            
        // redirect the browser to the test results page
        if( !$error )
        {
            // scale EC2 if necessary
            if( isset($locations[$test['location']]['ec2']) && is_file('./ec2/ec2.inc.php') )
            {
                require_once('./ec2/ec2.inc.php');
                EC2_ScaleUp($test['location'], $locations[$test['location']]['ec2']);
            }
            
            $host  = $_SERVER['HTTP_HOST'];
            $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');

            if( $xml )
            {
                header ('Content-type: text/xml');
                echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
                echo "<response>\n";
                echo "<statusCode>200</statusCode>\n";
                echo "<statusText>Ok</statusText>\n";
                if( strlen($req_r) )
                    echo "<requestId>{$req_r}</requestId>\n";
                echo "<data>\n";
                if( $test['batch'] || $test['batch_locations'])
                {
                    foreach( $test['tests'] as &$t )
                    {
                        echo "<test>\n";
                        echo "<testId>{$t['id']}</testId>\n";
                        echo "<testUrl>" . htmlentities($t['url']) . "</testUrl>\n";
                        echo "<ownerKey>{$t['owner']}</ownerKey>\n";
                        echo "<xmlUrl>http://$host$uri/xmlResult/{$t['id']}/</xmlUrl>\n";
                        echo "<userUrl>http://$host$uri/result/{$t['id']}/</userUrl>\n";
                        echo "<summaryCSV>http://$host$uri/result/{$t['id']}/page_data.csv</summaryCSV>\n";
                        echo "<detailCSV>http://$host$uri/result/{$t['id']}/requests.csv</detailCSV>\n";
                        echo "</test>\n";
                    }
                }
                else
                {
                    echo "<testId>{$test['id']}</testId>\n";
                    echo "<ownerKey>{$test['owner']}</ownerKey>\n";
                    echo "<xmlUrl>http://$host$uri/xmlResult/{$test['id']}/</xmlUrl>\n";
                    echo "<userUrl>http://$host$uri/result/{$test['id']}/</userUrl>\n";
                    echo "<summaryCSV>http://$host$uri/result/{$test['id']}/page_data.csv</summaryCSV>\n";
                    echo "<detailCSV>http://$host$uri/result/{$test['id']}/requests.csv</detailCSV>\n";
                }
                echo "</data>\n";
                echo "</response>\n";
                
            }
            elseif( $json )
            {
                $ret = array();
                $ret['statusCode'] = 200;
                $ret['statusText'] = 'Ok';
                if( strlen($req_r) )
                    $ret['requestId'] = $req_r;
                $ret['data'] = array();
                if( $test['batch'] || $test['batch_locations'])
                {
                    $ret['data']['test'] = array();
                    foreach( $test['tests'] as &$t )
                    {
                        $entry = array();
                        $entry['testId'] = $t['id'];
                        $entry['ownerKey'] = $t['owner'];
                        $entry['testUrl'] = $t['url'];
                        $entry['jsonUrl'] = "http://$host$uri/jsonResult/{$t['id']}/";
                        $entry['userUrl'] = "http://$host$uri/result/{$t['id']}/";
                        $entry['summaryCSV'] = "http://$host$uri/result/{$t['id']}/page_data.csv";
                        $entry['detailCSV'] = "http://$host$uri/result/{$t['id']}/requests.csv";
                        $ret['data']['test'][] = $entry;
                    }
                }
                else
                {
                    $ret['data']['testId'] = $test['id'];
                    $ret['data']['ownerKey'] = $test['owner'];
                    $ret['data']['jsonUrl'] = "http://$host$uri/jsonResult/{$test['id']}/";
                    $ret['data']['userUrl'] = "http://$host$uri/result/{$test['id']}/";
                    $ret['data']['summaryCSV'] = "http://$host$uri/result/{$test['id']}/page_data.csv";
                    $ret['data']['detailCSV'] = "http://$host$uri/result/{$test['id']}/requests.csv";
                }
                header ("Content-type: application/json");
                echo json_encode($ret);
            }
            else
            {
                // redirect regardless if it is a bulk test or not
                header("Location: http://$host$uri/result/{$test['id']}/");    
            }
        }
        else
        {
            if( $xml )
            {
                header ('Content-type: text/xml');
                echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
                echo "<response>\n";
                echo "<statusCode>400</statusCode>\n";
                echo "<statusText>" . $error . "</statusText>\n";
                if( strlen($req_r) )
                    echo "<requestId>" . $req_r . "</requestId>\n";
                echo "</response>\n";
            }
            elseif( $json )
            {
                $ret = array();
                $ret['statusCode'] = 400;
                $ret['statusText'] = $error;
                if( strlen($req_r) )
                    $ret['requestId'] = $req_r;
                header ("Content-type: application/json");
                echo json_encode($ret);
            }
            else
            {
                ?>
                <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
                <html>
                    <head>
                        <title>WebPagetest - Test Error</title>
                        <?php $gaTemplate = 'Test Error'; include ('head.inc'); ?>
                    </head>
                    <body>
                        <div class="page">
                            <?php
                            include 'header.inc';

                            echo "<p>$error</p>\n";
                            ?>
            
                            <?php include('footer.inc'); ?>
                        </div>
                    </body>
                </html>
                <?php
            }
        }
    }
    else
    {
        if( $xml )
        {
            header ('Content-type: text/xml');
            echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
            echo "<response>\n";
            echo "<statusCode>400</statusCode>\n";
            echo "<statusText>Your test request was intercepted by our spam filters (or because we need to talk to you about how you are submitting tests)</statusText>\n";
            echo "</response>\n";
        }
        elseif( $json )
        {
            $ret = array();
            $ret['statusCode'] = 400;
            $ret['statusText'] = 'Your test request was intercepted by our spam filters (or because we need to talk to you about how you are submitting tests)';
            header ("Content-type: application/json");
            echo json_encode($ret);
        }
        else
            include 'blocked.php';
    }


/**
* Update the given location into the Test variable. This is needed for
* submitting multiple-locations tests in one-shot.
*   This also involves updating the locationText, browser and connectivity
* values that are applicable for the new location.
* 
* @param mixed $test
* @param mixed $new_location
*/
function UpdateLocation(&$test, &$locations, $new_location)    
{
  // Update the location.
  $test['location'] = $new_location;
    
  // see if we need to override the browser
  if( isset($locations[$test['location']]['browserExe']) && strlen($locations[$test['location']]['browserExe']))
    $test['browser'] = $locations[$test['location']]['browserExe'];
                
  // figure out what the location working directory and friendly name are
  $test['locationText'] = $locations[$test['location']]['label'];
  $test['workdir'] = $locations[$test['location']]['localDir'];
  $test['remoteUrl']  = $locations[$test['location']]['remoteUrl'];
  $test['remoteLocation'] = $locations[$test['location']]['remoteLocation'];
  if( !strlen($test['workdir']) && !strlen($test['remoteUrl']) )
      $error = "Invalid Location, please try submitting your test request again.";

  // see if we need to pick the default connectivity
  if( (!isset($locations[$test['location']]['connectivity']) || !strlen($locations[$test['location']]['connectivity'])) && !isset($test['connectivity']) )
      $test['connectivity'] = 'DSL';

  if( isset($test['connectivity']) )
  {
      $test['locationText'] .= " - <b>{$test['connectivity']}</b>";
      $connectivity = parse_ini_file('./settings/connectivity.ini', true);
      if( isset($connectivity[$test['connectivity']]) )
      {
          $test['bwIn'] = (int)$connectivity[$test['connectivity']]['bwIn'] / 1000;
          $test['bwOut'] = (int)$connectivity[$test['connectivity']]['bwOut'] / 1000;
          $test['latency'] = (int)$connectivity[$test['connectivity']]['latency'];
          $test['testLatency'] = (int)$connectivity[$test['connectivity']]['latency'];
          $test['plr'] = $connectivity[$test['connectivity']]['plr'];

          if( isset($connectivity[$test['connectivity']]['aftCutoff']) && !$test['aftEarlyCutoff'] )
              $test['aftEarlyCutoff'] = $connectivity[$test['connectivity']]['aftCutoff'];
      }
  }

  // adjust the latency for any last-mile latency at the location
  if( isset($test['latency']) && $locations[$test['location']]['latency'] )
      $test['testLatency'] = max(0, $test['latency'] - $locations[$test['location']]['latency'] );

}
    
    
/**
* See if we are requiring key validation and if so, enforce the restrictions
* 
* @param mixed $test
* @param mixed $error
*/
function ValidateKey(&$test, &$error)
{
  // load the secret key (if there is one)
  $secret = '';
  $keys = parse_ini_file('./settings/keys.ini', true);
  if( $keys && isset($keys['server']) && isset($keys['server']['secret']) )
    $secret = trim($keys['server']['secret']);
    
  if( strlen($secret) ){
    // ok, we require key validation, see if they have an hmac (user with form)
    // or API key
    if( isset($test['vh']) && strlen($test['vh']) ){
      // validate the hash
      $hashStr = $secret;
      $hashStr .= $_SERVER['HTTP_USER_AGENT'];
      $hashStr .= $test['owner'];
      $hashStr .= $test['vd'];
      $hmac = sha1($hashStr);
      
      // check the elapsed time since the hmac was issued
      $now = time();
      $origTime = strtotime($test['vd']);
      $elapsed = abs($now - $origTime);
      
      if( $hmac != $test['vh'] || $elapsed > 86400 )
        $error = 'Your test request could not be validated (this can happen if you leave the browser window open for over a day before submitting a test).  Please try submitting it again.';
      
    }elseif( isset($test['key']) && strlen($test['key']) ){
      // validate their API key and enforce any rate limits
      if( isset($keys[$test['key']]) ){
        if (isset($keys[$test['key']]['priority']))
            $test['priority'] = $keys[$test['key']]['priority'];
        if( isset($keys[$test['key']]['limit']) ){
          $limit = (int)$keys[$test['key']]['limit'];
          if( $limit > 0 ){
            // update the number of tests they have submitted today
            if( !is_dir('./dat') )
              mkdir('./dat', 0777, true);
              
            $keyfile = './dat/keys_' . date('Ymd') . '.dat';
            $usage = null;
            if( is_file($keyfile) )
              $usage = json_decode(file_get_contents($keyfile), true);
            if( !isset($usage) )
              $usage = array();
            if( isset($usage[$test['key']]) )
              $used = (int)$usage[$test['key']];
            else
              $used = 0;
            
            $runcount = $test['runs'];
            if( !$test['fvonly'] )
              $runcount *= 2;
              
            if( $used + $runcount <= $limit ){
              $used += $runcount;
              $usage[$test['key']] = $used;
              file_put_contents($keyfile, json_encode($usage));
            }else{
              $error = 'The test request will exceed the daily test limit for the given API key';
            }
          }
        }
      }else{
        $error = 'Invalid API Key';
      }
    }else{
      $error = 'An error occurred processing your request.  Please reload the testing page and try submitting your test request again. (missing API key)';
    }
  }
}
    
/**
* Validate the test options and set intelligent defaults
*     
* @param mixed $test
* @param mixed $locations
*/
function ValidateParameters(&$test, $locations, &$error)
{
    if( strlen($test['script']) )
    {
        $url = ValidateScript($test, $error);
        if( isset($url) )
            $test['url'] = $url;
    }
    
    if( strlen($test['url']) || $test['batch'] )
    {
        $settings = parse_ini_file('./settings/settings.ini');
        if( $_COOKIE['maxruns'] )
            $settings['maxruns'] = (int)$_COOKIE['maxruns'];
        $maxruns = (int)$settings['maxruns'];
        if( !$maxruns )
            $maxruns = 10;
        
        if( !$test['batch'] )
            ValidateURL($test['url'], $error, $settings);
            
        if( !$error )
        {
            // make sure the test runs are between 1 and 200
            if( $test['runs'] > $maxruns )
                $test['runs'] = $maxruns;
            elseif( $test['runs'] < 1 )
                $test['runs'] = 1;
                
            // if fvonly is set, make sure it is to an explicit value of 1
            if( $test['fvonly'] > 0 )
                $test['fvonly'] = 1;

            // make sure private is explicitly 1 or 0
            if( $test['private'] )
                $test['private'] = 1;
            else
                $test['private'] = 0;
                
            // make sure web10 is explicitly 1 or 0
            if( $test['web10'] )
                $test['web10'] = 1;
            else
                $test['web10'] = 0;

            // make sure ignoreSSL is explicitly 1 or 0
            if( $test['ignoreSSL'] )
                $test['ignoreSSL'] = 1;
            else
                $test['ignoreSSL'] = 0;
                
            // make sure tcpdump is explicitly 1 or 0
            if( $test['tcpdump'] )
                $test['tcpdump'] = 1;
            else
                $test['tcpdump'] = 0;

            // make sure sensitive is explicitly 1 or 0
            if( $test['sensitive'] )
                $test['sensitive'] = 1;
            else
                $test['sensitive'] = 0;

            if( $test['aft'] )
            {
                $test['aft'] = 1;
                $test['video'] = 1;
            }
            else
                $test['aft'] = 0;
            
            if( !$test['aftMinChanges'] && $settings['aftMinChanges'] )
                $test['aftMinChanges'] = $settings['aftMinChanges'];

            // use the default location if one wasn't specified
            if( !strlen($test['location']) )
            {
                $def = $locations['locations']['default'];
                if( !$def )
                    $def = $locations['locations']['1'];
                $loc = $locations[$def]['default'];
                if( !$loc )
                    $loc = $locations[$def]['1'];
                $test['location'] = $loc;
            }
            
            // see if we are blocking API access at the given location
            if( $locations[$test['location']]['noscript'] && $test['priority'] )
                $error = 'API Automation is currently disabled for that location.';
            
            // see if we need to override the browser
            if( isset($locations[$test['location']]['browserExe']) && strlen($locations[$test['location']]['browserExe']))
                $test['browser'] = $locations[$test['location']]['browserExe'];
                
            // figure out what the location working directory and friendly name are
            $test['locationText'] = $locations[$test['location']]['label'];
            $test['workdir'] = $locations[$test['location']]['localDir'];
            $test['remoteUrl']  = $locations[$test['location']]['remoteUrl'];
            $test['remoteLocation'] = $locations[$test['location']]['remoteLocation'];
            if( !strlen($test['workdir']) && !strlen($test['remoteUrl']) )
                $error = "Invalid Location, please try submitting your test request again.";

            if( strlen($test['type']) )
            {
                if( $test['type'] == 'traceroute' )
                {
                    // make sure we're just passing a host name
                    $parts = parse_url($test['url']);
                    $test['url'] = $parts['host'];
                }
            }
            else
            {                
                // see if we need to pick the default connectivity
                if( (!isset($locations[$test['location']]['connectivity']) || !strlen($locations[$test['location']]['connectivity'])) && !isset($test['connectivity']) )
                    $test['connectivity'] = 'DSL';
                    
                if( isset($test['connectivity']) )
                {
                    $test['locationText'] .= " - <b>{$test['connectivity']}</b>";
                    $connectivity = parse_ini_file('./settings/connectivity.ini', true);
                    if( isset($connectivity[$test['connectivity']]) )
                    {
                        $test['bwIn'] = (int)$connectivity[$test['connectivity']]['bwIn'] / 1000;
                        $test['bwOut'] = (int)$connectivity[$test['connectivity']]['bwOut'] / 1000;
                        $test['latency'] = (int)$connectivity[$test['connectivity']]['latency'];
                        $test['testLatency'] = (int)$connectivity[$test['connectivity']]['latency'];
                        $test['plr'] = $connectivity[$test['connectivity']]['plr'];
                        
                        if( isset($connectivity[$test['connectivity']]['aftCutoff']) && !$test['aftEarlyCutoff'] )
                            $test['aftEarlyCutoff'] = $connectivity[$test['connectivity']]['aftCutoff'];
                    }
                }
                
                // adjust the latency for any last-mile latency at the location
                if( isset($test['latency']) && $locations[$test['location']]['latency'] )
                    $test['testLatency'] = max(0, $test['latency'] - $locations[$test['location']]['latency'] );
            }
            
            if( !$test['aftEarlyCutoff'] && $settings['aftEarlyCutoff'] )
                $test['aftEarlyCutoff'] = $settings['aftEarlyCutoff'];
        }
    }
    elseif( !strlen($error) )
        $error = "Invalid URL, please try submitting your test request again.";
    
    return $ret;
}

/**
* Validate the uploaded script to make sure it should be run
* 
* @param mixed $test
* @param mixed $error
*/
function ValidateScript(&$test, &$error)
{
    FixScript($test['script']);
    
    $ok = false;
    $url = null;
    $lines = explode("\n", $test['script']);
    foreach( $lines as $line )
    {
        $tokens = explode("\t", $line);
        $command = trim($tokens[0]);
        if( !strcasecmp($command, 'navigate') )
        {
            $ok = true;
            $url = trim($tokens[1]);
            if (stripos($url, '%URL%') !== false)
                $url = null;
        }
        elseif( !strcasecmp($command, 'loadVariables') )
            $error = "loadVariables is not a supported command for uploaded scripts.";
        elseif( !strcasecmp($command, 'loadFile') )
            $error = "loadFile is not a supported command for uploaded scripts.";
        elseif( !strcasecmp($command, 'fileDialog') )
            $error = "fileDialog is not a supported command for uploaded scripts.";
    }
    
    if( !$ok )
        $error = "Invalid Script (make sure there is at least one navigate command and that the commands are tab-delimited).  Please contact us if you need help with your test script.";
    
    return $url;
}

/**
* Try to automaticaly fix a script that used spaces instead of tabs
* 
* @param mixed $script
*/
function FixScript(&$script)
{
    if( strlen($script) )
    {
        $newScript = '';
        $lines = explode("\n", $script);
        foreach( $lines as $line )
        {
            $line = trim($line);
            if( strlen($line) )
            {
                if( strpos($line, "\t") !== false )
                    $newScript .= "$line\r\n";
                else
                {
                    $command = strtok(trim($line), " \t\r\n");
                    if( $comand !== false )
                    {
                        $newScript .= $command;
                        $expected = ScriptParameterCount($command);
                        if( $expected == 2 )
                        {
                            $target = strtok("\r\n");
                            if( $target !== false )
                                $newScript .= "\t$target";
                        }
                        elseif( $expected = 3 )
                        {
                            $target = strtok(" \t\r\n");
                            if( $target !== false )
                            {
                                $newScript .= "\t$target";
                                $value = strtok("\r\n");
                                if( $value !== false )
                                    $newScript .= "\t$value";
                            }
                        }
                        $newScript .= "\r\n";
                    }
                }
            }
        }
        
        $script = $newScript;
    }
}

/**
* Figure out how many parameters are expected for the given script step
* in case we're trying to fix a script with no tabs the command count
* will help us allow commands with spaces in them
* 
* @param mixed $command
*/
function ScriptParameterCount($command)
{
    // default to 2 - 3 is the special case
    $count = 2;
    
    if( !strcasecmp($command, 'setDOMRequest') ||
        !strcasecmp($command, 'setValue') || 
        !strcasecmp($command, 'setInnerText') || 
        !strcasecmp($command, 'setInnerHTML') || 
        !strcasecmp($command, 'selectValue') || 
        !strcasecmp($command, 'loadFile') || 
        !strcasecmp($command, 'fileDialog') || 
        !strcasecmp($command, 'sendKeyPress') || 
        !strcasecmp($command, 'sendKeyPressAndWait') || 
        !strcasecmp($command, 'sendKeyDown') || 
        !strcasecmp($command, 'sendKeyDownAndWait') || 
        !strcasecmp($command, 'sendKeyUp') || 
        !strcasecmp($command, 'sendKeyUpAndWait') || 
        !strcasecmp($command, 'sendCommand') || 
        !strcasecmp($command, 'sendCommandAndWait') || 
        !strcasecmp($command, 'setCookie') || 
        !strcasecmp($command, 'setDNS') || 
        !strcasecmp($command, 'setDnsName') )
    {
        $count = 3;
    }
    
    return $count;
}

/**
* Make sure the URL they requested looks valid
* 
* @param mixed $test
* @param mixed $error
*/
function ValidateURL(&$url, &$error, &$settings)
{
    $ret = false;
    
    // make sure the url starts with http://
    if( strncasecmp($url, 'http:', 5) && strncasecmp($url, 'https:', 6))
        $url = 'http://' . $url;
        
    $parts = parse_url($url);
    $host = $parts['host'];
    
    if( strpos($host, '.') === FALSE )
        $error = "Please enter a Valid URL.  <b>$host</b> is not a valid Internet host name";
    elseif( !strcmp($host, "127.0.0.1") || ((!strncmp($host, "192.168.", 8)  || !strncmp($host, "10.", 3)) && !$settings['allowPrivate']) )
        $error = "You can not test <b>$host</b> from the public Internet.  Your web site needs to be hosted on the public Internet for testing";
    else
        $ret = true;

    return $ret;
}

/**
* Generate a SNS authentication script for the given URL
* 
* @param mixed $test
*/
function GenerateSNSScript($test)
{
    $script = "logdata\t0\n\n";
    
    $script .= "setEventName\tLaunch\n";
    $script .= "setDOMElement\tname=loginId\n";
    $script .= "navigate\t" . 'https://my.screenname.aol.com/_cqr/login/login.psp?mcState=initialized&sitedomain=search.aol.com&authLev=1&siteState=OrigUrl%3Dhttp%253A%252F%252Fsearch.aol.com%252Faol%252Fwebhome&lang=en&locale=us&seamless=y' . "\n\n";

    $script .= "setValue\tname=loginId\t{$test['login']}\n";
    $script .= "setValue\tname=password\t{$test['password']}\n";
    $script .= "setEventName\tLogin\n";
    $script .= "submitForm\tname=AOLLoginForm\n\n";
    
    $script .= "logData\t1\n\n";
    
    if( strlen($test['domElement']) )
        $script .= "setDOMElement\t{$test['domElement']}\n";
    $script .= "navigate\t{$test['url']}\n";
    
    return $script;
}    

/**
* Submit the test request file to the server
* 
* @param mixed $run
* @param mixed $testRun
* @param mixed $test
*/
function SubmitUrl($testId, $testData, &$test, $url)
{
    $ret = false;
    
    // make sure the work directory exists
    if( !is_dir($test['workdir']) )
        mkdir($test['workdir'], 0777, true);
    
    $out = "Test ID=$testId\r\nurl=";
    if( !strlen($test['script']) )
        $out .= $url;
    else
        $out .= "script://$testId.pts";

    // add the actual test configuration
    $out .= $testData;
    
    // add the script data (if we're running a script)
    if( strlen($test['script']) )
    {
        $script = trim($test['script']);
        if (strlen($url))
            $script = str_ireplace('%URL%', $url, $script);
        $out .= "\r\n[Script]\r\n" . $script;
    }
        
    // write out the actual test file
    $ext = 'url';
    if( $test['priority'] )
        $ext = "p{$test['priority']}";
    if( file_put_contents($test['workdir'] . "/$testId.$ext", $out) )
        $ret = true;
    
    return $ret;
}

/**
* Log the actual test in the test log file
* 
* @param mixed $test
*/
function LogTest(&$test, $testId, $url)
{
    if( !is_dir('./logs') )
        mkdir('./logs', 0777, true);
        
    // open the log file
    $filename = "./logs/" . gmdate("Ymd") . ".log";
    $file = fopen( $filename, "a+b",  false);
    $video = 0;
    if( strlen($test['video']) )
        $video = 1;
    if( $file )
    {
        $ip = $_SERVER['REMOTE_ADDR'];
        if( $test['ip'] && strlen($test['ip']) )
            $ip = $test['ip'];
        
        $log = gmdate("Y-m-d G:i:s") . "\t$ip" . "\t0" . "\t0";
        $log .= "\t$testId" . "\t$url" . "\t{$test['locationText']}" . "\t{$test['private']}";
        $log .= "\t{$test['uid']}" . "\t{$test['user']}" . "\t$video" . "\t{$test['label']}" . "\r\n";

        // flock will block until we acquire the lock or the script times out and is killed
        if( flock($file, LOCK_EX) )
            fwrite($file, $log);
        
        fclose($file);
    }
}


/**
* Make sure the requesting IP isn't on our block list
* 
*/
function CheckIp(&$test)
{
    $ok = true;
    $ip2 = $test['ip'];
    $ip = $_SERVER['REMOTE_ADDR'];
    $blockIps = file('./settings/blockip.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach( $blockIps as $block )
    {
        $block = trim($block);
        if( strlen($block) )
        {
            if( ereg($block, $ip) )
            {
                $ok = false;
                break;
            }
            
            if( $ip2 && strlen($ip2) && ereg($block, $ip) )
            {
                $ok = false;
                break;
            }
        }
    }
    
    return $ok;
}

/**
* Make sure the url isn't on our block list
* 
* @param mixed $url
*/
function CheckUrl($url)
{
    $ok = true;
    $blockUrls = file('./settings/blockurl.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach( $blockUrls as $block )
    {
        $block = trim($block);
        if( strlen($block) && ereg($block, $url) )
        {
            $ok = false;
            break;
        }
    }
    
    return $ok;
}

/**
* Generate a shard key to better spread out the test results
* 
*/
function ShardKey()
{
    global $settings;
    $key = '';

    // default to a 2-digit shard (1024-way shard)
    $size = 2;
    if( array_key_exists('shard', $settings) )
        $size = (int)$settings['shard'];
    
    if( $size > 0 && $size < 20 )
    {
        $digits = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
        $digitCount = strlen($digits) - 1;
        while( $size )
        {
            $key .= substr($digits, rand(0, $digitCount), 1);
            $size--;
        }
        $key .= '_';
    }
    
    return $key;
}

/**
* Create a single test and return the test ID
* 
* @param mixed $test
* @param mixed $url
*/
function CreateTest(&$test, $url, $batch = 0, $batch_locations = 0)
{
    $testId = null;
    
    // generate the test ID
    $id = null;
    if( $test['private'] )
        $id = ShardKey() . md5(uniqid(rand(), true));
    else
        $id = ShardKey() . uniqueId();
    $today = new DateTime("now", new DateTimeZone('UTC'));
    $testId = $today->format('ymd_') . $id;
    $test['path'] = './' . GetTestPath($testId);
    
    // make absolutely CERTAIN that this test ID doesn't already exist
    while( is_dir($test['path']) )
    {
        // fall back to random ID's
        $id = ShardKey() . md5(uniqid(rand(), true));
        $testId = $today->format('ymd_') . $id;
        $test['path'] = './' . GetTestPath($testId);
    }

    // create the folder for the test results
    if( !is_dir($test['path']) )
        mkdir($test['path'], 0777, true);
    
    // write out the ini file
    $testInfo = "[test]\r\n";
    $testInfo .= "fvonly={$test['fvonly']}\r\n";
    $testInfo .= "runs={$test['runs']}\r\n";
    $testInfo .= "location=\"{$test['locationText']}\"\r\n";
    $testInfo .= "loc={$test['location']}\r\n";
    $testInfo .= "id=$testId\r\n";
    $testInfo .= "batch=$batch\r\n";
    $testInfo .= "batch_locations=$batch_locations\r\n";
    $testInfo .= "aft={$test['aft']}\r\n";
    $testInfo .= "sensitive={$test['sensitive']}\r\n";
    if( strlen($test['login']) )
        $testInfo .= "authenticated=1\r\n";
    $testInfo .= "connections={$test['connections']}\r\n";
    if( strlen($test['script']) )
        $testInfo .= "script=1\r\n";
    if( strlen($test['notify']) )
        $testInfo .= "notify={$test['notify']}\r\n";
    if( strlen($test['video']) )
        $testInfo .= "video=1\r\n";
    if( strlen($test['uid']) )
        $testInfo .= "uid={$test['uid']}\r\n";
    if( strlen($test['owner']) )
        $testInfo .= "owner={$test['owner']}\r\n";
    if( strlen($test['type']) )
        $testInfo .= "type={$test['type']}\r\n";
    if( strlen($test['industry']) && strlen($test['industry_page']) )
    {
        $testInfo .= "industry=\"{$test['industry']}\"\r\n";
        $testInfo .= "industry_page=\"{$test['industry_page']}\"\r\n";
    }

    if( isset($test['connectivity']) )
    {
        $testInfo .= "connectivity={$test['connectivity']}\r\n";
        $testInfo .= "bwIn={$test['bwIn']}\r\n";
        $testInfo .= "bwOut={$test['bwOut']}\r\n";
        $testInfo .= "latency={$test['latency']}\r\n";
        $testInfo .= "plr={$test['plr']}\r\n";
    }
    
    $testInfo .= "\r\n[runs]\r\n";
    if( $test['median_video'] )
        $testInfo .= "median_video=1\r\n";

    file_put_contents("{$test['path']}/testinfo.ini",  $testInfo);

    // for "batch" tests (the master) we don't need to submit an actual test request
    if( !$batch && !$batch_locations)
    {
        // build up the actual test commands
        $testFile = '';
        if( strlen($test['domElement']) )
            $testFile .= "\r\nDOMElement={$test['domElement']}";
        if( $test['fvonly'] )
            $testFile .= "\r\nfvonly=1";
        if( $test['web10'] )
            $testFile .= "\r\nweb10=1";
        if( $test['ignoreSSL'] )
            $testFile .= "\r\nignoreSSL=1";
        if( $test['tcpdump'] )
            $testFile .= "\r\ntcpdump=1";
        if( $test['video'] )
            $testFile .= "\r\nCapture Video=1";
        if( $test['aft'] )
        {
            $testFile .= "\r\naft=1";
            $testFile .= "\r\naftMinChanges={$test['aftMinChanges']}";
            $testFile .= "\r\naftEarlyCutoff={$test['aftEarlyCutoff']}";
        }
        if( strlen($test['type']) )
            $testFile .= "\r\ntype={$test['type']}";
        if( $test['block'] )
            $testFile .= "\r\nblock={$test['block']}";
        if( $test['noopt'] )
            $testFile .= "\r\nnoopt=1";
        if( $test['noimages'] )
            $testFile .= "\r\nnoimages=1";
        if( $test['noheaders'] )
            $testFile .= "\r\nnoheaders=1";
        $testFile .= "\r\nruns={$test['runs']}\r\n";
        
        if( isset($test['connectivity']) )
        {
            $testFile .= "bwIn={$test['bwIn']}\r\n";
            $testFile .= "bwOut={$test['bwOut']}\r\n";
            $testFile .= "latency={$test['testLatency']}\r\n";
            $testFile .= "plr={$test['plr']}\r\n";
        }

        if( isset($test['browser']) && strlen($test['browser']) )
            $testFile .= "browser={$test['browser']}\r\n";

        // see if we need to generate a SNS authentication script
        if( strlen($test['login']) && strlen($test['password']) )
        {
            if( $test['authType'] == 1 )
                $test['script'] = GenerateSNSScript($test);
            else
                $testFile .= "\r\nBasic Auth={$test['login']}:{$test['password']}\r\n";
        }
            
        if( SubmitUrl($testId, $testFile, $test, $url) )
        {
            // store the entire test data structure JSON encoded (instead of a bunch of individual files)
            if( !$test['sensitive'] )
                gz_file_put_contents("{$test['path']}/testinfo.json",  json_encode($test));
        }
        else
            $testId = null;
    }
    
    // log the test
    if( isset($testId) )
    {
        if ( $batch_locations )
            LogTest($test, $testId, 'Multiple Locations test');
        else if( $batch )
            LogTest($test, $testId, 'Bulk Test');
        else
            LogTest($test, $testId, $url);
    }

    return $testId;
}

/**
* Parse an URL from bulk input which can optionally have a label
* <url>
* or
* <label>=<url>
* 
* @param mixed $line
*/
function ParseBulkUrl($line)
{
    $entry = null;
    global $settings;
    $err;
    
    $equals = strpos($line, '=');
    $query = strpos($line, '?');
    $label = null;
    $url = null;
    if( $equals === false || ($query !== false && $equals < $query) )
        $url = $line;
    else
    {
        $label = trim(substr($line, 0, $equals));
        $url = trim(substr($line, $equals + 1));
    }
    
    if( $url && ValidateURL($url, $err, $settings) )
    {
        $entry = array();
        $entry['u'] = $url;
        if( $label )
            $entry['l'] = $label;
    }
    
    return $entry;
}

/**
* Parse the url variation from the bulk data
* in the format:
* <label>=<query param>
* 
* @param mixed $line
*/
function ParseBulkVariation($line)
{
    $entry = null;
    $equals = strpos($line, '=');

    if( $equals !== false )
    {
        $label = trim(substr($line, 0, $equals));
        $query = trim(substr($line, $equals + 1));
        if( strlen($label) && strlen($query) )
            $entry = array('l' => $label, 'q' => $query);
    }

    return $entry;
}
?>
