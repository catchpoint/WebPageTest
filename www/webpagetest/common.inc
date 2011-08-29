<?php 
// shared initializiation/loading code
set_time_limit(300);
error_reporting(0);
umask(0);
date_default_timezone_set('UTC');
import_request_variables('PG', 'req_');

if ($_SERVER['HTTP_MOD_REWRITE'] == 'On')
    define('FRIENDLY_URLS', true);
else
    define('FRIENDLY_URLS', false);

// constants
define('VER_WEBPAGETEST', '2.2.1');   // webpagetest version
define('VER_CSS', 50);          // version of the sitewide css file
define('VER_JS', 15);            // version of the sitewide javascript file
define('VER_JS_TEST', 20);       // version of the javascript specific to the test pages
define('VER_JS_RUNNING', 1);    // version of the javascript specific to the test running status page

// SEO stuff
$page_keywords = array('Webpagetest','Website Speed Test','Page Speed');
$page_description = "Run a free website speed test from around the globe using real browsers at consumer connection speeds with detailed optimization recommendations.";

$tempDir = realpath('./tmp');
if (!is_dir($tempDir))
    mkdir($tempDir, 0777, true);
$tempDir .= '/';
define('PCLZIP_TEMPORARY_DIR', $tempDir);

if( $req_bare )
    define('BARE_UI', true);

// load the install-specific settings
$settings = parse_ini_file('./settings/settings.ini');

// override some settings from the URI
if( $req_bulk )
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
$api_keys;
if( is_dir('./forums') && !$settings['disableMybb'] )
{                         
    ob_start();
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
            unset($mybb);
        }
        catch(Exception $e)
        {
        }
        chdir($dir);
    }
    ob_end_clean();
}

// assign a unique ID to each person
$isOwner = false;
$owner = null;
if( isset($_COOKIE['google_id']) && strlen($_COOKIE['google_id']) ) {
  $owner = $_COOKIE['google_id'];
}
else if( isset($_COOKIE['o']) && strlen($_COOKIE['o']) ){
  $owner = $_COOKIE['o'];
}else{
  $owner = sha1(uniqid(uniqid('', true), true));
}
setcookie('o', $owner, time()+60*60*24*365, '/');


// set their color selection as a cookie
if( $req_color )
{
    setcookie('color', $req_color, time()+60*60*24*365, '/');
    $_REQUEST['color'] = $req_color;
}

// Load the test-specific data
$id = htmlspecialchars($req_test);

// if we didn't get an id explicitly, try from cookie
if( !$id )
    $id = $_COOKIE['tid'];

$testLabel = '';    
if( $id )
{
    // set the test ID cookie (session cookie) if we're looking at a different test
    if( strcmp($id, $_COOKIE['tid']) )
        setcookie('tid', $id);

    RestoreTest($id);   // restore the test if it is archived (and deleted)
    
    $testPath = './' . GetTestPath($id);
    // test if the testPath exists. If not, download from the remote storage.
    if( $settings['archive'] )
    {
        if( !is_dir($testPath) && is_file('storage/storage.ini') && is_file('storage/storage.inc') )
        {
            require_once('storage/storage.inc');
            DownloadResults($id);
        }
    }

    $run = htmlspecialchars($req_run);
    if( !$run )
        $run = (int)1;
    $cached = (int)$req_cached;
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
        if (isset($test['testinfo']))
        {
            if( isset($test['testinfo']['completed']))
                $testDate = strftime('%x %X', (int)$test['testinfo']['completed'] + ($tz_offset * 60));
            if (isset($test['testinfo']['owner']) && strlen($owner) && $owner == $test['testinfo']['owner'])
                $isOwner = true;
            elseif (isset($test['testinfo']['uid']) && strlen($uid) && $uid == $test['testinfo']['uid'])
                $isOwner = true;
            
            $url = htmlspecialchars($test['testinfo']['url']);
            $dom = htmlspecialchars($test['testinfo']['domElement']);
            $login = htmlspecialchars($test['testinfo']['login']);
            $blockString = htmlspecialchars($test['testinfo']['block']);
            $label = htmlspecialchars($test['testinfo']['label']);
        }
    }

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
* Generate a thumbnail for the video file if we don't already have one
* 
* @param mixed $dir
*/
function GenerateVideoThumbnail($dir)
{
    $dir = realpath($dir);
    if( is_file("$dir/video.mp4") && !is_file("$dir/video.png") )
    {
        $output = array();
        $result;
        $command = "ffmpeg -i \"$dir/video.mp4\" -vframes 1 -ss 00:00:00 -f image2 \"$dir/video.png\"";
        $retStr = exec($command, $output, $result);
    }
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
    if( substr( $dir, -1 ) != '/' )
        $dir .= '/';
        
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
    global $settings;
    $ret = false;
    
    if( !$settings['nogzip'] )
    {
        $zip = gzopen("$filename.gz", 'wb9');
        if( $zip !== false )
        {
            if( gzwrite($zip, $data) )
                $ret = true;
            gzclose($zip);
        }
    }
    else
    {
        if( file_put_contents($filename, $data) )
            $ret = true;
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
    global $settings;
    $ret = false;
    
    if( !$settings['nogzip'] )
    {
        $data = file_get_contents($filename);
        if( $data ){
            $ret = gz_file_put_contents($filename, $data);
            unset($data);
        }
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
    if( !$locations['processed'] )
    {
        // dynamically create a whole new tree based on the data from the locations
        // the main reason for this is to be able to support multiple browsers in each "location"
        $original = $locations;
        $locations = array();
        
        // start from the top-level locations
        foreach( $original as $name => $loc )
        {
            // just the top-level locations
            if( isset($loc['browser']) )
            {
                // clone the existing locations over for code that just accesses them directly
                $loc['localDir'] = "./work/jobs/$name";
                $loc['location'] = $name;
                if( !is_dir($loc['localDir']) )
                    mkdir($loc['localDir'], 0777, true);
                $locations[$name] = $loc;
            }
            else
            {
                if( $name == 'locations' )
                    $locations[$name] = $loc;
                else
                {    
                    $index = 1;
                    $default = $loc['default'];
                    $location = array();
                    foreach( $loc as $key => $value )
                    {
                        if( is_numeric($key) )
                        {
                            // make sure we have a default
                            if( !strlen($default) )
                                $default = $value;

                            // clone the individual configuration based on the available browsers
                            $configuration = $original[$value];
                            if( strlen($configuration['browser']) )
                            {
                                $configuration['localDir'] = "./work/jobs/$value";
                                $configuration['location'] = $value;
                                if( !is_dir($configuration['localDir']) )
                                    mkdir($configuration['localDir'], 0777, true);

                                $browsers = array();
                                $parts = explode(',', $configuration['browser']);
                                foreach( $parts as $browser )
                                    $browsers[] = trim($browser);
                                if( count($browsers) > 1 )
                                {
                                    // default to the first browser in the list
                                    if( $default == $value )
                                        $default .= ':' . $browsers[0];

                                    // build the actual configurations
                                    foreach( $browsers as $browser )
                                    {
                                        $label = $value . ':' . $browser;
                                        $location[$index] = $label;
                                        $index++;
                                        $cfg = $configuration;
                                        $cfg['browser'] = $browser;
                                        $cfg['label'] = $cfg['label'] . " - $browser";
                                        $locations[$label] = $cfg;
                                    }
                                }
                                else
                                {
                                    // for single-browser locations, just copy it over as it exists
                                    $location[$index] = $value;
                                    $index++;
                                }
                            }
                        }
                        elseif( $key !== 'default' )
                            $location[$key] = $value;
                    }
                    if( $index > 1 )
                    {
                        $location['default'] = $default;
                        $locations[$name] = $location;
                    }
                }
            }
        }
        $locations['processed'] = true;
    }
}

/**
* Remove any locations that appear to be offline
* 
* @param mixed $locations
*/
function FilterLocations( &$locations, $includeHidden = '', $stripBrowser = null )
{
    BuildLocations( $locations );
    
    // drop the main index of any hidden locations so they don't show up in the map view
    foreach( $locations as $name => $loc )
    {
        if( $loc['hidden'] && !$_REQUEST['hidden'] )
        {
            $hide = true;
            if( strlen($includeHidden) && stripos($loc['hidden'], $includeHidden) !== false )
                $hide = false;
            
            if( $hide )
                unset( $locations[$name] );
        }
        unset($loc['hidden']);
    }
    
    // only do it if we aren't displaying hidden locations and we're not running on Windows (busted filetime())
    if( !$_REQUEST['hidden'] && (PHP_OS!='WINNT' && PHP_OS!='WIN32' && PHP_OS!='Windows'))
    {
        // first remove any locations that haven't checked in for 30 minutes (could tighten this up in the future)
        foreach( $locations as $name => &$loc )
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
    
    // next pass, filter browsers if we were asked to
    if( isset($stripBrowser) )
    {
        foreach( $locations as $name => &$loc )
        {
            if( isset($loc['browser']) )
            {
                $remove = false;
                foreach( $stripBrowser as $browser )
                {
                    $pos = stripos($loc['browser'], $browser);
                    if( $pos !== false )
                    {
                        $remove = true;
                        break;
                    }
                }
                    
                if( $remove )
                {
                    unset($locations[$name]);
                }
            }
            else
            {
                // strip the browsers from the label
                foreach( $stripBrowser as $browser )
                    $loc['label'] = preg_replace("/[, -]*$browser/i", '', $loc['label']);
            }
        }
    }
        
    // next pass, remove any top-level locations whose sub-locations have all been removed
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
            $location['label'] = $locations[$name]['label'];
            $location['comment'] = str_replace("'", '"', $locations[$name]['comment']);
            $location['name'] = $name;
            $loc['locations'][$name] = $location;
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
* Get the text block of the test info that we want to display
* 
*/
function GetTestInfoHtml($includeScript = true)
{
    global $test;
    global $isOwner;
    global $dom;
    global $login;
    global $settings;
    global $admin;
    $html = '';
    if( $dom ) 
        $html .= 'DOM Element: <b>' . $dom . '</b><br>';
    if( $test['test']['fvonly'] ) 
        $html .= '<b>First View only</b><br>';
    if( (int)$test['test']['runs'] > 1 ) 
        $html .= 'Test runs: <b>' . $test['test']['runs'] . '</b><br>';
    if( (int)$test['test']['authenticated'] == 1) 
        $html .= '<b>Authenticated: ' . $login . '</b><br>';
    if( isset($test['testinfo']) && !strcasecmp($test['testinfo']['connectivity'], 'custom') && $test['testinfo']['bwIn'] && $test['testinfo']['bwOut'] )
    {
        $html .= "<b>Connectivity:</b> {$test['testinfo']['bwIn']}/{$test['testinfo']['bwOut']} Kbps, {$test['testinfo']['latency']}ms Latency";
        if( $test['testinfo']['plr'] )
            $html .= ", {$test['testinfo']['plr']}% Packet Loss";
        $html .= '<br>';
    }
    if( isset($test['testinfo']) && strlen($test['testinfo']['script']) )
    {
        if ($includeScript && ($settings['show_script_in_results'] || $isOwner || $admin) && !$test['testinfo']['sensitive'])
        {
            $html .= '<p><a href="javascript:void(0)" id="script_in_results">Script <span class="arrow"></span></a></p>';
            $html .= '<div id="script_in_results-container" class="hidden">';
            $html .= '<pre>' . $test['testinfo']['script'] . '</pre>';
            $html .= '</div>';
        }
        else
            $html .= '<b>Scripted test</b><br>';
    }
    return $html;
}

/**
* Append the provided query param onto the provided url (handeling ? vs &)
* 
* @param mixed $entry
*/
function CreateUrlVariation($url, $query)
{
    $newUrl = null;
    $url = trim($url);
    $query = trim($query);
    if( strlen($url) && strlen($query) )
    {
        $newUrl = $url;
        if( strpos($url, '?') === false )
            $newUrl .= '?';
        else
            $newUrl .= '&';
        $newUrl .= $query;
    }
    return $newUrl;
}

/**
* Append a / to the URL if we are looking at a base page
* 
* @param mixed $url
*/
function FixUrlSlash($url)
{
    if( strpos($url,'/',8) == false )
        $url .= '/';
    return $url;
}

/**
* Archive the given test if it hasn't already been archived
* For now this will just zip and move to a location on disk
* but will eventually integrate with the S3 archiving
* 
* @param mixed $id
*/
function ArchiveTest($id)
{
    global $settings;
    global $api_keys;
    $ret = false;
    if( isset($settings['archive_dir']) )
    {
        $testPath = realpath('./' . GetTestPath($id));
        $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
        $completed = $testInfo['completed'];
        if( !$completed )
        {
            $test = parse_ini_file("$testPath/testinfo.ini", true);
            $completed = isset($test['test']['completeTime']);
        }
        if( $completed || $testInfo['batch'] )
        {
            $dest = GetArchiveFile($id, true);
            if( is_file($dest) )
                $ret = true;
            else
            {
                // zip up the contents
                if(is_dir($testPath) === true)
                {
                    $count = 0;
                    $zip = new ZipArchive();
                    if ($zip->open($dest, ZIPARCHIVE::CREATE) === true)
                    {
                        // add the files (skip the ones we don't want to archive long-term)
                        $files = scandir($testPath);
                        foreach( $files as $file )
                        {
                            $filePath = "$testPath/$file";
                            if( is_file($filePath) && 
                                strpos($file, '_doc.jpg') === false &&
                                strpos($file, '_render.jpg') === false &&
                                strpos($file, '_status.txt') === false )
                            {
                                $count++;
                                $zip->addFile($filePath, $file);
                            }
                        }
                        
                        // if it is a video test, save the median first view video
                        if( $count && $testInfo['video'] )
                        {
                            $run = $testInfo['medianRun'];
                            if( !$run )
                            {
                                require_once('page_data.inc');
                                $pageData = loadAllPageData($testPath);
                                if( $pageData )
                                    $run = GetMedianRun($pageData, 0);
                            }

                            if( $run )
                            {
                                $relativeDir = "video_$run";
                                $videoDir = "$testPath/$relativeDir";
                                $files = scandir($videoDir);
                                if( $files )
                                {
                                    $zip->addEmptyDir($relativeDir);
                                    foreach($files as $file)
                                    {
                                        $filePath = "$videoDir/$file";
                                        if( is_file($filePath) )
                                            $zip->addFile($filePath, "$relativeDir/$file");
                                    }
                                }
                            }
                        }
                        
                        $zip->close();
                    }

                    // only consider it successful if the archive file was actually created
                    if( is_file($dest) )
                    {
                        if( $count )
                        {
                            $ret = true;
                            $testInfo['archived'] = true;
                            gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfo));
                        }
                        else
                            unlink($dest);
                    }
                }
            }
        }
    }
    return $ret;
}

/**
* Restore the given test from the archive if it is archived
* 
* @param mixed $id
*/
function RestoreTest($id)
{
    global $settings;
    $ret = false;
    $testPath = './' . GetTestPath($id);
    if( isset($settings['archive_dir']) )
    {
        if( is_dir($testPath) )
        {
            $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
            if( $testInfo['restored'] && $testInfo['restoredDataOnly'] && !defined('RESTORE_DATA_ONLY') )
                $restore = true;
        }
        else
            $restore = true;
        
        if( $restore )
        {
            mkdir( $testPath, 0777, true );
            $testPath = realpath($testPath);
            $source = GetArchiveFile($id);
            $zip = new ZipArchive;
            if ($zip->open($source) === TRUE) 
            {
                if( defined('RESTORE_DATA_ONLY') )
                {
                    for( $i = 0; $i < $zip->numFiles; $i++ )
                    {
                        $file = $zip->getNameIndex($i);
                        if( strpos($file, '.jpg') === false && 
                            strpos($file, '.png') == false &&
                            strpos($file, 'pagespeed.') == false &&
                            strpos($file, 'progress.') == false &&
                            strpos($file, 'report.') == false &&
                            strpos($file, '/') == false )
                            file_put_contents("$testPath/$file", $zip->getFromIndex($i));
                    }
                }
                else
                    $zip->extractTo($testPath);
                
                $zip->close();

                $testInfo = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
                $testInfo['archived'] = true;
                $testInfo['restored'] = true;
                if( defined('RESTORE_DATA_ONLY') )
                    $testInfo['restoredDataOnly'] = true;
                else
                    $testInfo['restoredDataOnly'] = false;
                gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfo));
                
                $ret = true;
            }    
        }
        else
            $ret = true;
    }
    else
        $ret = true;
        
    return $ret;
}

/**
* Generate the file name for the given archive file
* 
* @param mixed $id
* @param mixed $create_directory
*/
function GetArchiveFile($id, $create_directory = false)
{
    global $settings;
    $file = null;
    if( isset($settings['archive_dir']) && strlen($id) )
    {
        $testPath = GetTestPath($id);
        if( strlen($testPath) )
        {
            $file = $settings['archive_dir'] . $testPath . '.zip';
            if( $create_directory )
            {
                $dir = dirname($file);
                mkdir($dir, 0777, true);
            }
        }
    }
    return $file;
}

/**
* Get the number of days since the test was last accessed
* 
* @param mixed $id
*/
function TestLastAccessed($id)
{
    $elapsed = 0;
    $file = './' . GetTestPath($id) . '/testinfo.ini';
    $timestamp = filemtime($file);
    if( $timestamp )
    {
        $elapsed = max(time() - $timestamp, 0);
        $elapsed /= 86400;
    }
    return $elapsed;
}

/**
* Faster image resampling
*/
function fastimagecopyresampled (&$dst_image, $src_image, $dst_x, $dst_y, $src_x, $src_y, $dst_w, $dst_h, $src_w, $src_h, $quality = 3) {
  // Plug-and-Play fastimagecopyresampled function replaces much slower imagecopyresampled.
  // Just include this function and change all "imagecopyresampled" references to "fastimagecopyresampled".
  // Typically from 30 to 60 times faster when reducing high resolution images down to thumbnail size using the default quality setting.
  // Author: Tim Eckel - Date: 09/07/07 - Version: 1.1 - Project: FreeRingers.net - Freely distributable - These comments must remain.
  //
  // Optional "quality" parameter (defaults is 3). Fractional values are allowed, for example 1.5. Must be greater than zero.
  // Between 0 and 1 = Fast, but mosaic results, closer to 0 increases the mosaic effect.
  // 1 = Up to 350 times faster. Poor results, looks very similar to imagecopyresized.
  // 2 = Up to 95 times faster.  Images appear a little sharp, some prefer this over a quality of 3.
  // 3 = Up to 60 times faster.  Will give high quality smooth results very close to imagecopyresampled, just faster.
  // 4 = Up to 25 times faster.  Almost identical to imagecopyresampled for most images.
  // 5 = No speedup. Just uses imagecopyresampled, no advantage over imagecopyresampled.

  if (empty($src_image) || empty($dst_image) || $quality <= 0) { return false; }
  if ($quality < 5 && (($dst_w * $quality) < $src_w || ($dst_h * $quality) < $src_h)) {
    $temp = imagecreatetruecolor ($dst_w * $quality + 1, $dst_h * $quality + 1);
    imagecopyresized ($temp, $src_image, 0, 0, $src_x, $src_y, $dst_w * $quality + 1, $dst_h * $quality + 1, $src_w, $src_h);
    imagecopyresampled ($dst_image, $temp, $dst_x, $dst_y, 0, 0, $dst_w, $dst_h, $dst_w * $quality, $dst_h * $quality);
    imagedestroy ($temp);
  } else imagecopyresampled ($dst_image, $src_image, $dst_x, $dst_y, $src_x, $src_y, $dst_w, $dst_h, $src_w, $src_h);
  return true;
}

/**
* Get the number of pending high-priority page loads at the given location
* and the average time per page load (from the last 100 tests)
*/
function GetPendingTests($location, &$count, &$avgTime)
{
    $count = 0;
    $avgTime = 0;
    $tests = json_decode(file_get_contents("./tmp/$location.tests"), true);
    if( $tests )
    {
        $count = (int)$tests['tests'];
        $timeCount = count($tests['times']);
        if( $timeCount )
        {
            $timeTotal = 0;
            foreach( $tests['times'] as $time )
                $timeTotal += $time;
            $avgTime = ceil($timeTotal / $timeCount);
        }
    }
}

/**
* Get the number of active testers at the given location
*/
function GetTesterCount($location)
{
    $count = 0;
    $testers = json_decode(file_get_contents("./tmp/$location.tm"), true);
    if( count($testers) )
    {
        $now = time();
        foreach( $testers as &$tester )
        {
            if( !$tester['offline'] && $tester['updated'] && $now - $tester['updated'] < 3600 )
                $count++;
        }
    }
    
    return $count;
}

/**
* Add a job to the work queue (assume it is locked)
*/
function AddJobFile($workDir, $file, $priority, $queue_limit = 0)
{
    $ret = false;
    if( LoadJobQueue($workDir, $queue) )
    {
        if( !$queue_limit || count($queue[$priority]) < $queue_limit )
            if( array_push($queue[$priority], $file) )
                $ret = SaveJobQueue($workDir, $queue);
    }
    return $ret;
}

/**
* Get a job from the given work queue (assume it is locked)
*/
function GetJobFile($workDir)
{
    $file = null;
    
    if( LoadJobQueue($workDir, $queue) )
    {
        $priority = 0;
        while( !isset($file) && $priority <= 9 )
        {
            $file = array_shift($queue[$priority]);
            $priority++;
        }

        if( isset($file) )
        {
            $file = "$workDir/$file";
            $ret = SaveJobQueue($workDir, $queue);
        }
    }

    return $file;
}

/**
* Find the position in the work queue for the given test (assume it is locked)
*/
function FindJobPosition($workDir, $testId)
{
    $count = 0;
    $found = false;

    if( LoadJobQueue($workDir, $queue) )
    {
        $priority = 0;
        while( !$found && $priority <= 9 )
        {
            foreach($queue[$priority] as $file)
            {
                if( stripos($file, $testId) !== false )
                {
                    $found = true;
                    break;
                }
                elseif( !$found )
                    $count++;
            }
            $priority++;
        }
    }
    
    if( !$found )
        $count = -1;
        
    return $count;
}

/**
* Load the job queue from disk
*/
function LoadJobQueue($workDir, &$queue)
{
    $ret = true;
    
    $queueName = sha1($workDir);
    $queueFile = "./tmp/$queueName.queue";
    if( is_file($queueFile) )
        $queue = json_decode(file_get_contents($queueFile), true);
    else
    {
        // build the queue from disk
        $files = array();
        $f = scandir($workDir);
        foreach( $f as $file )
        {
            if( is_file("$workDir/$file") )
            {
                $fileTime = filemtime("$workDir/$file");
                if( $fileTime && !isset($files[$fileTime]) )
                    $files[$fileTime] = $file;
                else
                    $files[] = $file;
            }
        }

        // sort it by time
        ksort($files);
        
        // now add them to the various priority queues
        $queue = array();
        for($priority = 0; $priority <= 9; $priority++)
            $queue[$priority] = array();
            
        foreach($files as $file)
        {
            if( stripos($file, '.url') )
                $queue[0][] = $file;
            else if( preg_match('/\.p([1-9])/i', $file, $matches) )
            {
                $priority = (int)$matches[1];
                $queue[$priority][] = $file;
            }
        }
        
        SaveJobQueue($workDir, $queue);
    }
    
    return $ret;
}

/**
* Save the job queue to disk
*/
function SaveJobQueue($workDir, &$queue)
{
    $ret = false;
    $queueName = sha1($workDir);
    if( file_put_contents("./tmp/$queueName.queue", json_encode($queue)) )
        $ret = true;
        
    return $ret;
}

/**
* Get the backlog for the given location
* 
* @param mixed $dir
*/
function GetTesters($locationId)
{
    $location = array();

    $file = "./tmp/$locationId.tm";
    if( is_file($file) )
    {
        $now = time();
        $updated = filemtime($file);
        $elapsed = 0;
        if( $now > $updated )
            $elapsed = $now - $updated;
        $location['elapsed'] = (int)($elapsed / 60);
        
        // load information about each tester
        $testers = json_decode(file_get_contents($file), true);
        if( count($testers) )
        {
            ksort($testers);
            $location['testers'] = array();
            foreach( $testers as $index => $tester )
            {
                if( !$tester['offline'] )
                {
                    $entry = array('pc' => $tester['pc'], 'ec2' => $tester['ec2'], 'ip' => $tester['ip'], 'version' => $tester['ver']);
                    
                    // last time it checked in
                    if( isset($tester['updated']) )
                    {
                        $elapsed = 0;
                        $updated = $tester['updated'];
                        if( $now > $updated )
                            $elapsed = $now - $updated;
                        $entry['elapsed'] = (int)($elapsed / 60);
                    }
                    
                    // last time it got work
                    if( isset($tester['last']) )
                    {
                        $elapsed = 0;
                        $updated = $tester['last'];
                        if( $now > $updated )
                            $elapsed = $now - $updated;
                        $entry['last'] = (int)($elapsed / 60);
                    }
                    
                    $entry['busy'] = 0;
                    if( strlen( $tester['test'] ) )
                        $entry['busy'] = 1;
                        
                    $location['testers'][] = $entry;
                }
            }
        }
    }
    
    return $location;
}

/**
* Lock the given location (make sure to unlock it when you are done)
*/
function LockLocation($location)
{
    if( !is_dir('./tmp') )
        mkdir('./tmp');
    $lock = fopen( "./tmp/$location.lock", 'w',  false);
    if( $lock )
    {
        if( !flock($lock, LOCK_EX) )
        {
            fclose($lock);
            $lock = false;
        }
    }

    return $lock;
}

/**
* Unlock the given location
*/
function UnlockLocation($lock)
{
    if( $lock )
        fclose($lock);
}
?>
