<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Test cancelled</title>
        <?php
            $noanalytics = true;
            $page_keywords = array('Cancelled','Webpagetest','Website Speed Test','Page Speed');
            $page_description = "Website speed test cancelled.";
            include ('head.inc');
        ?>
    </head>
    <body>
        <div class="page">
            <div align="center" class="translucent">
                <h3>Sorry, this test was cancelled before it ran!</h3>
                <form><input type="button" value="Back" onClick="history.go(-1);return true;"> </form>
            </div>
        </div>
    </body>
</html>
