<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
$page_keywords = array('Missing');
$page_description = "Page Not Found.";
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest - Page Not Found</title>
        <meta http-equiv="charset" content="iso-8859-1">

        <?php $gaTemplate = '404'; include ('head.inc'); ?>
    </head>
    <body>
            <?php
            $tab = '404';
            include 'header.inc';
            ?>
            <div class="about">
            <h1>Page Not Found</h1>
            <div class="box">
                <p><strong>Sorry!</strong> That page doesn't appear to exist. If you think you have the right link, perhaps try logging in to see if anything changes.</p>

            </div>
            </div>
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
