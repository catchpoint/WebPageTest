<?php
chdir('..');
include 'common.inc';
$id = $_REQUEST['id'];
$file = './' . GetVideoPath($id) . '/video.mp4';
if( ValidateTestId($id) && is_file($file) )
{
    header('Content-disposition: attachment; filename=video.mp4');
    header('Content-type: video/mp4');
    readfile_chunked($file);
}
else
{
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Visual Comparison</title>
        <?php $gaTemplate = 'Video Download Error'; include ('head.inc'); ?>
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
