<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Running web page performance and optimization test...</title>
        <meta http-equiv="refresh" content="15">
        <?php 
            $noanalytics = true;
            include ('head.inc');
        ?>
    </head>
    <body>
        <div class="page">
            <?php
            require_once('testStatus.inc');
            $tab = 'Test Result';
            include 'header.inc';
            ?>
            <div id="runningHeader">
                <p>
                Url: <a rel="nofollow" href=<?php echo '"' . $url . '"';?>><?php echo $url;?></a><br>
                From: <?php echo $test['test']['location'];?><br>
                <?php echo GetTestInfoHtml(false); ?>
                </p>
                <h3>Testing...</h3>
                <?php
                if ( !$test['test']['startTime'] )
                {
                    ?>
                    <form action="/cancelTest.php" method="get">
                    <input type="hidden" name="test" value="<?php echo $id;?>">
                    <input type="submit" value="Cancel Test"/>
                    </form>
                    <?php
                }
                ?>
            </div>
            <?php
              $statusText = GetTestStatusText($id, $test);
            ?>
            <div id="statusImg">
                <?php
                    $img = "waiting";
                    if( $test['test']['startTime'] )
                        $img = "testing";
                    echo "<img src=\"{$GLOBALS['cdnPath']}/images/status_$img.png\">";
                    echo "<div id=\"statusText\">$statusText</div>\n";
                ?>
            </div>
            <?php
            $tip = GetTip();
            if( strlen($tip) )
            {
                echo '<table class="tip"><tr><th>Did you know...<span class="tip_note">(all links open in a new window/tab)</span></th></tr><tr><td>';
                echo $tip;
                echo "</td></table>\n";
            }
            ?>
            <p>Your web page performance test has been submitted and is now being processed.  This page will automatically update with the test status as 
            the test continues to run and when the test is complete the final results will be available here.</p>
            <p>You can either leave this page open in your browser until the test
             is complete or come back later and check on the status of the test (the browser does not need to remain open for testing to continue).</p>
            <br>
            <?php include('./ads/test_progress_bottom.inc'); ?>
            <br>
            <?php include('footer.inc'); ?>
        </div>
        <script type="text/javascript">
            var testId = "<?php echo $id; ?>";
        </script>
    </body>
</html>

<?php
/**
* Load a tip
* 
*/
function GetTip()
{
    $tip = '';
    
    $tips = glob('./tips_data/*.html',GLOB_NOSORT);
    $count = count($tips);
    if( $count > 0 )
    {
        $pick = rand(0, $count - 1);
        $file = $tips[$pick];
        $tip = file_get_contents($file);
    }
    
    return $tip;
}
?>