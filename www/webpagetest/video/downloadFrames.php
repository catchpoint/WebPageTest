<?php
chdir('..');
include 'common.inc';
require_once('video.inc');

$dir = "$testPath/video_$run";
if( $cached )
    $dir .= "_cached";
$ok = false;

if( is_dir($dir) )
{
    $file = "$dir/video.zip";
    BuildVideoScript($testPath, $dir);
    ZipVideo($dir);
    
    if( is_file($file) )
    {
        header('Content-disposition: attachment; filename=video.zip');
        header('Content-type: application/zip');
        readfile_chunked($file);
        unlink($file);
        $ok = true;
    }
}

if( !$ok )
{
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Visual Comparison</title>
        <meta http-equiv="charset" content="iso-8859-1">
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
    </head>
    <body>
        <div class="page">
            <?php
            $tab = null;
            include 'header.inc';
            ?>
            <h1>The video requested does not exist.</h1>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
<?php
}

?>
