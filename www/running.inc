<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title><?php echo $page_title; ?> - Running web page performance and optimization tests...</title>
        <noscript>
        <meta http-equiv="refresh" content="30" />
        </noscript>
        <?php

            $autoRefresh = true;
            $noanalytics = true;
            $page_keywords = array('WebPageTest','Website Speed Test','Page Speed');
            $page_description = "Running website performance test.";
	    
            include('head.inc');
	    require_once WWW_PATH . '/templates/layouts/google-tag-manager.inc';
        ?>
    </head>
    <body class="common">
            <?php
            require_once('testStatus.inc');
            $tab = 'Test Result';
            include 'header.inc';
            if (!isset($test)) {
                echo "<h3>Test Not Found</h3>\n";
                echo "<p>Sorry, the test you requested could not be found.</p>";
            } elseif (TestArchiveExpired($id)) {
                echo "<h3>Test Result Expired</h3>\n";
                $retain_months = GetSetting('archive_retention_months', null);
                if ($retain_months) {
                    $retain_months = htmlspecialchars($retain_months);
                    echo "<p>Sorry, the test you requested has expired. Test results are kept for $retain_months months.</p>";
                } else {
                    echo "<p>Sorry, the test you requested could not be found.</p>";
                }
            } else {
                ?>
            <h1>Testing...</h1>
            <div id="runningHeader" class="box">
                <?php
                $status = GetTestStatus($id, true);
                $cp_scheduler = GetSetting('cp_scheduler');
                $has_scheduler = isset($cp_scheduler) && strlen($cp_scheduler) > 0;
                if (!$has_scheduler && $status['statusCode'] < 400 && (!array_key_exists('startTime', $status) || !$status['startTime'])) {
                    ?>
                    <form class="cancel_form" action="/cancelTest.php" method="get">
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
                    if (GetSetting('traceroute_enabled') && $test['testinfo']['type'] === "traceroute") {
                        echo "Host/IP: <a class=\"urlLinkWrap\" rel=\"nofollow\" href=\"http://$url\" target=\"_blank\">$url</a><br>\n";
                    } else {
                        echo "URL: <a class=\"urlLinkWrap\" rel=\"nofollow\" href=\"$url\" target=\"_blank\">$url</a><br>\n";
                    }
                }
                    echo "From: {$test['test']['location']}<br>\n";
                    echo GetTestInfoHtml(false);
                ?>
                </p>

                <?php
                $statusText = $status['statusText'];
                $statusStep = "waiting";
                if (array_key_exists('statusCode', $status) && $status['statusCode'] == 100) {
                    $statusStep = "testing";
                }
                ?>
                <ul class="runningStatusIndicator">
                    <li id="waiting" <?php if ($statusStep == "waiting") {
                        ?>class="is-active"<?php
                                     } ?>>Waiting...</li>
                    <li id="testing" <?php if ($statusStep == "testing") {
                        ?>class="is-active"<?php
                                     } ?>>Testing...</li>
                    <li id="done" >Done</li>
                </ul>
                <?php
                echo '<h3 id="statusText">' . htmlspecialchars($statusText) . '</h3>';
                ?>

	        <div class="marketing-section testingBannerMessage"></div>
	        </div>
            
            <?php } ?>

            <?php include('footer.inc'); ?>
        </div>

        <script>
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
                              var showCancelButton = false;
                              if (lastStatusCode == 101) {
                                  document.getElementById('waiting').classList.add('is-active');
                                  document.getElementById('testing').classList.remove('is-active');
                                  showCancelButton = true;
                              } else if (lastStatusCode == 100) {
                                  document.getElementById('waiting').classList.remove('is-active');
                                  document.getElementById('testing').classList.add('is-active');
                              } else if (lastStatusCode >= 400) {
                                  interval = 0;
                              } else {
                                  reload = true;
                              }

                              if (!showCancelButton) {
                                $('.cancel_form').hide();
                              } else {
                                $('.cancel_form').show();
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

    $files = glob('./tips_data/*.html', GLOB_NOSORT);
    $tips = array();
    $active_tips = GetSetting("active_tips");
    if ($active_tips) {
        $active_tips = explode(" ", $active_tips);
    }
    foreach ($files as $file) {
        if (!$active_tips || in_array(basename($file), $active_tips)) {
            $tips[] = $file;
        }
    }
    $count = count($tips);
    if ($count > 0) {
        $pick = rand(0, $count - 1);
        $file = $tips[$pick];
        $tip = file_get_contents($file);
    }

    return $tip;
}
?>
