<?php 
include 'common.inc';
$page_keywords = array('About','Contact','Webpagetest','Website Speed Test','Page Speed');
$page_description = "More information about WebPagetest website speed testing and how to contact us.";
?>
<!DOCTYPE html>
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
                <a href="https://developers.google.com/speed"><img id="logo" src="images/google.png"></a>
                <br><p>WebPagetest is an open source project that is primarily being developed and supported by Google as part of our efforts 
                to <a href="http://developers.google.com/speed">make the web faster</a>.</p>
                <p>WebPagetest is a tool that was originally developed by <a href="http://dev.aol.com/">AOL</a> for use internally and was open-sourced in 2008 
                under a BSD license.  The platform is under active development on <a href="https://github.com/WPO-Foundation/webpagetest">GitHub</a> and 
                is also packaged up periodically and available for <a href="https://www.webpagetest.org/forums/forumdisplay.php?fid=12">download</a> if you would like to run your own 
                instance.</p>
                <p>The online version at <a href="https://www.webpagetest.org/">www.webpagetest.org</a> is run by for the benefit of the 
                performance community 
                with several companies and individuals providing the testing infrastructure around the globe.</p>
                <p>In exchange for running a testing location, partners get their logo associated with the location and a banner on the site. 
                <a href="https://sites.google.com/a/webpagetest.org/docs/other-resources/hosting-a-test-location">Hosting a test location</a> is open to anyone who is interested and 
                does not constitute an endorsement of the services offered by the partner (however, I think you will find that the partners providing test locations 
                tend to be very involved in the web performance community).</p>
                <p>If you are having any problems or just have questions about the site, please feel free to <a href="mailto:pmeenan@webpagetest.org">contact me</a>.</p>
                <?php
                }
                ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
