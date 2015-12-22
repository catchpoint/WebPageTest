<?php
include 'common.inc';
require_once('./lib/json.php');
$page_keywords = array('PageSpeed','Webpagetest','Website Speed Test','Analysis');
$page_description = "Google PageSpeed results$testLabel.";
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest PageSpeed analysis<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'PageSpeed'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'PageSpeed';
            include 'header.inc';
            ?>

            <div id="pagespeed_results">
            <h2 class="nomargin">PageSpeed Optimization Check</h2>
            <p class="centered"><a href="http://code.google.com/speed/page-speed/" target="_blank">More about PageSpeed</a></p>
            <div id="pagespeed"></div>
            
            </div>
            
            <?php 
            include('footer.inc');
            echo "<script type=\"text/javascript\" src=\"/widgets/pagespeed/tree.php?test=$id&amp;run=$run&amp;cached=$cached&amp;div=pagespeed\"></script>\n";
            ?>
        </div>
    </body>
</html>
