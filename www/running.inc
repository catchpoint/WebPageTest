<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Running web page performance and optimization test...</title>
        <noscript>
        <meta http-equiv="refresh" content="30" />
        </noscript>
        <?php 
            $autoRefresh = true;
            $noanalytics = true;
            $page_keywords = array('Webpagetest','Website Speed Test','Page Speed');
            $page_description = "Running website performance test.";
            include ('head.inc');
        ?>
    </head>
    <body>
        <div class="page">
            <?php
            require_once('testStatus.inc');
            $tab = 'Test Result';
            include 'header.inc';
            if( !isset($test) )
            {
                echo "<h3>Test Not Found</h3>\n";
                echo "<p>Sorry, the test you requested could not be found.</p>";
            }
            else
            {
            ?>
            <div id="runningHeader">
                <p>
                <?php
                    if ($settings['nolinks']) {
                        echo "Url: $url<br>\n";
                    } else {
                        echo "Url: <a rel=\"nofollow\" href=\"$url\">$url</a><br>\n";
                    }
                    echo "From: {$test['test']['location']}<br>\n";
                    echo GetTestInfoHtml(false);
                ?>
                </p>
                <h3>Testing...</h3>
                <?php
                $status = GetTestStatus($id, true);
                if ( !array_key_exists('startTime', $status) || !$status['startTime'] )
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
              $statusText = $status['statusText'];
            ?>
            <div id="statusImg">
                <?php
                    $img = "waiting";
                    if( array_key_exists('statusCode', $status) && $status['statusCode'] == 100 )
                        $img = "testing";
                    echo "<img id='statusImage' src=\"{$GLOBALS['cdnPath']}/images/status_$img.png\">";
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
            <?php } include('footer.inc'); ?>
        </div>
        <script type="text/javascript">
            var testId = "<?php echo $id; ?>";
            <?php
            $polling_interval_testing = 1000;
            $polling_interval = 15000;
            if (array_key_exists('testinfo', $test) &&
                array_key_exists('loc_type', $test['testinfo']) &&
                $test['testinfo']['loc_type'] == 'Appurify') {
              $polling_interval = 30000;
              $polling_interval_testing = 15000;
            }
            echo "var pollingInterval = $polling_interval;\n";
            echo "var pollingIntervalTesting = $polling_interval_testing;\n";
            ?>
            var waitingImage = '<?php echo "{$GLOBALS['cdnPath']}/images/status_waiting.png"; ?>';
            var testingImage = '<?php echo "{$GLOBALS['cdnPath']}/images/status_testing.png"; ?>';
            var lastStatusCode = 0;
            var lastStatusText = '';
            function UpdateStatus(){
                try {
                  var xhr = new XMLHttpRequest();
                  xhr.open('GET', '/testStatus.php?f=json&pos=1&test=' + testId, true);
                  xhr.onreadystatechange = function() {
                    if (xhr.readyState != 4)
                      return;
                    var reload = false;
                    var interval = pollingInterval;
                    if (xhr.status == 200) {
                        var response = JSON.parse(xhr.responseText);
                        if (response['statusCode'] != undefined &&
                            response['statusCode'] != lastStatusCode) {
                            lastStatusCode = response['statusCode'];
                            if (lastStatusCode == 101)
                                $("#statusImage").attr("src",waitingImage);
                            else if (lastStatusCode == 100)
                                $("#statusImage").attr("src",testingImage);
                            else
                                reload = true;
                        }
                        if (lastStatusCode == 100) {
                            interval = pollingIntervalTesting;
                            if (response['data'] != undefined &&
                                !response.data['remote'] && 
                                response.data['testsCompleted'] != undefined &&
                                response.data['testsCompleted'] >= 1)
                                reload = true;
                        }
                        if (response['statusText'] != undefined &&
                            response['statusText'] != lastStatusText) {
                            lastStatusText = response['statusText'];
                            $('#statusText').text(lastStatusText);
                        }
                    }
                    if (reload)
                        window.location.reload(true);
                    else
                        setTimeout('UpdateStatus()', interval);
                  };
                  xhr.onerror = function() {
                    setTimeout('UpdateStatus()', pollingInterval);
                  };
                  xhr.send();
                } catch (err) {
                    setTimeout('UpdateStatus()', pollingInterval);
                }
            }
            setTimeout('UpdateStatus()', pollingInterval);
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
