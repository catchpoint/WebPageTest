<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Running web page performance and optimization test...</title>
        <meta http-equiv="refresh" content="10">
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
            <div class="translucent">
                <h3 align="left">Testing...
                <?php
                if ( !$test['test']['startTime'] )
                {
                    echo "( <a href=\"/cancelTest.php?test=$id \">Cancel Test</a> )";
                }
                ?></h3>
                <p>
                Url: <a rel="nofollow" href=<?php echo '"' . $url . '"';?>><?php echo $url;?></a><br>
                From: <?php echo $test['test']['location'];?><br>
                <?php if( $dom ) echo 'DOM Element: <b>' . $dom . '</b><br>'; ?>
                <?php if( $test['test']['fvonly'] ) echo '<b>First View only</b><br>'; ?>
                <?php if( (int)$test['test']['runs'] > 1 ) echo 'Test runs: <b>' . $test['test']['runs'] . '</b><br>'; ?>
                <?php if( (int)$test['test']['authenticated'] == 1) echo '<br><b>Authenticated: ' . $login . '</b>'; ?>
                <?php if( (int)$test['test']['connections'] !== 0) echo '<b>' . $test['test']['connections'] . ' Browser connections</b><br>';?>
                <?php if( $test['test']['script'] ) echo '<b>Scripted test</b><br>'; ?>
                </p>
                <?php
                  $statusText = GetTestStatusText($id, $test);
                ?>
                <div id="statusImg">
                    <?php
                        if( $test['test']['startTime'] )
                        {
                            echo "<div id=\"statusWaiting\" class=\"statusImg\"></div>\n";
                            echo "<div id=\"statusTesting\" class=\"statusImg enabled\"></div>\n";
                        }
                        else
                        {
                            echo "<div id=\"statusWaiting\" class=\"statusImg enabled\"></div>\n";
                            echo "<div id=\"statusTesting\" class=\"statusImg\"></div>\n";
                        }
                        echo "<div id=\"statusDone\" class=\"statusImg\"></div>\n";
                        echo "<div id=\"statusText\">$statusText</div>\n";
                    ?>
                </div>
                <p>Your web page performance test has been submitted and is now being processed.  This page will automatically update with the test status as 
                the test continues to run and when the test is complete the final results will be available here.</p>
                <p>You can either leave this page open in your browser until the test
                 is complete or come back later and check on the status of the test (the browser does not need to remain open for testing to continue).</p>
                <br><br>
                <?php include('./ads/test_progress_bottom.inc'); ?>
            </div>
            <?php include('footer.inc'); ?>
        </div>
        <script type="text/javascript">
            var testId = "<?php echo $id; ?>";
        </script>
    </body>
</html>
