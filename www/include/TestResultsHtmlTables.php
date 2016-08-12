<?php

class TestResultsHtmlTables {

  /** @var TestInfo */
  private $testInfo;
  /** @var TestResults */
  private $testResults;
  private $testComplete;
  private $breakdown;
  private $hasVideo;

  private $waterfallDisplayed;
  private $pageData;

  public function __construct($testInfo, $testResults, $testComplete) {
    $this->testInfo = $testInfo;
    $this->testResults = $testResults;
    $this->testComplete = $testComplete;
    $this->breakdown = null;
    $this->hasVideo = $this->testInfo->hasVideo();
  }

  public function create(&$pageData, $median_metric, $tcpDumpView) {
    $runs = $this->testInfo->getRuns();
    $this->waterfallDisplayed = false;
    $this->pageData = $pageData;
    for ($run = 1; $run <= $runs; $run++) {
      $runResults = $this->testResults->getRunResult($run, false);
      if ($runs > 1) {
        echo '<h4><a name="run' . $run . '">Run ' . $run . ':</a></h4>';
      }
      if (!$runResults) {
        $error_str = $this->testComplete ? 'Test Error: Data is missing.' : 'Waiting for test result...';
        echo '<p>' . htmlspecialchars($error_str) . '</p>';
      } else {
        $this->_createTableForRun($run, $median_metric, $tcpDumpView);
      }
    }
  }

  private function _createTableForRun($run, $median_metric, $tcpDumpView) {
    $pageData = $this->pageData;
    $wpt_host = trim($_SERVER['HTTP_HOST']);
    $video = $this->testInfo->hasVideo();
    $testPath = $this->testInfo->getRootDirectory();
    $id = $this->testInfo->getId();
    $fvMedian = $this->testResults->getMedianRunNumber($median_metric, false);
    $infoArray = $this->testInfo->getInfoArray();
    ?>
    <table id="table<?php echo $run; ?>" class="pretty result" align="center" border="1" cellpadding="20"
           cellspacing="0">
      <?php
      $table_columns = $this->_createTableHead();
      echo '<tr>';
        if (array_key_exists($run, $pageData) && array_key_exists(0, $pageData[$run]) && count($pageData[$run][0])) {
          $onloadWaterfall = '';
          $onloadScreenShot = '';
          if (!$this->waterfallDisplayed) {
            $onloadWaterfall = " onload=\"markUserTime('aft.First Waterfall')\"";
            $onloadScreenShot = " onload=\"markUserTime('aft.First Screen Shot')\"";
          }
          $this->waterfallDisplayed = true;
          echo '<td align="left" valign="middle">First View';
          if (isset($test['testinfo']['errors'][$run][0]) && strlen($test['testinfo']['errors'][$run][0]))
            echo '<br>(Test Error: ' . htmlspecialchars($test['testinfo']['errors'][$run][0]) . ')';
          if (isset($pageData[$run][0]['result']) && $pageData[$run][0]['result'] !== 0 && $pageData[$run][0]['result'] !== 99999)
            echo '<br>(Error: ' . LookupError($pageData[$run][0]['result']) . ')';
          else if (isset($pageData[$run][0]['loadTime']))
            echo '<br>(' . number_format($pageData[$run][0]['loadTime'] / 1000.0, 3) . 's)';
          if (is_file("$testPath/{$run}_dynaTrace.dtas")) {
            echo "<br><br><div><a href=\"/$testPath/{$run}_dynaTrace.dtas\" title=\"Download dynaTrace Session\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_session_v3.png\" alt=\"Download dynaTrace Session\"></a></div><br>";
            echo "<a href=\"http://ajax.dynatrace.com/pages/\" target=\"_blank\" title=\"Get dynaTrace AJAX Edition\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_ajax.png\" alt=\"Get dynaTrace Ajax Edition\"></a>";
          }
          if (gz_is_file("$testPath/{$run}.cap")) {
            $tcpdump_url = "/getgzip.php?test=$id&file=$run.cap";
            if (FRIENDLY_URLS)
              $tcpdump_url = "/result/$id/{$run}.cap";
            echo "<br><br><a href=\"$tcpdump_url\" title=\"Download tcpdump session capture\">tcpdump</a>";
            if ($tcpDumpView) {
              $view_url = $tcpDumpView . urlencode("http://$wpt_host$tcpdump_url");
              echo " - (<a href=\"$view_url\" title=\"View tcpdump session capture\">view</a>)";
            }
            if (gz_is_file("$testPath/{$run}_keylog.log")) {
              $keylog = "/getgzip.php?test=$id&file={$run}_keylog.log";
              echo "<br>(<a href=\"$keylog\" title=\"TLS key log file\">TLS Key Log</a>)";
            }
          }
          if ($infoArray['timeline']) {
            if (gz_is_file("$testPath/{$run}_trace.json")) {
              echo "<br><br><a href=\"/getTimeline.php?test=$id&run=$run&cached=0\" title=\"Download Chrome Dev Tools Timeline\">Timeline</a>";
              echo " (<a href=\"/chrome/timeline.php?test=$id&run=$run\" title=\"View Chrome Dev Tools Timeline\">view</a>)";
              echo "<br><a href=\"/breakdownTimeline.php?test=$id&run=$run&cached=0\" title=\"View browser main thread activity by event type\">Processing Breakdown</a>";
            } elseif (gz_is_file("$testPath/{$run}_timeline.json") || gz_is_file("$testPath/{$run}_devtools.json")) {
              echo "<br><br><a href=\"/getTimeline.php?test=$id&run=$run&cached=0\" title=\"Download Chrome Dev Tools Timeline\">Timeline</a>";
              echo " (<a href=\"/chrome/timeline.php?test=$id&run=$run\" title=\"View Chrome Dev Tools Timeline\">view</a>)";
              echo "<br><a href=\"/breakdownTimeline.php?test=$id&run=$run&cached=0\" title=\"View browser main thread activity by event type\">Processing Breakdown</a>";
            }
          }
          if ($infoArray['trace'] && gz_is_file("$testPath/{$run}_trace.json")) {
            echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_trace.json\" title=\"Download Chrome Trace\">Trace</a>";
            echo " (<a href=\"/chrome/trace.php?test=$id&run=$run&cached=0\" title=\"View Chrome Trace\">view</a>)";
          }
          if (gz_is_file("$testPath/{$run}_netlog.txt")) {
            echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_netlog.txt\" title=\"Download Network Log\">Net Log</a>";
          }
          echo "</td>\n";
          echo '<td align="center" valign="middle">';
          $testUrl = "/details.php?test=$id&run=$run";
          if ($run == $fvMedian && array_key_exists('end', $_REQUEST))
            $testUrl .= "&end={$_REQUEST['end']}";
          elseif (FRIENDLY_URLS)
            $testUrl = "/result/$id/$run/details/";
          echo "<a href=\"$testUrl\">";
          echo "<img class=\"progress\"$onloadWaterfall width=250 src=\"/thumbnail.php?test=$id&run=$run&file={$run}_waterfall.png\"></a></td>\n";
          if (!isset($test['testinfo']) || !$test['testinfo']['noimages']) {
            if (FRIENDLY_URLS)
              echo "<td align=\"center\" valign=\"middle\"><a href=\"/result/$id/$run/screen_shot/\"><img class=\"progress\"$onloadScreenShot width=250 src=\"/result/$id/{$run}_screen_thumb.jpg\"></a></td>";
            else
              echo "<td align=\"center\" valign=\"middle\"><a href=\"/screen_shot.php?test=$id&run=$run\"><img class=\"progress\"$onloadScreenShot width=250 src=\"/thumbnail.php?test=$id&run=$run&file={$run}_screen.jpg\"></a></td>";
          }
          if ($video) {
            echo '<td align="center" valign="middle">';
            if (is_dir("$testPath/video_$run")) {
              $end = '';
              $endId = '';
              if ($run == $fvMedian && array_key_exists('end', $_REQUEST)) {
                $end = "-e:{$_REQUEST['end']}";
                $endId = "-e{$_REQUEST['end']}";
              }
              echo "<a href=\"/video/compare.php?tests=$id-r:$run-c:0$end\">Filmstrip View</a><br>-<br>";
              echo "<a href=\"/video/create.php?tests=$id-r:$run-c:0$end&id={$id}.{$run}.0$endId\">Watch Video</a>";
              if (is_file("$testPath/{$run}_video.mp4"))
                echo "<br>-<br><a href=\"/$testPath/{$run}_video.mp4\">Raw Device Video</a>";
            } else {
              echo "not available";
            }
            echo '</td>';
          }
        } else {
          echo "<td colspan=\"$table_columns\" align=\"left\" valign=\"middle\">First View: Test Data Missing</td>";
        }
        echo '</tr>';
        if (!$this->testInfo->isFirstViewOnly() || isset($pageData[$run][1])) {
          echo '<tr>';
          if (isset($pageData[$run][1])) {
            if (array_key_exists($run, $pageData) && array_key_exists(1, $pageData[$run]) && count($pageData[$run][1])) {
              echo '<td align="left" class="even" valign="middle">Repeat View';
              if (isset($test['testinfo']['errors'][$run][1]) && strlen($test['testinfo']['errors'][$run][1]))
                echo '<br>(Test Error: ' . htmlspecialchars($test['testinfo']['errors'][$run][0]) . ')';
              if (isset($pageData[$run][1]['result']) && $pageData[$run][1]['result'] !== 0 && $pageData[$run][1]['result'] !== 99999)
                echo '<br>(Error: ' . LookupError($pageData[$run][1]['result']) . ')';
              else if (isset($pageData[$run][1]['loadTime']))
                echo '<br>(' . number_format($pageData[$run][1]['loadTime'] / 1000.0, 3) . 's)';
              if (is_file("$testPath/{$run}_Cached_dynaTrace.dtas")) {
                echo "<br><br><div><a href=\"/$testPath/{$run}_Cached_dynaTrace.dtas\" title=\"Download dynaTrace Session\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_session_v3.png\" alt=\"Download dynaTrace Session\"></a></div><br>";
                echo "<a href=\"http://ajax.dynatrace.com/pages/\" target=\"_blank\" title=\"Get dynaTrace AJAX Edition\"><img src=\"{$GLOBALS['cdnPath']}/images/dynatrace_ajax.png\" alt=\"Get dynaTrace Ajax Edition\"></a>";
              }
              if (gz_is_file("$testPath/{$run}_Cached.cap")) {
                $tcpdump_url = "/getgzip.php?test=$id&file={$run}_Cached.cap";
                if (FRIENDLY_URLS)
                  $tcpdump_url = "/result/$id/{$run}_Cached.cap";
                echo "<br><br><a href=\"$tcpdump_url\" title=\"Download tcpdump session capture\">tcpdump</a>";
                if ($tcpDumpView) {
                  $view_url = $tcpDumpView . urlencode("http://$wpt_host$tcpdump_url");
                  echo " - (<a href=\"$view_url\" title=\"View tcpdump session capture\">view</a>)";
                }
                if (gz_is_file("$testPath/{$run}_Cached_keylog.log")) {
                  $keylog = "/getgzip.php?test=$id&file={$run}_Cached_keylog.log";
                  echo "<br>(<a href=\"$keylog\" title=\"TLS key log file\">TLS Key Log</a>)";
                }
              }
              if ($infoArray['timeline']) {
                if (gz_is_file("$testPath/{$run}_Cached_trace.json")) {
                  echo "<br><br><a href=\"/getTimeline.php?test=$id&run=$run&cached=1\" title=\"Download Chrome Dev Tools Timeline\">Timeline</a>";
                  echo " (<a href=\"/chrome/timeline.php?test=$id&run=$run&cached=1\" title=\"View Chrome Dev Tools Timeline\">view</a>)";
                } elseif (gz_is_file("$testPath/{$run}_Cached_timeline.json") || gz_is_file("$testPath/{$run}_Cached_devtools.json")) {
                  echo "<br><br><a href=\"/getTimeline.php?test=$id&run={$run}&cached=1\" title=\"Download Chrome Dev Tools Timeline\">Timeline</a>";
                  echo " (<a href=\"/chrome/timeline.php?test=$id&run=$run&cached=1\" title=\"View Chrome Dev Tools Timeline\">view</a>)";
                  if (array_key_exists('testinfo', $test) && array_key_exists('timeline', $test['testinfo']) && $test['testinfo']['timeline'])
                    echo "<br><a href=\"/breakdownTimeline.php?test=$id&run=$run&cached=1\" title=\"View browser main thread activity by event type\">Processing Breakdown</a>";
                }
              }
              if ($infoArray['trace'] && gz_is_file("$testPath/{$run}_Cached_trace.json")) {
                echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_Cached_trace.json\" title=\"Download Chrome Trace\">Trace</a>";
                echo " (<a href=\"/chrome/trace.php?test=$id&run=$run&cached=1\" title=\"View Chrome Trace\">view</a>)";
              }
              if (gz_is_file("$testPath/{$run}_Cached_netlog.txt")) {
                echo "<br><br><a href=\"/getgzip.php?test=$id&file={$run}_Cached_netlog.txt\" title=\"Download Network Log\">Net Log</a>";
              }
              echo '</td>';
              if (FRIENDLY_URLS)
                echo "<td align=\"center\" class=\"even\" valign=\"middle\"><a href=\"/result/$id/$run/details/cached/\"><img class=\"progress\" width=250 src=\"/result/$id/{$run}_Cached_waterfall_thumb.png\"></a></td>";
              else
                echo "<td align=\"center\" class=\"even\" valign=\"middle\"><a href=\"/details.php?test=$id&run=$run&cached=1\"><img class=\"progress\" width=250 src=\"/thumbnail.php?test=$id&run=$run&cached=1&file={$run}_Cached_waterfall.png\"></a></td>";

              if (!isset($test['testinfo']) || !$test['testinfo']['noimages']) {
                if (FRIENDLY_URLS)
                  echo "<td align=\"center\" class=\"even\" valign=\"middle\"><a href=\"/result/$id/$run/screen_shot/cached/\"><img class=\"progress\" width=250 src=\"/result/$id/{$run}_Cached_screen_thumb.jpg\"></a></td>";
                else
                  echo "<td align=\"center\" valign=\"middle\"><a href=\"/screen_shot.php?test=$id&run=$run&cached=1\"><img class=\"progress\" width=250 src=\"/thumbnail.php?test=$id&run=$run&cached=1&file={$run}_Cached_screen.jpg\"></a></td>";
              }
              if ($video) {
                echo '<td align="center" valign="middle">';
                if (is_dir("$testPath/video_{$run}_cached")) {
                  echo "<a href=\"/video/compare.php?tests=$id-r:$run-c:1\">Filmstrip View</a><br>-<br>";
                  echo "<a href=\"/video/create.php?tests=$id-r:$run-c:1&id={$id}.{$run}.1\">Watch Video</a>";
                } else
                  echo "not available";
                echo '</td>';
              }
            }
          } else if (array_key_exists('testinfo', $test) &&
            array_key_exists('errors', $test['testinfo']) &&
            array_key_exists($run, $test['testinfo']['errors']) &&
            array_key_exists(0, $test['testinfo']['errors'][$run]) &&
            strlen($test['testinfo']['errors'][$run][1])
          ) {
            $error_str = htmlspecialchars('Test Error: ' . $test['testinfo']['errors'][$run][1]);
            echo "<td colspan=\"$table_columns\" align=\"left\" valign=\"middle\">Repeat View: $error_str</td>";
          } else {
            echo "<td colspan=\"$table_columns\" align=\"left\" valign=\"middle\">Repeat View: Test Data Missing</td>";
          }
          echo '</tr>';
        }
        if ($this->testComplete && $run == $fvMedian) {
        $b = getBreakdown($id, $testPath, $run, 0, $requests);
        if (is_array($b)) {
          $this->breakdown[] = array('run' => $run, 'data' => $b);
        }
        ?>
      <tr>
        <td align="left" valign="middle">
          <?php if (FRIENDLY_URLS) {
            echo "<a href=\"/result/$id/$run/breakdown/\">Content Breakdown</a>";
          } else {
            echo "<a href=\"/breakdown.php?id=$id&run=$run&cached=0\">Content Breakdown</a>";
          }
          ?>
        </td>
        <?php
        $span = 2;
        if ($pageData[$run][0]['optimization_checked'])
          $span++;
        if (!isset($test['testinfo']) || !$test['testinfo']['noimages'])
          $span++;
        if ($video)
          $span++;
        echo "<td align=\"left\" valign=\"middle\" colspan=\"$span\">";
        $extension = 'php';
        if (FRIENDLY_URLS)
          $extension = 'png';
        echo "<table><tr><td style=\"border:none;\"><div id=\"requests_$run\"></div></td>";
        echo "<td style=\"border:none;\"><div id=\"bytes_$run\"></div></td></tr></table>";
        ?>
        </td>
      </tr>
      <?php } // breakdown ?>

    </table>
    <br>
    <?php

  }

  public function getBreakdown() {
    return $this->breakdown;
  }

  private function _createTableHead() {
    echo "<tr>\n";
    echo "<th align=\"center\" class=\"empty\" valign=\"middle\"></th>\n";
    echo "<th align=\"center\" valign=\"middle\">Waterfall</th>\n";
    $table_columns = 2;
    $infoArray = $this->testInfo->getInfoArray();
    if (empty($infoArray['noimages'])) {
      echo '<th align="center" valign="middle">Screen Shot</th>';
      $table_columns++;
    }
    if ($this->hasVideo) {
      echo '<th align="center" valign="middle">Video</th>';
      $table_columns++;
    }
    echo '</tr>';
    return $table_columns;
}

}