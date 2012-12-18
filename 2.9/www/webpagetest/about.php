<?php 
include 'common.inc';
$page_keywords = array('About','Contact','Webpagetest','Website Speed Test','Page Speed');
$page_description = "More information about WebPagetest website speed testing and how to contact us.";
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - About</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
        <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
        <meta name="author" content="Patrick Meenan">
        <style type="text/css">
        #logo {float:right;}
        </style>
        <?php $gaTemplate = 'About'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'About';
            include 'header.inc';
            ?>
            
            <div class="translucent">
                <?php
                if( is_file('settings/about.inc') )
                    include('settings/about.inc');
                else
                {
                ?>
                <a href="http://developers.google.com/speed"><img id="logo" src="images/google.png"></a>
                <br><p>WebPagetest is an open source project that is being developed and supported by Google as part of our efforts 
                to <a href="http://developers.google.com/speed">make the web faster</a>.</p>
                <p>WebPagetest is a tool that was orginally developed by <a href="http://dev.aol.com/">AOL</a> for use internally and was open-sourced in 2008.
                The software is available for <a href="http://www.webpagetest.org/forums/forumdisplay.php?fid=12">download</a> if you would like to run your own 
                instance.</p>
                <p>The public instance of WebPagetest at <a href="http://www.webpagetest.org/">www.webpagetest.org</a> is operated by the 
                <a href="http://www.wpofoundation.org/">WPO Foundation</a>.</p>
                <?php
                }
                ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
