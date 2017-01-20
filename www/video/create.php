<?php
$version = 8;
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

    $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
    $host  = $_SERVER['HTTP_HOST'];
    $uri = $_SERVER['PHP_SELF'];
    $params = '';
    foreach( $_GET as $key => $value )
        if( $key != 't' && !is_array($value))
            $params .= "&$key=" . urlencode($value);
    header("Location: $protocol://$host$uri?tests=$tests{$params}");
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
        $bgColor = isset($_REQUEST['bg']) ? $_REQUEST['bg'] : '000000';
        $textColor = isset($_REQUEST['text']) ? $_REQUEST['text'] : 'ffffff';

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
                $test['bg'] = $bgColor;
                $test['text'] = $textColor;
                
                if (isset($_REQUEST['labelHeight']) && is_numeric($_REQUEST['labelHeight']))
                  $test['labelHeight'] = intval($_REQUEST['labelHeight']);
                if (isset($_REQUEST['timeHeight']) && is_numeric($_REQUEST['timeHeight']))
                  $test['timeHeight'] = intval($_REQUEST['timeHeight']);
                
                if (isset($_REQUEST['slow']) && $_REQUEST['slow'])
                  $test['speed'] = 0.2;

                for( $i = 1; $i < count($parts); $i++ )
                {
                    $p = explode(':', $parts[$i]);
                    if( count($p) >= 2 )
                    {
                        if( $p[0] == 'r' )
                            $test['run'] = (int)$p[1];
                        if( $p[0] == 'l' )
                            $test['label'] = preg_replace('/[^a-zA-Z0-9 \-_]/', '', $p[1]);
                        if( $p[0] == 'c' )
                            $test['cached'] = (int)$p[1];
                        if( $p[0] == 'e' )
                            $test['end'] = trim($p[1]);
                        if( $p[0] == 'i' )
                            $test['initial'] = intval(trim($p[1]) * 1000.0);
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
                    elseif( !strcmp($test['end'], 'load') )
                        $test['end'] = $test['pageData'][$test['run']][$test['cached']]['loadTime'];
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
                    
                // round the test end up to the closest 100ms interval
                $test['end'] = intval(ceil(floatval($test['end']) / 100.0) * 100.0);

                if ($test['syncStartRender'] || $test['syncDocTime'] || $test['syncFullyLoaded'])
                    $videoIdExtra .= ".{$test['syncStartRender']}.{$test['syncDocTime']}.{$test['syncFullyLoaded']}";

                $testInfo = GetTestInfo($test['id']);
                if ($testInfo) {
                  if( !strlen($test['label']) )
                    $test['label'] = trim($testInfo['label']);
                  if (array_key_exists('locationText', $testInfo))
                    $test['location'] = $testInfo['locationText'];
                }

                if (!strlen($test['label'])) {
                    $test['label'] = trim($test['pageData'][1][0]['URL']);
                }

                // See if the label has been edited
                $new_label = getLabel($test['id'], $user);

                if (!empty($new_label)) {
                    $labels[] = $new_label;
                } else {
                    $labels[] = $test['label'];
                }


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
                    $hashstr = $_REQUEST['tests'] . $_REQUEST['template'] . $version . trim($_REQUEST['end']) . $videoIdExtra . $bgColor . $textColor;
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

            if( !$exists ) {
                // set up the result directory
                $dest = './' . GetVideoPath($id);
                if( !is_dir($dest) )
                    mkdir($dest, 0777, true);
                if( count($labels) )
                    file_put_contents("$dest/labels.txt", json_encode($labels));
                gz_file_put_contents("$dest/testinfo.json", json_encode($tests));

                // kick off the actual rendering
                SendAsyncRequest("/video/render.php?id=$id");
            }
        }
    }

    // redirect to the destination page
    if( $id )
    {
        $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
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
            echo "<xmlUrl>$protocol://$host$uri/view.php?f=xml&id=$id</xmlUrl>\n";
            echo "<userUrl>$protocol://$host$uri/view.php?id=$id</userUrl>\n";
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
            $ret['data']['jsonUrl'] = "$protocol://$host$uri/view.php?f=json&id=$id";
            $ret['data']['userUrl'] = "$protocol://$host$uri/view.php?id=$id";
            json_response($ret);
        }
        else
        {
            header("Location: $protocol://$host$uri/view.php?id=$id");
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
