<?php
chdir('..');
include 'common.inc';
$id = $_REQUEST['id'];
$file = './' . GetVideoPath($id) . '/video.mp4';
if( is_file($file) )
{
    header('Content-disposition: attachment; filename=video.mp4');
    header('Content-type: video/mp4');
    readfile_chunked($file);
}
else
{
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Visual Comparison</title>
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
