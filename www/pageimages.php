<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include __DIR__ . '/common.inc';
require_once INCLUDES_PATH . '/object_detail.inc';
require_once INCLUDES_PATH . '/page_data.inc';
require_once INCLUDES_PATH . '/include/TestInfo.php';
require_once INCLUDES_PATH . '/include/TestPaths.php';
require_once INCLUDES_PATH . '/include/TestStepResult.php';
require_once INCLUDES_PATH . '/include/UrlGenerator.php';

global $testPath, $id, $run, $cached, $step; // defined in common.inc

$secure = false;
$testInfo = TestInfo::fromFiles($testPath);
$localPaths = new TestPaths($testPath, $run, $cached, $step);
$urlGenerator = UrlGenerator::create(false, "", $id, $run, $cached, $step);
$requests = getRequestsForStep($localPaths, $urlGenerator, $secure);
$page_keywords = array('Images','WebPageTest','Website Speed Test','Page Speed');
$page_description = "Website speed test images$testLabel.";
$userImages = true;
?>
<!DOCTYPE html>
<html lang="en-us">
  <head>
    <title>WebPageTest Page Images<?php echo $testLabel; ?></title>
    <script>document.documentElement.classList.add('has-js');</script>

    <?php include('head.inc'); ?>
  </head>
  <body id="page-images" class="result">
      <?php
        $tab = 'Test Result';
        $subtab = "Page Images";
        include 'header.inc';
        ?>

<div class="results_main_contain">
        <div class="results_main">




           <div class="results_and_command">





           <div class="results_header">
                <h2>Page Images</h2>
                <p>The following requests were images.</p>
            </div>

            </div>


            <div id="result" class="results_body">

      <div class="translucent">
        <?php
        $stepsInRun = $testInfo->stepsInRun($run);
        if ($stepsInRun > 1) {
            $stepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);
            echo "<h3>Step " . $stepResult->readableIdentifier($step) . "</h3>";
        }
        ?>
        <p>Images are currently being served from the given URL, and might not necessarily match what was loaded at the time of the test.</p>
        <div class="scrollableTable"><table class="images">
          <?php
            foreach ($requests as &$request) {
                if (
                    array_key_exists('contentType', $request) &&
                    !strncasecmp($request['contentType'], 'image/', 6)
                ) {
                    $index = $request['index'] + 1;
                    echo "<tr id=\"image$index\"><td><b>$index:</b></td><td>";
                    $reqUrl = "http://";
                    if ($request['is_secure']) {
                        $reqUrl = "https://";
                    }
                    $reqUrl .= $request['host'];
                    $reqUrl .= $request['url'];
                    echo "$reqUrl<br>";
                    if (array_key_exists('image_total', $request) && $request['image_total'] > 0) {
                        echo number_format(((float)$request['image_total'] / 1024.0), 1) . " KB {$request['contentType']}<br>";
                        if (array_key_exists('image_save', $request) && $request['image_save'] > 1000) {
                            $optimizedSize = number_format((float)(($request['image_total'] - $request['image_save']) / 1024.0), 1);
                            echo "Optimized size: $optimizedSize KB (<b>" . number_format(((float)$request['image_save'] / 1024.0), 1) . " KB smaller</b>)<br>";
                        }
                    } elseif (array_key_exists('objectSize', $request)) {
                        echo number_format(((float)$request['objectSize'] / 1024.0), 1) . " KB {$request['contentType']}<br>";
                    }
                    if (array_key_exists('jpeg_scan_count', $request) && $request['jpeg_scan_count'] > 0) {
                        if ($request['jpeg_scan_count'] == 1) {
                            echo "Baseline (Renders top-down)";
                        } else {
                            echo "Progressive (Renders blurry to sharp): {$request['jpeg_scan_count']} scans";
                        }
                    }
                    if (stristr($request['contentType'], 'svg') !== false) {
                        echo "<img width=100 height=100 src=\"$reqUrl\">";
                    } else {
                        echo "<img src=\"$reqUrl\">";
                    }
                    echo "</td></tr>\n";
                }
            }
            ?>
        </table></div>
      </div>
      </div>

      <?php include('footer.inc'); ?>
      </div>
      </div>
  </body>
</html>
