<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
$page_keywords = array('About', 'Contact', 'WebPageTest', 'Website Speed Test', 'Page Speed');
$page_description = "More information about WebPageTest website speed testing and how to contact us.";
?>
<!DOCTYPE html>
<html lang="en-us">

<head>
    <title>WebPageTest - About</title>
    <meta http-equiv="charset" content="iso-8859-1">
    <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
    <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
    <?php include('head.inc'); ?>
</head>

<body>
    <?php
    $tab = 'About';
    include 'header.inc';
    ?>
    <div class="about">
        <h1>About WebPageTest</h1>
        <div class="box">
            <p>Building high quality web experiences for users is at the core of all our efforts. With WebPageTest,
                we strive to provide performance products and resources to our global and growing community of developers,
                third-party platforms, technical consultants and others. WebPage as a tool was originally developed by
                Patrick Meenan while he was at AOL for use internally and was open-sourced in 2008 under a BSD license.
                The online version at <a href="https://www.webpagetest.org/">www.webpagetest.org</a> is run for the benefit
                of the performance community.</p>

            <p>WebPageTest was acquired in September of 2020 by <a href="https://www.catchpoint.com/">Catchpoint</a>, the leading Digital Experience Monitoring
                platform providing <a href="https://www.catchpoint.com/guide-to-synthetic-monitoring">Synthetic Monitoring</a>, Real User Measurement, Network Monitoring, and Endpoint Monitoring products.</p>

            <p>The acquisition starts a new and exciting chapter as we plan to expand WebPageTest’s capabilities and WebPageTest.org’s
                geographical performance testing footprint, leveraging Catchpoint’s best-in-class infrastructure, adding capacity and
                improving consistency and quality of analytics. You can read more about Catchpoint’s acquisition of
                WebPageTest <a href="https://www.catchpoint.com/webpagetest-joins-catchpoint">here</a>.
            <p>

            <p>The WebPageTest code is free to use under the Polyform Shield license, a source-available license. As
                long as you are not creating a product or service that competes with Catchpoint’s offerings then you
                are free to do whatever you like with the WebPageTest code, including using it for your own internal
                use or creating non-competing commercial products from it. In fact, we encourage using the WebPageTest
                code to build your own value-added applications. Read
                more <a href="https://github.com/WPO-Foundation/webpagetest/blob/master/LICENSE_FAQ.md">here</a>.</p>

            <p>If you are having any problems or just have questions about the site, please feel free to
                <a href="https://www.product.webpagetest.org/contact">contact us</a>. If you are considering sending advertising opportunities,
                SEO/SEM solicitations, link sharing, etc....don't. We won't respond and will mark it as spam.
            </p>
        </div>
    </div>
    <?php include('footer.inc'); ?>
    </div>
</body>

</html>