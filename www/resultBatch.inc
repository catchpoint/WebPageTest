<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once('testStatus.inc');
require_once('util.inc');
require_once('./video/visualProgress.inc.php');
//error_reporting(E_ALL);

set_time_limit(3600);
if( !defined('BARE_UI') )
    define('BARE_UI', true);
$csv = false;
$json = false;
if (array_key_exists('f', $_REQUEST)) {
  if( $_REQUEST['f'] == 'csv' )
  {
      //define('RESTORE_DATA_ONLY', true);
      $csv = true;
      $json_response = array();
  } elseif($_REQUEST['f'] == 'json') {
      $json_response = array();
      $json = true;
  }
}

$tests = null;
if( gz_is_file("$testPath/bulk.json") ) {
  $tests = json_decode(gz_file_get_contents("$testPath/bulk.json"), true);
} elseif( gz_is_file("$testPath/tests.json") ) {
  $legacyData = json_decode(gz_file_get_contents("$testPath/tests.json"), true);
  $tests = array();
  $tests['variations'] = array();
  $tests['urls'] = array();
  foreach( $legacyData as &$legacyTest )
    $tests['urls'][] = array('u' => $legacyTest['url'], 'id' => $legacyTest['id']);
}

// grab the location from the first test
$location = $test['test']['location'];
if( count($tests) && count($tests['urls']) ) {
  $location_test_path = './' . GetTestPath($tests['urls'][0]['id']);
  $location_test_ini = parse_ini_file("$location_test_path/testinfo.ini",true);
  if( array_key_exists('test', $location_test_ini) && array_key_exists('location', $location_test_ini['test']) )
    $location = $location_test_ini['test']['location'];
}

$stats = array();
$stats['fv'] = array();
$stats['rv'] = array();
$fvonly = false;
if( $test['test']['fvonly'] )
    $fvonly = true;
$videoCaptured = false;
if (array_key_exists('video', $test['test']) && $test['test']['video'])
    $videoCaptured = true;
$showExperimental = false;
if( $videoCaptured && (!$supportsAuth || $admin) )
    $showExperimental = true;


$testIds = array();
foreach( $tests['urls'] as &$testData ) {
  $testIds[] = $testData['id'];
  if (array_key_exists('v', $test) && is_array($test['v']))
    foreach( $test['v'] as $variationId )
      $testIds[] = $variationId;
}

// run a quick check to see if the tests are complete
$dirty = false;
$complete = CheckTests($tests, $dirty);

// rewrite the bulk file if it changed
if( $dirty )
{
    gz_file_put_contents("$testPath/bulk.json", json_encode($tests));
    $dirty = false;
}

$page_keywords = array('Bulk','Result','WebPageTest','Website Speed Test','Page Speed');
$page_description = "Bulk website performance test result$testLabel.";

if($json)
{
  if (isset($test['test']['id']))
    $json_response['id'] = $test['test']['id'];
  if (isset($test['testinfo']['created']))
    $json_response['created'] = $test['testinfo']['created'];
  if (isset($test['testinfo']['label']))
    $json_response['label'] = $test['testinfo']['label'];
  $json_response['tests'] = $testIds;
  json_response($json_response);
}
else
{
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest Comparison Test Result<?php echo $testLabel; ?></title>
        <?php
        if( !$complete )
        {
            $autoRefresh = true;
            ?>
            <noscript>
            <meta http-equiv="refresh" content="5" />
            </noscript>
            <?php
        }
        $gaTemplate = 'Bulk Result';
        include ('head.inc');
        ?>
        <style type="text/css">
            .player
            {
                margin-left: auto;
                margin-right: auto;
            }
            #pimg {
                z-index: 999999;
                display: none;
                position: absolute;
            }
            #filmstrip {
                width: 100%;
                height: 380px;
            }
        </style>
        </style>
    </head>
    <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
            <?php
            $tab = 'Test Result';
            include 'header.inc';
            ?>
            <div id="result">
                <div id="download">
                    <div id="testinfo">
                        <?php
                            if( $test['test']['batch'] )
                            {
                                echo "Tested From: $location<br>";
                            }
                            else if ( $test['test']['batch_locations'] )
                            {
                                echo 'Tested Url: ' . $test['testinfo']['url'] . '<br>';
                            }
                            echo GetTestInfoHtml();
                        ?>
                    </div>
                </div>
                <div class="cleared"></div>
                <?php
                if ($complete)
                {
                    if (strlen($test['testinfo']['label']))
                    {
                        $label = $test['testinfo']['label'];
                        echo "<h2>$label<br><span class=\"small\">(You can bookmark this page to come back or share the results with others)</span></h2>";
                    }
                }
                else
                {
                    echo '<h2>Please wait while the testing is performed<br><span class="small">This page will automatically update until the test is complete</span></h2>';
                }

                if( count($tests['variations']) )
                    DisplayTestsWithVariations($tests);
                else
                    DisplayTests($tests);

                // rewrite the bulk file if it changed
                if( $dirty )
                {
                    gz_file_put_contents("$testPath/bulk.json", json_encode($tests));
                    $dirty = false;
                }

                if ($complete)
                {
                    if( count($stats['fv']) )
                    {
                        $total = 0;
                        $count = count($stats['fv']);
                        foreach($stats['fv'] as $val)
                            $total += $val;
                        $avg = $total / $count;
                        echo '<br>Average First View Load Time: ' . number_format($avg / 1000.0, 3) .'s';
                        if( count($stats['rv']) )
                        {
                            $total = 0;
                            $count = count($stats['rv']);
                            foreach($stats['rv'] as $val)
                                $total += $val;
                            $avg = $total / $count;
                            echo '<br>Average Repeat View Load Time: ' . number_format($avg / 1000.0, 3) .'s';
                        }
                        echo '<br>';
                    }
                    if( FRIENDLY_URLS )
                        echo "<br>Download Combined Raw: <a href=\"/result/$id/{$id}_bulk_page_data.csv\">Page Data</a> - <a href=\"/result/$id/{$id}_bulk_requests.csv\">Object Data</a>";
                    else
                        echo "<br>Download Combined Raw: <a href=\"/csv.php?test=$id\">Page Data</a> - <a href=\"/csv.php?test=$id&requests=1\">Object Data</a>";
                    echo "<br><br><a href=\"/aggregate.php?test=$id\">Download Aggregate Statistics</a>";
                }
                else
                {
                    if( FRIENDLY_URLS )
                        echo "<br>Download Partial Combined Raw: <a href=\"/result/$id/{$id}_bulk_page_data.csv\">Page Data</a> - <a href=\"/result/$id/{$id}_bulk_requests.csv\">Object Data</a>";
                    else
                        echo "<br>Download Partial Combined Raw: <a href=\"/csv.php?test=$id\">Page Data</a> - <a href=\"/csv.php?test=$id&requests=1\">Object Data</a>";
                    echo "<br><br><a href=\"/aggregate.php?test=$id\">Download Partial Aggregate Statistics</a>";
                    echo "<br><br><a href=\"/cancelTest.php?test=$id\">Cancel all pending tests</a>";
                }
                ?>
            </div>
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>

<?php
} // csv

// rewrite the bulk file if it changed
if( $dirty )
{
    gz_file_put_contents("$testPath/bulk.json", json_encode($tests));
    $dirty = false;
}

/**
* Display a straight data table of the test results
*
* @param mixed $tests
*/
function DisplayTests(&$tests)
{
    global $fvonly;
    global $videoCaptured;

    if ($videoCaptured) {
        echo "<form name=\"compare\" method=\"get\" action=\"/video/compare.php\">";
    }
    echo '<br><table class="batchResults" border="1" cellpadding="10" cellspacing="0">
        <tr>';
    if ($videoCaptured) {
        echo    '<th><input style="font-size: 90%; padding: 2px;" id="CompareBtn" type="submit" value="Compare"></th>';
    }
    echo    '<th>Test</th>
            <th>Median load time<br>(First view)</th>';
    if( !$fvonly )
        echo '<th>Median load time<br>(Repeat view)</th>';
    echo '<th>Median <a href="https://docs.webpagetest.org/metrics/speedindex/" target="_blank">Speed Index</a><br>(First View)</th>';
    echo    '<th>Raw page data</th>
            <th>Raw object data</th>
            <th>Http archive (.har)</th>
        </tr>';
    foreach( $tests['urls'] as &$test )
    {
        $label = array_key_exists('l', $test) ? $test['l'] : '';
        if( !strlen($label) )
            $label = htmlspecialchars(ShortenUrl($test['u']));
        $complete = array_key_exists('c', $test) ? $test['c'] : false;
        DisplayTest($test['id'], $test['u'], $label, $complete);
    }
    echo '</table>';
    if ($videoCaptured) {
        echo '</form>';
    }
}

/**
* Display the test results as a comparison across multiple variations of a given test
*
* @param mixed $tests
*/
function DisplayTestsWithVariations(&$tests)
{
    global $fvonly;
    global $videoCaptured;

    if ($videoCaptured) {
        echo "<form name=\"compare\" method=\"get\" action=\"/video/compare.php\">";
    }
    echo '<br><table class="batchResults" border="1" cellpadding="10" cellspacing="0">
        <tr>';
    if ($videoCaptured) {
        echo    '<th><input style="font-size: 90%; padding: 2px;" id="CompareBtn" type="submit" value="Compare"></th>';
    }
    echo    '<th>Test</th>
            <th>Median load time<br>(First view)</th>';
    if( !$fvonly )
        echo '<th>Median load time<br>(Repeat view)</th>';
    echo '<th>Median <a href="https://docs.webpagetest.org/metrics/speedindex/" target="_blank">Speed Index</a><br>(First View)</th>';
    echo   '<th>Raw page data</th>
            <th>Raw object data</th>
            <th>Http archive (.har)</th>
        </tr>';
    foreach( $tests['urls'] as &$test )
    {
        $label = $test['l'];
        if( !strlen($label) )
            $label = htmlspecialchars(ShortenUrl($test['u']));
        DisplayTest($test['id'], $test['u'], $label, $test['c']);
        foreach( $test['v'] as $variationIndex => $variationId )
            DisplayTest($variationId, CreateUrlVariation($test['u'], $tests['variations'][$variationIndex]['q']), "$label - {$tests['variations'][$variationIndex]['l']}", $test['c']);
    }
    echo '</table>';
    if ($videoCaptured) {
        echo '</form>';
    }
}

/**
* Display a single row of the data table
*
* @param mixed $current_id
* @param mixed $current_url
* @param mixed $current_label
*/
function DisplayTest($id, $url, $label, $complete)
{
    global $stats;
    global $fvonly;
    global $videoCaptured;
    global $median_metric;
    RestoreTest($id);
    $testPath = './' . GetTestPath($id);
    $fileUrl = GetFileUrl($url);

    echo '<tr>';
    if ($videoCaptured) {
        echo "<td><input type=\"checkbox\" name=\"t[]\" value=\"$id\" title=\"First View\">";
    }
    $safeUrl = htmlspecialchars($url);
    $label = htmlspecialchars($label);
    if( FRIENDLY_URLS )
        echo "<td><a href=\"/result/$id/\" title=\"$safeUrl\" target=\"_blank\">$label</a></td>";
    else
        echo "<td><a href=\"/results.php?test=$id\" title=\"$safeUrl\" target=\"_blank\">$label</a></td>";
    if( $complete )
    {
        $pageData = loadAllPageData($testPath);
        $fvMedian = GetMedianRun($pageData, 0, $median_metric);
        $rvMedian = GetMedianRun($pageData, 1, $median_metric);
        $rvMedian_column = '';
        if ($rvMedian && ($pageData[$rvMedian][1]['result'] == 0 || $pageData[$rvMedian][1]['result'] == 99999))
            $rvMedian_column = number_format($pageData[$rvMedian][1]['loadTime'] / 1000.0, 3);
        if ($fvMedian && ($pageData[$fvMedian][0]['result'] == 0 || $pageData[$fvMedian][0]['result'] == 99999)) {
          echo "<td>" . number_format($pageData[$fvMedian][0]['loadTime'] / 1000.0, 3) . "</td>";
          if( $pageData[$fvMedian][0]['loadTime'] )
              $stats['fv'][] = $pageData[$fvMedian][0]['loadTime'];
        } else {
          echo '<td></td>';
        }
        if( !$fvonly )
        {
            if ($pageData[$rvMedian][1]['loadTime'])
                $stats['rv'][] = $pageData[$rvMedian][1]['loadTime'];
            echo "<td>$rvMedian_column</td>";
        }
        echo '<td>';
        if ($fvMedian &&
            array_key_exists('SpeedIndex', $pageData[$fvMedian][0]) &&
            ($pageData[$fvMedian][0]['result'] == 0 || $pageData[$fvMedian][0]['result'] == 99999)) {
            $siMedian = GetMedianRun($pageData, 0, 'SpeedIndex');
            echo $pageData[$siMedian][0]['SpeedIndex'];
        }
        echo '</td>';
        if( FRIENDLY_URLS )
        {
            echo "<td><a href=\"/result/$id/{$id}_{$fileUrl}_page_data.csv\">Download Page Data</a></td>";
            echo "<td><a href=\"/result/$id/{$id}_{$fileUrl}_requests.csv\">Download Object Data</a></td>";
        }
        else
        {
            echo "<td><a href=\"/csv.php?test=$id\">Download Page Data</a></td>";
            echo "<td><a href=\"/csv.php?test=$id&requests=1\">Download Object Data</a></td>";
        }
        echo "<td><a href=\"/export.php?bodies=1&pretty=1&test=$id\">Download HAR</a></td>";
    }
    else
    {
        if( $fvonly )
            echo '<td colspan="5">';
        else
            echo '<td colspan="6">';
        $status = GetTestStatus($id);
        echo $status['statusText'];
        if( $status['statusCode'] == 101 )
            echo "( <a href=\"/cancelTest.php?test=$id\">Cancel Test</a> )";
        echo '</td>';
    }
    echo "</tr>\n";
}

/**
* Walk through the tests determining which ones are complete
*
* @param mixed $tests
*/
function CheckTests(&$tests, &$dirty)
{
  global $location;
  $allComplete = true;
  $completed = 0;
  $checked = 0;

  foreach( $tests['urls'] as &$test ) {
    if( !$test['c'] ) {
      $complete = true;
      $id = $test['id'];
      RestoreTest($id);
      $testPath = './' . GetTestPath($id);
      $testIni = parse_ini_file("$testPath/testinfo.ini",true);
      $checked++;
      if( (!isset($testIni['test']) || !isset($testIni['test']['completeTime'])) ) {
        $complete = false;
      } else {
        // go through all of the variations as well
        foreach( $test['v'] as $variationId ) {
          RestoreTest($variationId);
          $testPath = './' . GetTestPath($variationId);
          $testIni = parse_ini_file("$testPath/testinfo.ini",true);
          if( (!isset($testIni['test']) || !isset($testIni['test']['completeTime'])) ) {
            $complete = false;
            break;
          }
        }
      }

      if( $complete ) {
        $test['c'] = 1;
        $dirty = true;
        $completed++;
      } else {
        $allComplete = false;
      }
    }
  }

  return $allComplete;
}
?>
