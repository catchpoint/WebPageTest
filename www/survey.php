<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
if (!GetSetting('survey')) {
    die;
}
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
        <style>
        #logo {float:right;}
        </style>
        <?php include('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            include 'header.inc';
            ?>

            <div class="translucent">
            <div class="typeform-widget" data-url="https://form.typeform.com/to/OeM7lVCD?typeform-medium=embed-snippet" style="width: 100%; height: 500px;"></div> <script> (function() { var qs,js,q,s,d=document, gi=d.getElementById, ce=d.createElement, gt=d.getElementsByTagName, id="typef_orm", b="https://embed.typeform.com/"; if(!gi.call(d,id)) { js=ce.call(d,"script"); js.id=id; js.src=b+"embed.js"; q=gt.call(d,"script")[0]; q.parentNode.insertBefore(js,q) } })() </script>
            </div>

            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
