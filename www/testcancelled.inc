<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPagetest - Test cancelled</title>
        <?php
            $noanalytics = true;
            $page_keywords = array('Cancelled','Webpagetest','Website Speed Test','Page Speed');
            $page_description = "Website speed test cancelled.";
            include ('head.inc');
        ?>
    </head>
    <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
            <?php
            $tab = 'Test Result';
            $nosubheader = true;
            include 'header.inc';
            ?>
            <div align="center" class="box">
                <h3>Sorry, this test was cancelled before it ran!</h3>
                <form><input type="button" value="Back" onClick="history.go(-1);return true;"> </form>
            </div>
        </div>
    </body>
</html>
