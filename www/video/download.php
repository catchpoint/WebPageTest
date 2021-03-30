<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
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
<html lang="en-us">
    <head>
        <title>WebPageTest - Visual Comparison</title>
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
    <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
        <div class="page">
            <?php
            $tab = null;
            include 'header.inc';
            ?>
            <h1>The requested video does not exist.</h1>

            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
<?php
}

?>
