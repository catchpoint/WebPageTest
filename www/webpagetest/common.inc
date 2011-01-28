<?php 
// shared initializiation/loading code
set_time_limit(300);
error_reporting(0);
if( $debug )
    error_reporting(E_ALL);
umask(0);
date_default_timezone_set('UTC');

// load the install-specific settings
$settings = parse_ini_file('./settings/settings.ini');

// override some settings from the URI
if( $_GET['bulk'] )
    $settings['noBulk'] = 0;

$cdnPath = '';
if( isset($settings['cdn']) )
    $cdnPath = $settings['cdn'];
$GLOBALS['cdnPath'] = $cdnPath;

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

if( $id )
{
    // set the test ID cookie (session cookie) if we're looking at a different test
    if( strcmp($id, $_COOKIE['tid']) )
        setcookie('tid', $id);
    
    $testPath = './' . GetTestPath($id);
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
    if( gz_is_file("$testPath/testinfo.json") )
        $test['testinfo'] = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
    if( gz_is_file("$testPath/url.txt") )
        $url = htmlspecialchars(gz_file_get_contents("$testPath/url.txt"));
    if( gz_is_file("$testPath/dom.txt") )
        $dom = htmlspecialchars(gz_file_get_contents("$testPath/dom.txt"));
    if( gz_is_file("$testPath/login.txt") )
        $login = htmlspecialchars(gz_file_get_contents("$testPath/login.txt"));
    if( gz_is_file("$testPath/block.txt") )
        $blockString = htmlspecialchars(gz_file_get_contents("$testPath/block.txt"));
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

?>
