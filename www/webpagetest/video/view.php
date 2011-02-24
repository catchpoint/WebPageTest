<?php
chdir('..');
include 'common.inc';
$id = $_REQUEST['id'];
$valid = false;
$done = false;

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
    $ini = parse_ini_file("./$dir/video.ini");
    if( isset($ini['completed']) )
    {
        $done = true;
        GenerateThumbnail("./$dir");
    }
    
    // get the video time
    $date = date("M j, Y", filemtime("./$dir"));
    if( is_file("./$dir/video.mp4")  )
        $date = date("M j, Y", filemtime("./$dir/video.mp4"));
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
    if( strlen($_REQUEST['r']) )
        $ret['requestId'] = $_REQUEST['r'];
    $ret['data'] = array();
    $ret['data']['videoId'] = $id;
    if( strlen($videoUrl) )
        $ret['data']['videoUrl'] = $videoUrl;
    header ("Content-type: application/json");
    echo json_encode($ret);
}
else
{
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title><?php echo $title;?></title>
        <?php
        if( $valid && !$done )
            echo "<meta http-equiv=\"refresh\" content=\"10\">\n";
        ?>
        <?php include ('head.inc'); ?>
        <style type="text/css">
            div.content
            {
                text-align:center;
                background: black;
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
        </style>
        <script type="text/javascript" src="player/flowplayer-3.2.4.min.js"></script>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $videoId = $id;
            $nosubheader = true;
            include 'header.inc';

            if( $valid && $done )
            {
                $width = 800;
                $height = 600;

                $hasThumb = false;
                if( is_file("./$dir/video.png") )
                {
                    $hasThumb = true;
                    list($width, $height) = getimagesize("./$dir/video.png");
                }
                    
                echo '<div';
                echo " style=\"display:block; width:{$width}px; height:{$height}px\"";
                echo " id=\"player\">\n";
                echo "</div>\n";

                // embed the actual player
                ?>
                <script>
                    flowplayer("player", 
                                    {
                                        src: "player/flowplayer-3.2.4.swf",
                                        cachebusting: true,
                                        version: [9, 115]
                                    } , 
                                    { 
                                        clip:  { 
                                            scaling: "fit"
                                        } ,
                                        playlist: [
                                            <?php
                                            if( $hasThumb )
                                            {
                                                echo "{ url: '/$dir/video.png'} ,\n";
                                                echo "{ url: '/$dir/video.mp4', autoPlay: false, autoBuffering: false}\n";
                                            }
                                            else
                                                echo "{ url: '/$dir/video.mp4', autoPlay: false, autoBuffering: true}\n";
                                            ?>
                                        ],
                                        plugins: {
                                            controls: {
                                                volume:false,
                                                mute:false,
                                                stop:true,
                                                tooltips: { 
                                                    buttons: true, 
                                                    fullscreen: 'Enter fullscreen mode' 
                                                } 
                                            }
                                        } ,
                                        canvas:  { 
                                            backgroundColor: '#000000', 
                                            backgroundGradient: 'none'
                                        }
                                    }
                                ); 
                </script>
                <?php                

                echo "<br><a class=\"link\" href=\"/video/download.php?id=$id\">Click here to download the video file...</a>\n";
            }
            elseif( $valid )
            {
            ?>
            <h1>Your video will be available shortly.  Please wait...</h1>
            <?php
            }
            else
            {
            ?>
            <h1>The requested video does not exist.  Please try creating it again and if the problem persists please contact us.</h1>
            <?php
            }
            ?>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>

<?php
}

/**
* Generate a thumbnail for the video file if we don't already have one
* 
* @param mixed $dir
*/
function GenerateThumbnail($dir)
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
?>
