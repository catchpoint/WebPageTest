<?php 
// shared initializiation/loading code
set_time_limit(300);
error_reporting(0);
if( $debug )
    error_reporting(E_ALL);
umask(0);
date_default_timezone_set('UTC');


// constants
define('VER_CSS', 38);          // version of the sitewide css file
define('VER_JS', 13);            // version of the sitewide javascript file
define('VER_JS_TEST', 13);       // version of the javascript specific to the test pages
define('VER_JS_RUNNING', 1);    // version of the javascript specific to the test running status page

$tempDir = realpath('./tmp');
if (!is_dir($tempDir))
    mkdir($tempDir, 0777, true);
$tempDir .= '/';
define('PCLZIP_TEMPORARY_DIR', $tempDir);

// load the install-specific settings
$settings = parse_ini_file('./settings/settings.ini');

// override some settings from the URI
if( $_GET['bulk'] )
    $settings['noBulk'] = 0;

$cdnPath = '';
if( isset($settings['cdn']) )
    $cdnPath = $settings['cdn'];
$GLOBALS['cdnPath'] = $cdnPath;

$tz_offset = null;
if( isset($_COOKIE['tzo']) )
    $tz_offset = (int)$_COOKIE['tzo'];
SetLocaleFromBrowser();

// some myBB integration to get the requesting user
$supportsAuth = false;
$uid = NULL;
$user = NULL;
$admin = false;
if( is_dir('./forums') && !$settings['disableMybb'] )
{                         
    $supportsAuth = true;
    
    if( isset($_COOKIE['mybbuser']) )
    {
        $dir = getcwd();
        try
        {
            define("IN_MYBB",1);
            chdir('forums'); // path to MyBB
            include './global.php';

            $uid = $mybb->user['uid'];
            $user = $mybb->user['username'];
            if( $mybb->usergroup['cancp'] )
                $admin = true;
        }
        catch(Exception $e)
        {
        }
        chdir($dir);
    }
}

// assign a unique ID to each person
$owner = null;
if( isset($_COOKIE['o']) && strlen($_COOKIE['o']) ){
  $owner = $_COOKIE['o'];
}else{
  $owner = sha1(uniqid(uniqid('', true), true));
}
setcookie('o', $owner, time()+60*60*24*365, '/');


// set their color selection as a cookie
if( isset($_GET['color']) )
{
    setcookie('color', $_GET['color'], time()+60*60*24*365, '/');
    $_REQUEST['color'] = $_GET['color'];
}

// Load the test-specific data
$id = htmlspecialchars($_GET["test"]);

// if we didn't get an id explicitly, try from cookie
if( !$id )
    $id = $_COOKIE['tid'];

$testLabel = '';    
if( $id )
{
    // set the test ID cookie (session cookie) if we're looking at a different test
    if( strcmp($id, $_COOKIE['tid']) )
        setcookie('tid', $id);
    
    $testPath = './' . GetTestPath($id);
    // test if the testPath exists. If not, download from the remote storage.
    if( !is_dir($testPath) && is_file('storage/storage.inc') )
    {
        logMsg("Download $testPath\n");
        require_once('storage/storage.inc');
        DownloadResults($id);
    }

    $run = htmlspecialchars($_GET["run"]);
    if( !$run )
        $run = (int)1;
    $cached = (int)$_GET["cached"];
    $cachedText = '';
    if( $cached )
        $cachedText = '_Cached';
    if( is_file("$testPath/testinfo.ini") )
    {
        $test = parse_ini_file("$testPath/testinfo.ini",true);
        touch("$testPath/testinfo.ini");
    }
    $testDate = null;
    if( gz_is_file("$testPath/testinfo.json") )
    {
        $test['testinfo'] = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
        if (isset($test['testinfo']) && isset($test['testinfo']['completed']))
            $testDate = strftime('%x %X', (int)$test['testinfo']['completed'] + ($tz_offset * 60));
    }
    if( gz_is_file("$testPath/url.txt") )
        $url = htmlspecialchars(gz_file_get_contents("$testPath/url.txt"));
    if( gz_is_file("$testPath/dom.txt") )
        $dom = htmlspecialchars(gz_file_get_contents("$testPath/dom.txt"));
    if( gz_is_file("$testPath/login.txt") )
        $login = htmlspecialchars(gz_file_get_contents("$testPath/login.txt"));
    if( gz_is_file("$testPath/block.txt") )
        $blockString = htmlspecialchars(gz_file_get_contents("$testPath/block.txt"));

    // build a common label to add to the title of each of the results pages
    if( isset($test["test"]) && isset($test["test"]["location"]) )
    {
        $locs = preg_replace('/<.*>/U', '', $test["test"]["location"]); 
        $locscitypos =  strpos($locs, ",");
        if ($locscitypos)
            $locs = substr($locs,0,strpos($locs, ","));
        $url_temp = $url;
        if (substr($url,0,7) == 'http://')
            $url_temp = substr($url,7);
        elseif (substr($url,0,8) == 'https://')
            $url_temp = substr($url,8);
        $label = htmlspecialchars(gz_file_get_contents("$testPath/label.txt"));
        if ($label)
            $label = $label . " : ";
        $testLabel = FitText(' - ' . $locs . ' : ' . $label . $url_temp, 40);
        if( isset($testDate) && strlen($testDate) )
            $testLabel .= " - $testDate";
    }
}

/**
 * Create a shorter version of the url for displaying.
 */
function ShortenUrl($url)
{
  $displayurl = $url;
  $maxlen = 40;
  $len = strlen($displayurl);
  if( $len > $maxlen)
    $displayurl = substr($url, 0, $maxlen / 2) . '...' . substr($url, $len - ($maxlen / 2), $maxlen / 2);
  return $displayurl;
}

/**
 * Create a friendlier (unique) name for the download file from the url that was tested.
 */
function GetFileUrl($url)
{
  $parts = parse_url($url);
  return trim(preg_replace( '/[^\w.]/', '_', substr("{$parts['host']}/{$parts['path']}", 0, 50)), '_');
}

/**
* Figure out the test path (relative) for the given test id
* 
* @param mixed $id
*/
function GetTestPath($id)
{
    global $settings;
    $testPath = "results/$id";
    if( strpos($id, '_') == 6 )
    {
        $parts = explode('_', $id);
        
        // see if we have an extra level of hashing
        $dir = $parts[1];
        if( count($parts) > 2 && strlen($parts[2]))
            $dir .= '/' . $parts[2];
        
        $testPath = 'results/' . substr($parts[0], 0, 2) . '/' . substr($parts[0], 2, 2) . '/' . substr($parts[0], 4, 2) . '/' . $dir;
    }
    elseif( strlen($settings['olddir']) )
    {
        if( $settings['oldsubdir'] )
            $testPath = "results/{$settings['olddir']}/_" . strtoupper(substr($id, 0, 1)) . "/$id";
        else
            $testPath = "results/{$settings['olddir']}/$id";
    }
    return $testPath;
}

/**
* Set the php locale based on the browser's accept-languages header
* (if one exists) - only works on linux for now
*/
function SetLocaleFromBrowser()
{
  $langs = generate_languages();
  foreach ($langs as $lang)
  {
    if (strlen($lang > 2))
      $lang = substr($lang['lang'], 0, 3) . strtoupper(substr($lang['lang'], 3, 2));
    if (setlocale(LC_TIME, $lang['lang']) !== FALSE)
      break;   // it worked!
  }
}

function generate_languages()
{
  $rawlangs = explode(',', $_SERVER['HTTP_ACCEPT_LANGUAGE']);
  $langs = array();
  foreach ($rawlangs as $rawlang)
  {
    $parts = explode(';', $rawlang);
    if (count($parts) == 1)
      $qual = 1;                        // no q-factor
    else
    {
      $qual = explode('=', $parts[1]);
      if (count($qual) == 2)
        $qual = (float)$qual[1];        // q-factor
      else
        $qual = 1;                      // ill-formed q-f
    }
    $langs[] = array('lang' => trim($parts[0]), 'q' => $qual);
  }
  usort($langs, 'lang_compare_quality');
  return $langs;
}

// this function sorts by q-factors, putting highest first.
function lang_compare_quality($in_a, $in_b)
{
  if ($in_a['q'] > $in_b['q'])
    return -1;
  else if ($in_a['q'] < $in_b['q'])
    return 1;
  else
    return 0;
}

/**
* Figure out the path to the video directory given an id
* 
* @param mixed $id
*/
function GetVideoPath($id, $find = false)
{
    $path = "results/video/$id";
    if( strpos($id, '_') == 6 )
    {
        $parts = explode('_', $id);

        // see if we have an extra level of hashing
        $dir = $parts[1];
        if( count($parts) > 2 && strlen($parts[2]))
            $dir .= '/' . $parts[2];

        $path = 'results/video/' . substr($parts[0], 0, 2) . '/' . substr($parts[0], 2, 2) . '/' . substr($parts[0], 4, 2) . '/' . $dir;
        
        // support using the old path structure if we are trying to find an existing video
        if( $find && !is_dir($path) )
            $path = 'results/video/' . substr($parts[0], 0, 2) . '/' . substr($parts[0], 2, 2) . '/' . substr($parts[0], 4, 2) . '/' . $parts[1];
    }

    return $path;
}

/**
* Get the default location
* 
*/
function GetDefaultLocation()
{
    $locations = parse_ini_file('./settings/locations.ini', true);
    BuildLocations($locations);
    
    $def = $locations['locations']['default'];
    if( !$def )
        $def = $locations['locations']['1'];
    $loc = $locations[$def]['default'];
    if( !$loc )
        $loc = $locations[$def]['1'];
    
    return $locations[$loc];
}

/**
* Recursively delete a directory
* 
* @param mixed $dir
*/
function delTree($dir) 
{
    $files = glob( $dir . '*', GLOB_MARK );
    foreach( $files as $file )
    {
        if( substr( $file, -1 ) == '/' )
            delTree( $file );
        else
            unlink( $file );
    }
   
    if( is_dir($dir) ) 
        rmdir( $dir );
} 

/**
* Send a large file a chunk at a time
* 
* @param mixed $filename
* @param mixed $retbytes
* @return bool
*/
function readfile_chunked($filename, $retbytes = TRUE) 
{
    $buffer = '';
    $cnt =0;
    $handle = fopen($filename, 'rb');
    if ($handle === false) 
    {
        return false;
    }
    while (!feof($handle)) 
    {
        $buffer = fread($handle, 1024 * 1024);  // 1MB at a time
        echo $buffer;
        ob_flush();
        flush();
        if ($retbytes) 
        {
            $cnt += strlen($buffer);
        }
    }
    $status = fclose($handle);
    if ($retbytes && $status) 
    {
        return $cnt; // return num. bytes delivered like readfile() does.
    }
    return $status;
}

/**
* Send a large file a chunk at a time (supports gzipped files)
* 
* @param mixed $filename
* @param mixed $retbytes
* @return bool
*/
function gz_readfile_chunked($filename, $retbytes = TRUE) 
{
    $buffer = '';
    $cnt =0;
    $handle = gzopen("$filename.gz", 'rb');
    if ($handle === false) 
        $handle = gzopen($filename, 'rb');
    if ($handle === false) 
        return false;
    while (!gzeof($handle)) 
    {
        $buffer = gzread($handle, 1024 * 1024);  // 1MB at a time
        echo $buffer;
        ob_flush();
        flush();
        if ($retbytes) 
        {
            $cnt += strlen($buffer);
        }
    }
    $status = gzclose($handle);
    if ($retbytes && $status) 
    {
        return $cnt; // return num. bytes delivered like readfile() does.
    }
    return $status;
}

/**
* Make the text fit in the available space
* 
* @param mixed $text
* @param mixed $len
*/
function FitText($text, $len)
{
    $ret = $text;
    $textLen = strlen($ret);
    if( $textLen > $len)
    {
        // trim off any query parameters first
        $pos = strpos($ret, '?');
        if( $pos !== false )
        {
            $ret = substr($ret, 0, $pos);
            $ret .= '...';
        }

        // see if it is still too long            
        $textLen = strlen($ret);
        if( $textLen > $len)
            $ret = substr($ret, 0, ($len / 2) - 2) . '...' . substr($ret, $textLen - (($len / 2) - 1) + 1, ($len / 2) - 1);
    }

    return $ret;
}

/**
* Transparently read a gzip version of the given file (we will be looking for .gz extensions though it's not technically required, just good practice)
* 
* @param mixed $file
*/
function gz_file_get_contents($file)
{
    $data = null;
    
    $zip = gzopen("$file.gz", 'rb');
    if( $zip === false )
        $zip = gzopen($file, 'rb');
    
    if( $zip !== false )
    {
        $data = gzread($zip, 10000000);
        gzclose($zip);
    }
    else 
        $data = false;
    
    return $data;
}

/**
* Write out a gzip version of the given file (tacking on the .gz automatically)
* 
* @param mixed $filename
* @param mixed $data
*/
function gz_file_put_contents($filename, &$data)
{
    $ret = false;
    
    $zip = gzopen("$filename.gz", 'wb9');
    if( $zip !== false )
    {
        if( gzwrite($zip, $data) )
            $ret = true;
        gzclose($zip);
    }
    
    return $ret;
}

/**
* read a gzip file into an array
* 
* @param mixed $filename
*/
function gz_file($filename)
{
    $ret = null;
    
    if( is_file("$filename.gz") )
        $ret = gzfile("$filename.gz");
    elseif( is_file($filename) )
        $ret = file($filename);
    
    return $ret;
}

/**
* GZip compress the given file
* 
* @param mixed $filename
*/
function gz_compress($filename)
{
    $ret = false;
    
    $data = file_get_contents($filename);
    if( $data ){
        $ret = gz_file_put_contents($filename, $data);
        unset($data);
    }
    
    return $ret;
}

/**
* Check for either the compressed or uncompressed file
* 
* @param mixed $filename
*/
function gz_is_file($filename)
{
    $ret = is_file("$filename.gz") || is_file($filename);
    return $ret;
}

/**
* Load the pagespeed results and calculate the score
* 
* @param mixed $file
*/
function GetPageSpeedScore($file)
{
    $score = '';
    $pagespeed = LoadPageSpeedData($file);

    if( $pagespeed )
    {
        $total = 0;
        $count = 0;
        foreach( $pagespeed as &$check )
        {
            $total += (double)$check['score'];
            $count++;
        }
        if( $count )
            $score = ceil($total / $count);
    }
    
    return $score;
}

/**
* Load the full Page Speed data from disk
* 
* @param mixed $file
*/
function LoadPageSpeedData($file)
{
    $pagespeed = json_decode(gz_file_get_contents($file), true);

    if( !$pagespeed )
    {
        // try an alternate JSON decoder
        require_once('./lib/json.php');
        $json = new Services_JSON(SERVICES_JSON_LOOSE_TYPE | SERVICES_JSON_SUPPRESS_ERRORS);
        $pagespeed = $json->decode(gz_file_get_contents($file), true);
        if( $pagespeed )
        {
            // make sure we only have to go this route once, save the corrected file
            gz_file_put_contents($file, json_encode($pagespeed));
        }
    }
    
    return $pagespeed;
}

/**
* Message logging
* 
* @param mixed $msg
*/
function logMsg($msg, $logFile = './log.txt')
{
    global $debug;
    
    if( $debug || $force )
    {
        $file = fopen($logFile, 'a');
        if( $file )
        {
            fwrite($file, date('Y/m/d H:i:s - ') . $msg . "\n");
            fclose($file);
        }
    }
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
* Build the work queues and other dynamic information tied to the locations
* 
* @param mixed $locations
*/
function BuildLocations( &$locations )
{
    // build the path to the work queue dynamically
    foreach( $locations as $name => &$loc )
    {
        if( isset($loc['browser']) )
        {
            $loc['localDir'] = "./work/jobs/$name";
            if( !is_dir($loc['localDir']) )
                mkdir($loc['localDir'], 0777, true);
        }
    }
}

/**
* Remove any locations that appear to be offline
* 
* @param mixed $locations
*/
function FilterLocations( &$locations )
{
    BuildLocations( $locations );
    
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
                // now check the times
                $file = "./tmp/$name.tm";
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
        // top-level locations do not have the browser specified
        // and "locations" is the uber-top-level grouping
        if( $name != 'locations' && !isset($loc['browser']) )
        {
            $ok = false;        // default to deleting the location
            $newLoc = array();  // new, filtered copy of the location
            $default = null;    // the default location for the group
            
            // remove any of the child locations that don't exist
            $index = 0;
            foreach( $loc as $key => $val )
            {
                // the sub-locations are identified with numeric keys (1, 2, 3)
                if( is_numeric($key) )
                {
                    // check the location that is being referenced to see if it exists
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
?>
