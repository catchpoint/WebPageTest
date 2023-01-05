<?php

// Copyright 2021 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
if (!is_file('settings/server/terms.inc') && !is_file('settings/common/terms.inc') && !is_file('settings/terms.inc')) {
    http_response_code(404);
    die();
}
include 'common.inc';
$page_keywords = array('Terms of Service','WebPageTest','Website Speed Test','Page Speed');
$page_description = "WebPageTest Terms of Service.";
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest - Terms of Service</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
        <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
        <style>
        #logo {float:right;}
        </style>
        <?php include('head.inc'); ?>
    </head>
    <body class="common">
            <?php
            include 'header.inc';
            if (is_file('settings/server/terms.inc')) {
                include('settings/server/terms.inc');
            } elseif (is_file('settings/common/terms.inc')) {
                include('settings/common/terms.inc');
            } elseif (is_file('settings/terms.inc')) {
                include('settings/terms.inc');
            }
            include('footer.inc');
            ?>
        </div>
    </body>
</html>
