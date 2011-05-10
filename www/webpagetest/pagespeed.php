<?php
include 'common.inc';
require_once('./lib/json.php');
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest Page Speed analysis<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Page Speed'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Page Speed';
            include 'header.inc';
            ?>

            <div id="pagespeed_results">
            <h2 class="nomargin">Page Speed Optimization Check</h2>
            <p class="centered"><a href="http://code.google.com/speed/page-speed/" target="_blank">More about Page Speed</a></p>
            <div id="pagespeed"></div>
            
            </div>
            
            <?php 
            include('footer.inc');
            echo "<script type=\"text/javascript\" src=\"/widgets/pagespeed/tree.php?test=$id&amp;run=$run&amp;cached=$cached&amp;div=pagespeed\"></script>\n";
            ?>
        </div>
    </body>
</html>
