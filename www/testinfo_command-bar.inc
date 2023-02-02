<?php

use WebPageTest\Util;

?>

<div class="test_meta_commands">

                <p class="results_nav_hed">Tools:</p>


                <details>
                <summary>Export</summary>
                  <ul class="testinfo_artifacts-list">
                  <?php

                      $fvMedian = $testResults->getMedianRunNumber($median_metric, false);
                      $rvMedian = $testResults->getMedianRunNumber($median_metric, true);

                      echo "<li><a href='/jsonResult.php?test=$id&highlight=1'>View Test JSON</a></li>";
                      echo "<li><a href='/jsonResult.php?test=$id&pretty=1'>View Test JSON (unformatted)</a></li>";
                    if (is_file("$testPath/test.log")) {
                        echo "<li><a href=\"/viewlog.php?test=$id\">View Test Log</a></li>";
                    }
                    if (is_file("$testPath/lighthouse.log.gz")) {
                        echo "<li><a href=\"/viewlog.php?test=$id&lighthouse=1\">View Lighthouse Log</a></li>";
                    }
                    if (is_file("$testPath/lighthouse.html.gz")) {
                        echo "<li><a href=\"/lighthouse.php?test=$id&f=lh-viewer\">View Standard Lighthouse View</a></li>";
                        echo "<li><a href=\"/lighthouse.php?test=$id&f=json\">View Lighthouse JSON</a></li>";
                    }

                      $publish = GetSetting('publishTo');
                    if ($publish && GetSetting('host') != 'www.webpagetest.org') {
                        echo "<li><a href=\"/publish.php?test=$id\">Publish to $publish</a></li>";
                    }
                      echo "<li data-artifact-json=\"download\"><a href='/jsonResult.php?test=$id&pretty=1' download>Download JSON</a></li>";
                      echo '<li><a href="/export.php?bodies=1&pretty=1&test=' . $id . '">Download HAR</a></li>';
                    if (is_file("$testPath/test.log")) {
                        echo "<li><a href=\"/viewlog.php?test=$id\" download>Download Test Log</a></li>";
                    }
                    if (is_file("$testPath/lighthouse.log.gz")) {
                        echo "<li><a href=\"/viewlog.php?test=$id&lighthouse=1\" download>Download Lighthouse Log</a></li>";
                    }
                      echo "<li><a href=\"/csv.php?test=$id\">Download Page CSV</a></li>";
                      echo "<li><a href=\"/csv.php?test=$id&requests=1\">Download Request CSV</a></li>";
                    ?>
                  </ul>
                  </details>

                  <?php
                    if (
                        !Util::getSetting('headless') && gz_is_file("$testPath/testinfo.json")
                        && !array_key_exists('published', $test['testinfo'])
                        && ($isOwner || !$test['testinfo']['sensitive'])
                        && !isset($tests)
                        && (!isset($test['testinfo']['type']) || !strlen($test['testinfo']['type']))
                    ) {
                        // load the secret key (if there is one)
                        $secret = GetServerSecret();
                        if (!isset($secret)) {
                            $secret = '';
                        }

                        // if TTFB is extra slow (all runs had a ttfb greater than thresold below), then perhaps a site/cdn is purposefully slowing responsse times for bots.
                        // Show a message that offers an option to re-run the tests with a default UA
                        $slowttfbThreshold = 3000;
                        $firstByteTimes = $testResults->getMetricFromRuns("TTFB", false, false);
                        $showTTFBWarn = count($firstByteTimes) > 0 && min($firstByteTimes) > $slowttfbThreshold;
                        if ($showTTFBWarn) {
                            echo '<details class="test_meta_rerun"><summary>Re-Run Test</summary>';
                        }
                        echo "<form name='urlEntry' class=\"test_meta_rerun_form\" id='urlEntry' action='/runtest.php?test=$id' method='POST' enctype='multipart/form-data'>";
                        echo "\n<input type=\"hidden\" name=\"resubmit\" value=\"$id\">\n";
                        echo '<input type="hidden" name="vo" value="' . htmlspecialchars($owner) . "\">\n";
                        if (strlen($secret)) {
                            $hashStr = $secret;
                            $hashStr .= $_SERVER['HTTP_USER_AGENT'];
                            $hashStr .= $owner;

                            $now = gmdate('c');
                            echo "<input type=\"hidden\" name=\"vd\" value=\"$now\">\n";
                            $hashStr .= $now;

                            $hmac = sha1($hashStr);
                            echo "<input type=\"hidden\" name=\"vh\" value=\"$hmac\">\n";
                        }


                        if ($showTTFBWarn) {
                            echo <<<EOT
                            <div class="highttfb_warn">
                              <p><strong>High TTFB</strong>: Some networks intentionally slow performance for bots like the WebPageTest agent. If you suspect this is happening, you can try re-running your test with the browser's original User Agent string to see if it helps.</p>
                              <p><label><input type="checkbox" name="keepua"> Preserve original User Agent string in re-run</label></p>
                            </div>
                          EOT;
                        }


                         echo '<input type="submit" value="Re-Run Test">';
                        echo "\n</form>\n";
                        if ($showTTFBWarn) {
                            echo "</details>";
                        }
                    }
                    ?>
            </div>
            <script>
              var cmddeets = document.querySelectorAll(".test_meta_commands details");
              cmddeets.forEach(thisdeet => {
                thisdeet.addEventListener("toggle",function(e){
                  let opened = e.target;
                  if( opened.open ){
                    cmddeets.forEach(deet => {
                      if(deet !== opened ){
                        deet.open = false;
                      }
                    });
                  }
                });
              });
            </script>
