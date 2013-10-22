<?php
$version = 5;
if( !isset($_REQUEST['tests']) && isset($_REQUEST['t']) )
{
    $tests = '';
    foreach($_REQUEST['t'] as $t)
    {
        $parts = explode(',', $t);
        if( count($parts) >= 1 )
        {
            if( strlen($tests) )
                $tests .= ',';
            $tests .= trim($parts[0]);
            if( count($parts) > 1 )
                $tests .= "-r:{$parts[1]}";
            if( count($parts) > 2 && strlen(trim($parts[2])) )
                $tests .= '-l:' . urlencode($parts[2]);
            if( count($parts) > 3 )
                $tests .= "-c:{$parts[3]}";
            if( count($parts) > 4 && strlen(trim($parts[4])) )
                $tests .= "-e:{$parts[4]}";
            if( count($parts) > 5 )
                $tests .= "-s:{$parts[5]}";
            if( count($parts) > 6 )
                $tests .= "-d:{$parts[6]}";
            if( count($parts) > 7 )
                $tests .= "-f:{$parts[7]}";
        }
    }

    $host  = $_SERVER['HTTP_HOST'];
    $uri = $_SERVER['PHP_SELF'];
    $params = '';
    foreach( $_GET as $key => $value )
        if( $key != 't' && !is_array($value))
            $params .= "&$key=" . urlencode($value);
    header("Location: http://$host$uri?tests=$tests{$params}");    
}
else
{
    // move up to the base directory
    $cwd = getcwd();
    chdir('..');
    include 'common.inc';
    require_once('page_data.inc');
    require_once('video.inc');

    $xml = false;
    if( !strcasecmp($_REQUEST['f'], 'xml') )
        $xml = true;
    $json = false;
    if( !strcasecmp($_REQUEST['f'], 'json') )
        $json = true;
    
    // make sure the work directory exists
    if( !is_dir('./work/video/tmp') )
        mkdir('./work/video/tmp', 0777, true);

    // get the list of tests and test runs
    $tests = array();
    $id = null;
    
    $exists = false;
    if( isset($_REQUEST['id']) )
    {
        // see if the video already exists
        $id = $_REQUEST['id'];
        $path = GetVideoPath($id);
        if( is_file("./$path/video.mp4") )
            $exists = true;
    }

    if( !$exists )
    {
        $labels = array();
        $endTime = 'visual';
        if( strlen($_REQUEST['end']) )
            $endTime = trim($_REQUEST['end']);
        $videoIdExtra = "";
        
        $compTests = explode(',', $_REQUEST['tests']);
        foreach($compTests as $t)
        {
            $parts = explode('-', $t);
            if( count($parts) >= 1 )
            {
                $test = array();
                $test['id'] = $parts[0];
                $test['cached'] = 0;
                $test['end'] = $endTime;
                $test['extend'] = false;
                $test['syncStartRender'] = "";
                $test['syncDocTime'] = "";
                $test['syncFullyLoaded'] = "";
                    
                for( $i = 1; $i < count($parts); $i++ )
                {
                    $p = explode(':', $parts[$i]);
                    if( count($p) >= 2 )
                    {
                        if( $p[0] == 'r' )
                            $test['run'] = (int)$p[1];
                        if( $p[0] == 'l' )
                            $test['label'] = urldecode($p[1]);
                        if( $p[0] == 'c' )
                            $test['cached'] = (int)$p[1];
                        if( $p[0] == 'e' )
                            $test['end'] = trim($p[1]);
                        // Optional Extra info to sync the video with
                        if( $p[0] == 's' )
                            $test['syncStartRender'] = (int)$p[1];
                        if( $p[0] == 'd' )
                            $test['syncDocTime'] = (int)$p[1];
                        if( $p[0] == 'f' )
                            $test['syncFullyLoaded'] = (int)$p[1];
                    }
                }
                
                RestoreTest($test['id']);
                $test['path'] = GetTestPath($test['id']);
                $test['pageData'] = loadAllPageData($test['path']);
                
                if( !$test['run'] )
                    $test['run'] = GetMedianRun($test['pageData'], 0, $median_metric);
                    
                // figure out the real end time (in ms)
                if( isset($test['end']) )
                {
                    if (!strcmp($test['end'], 'visual') && array_key_exists('visualComplete', $test['pageData'][$test['run']][$test['cached']])) {
                        $test['end'] = $test['pageData'][$test['run']][$test['cached']]['visualComplete'];
                    }
                    elseif( !strcmp($test['end'], 'doc') || !strcmp($test['end'], 'docvisual') )
                    {
                        if( !strcmp($test['end'], 'docvisual') )
                        {
                            $test['extend'] = true;
                            $videoIdExtra .= 'e';
                        }
                        $test['end'] = $test['pageData'][$test['run']][$test['cached']]['docTime'];
                    }
                    elseif(!strncasecmp($test['end'], 'doc+', 4))
                        $test['end'] = $test['pageData'][$test['run']][$test['cached']]['docTime'] + (int)((double)substr($test['end'], 4) * 1000.0);
                    elseif( !strcmp($test['end'], 'aft') )
                    {
                        $test['end'] = $test['pageData'][$test['run']][$test['cached']]['aft'];
                        if( !$test['end'] )
                            $test['end'] = -1;
                    }
                    elseif( !strcmp($test['end'], 'full') )
                        $test['end'] = 0;
                    elseif( !strcmp($test['end'], 'all') )
                        $test['end'] = -1;
                    else
                        $test['end'] = (int)((double)$test['end'] * 1000.0);
                }
                if( $test['end'] == -1 )
                    $test['end'] = 0;
                elseif( !$test['end'] )
                    $test['end'] = $test['pageData'][$test['run']][$test['cached']]['fullyLoaded'];

                $test['videoPath'] = "./{$test['path']}/video_{$test['run']}";
                if( $test['cached'] )
                    $test['videoPath'] .= '_cached';
                    
                if ($test['syncStartRender'] || $test['syncDocTime'] || $test['syncFullyLoaded'])
                    $videoIdExtra .= ".{$test['syncStartRender']}.{$test['syncDocTime']}.{$test['syncFullyLoaded']}";

                $testInfo = json_decode(gz_file_get_contents("./{$test['path']}/testinfo.json"), true);
                if( !strlen($test['label']) ) {
                    $test['label'] = trim($testInfo['label']);
                }
                if (array_key_exists('locationText', $testInfo))
                    $test['location'] = $testInfo['locationText'];
                if( !strlen($test['label']) )
                    $test['label'] = trim($test['pageData'][1][0]['URL']);
                $labels[] = $test['label'];
                
                if( is_dir($test['videoPath']) )
                    $tests[] = $test;
            }
        }

        $count = count($tests);
        if( $count )
        {
            if( !strlen($id) )
            {
                // try and create a deterministic id so multiple submissions of the same tests will result in the same id
                if( strlen($_REQUEST['tests']) )
                {
                    $date = gmdate('ymd_');
                    $hashstr = $_REQUEST['tests'] . $_REQUEST['template'] . $version . trim($_REQUEST['end']) . $videoIdExtra;
                    if( $_REQUEST['slow'] )
                        $hashstr .= '.slow';
                    if( strpos($hashstr, '_') == 6 )
                        $date = substr($hashstr, 0, 7);
                    $id = $date . sha1($hashstr);
                }
                else
                    $id = gmdate('ymd_') . md5(uniqid(rand(), true));
            }

            $path = GetVideoPath($id);
            if( is_file("./$path/video.mp4") )
            {
                if( $_REQUEST['force'] )
                    delTree("./$path/");
                else
                    $exists = true;
            }

            if( !$exists )
            {
                // load the appropriate script file
                $scriptFile = "./video/templates/$count.avs";
                if( strlen($_REQUEST['template']) )
                    $scriptFile = "./video/templates/{$_REQUEST['template']}.avs";
                
                $script = file_get_contents($scriptFile);
                if( strlen($script) )
                {
                    // figure out the job id
                    require_once('./lib/pclzip.lib.php');

                    $zipFile = "./work/video/tmp/$id.zip";
                    $zip = new PclZip($zipFile);
                    if( $zip )
                    {
                        // zip up the video files
                        foreach( $tests as $index => &$test )
                        {
                            // build an appropriate script file for this test
                            $startOffset = array_key_exists('pageData', $test) &&
                                           array_key_exists($test['run'], $test['pageData']) &&
                                           array_key_exists($test['cached'], $test['pageData'][$test['run']]) &&
                                           array_key_exists('testStartOffset', $test['pageData'][$test['run']][$test['cached']])
                                           ? $test['pageData'][$test['run']][$test['cached']]['testStartOffset'] : null;
                            BuildVideoScript(null, $test['videoPath'], $test['end'], $test['extend'], $startOffset);

                            $files = array();
                            $dir = opendir($test['videoPath']);
                            if( $dir )
                            {
                                while($file = readdir($dir)) 
                                {
                                    $path = $test['videoPath'] . "/$file";
                                    if( is_file($path) && (stripos($file, '.jpg') || stripos($file, '.avs')) &&  strpos($file, '.thm') === false )
                                        $files[] = $path;
                                }

                                closedir($dir);
                            }
                            
                            // update the label in the script
                            $script = str_replace("%$index%", $test['label'], $script);
                            
                            if( count($files) )
                                $zip->add($files, PCLZIP_OPT_REMOVE_ALL_PATH, PCLZIP_OPT_ADD_PATH, "$index");
                        }
                    }
                    
                    // see if they want the video in slow motion
                    if( $_REQUEST['slow'] )
                        $script .= "\r\nAssumeFPS(2)\r\n";

                    // add the script to the zip file
                    $tmpScript = "./work/video/tmp/$id.avs";
                    file_put_contents($tmpScript, $script);
                    $zip->add($tmpScript, PCLZIP_CB_PRE_ADD, 'ZipAvsCallback');
                    unlink($tmpScript);
                    
                    // create an ini file for the job as well
                    $ini = "[info]\r\n";
                    $ini .= "id=$id\r\n";
                    $tmpIni = "./work/video/tmp/$id.ini";
                    file_put_contents($tmpIni, $ini);
                    $zip->add($tmpIni, PCLZIP_CB_PRE_ADD, 'ZipIniCallback');
                    unlink($tmpIni);
                    
                    // set up the result directory
                    $dest = './' . GetVideoPath($id);
                    if( !is_dir($dest) )
                        mkdir($dest, 0777, true);
                    if( count($labels) )
                        file_put_contents("$dest/labels.txt", json_encode($labels));
                    gz_file_put_contents("$dest/testinfo.json", json_encode($tests));
                    
                    // move the file to the video work directory
                    rename( $zipFile, "./work/video/$id.zip" );
                }
            }
        }
    }

    // redirect to the destination page
    if( $id )
    {
        $host  = $_SERVER['HTTP_HOST'];
        $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');

        if( $xml )
        {
            header ('Content-type: text/xml');
            echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
            echo "<response>\n";
            echo "<statusCode>200</statusCode>\n";
            echo "<statusText>Ok</statusText>\n";
            if( strlen($_REQUEST['r']) )
                echo "<requestId>{$_REQUEST['r']}</requestId>\n";
            echo "<data>\n";
            echo "<videoId>$id</videoId>\n";
            echo "<xmlUrl>http://$host$uri/view.php?f=xml&id=$id</xmlUrl>\n";
            echo "<userUrl>http://$host$uri/view.php?id=$id</userUrl>\n";
            echo "</data>\n";
            echo "</response>\n";
        }
        elseif( $json )
        {
            $ret = array();
            $ret['statusCode'] = 200;
            $ret['statusText'] = 'Ok';
            $ret['data'] = array();
            $ret['data']['videoId'] = $id;
            $ret['data']['jsonUrl'] = "http://$host$uri/view.php?f=json&id=$id";
            $ret['data']['userUrl'] = "http://$host$uri/view.php?id=$id";
            json_response($ret);
        }
        else
        {
            header("Location: http://$host$uri/view.php?id=$id");    
        }
    }
    else
    {
        $error = "Error creating video";
        if( $xml )
        {
            header ('Content-type: text/xml');
            echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
            echo "<response>\n";
            echo "<statusCode>400</statusCode>\n";
            echo "<statusText>$error</statusText>\n";
            if( strlen($_REQUEST['r']) )
                echo "<requestId>{$_REQUEST['r']}</requestId>\n";
            echo "</response>\n";
        }
        elseif( $json )
        {
            $ret = array();
            $ret['statusCode'] = 400;
            $ret['statusText'] = $error;
            if( strlen($_REQUEST['r']) )
                $ret['requestId'] = $_REQUEST['r'];
            header ("Content-type: application/json");
            echo json_encode($ret);
        }
    }
}

/**
* Override the script file name
* 
* @param mixed $p_event
* @param mixed $p_header
* @return mixed
*/
function ZipAvsCallback($p_event, &$p_header)
{
    $p_header['stored_filename'] = 'video.avs';
    return 1;
}

/**
* Override the ini file name
* 
* @param mixed $p_event
* @param mixed $p_header
* @return mixed
*/
function ZipIniCallback($p_event, &$p_header)
{
    $p_header['stored_filename'] = 'video.ini';
    return 1;
}
?>
