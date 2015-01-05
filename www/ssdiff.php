<?php
include 'common.inc';
require_once('page_data.inc');
$page_keywords = array('image','comparison','Webpagetest','Website Speed Test');
$page_description = "Visual comparison of multiple website screen shots.";
$title = 'Web page screen shot diff';
$gaTemplate = 'Screen Shot Diff';

$refPath = GetTestPath($_REQUEST['ref']);
$refData = loadAllPageData($refPath);
$cmpPath = GetTestPath($_REQUEST['cmp']);
$cmpData = loadAllPageData($cmpPath);
$refRun = GetMedianRun($refData, 0, $median_metric);
$cmpRun = GetMedianRun($cmpData, 0, $median_metric);
if( $refRun && $cmpRun )
{
    $refFile = "$refPath/{$refRun}_screen.png";
    $cmpFile = "$cmpPath/{$cmpRun}_screen.png";
    if( is_file($refFile) && is_file($cmpFile) )
    {
        $refImg = urlencode("{$_REQUEST['ref']}/{$refRun}_screen.png");
        $cmpImg = urlencode("{$_REQUEST['cmp']}/{$cmpRun}_screen.png");
    }
}
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Screen Shot diff</title>
        <?php include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $nosubheader = true;
            $filmstrip = $_REQUEST['tests'];
            include 'header.inc';
            
            if( isset($refImg) && isset($cmpImg) )
            {
                echo '<table style="text-align:center;">';
                echo '<tr><th>Reference Image</th><th>Comparison Image</th></tr>';
                echo '<tr><td>';
                echo "<a href=\"/$refFile\"><img style=\"max-width:450px; -ms-interpolation-mode: bicubic;\" src=\"/$refFile\"></a>";
                echo '</td><td>';
                echo "<a href=\"/$cmpFile\"><img style=\"max-width:450px; -ms-interpolation-mode: bicubic;\" src=\"/$cmpFile\"></a>";
                echo '</td></tr>';
                echo '<tr><th colspan=2>Comparison</th></tr>';
                echo '<tr><td colspan=2>';
                $cmpImgFile = "/imgdiff.php?ref=$refImg&amp;cmp=$cmpImg";
                echo "<a href=\"$cmpImgFile\"><img style=\"max-width:930px; -ms-interpolation-mode: bicubic;\" src=\"$cmpImgFile\"></a>";
                echo '</td></tr>';
                echo '</table>';
            }
            else
                echo 'Sorry, the screen shots were not available for comparison';
        
            include('footer.inc'); 
            ?>
        </div>
    </body>
</html>
