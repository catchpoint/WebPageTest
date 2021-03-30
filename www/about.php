<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
$page_keywords = array('About','Contact','WebPageTest','Website Speed Test','Page Speed');
$page_description = "More information about WebPageTest website speed testing and how to contact us.";
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest - About</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
        <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
        <meta name="author" content="Patrick Meenan">
        <style type="text/css">
        #logo {float:right;}
        </style>
        <?php $gaTemplate = 'About'; include ('head.inc'); ?>
    </head>
    <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
            <?php
            $tab = 'About';
            include 'header.inc';
            ?>
            <h1>About WebPageTest</h1>
            <div class="box">
                <?php
                if( is_file('settings/server/about.inc') ) {
                    include('settings/server/about.inc');
                } elseif( is_file('settings/common/about.inc') ) {
                    include('settings/common/about.inc');
                } elseif( is_file('settings/about.inc') ) {
                    include('settings/about.inc');
                } else {
                ?>
                <a href="https://developers.google.com/speed"><img id="logo" src="images/google.png"></a>
                <br><p>WebPageTest is an open source project that is primarily being developed and supported by Google as part of our efforts
                to <a href="http://developers.google.com/speed">make the web faster</a>.</p>
                <p>WebPageTest is a tool that was originally developed by <a href="http://dev.aol.com/">AOL</a> for use internally and was open-sourced in 2008
                under a BSD license.  The platform is under active development on <a href="https://github.com/WPO-Foundation/webpagetest">GitHub</a> and
                is also packaged up periodically and available for <a href="https://www.webpagetest.org/forums/forumdisplay.php?fid=12">download</a> if you would like to run your own
                instance.</p>
                <p>The online version at <a href="https://www.webpagetest.org/">www.webpagetest.org</a> is run for the benefit of the
                performance community.</p>
                <p>If you are having any problems or just have questions about the site, please feel free to <a href="mailto:info@webpagetest.org">contact us</a>.</p>
                <?php
                }
                ?>
            </div>
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
