<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest - Test cancelled</title>
        <?php

            $noanalytics = true;
            $page_keywords = array('Cancelled','WebPageTest','Website Speed Test','Page Speed');
            $page_description = "Website speed test cancelled.";
            include('head.inc');
        ?>
        <link rel="stylesheet" href="/assets/css/button.css?v=<?= constant('VER_BUTTON_CSS') ?>">
    </head>
    <body class="history">
            <?php
            $tab = 'Test Result';
            $nosubheader = true;
            include 'header.inc';
            ?>
            <div class="history_hed">
                <h1>Test Run Cancelled</h1>
                <p>Sorry, this test was cancelled before it ran!</p>
                <form><input class="yellow pill-button" type="button" value="Back" onClick="history.go(-1);return true;"> </form>
            </div>
        </div>
    </body>
</html>
