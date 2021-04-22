<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest - Running web page performance and optimization tests...</title>
        <noscript>
        <meta http-equiv="refresh" content="30" />
        </noscript>
        <?php
            $autoRefresh = true;
            $noanalytics = true;
            $page_keywords = array('WebPageTest','Website Speed Test','Page Speed');
            $page_description = "Running website performance test.";
            include ('head.inc');
        ?>
    </head>
    <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
            <?php
            require_once('testStatus.inc');
            $tab = 'Test Result';
            include 'header.inc';
            if( !isset($test) )
            {
                if (TestArchiveExpired($id)) {
                    echo "<h3>Test Result Expired</h3>\n";
                    $retain_months = GetSetting('archive_retention_months', null);
                    if ($retain_months) {
                        $retain_months = htmlspecialchars($retain_months);
                        echo "<p>Sorry, the test you requested has expired. Test results are kept for $retain_months months.</p>";
                    } else {
                        echo "<p>Sorry, the test you requested could not be found.</p>";
                    }
                } else {
                    echo "<h3>Test Not Found</h3>\n";
                    echo "<p>Sorry, the test you requested could not be found.</p>";
                }
            }
            else
            {
            ?>
            <h1>Testing...</h1>
            <div id="runningHeader" class="box">
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
                <p class="runningDetails">
                <?php
                    if (GetSetting('nolinks')) {
                        echo "URL: $url<br>\n";
                    } else {
                        echo "URL: <a rel=\"nofollow\" href=\"$url\">$url</a><br>\n";
                    }
                    echo "From: {$test['test']['location']}<br>\n";
                    echo GetTestInfoHtml(false);
                ?>
                </p>
                
                
                <?php
                $statusText = $status['statusText'];
                $statusStep = "waiting";
                if( array_key_exists('statusCode', $status) && $status['statusCode'] == 100 )
                    $statusStep = "testing"
                ?>
                <ul class="runningStatusIndicator">
                    <li id="waiting" <?php if ($statusStep == "waiting") { ?>class="is-active"<?php } ?>>Waiting...</li>
                    <li id="testing" <?php if ($statusStep == "testing") { ?>class="is-active"<?php } ?>>Testing...</li>
                    <li id="done" >Done</li>
                </ul>
                <?php
                echo '<h3 id="statusText" class="runningStatusText">' . htmlspecialchars($statusText) . '</h3>';
                ?>
                            
            <p>Your webpage-performance test has been submitted and is now being processed.  This page will automatically update with the test status as
            the test continues to run.  When the test is complete the final results will be available here.</p>
            <p>You can either leave this page open in your browser until the test
             is complete, or come back later and check on the status of the test (the browser does not need to remain open for testing to continue).</p>
            </div>
            
            
            <?php } ?>
            <?php
            $tip = GetTip();
            if( strlen($tip) )
            {
                echo '<div class="tip box"><div class="tipHead"><h2>Did you know?</h2><span class="tip_note">(all links open in a new window/tab)</span></div>';
                echo $tip;
                echo "</div>\n";
            }
            ?>
            <?php include('footer.inc'); ?>
        </div>
        
        <script type="text/javascript">
            var testId = "<?php echo $id; ?>";
            var lastStatusCode = 0;
            var lastStatusText = '';
            // polyfill performance.now
            if ("performance" in window == false) {
                window.performance = {};
            }
            Date.now = (Date.now || function () {  // thanks IE8
              return new Date().getTime();
            });
            if ("now" in window.performance == false){
              var nowOffset = Date.now();
              if (performance.timing && performance.timing.navigationStart){
                nowOffset = performance.timing.navigationStart
              }
              window.performance.now = function now(){
                return Date.now() - nowOffset;
              }
            }
            var lastUpdate = window.performance.now();
            function UpdateStatus(){
                var now = window.performance.now();
                var elapsed = now - lastUpdate;
                lastUpdate = now;
                if (elapsed < 0 || elapsed > 900) {
                  try {
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', '/testStatus.php?f=json&pos=1&test=' + testId, true);
                    xhr.onreadystatechange = function() {
                      if (xhr.readyState != 4)
                        return;
                      var reload = false;
                      var interval = 15000;
                      if (xhr.status == 200) {
                          var response = JSON.parse(xhr.responseText);
                          if (response['statusCode'] == 100) {
                              interval = 1000;
                          } else if (response['statusCode'] >= 400) {
                              interval = 0;
                              reload = false;
                          }
                          if (response['statusCode'] != undefined &&
                              response['statusCode'] != lastStatusCode) {
                              lastStatusCode = response['statusCode'];
                              if (lastStatusCode == 101) {
                                  document.getElementById('waiting').classList.add('is-active');
                                  document.getElementById('testing').classList.remove('is-active');
                              } else if (lastStatusCode == 100) {
                                  document.getElementById('waiting').classList.remove('is-active');
                                  document.getElementById('testing').classList.add('is-active');
                              } else if (lastStatusCode >= 400) {
                                  interval = 0;
                              } else {
                                  reload = true;
                              }
                          }
                          if (response['statusText'] != undefined &&
                              response['statusText'] != lastStatusText) {
                              lastStatusText = response['statusText'];
                              $('#statusText').text(lastStatusText);
                          }
                      }
                      if (reload) {
                          window.location.reload(true);
                      } else if(interval > 0) {
                          setTimeout('UpdateStatus()', interval);
                      }
                    };
                    xhr.onerror = function() {
                      setTimeout('UpdateStatus()', 5000);
                    };
                    xhr.send();
                  } catch (err) {
                      setTimeout('UpdateStatus()', 5000);
                  }
                } else {
                  setTimeout('UpdateStatus()', 5000);
                }
            }
            setTimeout('UpdateStatus()', 1000);
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

    $files = glob('./tips_data/*.html',GLOB_NOSORT);
    $tips = array();
    $active_tips = GetSetting("active_tips");
    if ($active_tips) {
        $active_tips = explode(" ", $active_tips);
    }
    foreach( $files as $file )
    {
        if (!$active_tips || in_array(basename($file), $active_tips)) {
            $tips[] = $file;
        }
    }
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
