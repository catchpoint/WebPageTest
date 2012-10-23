<?php
chdir('..');
include 'common.inc';
$id = $_REQUEST['id'];
$valid = false;
$done = false;
$embed = false;
if( $_REQUEST['embed'] )
{
    $embed = true;
    header('Last-Modified: ' . gmdate('r'));
    header('Expires: '.gmdate('r', time() + 31536000));
}
$bgcolor = "black";
if (array_key_exists('bgcolor', $_REQUEST))
    $bgcolor = $_REQUEST['bgcolor'];
$autoplay = 'false';
if (array_key_exists('autoplay', $_REQUEST) && $_REQUEST['autoplay'])
    $autoplay = 'true';

$page_keywords = array('Video','comparison','Webpagetest','Website Speed Test');
$page_description = "Side-by-side video comparison of website performance.";

$xml = false;
if( !strcasecmp($_REQUEST['f'], 'xml') )
    $xml = true;
$json = false;
if( !strcasecmp($_REQUEST['f'], 'json') )
    $json = true;

$ini = null;
$title = "WebPagetest - Visual Comparison";

$dir = GetVideoPath($id, true);
if( is_dir("./$dir") )
{
    $valid = true;
    if (is_file("./$dir/video.mp4") || is_file("./$dir/video.ini")) {
        $ini = parse_ini_file("./$dir/video.ini");
        if( is_file("./$dir/video.mp4") || isset($ini['completed']) )
        {
            $done = true;
            GenerateVideoThumbnail("./$dir");
        }
    }
    
    // get the video time
    $date = gmdate("M j, Y", filemtime("./$dir"));
    if( is_file("./$dir/video.mp4")  )
        $date = gmdate("M j, Y", filemtime("./$dir/video.mp4"));
    $title .= " - $date";

    $labels = json_decode(file_get_contents("./$dir/labels.txt"), true);
    if( count($labels) )
    {
        $title .= ' : ';
        foreach($labels as $index => $label)
        {
            if( $index > 0 )
                $title .= ", ";
            $title .= $label;
        }
    }
    
    $location = null;
    if (gz_is_file("./$dir/testinfo.json")) {
        $tests = json_decode(gz_file_get_contents("./$dir/testinfo.json"), true);
        if (is_array($tests) && count($tests)) {
            foreach($tests as &$test) {
                if (array_key_exists('location', $test)) {
                    if (!isset($location)) {
                        $location = $test['location'];
                    } elseif ($location != $test['location']) {
                        $location = '';
                    }
                } else {
                    $location = '';
                }
            }
        }
    }
}

if( $xml || $json )
{
    $error = "Ok";
    if( $valid )
    {
        if( $done )
        {
            $ret = 200;

            $host  = $_SERVER['HTTP_HOST'];
            $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
            $videoUrl = "http://$host$uri/download.php?id=$id";
            $embedUrl = "http://$host$uri/view.php?embed=1&id=$id";
        }
        else
            $ret = 100;
    }
    else
    {
        $ret = 400;
        $error = "Invalid video ID";
    }
}

if( $xml )
{
    header ('Content-type: text/xml');
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    echo "<response>\n";
    echo "<statusCode>$ret</statusCode>\n";
    echo "<statusText>$error</statusText>\n";
    if( strlen($_REQUEST['r']) )
        echo "<requestId>{$_REQUEST['r']}</requestId>\n";
    echo "<data>\n";
    echo "<videoId>$id</videoId>\n";
    if( strlen($videoUrl) )
        echo '<videoUrl>' . htmlspecialchars($videoUrl) . '</videoUrl>\n';
    echo "</data>\n";
    echo "</response>\n";
}
elseif( $json )
{
    $ret = array();
    $ret['statusCode'] = $ret;
    $ret['statusText'] = $error;
    $ret['data'] = array();
    $ret['data']['videoId'] = $id;
    if( strlen($videoUrl) )
        $ret['data']['videoUrl'] = $videoUrl;
    if (strlen($embedUrl)) {
        $ret['data']['embedUrl'] = $embedUrl;
        if (is_file("./$dir/video.png")) {
            list($width, $height) = getimagesize("./$dir/video.png");
            $ret['data']['width'] = $width;
            $ret['data']['height'] = $height;
        }
    }
    json_response($ret);
}
else
{
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title><?php echo $title;?></title>
        <?php
        if( $valid && !$done && !$embed )
        {
            ?>
            <noscript>
            <meta http-equiv="refresh" content="10" />
            </noscript>
            <script language="JavaScript">
            setTimeout( "window.location.reload(true)", 10000 );
            </script>
            <?php
        }
        ?>
        <?php 
            if( !$embed )
            {
                $gaTemplate = 'Video'; 
                include ('head.inc'); 
            }
        ?>
        <style type="text/css">
            div.content
            {
                text-align:center;
                background-color: black;
                color: white;
                font-family: arial,sans-serif
            }
            .link
            {
                text-decoration: none;
                color: white;
            }
            #player
            {
                margin-left: auto;
                margin-right: auto;
            }
            #location {
                text-align: left;
                padding: 5px;
                width: 100%;
            }
            <?php
            if( $embed )
                echo "body {background-color: $bgcolor; margin:0; padding: 0;}";
            ?>
        </style>
        <link rel="stylesheet" href="/video/video-js.3.2.0/video-js.min.css" type="text/css">
        <script type="text/javascript" src="/video/video-js.3.2.0/video.min.js"></script>
    </head>
    <body>
        <div class="page">
            <?php
            if( !$embed )
            {
                $tab = 'Test Result';
                $videoId = $id;
                $nosubheader = true;
                include 'header.inc';
            }

            if( $valid && ($done || $embed) )
            {
                if (isset($location) && strlen($location) && !$embed) {
                    echo "<div id=\"location\">Tested From: $location</div>";
                }

                $width = 800;
                $height = 600;

                $hasThumb = false;
                if( is_file("./$dir/video.png") )
                {
                    $hasThumb = true;
                    list($width, $height) = getimagesize("./$dir/video.png");
                }

                if( $_REQUEST['width'] )
                    $width = (int)$_REQUEST['width'];
                if( $_REQUEST['height'] )
                    $height = (int)$_REQUEST['height'];

                echo "<script>\n";
                echo "_V_.options.techOrder = ['flash', 'html5'];\n";
                echo "_V_.options.flash.swf = '/video/player/flowplayer-3.2.7.swf';\n";
                echo "_V_.options.flash.flashVars = {config:\"{";
                echo "'clip':{'scaling':'fit'},";
                echo "'plugins':{'controls':{'volume':false,'mute':false,'stop':true,'tooltips':{'buttons':true,'fullscreen':'Enter fullscreen mode'}}},";
                echo "'canvas':{'backgroundColor':'#000000','backgroundGradient':'none'},";
                if ($hasThumb) {
                    echo "'playlist':[{'url':'/$dir/video.png'},{'url':'/$dir/video.mp4','autoPlay':$autoplay,'autoBuffering':false}]";
                } else {
                    echo "'playlist':[{'url':'/$dir/video.mp4','autoPlay':$autoplay,'autoBuffering':true}]";
                }
                echo "}\"};\n";
                echo "_V_.options.flash.params = {
                       allowfullscreen: 'true',
                       wmode: 'transparent',
                       allowscriptaccess: 'always'
                   };
                   _V_.options.flash.attributes={};\n";
                echo "</script>\n";
                    
                echo "<video id=\"player\" class=\"video-js vjs-default-skin\" controls
                  preload=\"auto\" width=\"$width\" height=\"$height\"";
                if ($hasThumb) {
                    echo " poster=\"/$dir/video.png\"";
                }
                echo "data-setup=\"{}\">
                    <source src=\"/$dir/video.mp4\" type='video/mp4'>
                </video>";

                if(!$embed)
                    echo "<br><a class=\"link\" href=\"/video/download.php?id=$id\">Click here to download the video file...</a>\n";
            }
            elseif( $valid && !$embed )
                echo '<h1>Your video will be available shortly.  Please wait...</h1>';
            elseif($embed)
                echo '<h1>The requested video does not exist.</h1>';
            else
                echo '<h1>The requested video does not exist.  Please try creating it again and if the problem persists please contact us.</h1>';
            ?>
            
            <?php 
                if (!$embed)
                    include('footer.inc'); 
            ?>
        </div>
    </body>
</html>

<?php
}
?>
