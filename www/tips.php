<?php
include 'common.inc';
$page_keywords = array('Optimization','WebPageTest','Website Speed Test','Tips');
$page_description = "Website performance optimization tips.";
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPageTest - Tips</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
        <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
        <meta name="author" content="Patrick Meenan">
        <?php $gaTemplate = 'Tips'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Tips';
            include 'header.inc';
            ?>

            <h2 class="centered">Tips and Tricks<br><span class="centered small">(all links open in a new window/tab)</span></h2>
            <?php
            $files = glob('./tips_data/*.html');
            $active_tips = GetSetting("active_tips");
            if ($active_tips) {
                $active_tips = explode(" ", $active_tips);
            }
            foreach( $files as $file )
            {
                if (!$active_tips || in_array(basename($file), $active_tips)) {
                    $tip = file_get_contents($file);
                    if( strlen($tip) )
                    {
                        echo '<table class="tip"><tr><th>Did you know...</th></tr><tr><td>';
                        echo $tip;
                        echo "</td></table>\n";
                    }
                }
            }
            ?>

            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
