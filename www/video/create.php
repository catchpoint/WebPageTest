<?php
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
    require_once __DIR__ . '/visualProgress.inc.php';
    require_once __DIR__ . '/../include/TestInfo.php';
    require_once __DIR__ . '/../include/TestResults.php';
    require_once __DIR__ . '/../include/TestStepResult.php';
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
    if( isset($_REQUEST['id']) && preg_match('/^[\w\.\-_]+$/', $_REQUEST['id']) )
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
        $bgColor = isset($_REQUEST['bg']) ? htmlspecialchars($_REQUEST['bg']) : '000000';
        $textColor = isset($_REQUEST['text']) ? htmlspecialchars($_REQUEST['text']) : 'ffffff';

        $compTests = explode(',', $_REQUEST['tests']);
        foreach($compTests as $t)
        {
            $parts = explode('-', $t);
            if( count($parts) >= 1 )
            {
                $test = array();
                $test['id'] = $parts[0];
                $test['cached'] = 0;
                $test['step'] = 1;
                $test['end'] = $endTime;
                $test['extend'] = false;
                $test['syncStartRender'] = "";
                $test['syncDocTime'] = "";
                $test['syncFullyLoaded'] = "";
                $test['bg'] = $bgColor;
                $test['text'] = $textColor;
                $label = null;

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
                            $label = preg_replace('/[^a-zA-Z0-9 \-_]/', '', $p[1]);
                        if( $p[0] == 'c' )
                            $test['cached'] = (int)$p[1];
                        if( $p[0] == 's')
                            $test['step'] = (int)$p[1];
                        if( $p[0] == 'e' )
                            $test['end'] = trim($p[1]);
                        if( $p[0] == 'i' )
                            $test['initial'] = intval(trim($p[1]) * 1000.0);
                        // Optional extra info to sync the video with
                        if( $p[0] == 'p' )
                            $test['syncStartRender'] = (int)$p[1];
                        if( $p[0] == 'd' )
                            $test['syncDocTime'] = (int)$p[1];
                        if( $p[0] == 'f' )
                            $test['syncFullyLoaded'] = (int)$p[1];
                    }
                }

                RestoreTest($test['id']);
                $test['path'] = GetTestPath($test['id']);
                $info = GetTestInfo($test['id']);
                if ($info) {
                    if (array_key_exists('discard', $info) &&
                        $info['discard'] >= 1 &&
                        array_key_exists('priority', $info) &&
                        $info['priority'] >= 1) {
                        $defaultInterval = 100;
                    }
                    $test['url'] = $info['url'];
                    $test_median_metric = GetSetting('medianMetric', 'loadTime');
                    if (isset($info['medianMetric']))
                      $test_median_metric = $info['medianMetric'];
                }
                $testInfoObject = TestInfo::fromFiles("./" . $test['path']);

                if( !array_key_exists('run', $test) || !$test['run'] ) {
                    $testResults = TestResults::fromFiles($testInfoObject);
                    $test['run'] = $testResults->getMedianRunNumber($test_median_metric, $test['cached']);
                    $runResults = $testResults->getRunResult($test['run'], $test['cached']);
                    $stepResult = $runResults->getStepResult($test['step']);
                } else {
                    $stepResult = TestStepResult::fromFiles($testInfoObject, $test['run'], $test['cached'], $test['step']);
                }
                $test['pageData'] = $stepResult->getRawResults();
                $test['aft'] = (int) $stepResult->getMetric('aft');

                $loadTime = $stepResult->getMetric('fullyLoaded');
                if( isset($loadTime) && (!isset($fastest) || $loadTime < $fastest) )
                    $fastest = $loadTime;
                // figure out the real end time (in ms)
                if (isset($test['end'])) {
                    $visualComplete = $stepResult->getMetric("visualComplete");
                    if( !strcmp($test['end'], 'visual') && $visualComplete !== null ) {
                        $test['end'] = $visualComplete;
                    } elseif( !strcmp($test['end'], 'load') ) {
                        $test['end'] = $stepResult->getMetric('loadTime');
                    } elseif( !strcmp($test['end'], 'doc') ) {
                        $test['end'] = $stepResult->getMetric('docTime');
                    } elseif(!strncasecmp($test['end'], 'doc+', 4)) {
                        $test['end'] = $stepResult->getMetric('docTime') + (int)((double)substr($test['end'], 4) * 1000.0);
                    } elseif( !strcmp($test['end'], 'full') ) {
                        $test['end'] = 0;
                    } elseif( !strcmp($test['end'], 'all') ) {
                        $test['end'] = -1;
                    } elseif( !strcmp($test['end'], 'aft') ) {
                        $test['end'] = $test['aft'];
                        if( !$test['end'] )
                            $test['end'] = -1;
                    } else {
                        $test['end'] = (int)((double)$test['end'] * 1000.0);
                    }
                } else {
                    $test['end'] = 0;
                }
                if( !$test['end'] )
                    $test['end'] = $stepResult->getMetric('fullyLoaded');

                // round the test end up to the closest 100ms interval
                $test['end'] = intval(ceil(floatval($test['end']) / 100.0) * 100.0);
                $localPaths = new TestPaths('./' . $test['path'], $test["run"], $test["cached"], $test["step"]);
                $test['videoPath'] = $localPaths->videoDir();

                if ($test['syncStartRender'] || $test['syncDocTime'] || $test['syncFullyLoaded'])
                    $videoIdExtra .= ".{$test['syncStartRender']}.{$test['syncDocTime']}.{$test['syncFullyLoaded']}";

                if (!isset($label) || !strlen($label)) {
                    if ($info && isset($info['label']))
                        $label = $info['label'];
                    $new_label = getLabel($test['id'], $user);
                    if (!empty($new_label))
                        $label = $new_label;
                }
                if( empty($label) ) {
                  $label = $test['url'];
                  $label = str_replace('http://', '', $label);
                  $label = str_replace('https://', '', $label);
                }
                if (empty($label))
                    $label = trim($stepResult->getUrl());
                $test['label'] = $label;

                if ($info && isset($info['locationText']))
                    $test['location'] = $info['locationText'];

                if( is_dir($test['videoPath']) ) {
                    $labels[] = $test['label'];
                    $tests[] = $test;
                }
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
