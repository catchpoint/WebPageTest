<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once(__DIR__ . '/../util.inc');
$version = 9;
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

    $protocol = getUrlProtocol();
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
    require_once('video.inc');
    require_once __DIR__ . '/render.inc.php';

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
    if( isset($_REQUEST['id']) && preg_match('/^[\w\.\-_]+$/', $_REQUEST['id']) )
    {
        // see if the video already exists
        $id = $_REQUEST['id'];
        RestoreVideoArchive($id);
        $path = GetVideoPath($id);
        if( is_file("./$path/video.mp4") )
            $exists = true;
    }

    if( !$exists )
    {
        $tests = BuildRenderTests();

        $count = count($tests);
        if( $count )
        {
            $labels = array();
            foreach($tests as $test) {
                $labels[] = $test['label'];
            }

            if( !strlen($id) )
            {
                // try and create a deterministic id so multiple submissions of the same tests will result in the same id
                $server_id = GetSetting('serverID');
                if (is_string($server_id)) {
                    $server_id .= 'i';
                } else {
                    $server_id = '';
                }
                if( strlen($_REQUEST['tests']) ) {
                    $date = gmdate('ymd_');
                    $hashstr = $_REQUEST['tests'] . $_REQUEST['template'] . $version . trim($_REQUEST['end']) . $videoIdExtra . $bgColor . $textColor;
                    if( $_REQUEST['slow'] )
                        $hashstr .= '.slow';
                    if( strpos($hashstr, '_') == 6 )
                        $date = substr($hashstr, 0, 7);
                        $id = $date . $server_id . sha1($hashstr);
                } else {
                    $id = gmdate('ymd_') . $server_id . md5(uniqid(rand(), true));
                }
            }

            RestoreVideoArchive($id);
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
        $protocol = getUrlProtocol();
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
                echo "<requestId>" . htmlspecialchars($_REQUEST['r']) . "</requestId>\n";
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
                echo "<requestId>" . htmlspecialchars($_REQUEST['r']) . "</requestId>\n";
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
