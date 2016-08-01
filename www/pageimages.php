<?php
include __DIR__ . '/common.inc';
require_once __DIR__ . '/object_detail.inc';
require_once __DIR__ . '/page_data.inc';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestPaths.php';
require_once __DIR__ . '/include/TestStepResult.php';
require_once __DIR__ . '/include/UrlGenerator.php';

global $testPath, $id, $run, $cached, $step; // defined in common.inc

$secure = false;
$haveLocations = false;
$testInfo = TestInfo::fromFiles($testPath);
$localPaths = new TestPaths($testPath, $run, $cached, $step);
$urlGenerator = UrlGenerator::create(false, "", $id, $run, $cached, $step);
$requests = getRequestsForStep($localPaths, $urlGenerator, $secure, $haveLocations, true);
$page_keywords = array('Images','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Website speed test images$testLabel.";
$userImages = true;
?>
<!DOCTYPE html>
<html>
  <head>
    <title>WebPagetest Page Images<?php echo $testLabel; ?></title>
    <?php $gaTemplate = 'Page Images'; include ('head.inc'); ?>
    <style type="text/css">
      .images td
      {
        vertical-align: top;
        padding-bottom: 1em;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <?php
      $tab = 'Test Result';
      $subtab = null;
      include 'header.inc';
      ?>
      <div class="translucent">
        <?php
        $stepsInRun = $testInfo->stepsInRun($run);
        if ($stepsInRun > 1) {
          $stepResult = TestStepResult::fromFiles($testInfo, $run, $cached, $step);
          echo "<h3>Step " . $stepResult->readableIdentifier($step) . "</h3>";
        }
        ?>
        <p>Images are what are currently being served from the given url and may not necessarily match what was loaded at the time of the test.</p>
        <table class="images">
          <?php
          foreach( $requests as &$request ) {
            if( array_key_exists('contentType', $request) &&
              !strncasecmp($request['contentType'], 'image/', 6)) {
              $index = $request['index'] + 1;
              echo "<tr><td><b>$index:</b></td><td>";
              $reqUrl = "http://";
              if( $request['is_secure'] )
                $reqUrl = "https://";
              $reqUrl .= $request['host'];
              $reqUrl .= $request['url'];
              echo "$reqUrl<br>";
              if (array_key_exists('image_total', $request) && $request['image_total'] > 0) {
                echo number_format(((float)$request['image_total'] / 1024.0), 1). " KB {$request['contentType']}<br>";
                if (array_key_exists('image_save', $request) && $request['image_save'] > 1000) {
                  $q85 = number_format((float)(($request['image_total'] - $request['image_save']) / 1024.0), 1);
                  echo "Quality 85 optimized size: $q85 KB (<b>" . number_format(((float)$request['image_save'] / 1024.0), 1). " KB smaller</b>)<br>";
                }
              } else if (array_key_exists('objectSize', $request)) {
                echo number_format(((float)$request['objectSize'] / 1024.0), 1). " KB {$request['contentType']}<br>";
              }
              if (array_key_exists('jpeg_scan_count', $request) && $request['jpeg_scan_count'] > 0) {
                if ($request['jpeg_scan_count'] == 1)
                  echo "Baseline (Renders top-down)";
                else
                  echo "Progressive (Renders blurry to sharp): {$request['jpeg_scan_count']} scans";
                $analyze_url = 'jpeginfo/jpeginfo.php?url=' . urlencode($reqUrl);
                echo " - <a href=\"$analyze_url\">Analyze JPEG</a><br>";
              }
              if (stristr($request['contentType'], 'svg') !== false)
                echo "<img width=100 height=100 src=\"$reqUrl\">";
              else
                echo "<img src=\"$reqUrl\">";
              echo "</td></tr>\n";
            }
          }
          ?>
        </table>
      </div>

      <?php include('footer.inc'); ?>
    </div>
  </body>
</html>
