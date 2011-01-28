<?php 
include 'common.inc';
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - About</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
        <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
        <meta name="author" content="Patrick Meenan">
        <?php include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'About';
            include 'header.inc';
            ?>
            
            <div class="translucent">
                <p>WebPagetest is a tool that was orginially developed by <a href="http://dev.aol.com/">AOL</a> for use internally and was open-sourced in 2008.  
                The online version at <a href="http://www.webpagetest.org/">www.webpagetest.org</a> is an industry collaboration with various companies providing 
                the testing infrastructure for testing your site from across the globe.</p>

                <?php
                echo '<p>If you are having any problems of just have questions about the site, please feel free to <a href="mailto:' . $settings['contact'] . '">contact us</a>.</p>';
                ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
