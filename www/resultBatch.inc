<?php
require_once('testStatus.inc');
require_once('./video/visualProgress.inc.php');
//error_reporting(E_ALL);

set_time_limit(3600);
if( !defined('BARE_UI') )
    define('BARE_UI', true);
$csv = false;
$json = false;
$weblite = false;
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
$videoDirty = false;
if( gz_is_file("$testPath/video.json") ) {
  $videoInfo = json_decode(gz_file_get_contents("$testPath/video.json"), true);
} else {
  $videoInfo = array('vID' => @$tests['vID'], 'vPathID' => @$tests['vPathID']);
}

// grab the location from the first test
$location = $test['test']['location'];
if( count($tests) && count($tests['urls']) ) {
  $location_test_path = './' . GetTestPath($tests['urls'][0]['id']);
  $location_test_ini = parse_ini_file("$location_test_path/testinfo.ini",true);
  if( array_key_exists('test', $location_test_ini) && array_key_exists('location', $location_test_ini['test']) )
    $location = $location_test_ini['test']['location'];
}
    
$view = trim(strtolower($test['testinfo']['view']));
if( $view == 'simple' || $view == 'pss' )
    $view = 'pss';
elseif ($view == 'pss_path')
    $view = 'pss_path';
elseif ($view == 'cf')
    $view = 'cf';
elseif ($view == 'blink')
    $view = 'blink';
elseif ($view == 'weblite') {
    $view = 'weblite';
    $weblite = true;
} else
    $view = 'bulk';
$mod_pagespeed = false;
if (array_key_exists('script', $test['testinfo']) &&
    stripos($test['testinfo']['script'], "addHeader\tModPagespeed:off\t%HOST_REGEX%") !== false)
  $mod_pagespeed = true;

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
if( $videoCaptured && (!$supportsAuth || ($admin || strpos($_COOKIE['google_email'], '@google.com') !== false)) )
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
$videoCount = 0;

// rewrite the bulk file if it changed
if( $dirty )
{
    gz_file_put_contents("$testPath/bulk.json", json_encode($tests));
    $dirty = false;
}

$page_keywords = array('Bulk','Result','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Bulk website performance test result$testLabel.";

if($csv && ($view == 'pss' || $view == 'cf'))
{
    $testInfo = $test['testinfo'];
    header ("Content-type: text/csv");
    if ($complete)
        DisplayPSS($tests, $test['testinfo']['video'], $dirty);
}
elseif($csv && $view == 'pss_path')
{
    $testInfo = $test['testinfo'];
    header ("Content-type: text/csv");
    if ($complete)
        DisplayPSSPath($tests, $test['testinfo']['video'], $dirty);
}
elseif($json && ($view == 'pss' || $view = 'cf'))
{
    if ($complete)
        DisplayPSS($tests, $test['testinfo']['video'], $dirty);
    else
        DisplayProgress($tests);
    json_response($json_response);
}
elseif($json)
{
  $json_response['tests'] = $testIds;
  json_response($json_response);
}
else
{
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest Comparison Test Result<?php echo $testLabel; ?></title>
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
        <link rel="stylesheet" href="/video/video-js.3.2.0/video-js.min.css" type="text/css">
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
            .vjs-default-skin .vjs-controls {height: 0;}
            .vjs-default-skin .vjs-mute-control {display: none;}
            .vjs-default-skin .vjs-volume-control {display: none;}
        </style>
        </style>
        <script type="text/javascript" src="/video/video-js.3.2.0/video.min.js"></script>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            if( $view == 'pss' || $view == 'pss_path' )
            {
                $navTabs = array(   'New Comparison' => FRIENDLY_URLS ? "/compare?pssid=$id" : "/pss.php?pssid=$id",
                                    'Test Result' => FRIENDLY_URLS ? "/result/$id/" : "/results.php?test=$id");
                if (array_key_exists('testinfo', $test) && array_key_exists('pss_advanced', $test['testinfo']) && $test['testinfo']['pss_advanced']) {                
                    $navTabs['New Comparison'] = FRIENDLY_URLS ? "/compare?pssid=$id&option=prioritize_visible_content" : "/pss.php?pssid=$id&option=prioritize_visible_content";
                }
            }
            elseif ($view == 'cf') {
                $navTabs = array(   'New Comparison' => FRIENDLY_URLS ? "/compare-cf?pssid=$id" : "/compare-cf.php?pssid=$id",
                                    'Test Result' => FRIENDLY_URLS ? "/result/$id/" : "/results.php?test=$id");
            } elseif ($view == 'weblite')
            {
                $navTabs = array(   'New Comparison' => "/optimized?pssid=$id",
                                    'Test Result' => "/result/$id/");
            }
            elseif ($view == 'blink')
            {
                $navTabs = array(   'New Comparison' => FRIENDLY_URLS ? "/blink?bid=$id" : "/blink.php?bid=$id",
                                    'Test Result' => FRIENDLY_URLS ? "/result/$id/" : "/results.php?test=$id");
            }
            include 'header.inc';
            ?>
            <div id="result">
                <div id="download">
                    <div id="testinfo">
                        <?php
                            if ($weblite) {
                              echo "Tested From: Dulles, VA on a 2G network connection <a href=\"https://github.com/facebook/augmented-traffic-control/blob/master/utils/profiles/2G-DevelopingUrban.json\">(35Kbps, 1.3s RTT)</a>";
                            }
                            elseif( $test['test']['batch'] )
                            {
                                echo "Tested From: $location<br>";
                            }
                            else if ( $test['test']['batch_locations'] )
                            {
                                echo 'Tested Url: ' . $test['testinfo']['url'] . '<br>';
                            }
                            if( $view == 'bulk' )
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
                        $label = str_replace('PSS Comparison for', 'PageSpeed Service Comparison for', $label);
                        echo "<h2>$label<br><span class=\"small\">(You can bookmark this page to come back or share the results with others)</span></h2>";
                    }

                    if( $view == 'pss' || $view == 'cf' )
                        DisplayPSS($tests, $test['testinfo']['video'], $dirty);
                    elseif( $view == 'weblite' )
                        DisplayPSS($tests, $test['testinfo']['video'], $dirty);
                    elseif( $view == 'pss_path' )
                        DisplayPSSPath($tests, $test['testinfo']['video'], $dirty);
                    elseif( $view == 'blink' )
                        DisplayBlink($tests, $test['testinfo']['video'], $dirty);
                }
                else
                {
                    echo '<h2>Please wait while the testing is performed<br><span class="small">This page will automatically update until the test is complete</span></h2>';
                    if( $view != 'bulk' )
                        DisplayProgress($tests);
                }
                
                if( $view == 'bulk' )
                {
                    if( count($tests['variations']) )
                        DisplayTestsWithVariations($tests);
                    else
                        DisplayTests($tests);
                }

                // rewrite the bulk file if it changed
                if( $dirty )
                {
                    gz_file_put_contents("$testPath/bulk.json", json_encode($tests));
                    $dirty = false;
                }

                if ($complete)
                {
                    if( $view == 'bulk' )
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
                }
                else
                {
                    if( $view == 'pss' || $view == 'pss_path' )
                    {
                    } elseif( $view == 'bulk' ) {
                        if( FRIENDLY_URLS )
                            echo "<br>Download Partial Combined Raw: <a href=\"/result/$id/{$id}_bulk_page_data.csv\">Page Data</a> - <a href=\"/result/$id/{$id}_bulk_requests.csv\">Object Data</a>";
                        else
                            echo "<br>Download Partial Combined Raw: <a href=\"/csv.php?test=$id\">Page Data</a> - <a href=\"/csv.php?test=$id&requests=1\">Object Data</a>";
                        echo "<br><br><a href=\"/aggregate.php?test=$id\">Download Partial Aggregate Statistics</a>";
                        echo "<br><br><a href=\"/cancelTest.php?test=$id\">Cancel all pending tests</a>";
                    }
                }
                ?>
            </div>
            <?php include('footer.inc'); ?>
            <script type="text/javascript">
                var tests = "<?php echo implode(',', $testIds); ?>";
                var waitingImage = '<?php echo "{$GLOBALS['cdnPath']}/images/status_waiting.png"; ?>';
                var testingImage = '<?php echo "{$GLOBALS['cdnPath']}/images/status_testing.png"; ?>';
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
                  if (elapsed < 0 || elapsed > 10000) {
                    try {
                      var xhr = new XMLHttpRequest();
                      xhr.open('GET', '/testStatus.php?f=json&pos=1&tests=' + tests, true);
                      xhr.onreadystatechange = function() {
                        if (xhr.readyState != 4)
                          return;
                        var reload = false;
                        var interval = 10000;
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
                                interval = 5000;
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
                        setTimeout('UpdateStatus()', 10000);
                      };
                      xhr.send();
                    } catch (err) {
                        setTimeout('UpdateStatus()', 10000);
                    }
                  } else {
                    setTimeout('UpdateStatus()', 10000);
                  }
                }
                
                function CheckVideo(id) {
                    try {
                      var xhr = new XMLHttpRequest();
                      xhr.open('GET', '/video/videoStatus.php?id=' + id, true);
                      xhr.onreadystatechange = function() {
                        if (xhr.readyState != 4)
                          return;
                        var reload = false;
                        if (xhr.status == 200) {
                            var response = JSON.parse(xhr.responseText);
                            if (response['statusCode'] == 200) {
                                window.location.reload(true);
                            }
                        }
                      };
                      xhr.onerror = function() {};
                      xhr.send();
                    } catch (err) {
                    }
                }
                
                /*
                 * jQuery Pimg (Preview image) 
                 * Written by Dave Earley ( http://Bitsntuts.com )
                 */
                function pimg()
                {
                    this.xOffset = 10;
                    this.yOffset = 300;
                    $("img.pimg").hover(function (e)
                    {
                        this.img_title = this.title;
                        this.title = "";
                        var img_src = $(this).attr('img_src');
                        var desc = (this.img_title != "") ? "<h3>" + this.img_title + "</h3>" : "";
                        var image = (img_src) ? img_src : this.src;
                        $("body").append("<div id='pimg'><img src='" + image + "' alt='Image preview' />" + desc + "</div>");
                        $("#pimg").css("top", (e.pageY - yOffset) + "px").css("left", (e.pageX + xOffset) + "px");
                        $("#pimg").show();
                    }, function ()
                    {
                        this.title = this.img_title;
                        $("#pimg").remove();
                    });
                    $("img.pimg").mousemove(function (e)
                    {
                        $("#pimg").css("top", (e.pageY - yOffset) + "px").css("left", (e.pageX + xOffset) + "px");
                    });
                };
                //pimg();
                <?php
                if (!$complete && $view != 'bulk')
                    echo "setTimeout('UpdateStatus()', 30000);\n";
                ?>
            </script>
        </div>
    </body>
</html>

<?php
} // csv

if ($videoDirty) {
    gz_file_put_contents("$testPath/video.json", json_encode($videoInfo));
}
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
    echo '<th>Median <a href="https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index" target="_blank">Speed Index</a><br>(First View)</th>';
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
    echo '<th>Median <a href="https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index" target="_blank">Speed Index</a><br>(First View)</th>';
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
        $fvMedian = GetMedianRun($pageData, 0, 'docTime');
        $rvMedian = GetMedianRun($pageData, 1, 'docTime');
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
* Display a simple comparison
* 
* @param mixed $tests
* @param mixed $complete
*/
function DisplayPSS(&$tests, $video, &$dirty)
{
    global $id;
    global $csv;
    global $complete;
    global $testInfo;
    global $location;
    global $json;
    global $json_response;
    global $videoInfo;
    global $videoDirty;
    global $admin;
    global $median_metric;
    global $showExperimental;
    global $weblite;
    require_once('object_detail.inc');
    $includeRender = false;
    if( array_key_exists('norender', $_REQUEST) && $_REQUEST['norender'] )
        $includeRender = false;
    
    $fvLoadTime = array();
    $fvRenderTimes = array();
    $rvLoadTimes = array();
    $rvRenderTimes = array();
    $fvFLI = array();
    if ($showExperimental)
        $fvSpeedIndexDT = array();
    $rvFLI = array();
    $original = array();
    $optimized = array();
    $count = 0;
    $started = 0;
    global $fvonly;
    $url = '';
    $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
    $host  = $_SERVER['HTTP_HOST'];
    $videoCustom = '2';
    
    // first pass, check the status of all of the tests and calculate the relevant times
    foreach( $tests['urls'] as &$test )
    {
        if (!strlen($url) && array_key_exists('u', $test))
          $url = $test['u'];
        $test['end'] = $weblite ? 'load' : 'visual';
        if (!$count) {
            if (array_key_exists('endOriginal', $_GET)) {
                $test['end'] = urlencode(trim($_GET['endOriginal']));
                $videoCustom .= md5('o' . $test['end']);
            }
        } else {
            if (array_key_exists('endOptimized', $_GET)) {
                $test['end'] = urlencode(trim($_GET['endOptimized']));
                $videoCustom .= md5('x' . $test['end']);
            }
        }
        $fvLoadTime = null;
        $fvRenderTime = null;
        $rvLoadTime = null;
        $rvRenderTime = null;
        $fvFLIvalue = null;
        $fvSpeedIndexDTValue = null;
        RestoreTest($test['id']);
        $test['path'] = GetTestPath($test['id']);
        $testPath = './' . $test['path'];
        $path = substr($testPath, 1);
        if( $test['c'] )
        {
            $testInfo = GetTestInfo($test['id']);
            if( $testInfo && (!$started || (array_key_exists('started', $testInfo) && $testInfo['started'] < $started)))
              $started = $testInfo['started'];
            $options = array('end' => $test['end']);
            $pageData = loadAllPageData($testPath, $options);
            $fvMedian = GetMedianRun($pageData, 0, $median_metric);
            $test['fvMedian'] = $fvMedian;
            $fvLoadTime = $pageData[$fvMedian][0]['loadTime'];
            $fvRenderTime = $pageData[$fvMedian][0]['render'];
            $startOffset = array_key_exists('testStartOffset', $pageData[$fvMedian][0]) ? intval(round($pageData[$fvMedian][0]['testStartOffset'])) : 0;
            $visual = GetVisualProgress($testPath, $fvMedian, 0, null, $test['end'], $startOffset);
            if (array_key_exists('SpeedIndex', $pageData[$fvMedian][0]))
                $fvFLIvalue = $pageData[$fvMedian][0]['SpeedIndex'];
            if (array_key_exists('SpeedIndexCustom', $pageData[$fvMedian][0]))
                $fvFLIvalue = $pageData[$fvMedian][0]['SpeedIndexCustom'];
            if (array_key_exists('SpeedIndexDT', $pageData[$fvMedian][0]))
                $fvSpeedIndexDTValue = $pageData[$fvMedian][0]['SpeedIndexDT'];
            if (array_key_exists('visualComplete', $visual) && 
                array_key_exists($visual['visualComplete'], $visual['frames']) &&
                is_file('.' . $visual['frames'][$visual['visualComplete']]['path'])) {
                $test['thumbnail'] = "video_$fvMedian/{$visual['frames'][$visual['visualComplete']]['file']}";
            }
            if( $count )
            {
                $optimized[0] = $pageData[$fvMedian][0];
                $optimized[0]['request_data'] = getRequests($test['id'], $testPath, $fvMedian, 0, $secure);
                $optimized[0]['page_speed'] = GetPageSpeedScore("$testPath/{$fvMedian}_pagespeed.txt");
                if ($json) {
                    $optimized[0]['page_speed_data'] = LoadPageSpeedData("$testPath/{$fvMedian}_pagespeed.txt");
                    $optimized[0]['video_frames'] = array();
                    loadVideo("$testPath/video_{$fvMedian}", $frames);
                    if( is_array($frames) && count($frames) ) {
                        foreach( $frames as $time => $frameFile ) {
                            $entry = array (   
                                'time' => number_format((double)$time / 1000.0, 3),
                                'image' => "$protocol://$host$path/video_{$fvMedian}/$frameFile");
                            $ms = $time * 100;
                            if (array_key_exists('frames', $visual) && array_key_exists($ms, $visual['frames']))
                                $entry['progress'] = $visual['frames'][$ms]['progress'];
                            $optimized[0]['video_frames'][] = $entry;
                        }
                    }
                }
                $optimized[0]['SpeedIndex'] = $fvFLIvalue;
            }
            else
            {
                $original[0] = $pageData[$fvMedian][0];
                $original[0]['request_data'] = getRequests($test['id'], $testPath, $fvMedian, 0, $secure);
                $original[0]['page_speed'] = GetPageSpeedScore("$testPath/{$fvMedian}_pagespeed.txt");
                if ($json) {
                    $original[0]['page_speed_data'] = LoadPageSpeedData("$testPath/{$fvMedian}_pagespeed.txt");
                    $original[0]['video_frames'] = array();
                    loadVideo("$testPath/video_{$fvMedian}", $frames);
                    if( is_array($frames) && count($frames) ) {
                        foreach( $frames as $time => $frameFile ) {
                            $entry = array (   
                                'time' => number_format((double)$time / 1000.0, 3),
                                'image' => "$protocol://$host$path/video_{$fvMedian}/$frameFile");
                            $ms = $time * 100;
                            if (array_key_exists('frames', $visual) && array_key_exists($ms, $visual['frames']))
                                $entry['progress'] = $visual['frames'][$ms]['progress'];
                            $original[0]['video_frames'][] = $entry;
                        }
                    }
                }
                $original[0]['SpeedIndex'] = $fvFLIvalue;
            }
            if( !strlen($url) )
                $url = $pageData[$fvMedian][0]['URL'];
            $rvMedian = GetMedianRun($pageData, 1, $median_metric);
            $test['rvMedian'] = $rvMedian;
            $rvLoadTime = $pageData[$rvMedian][1]['loadTime'];
            $rvRenderTime = $pageData[$rvMedian][1]['render'];
            if( $count )
            {
                $optimized[1] = $pageData[$rvMedian][1];
                $optimized[1]['request_data'] = getRequests($test['id'], $testPath, $rvMedian, 1, $secure);
                $optimized[1]['page_speed'] = GetPageSpeedScore("$testPath/{$rvMedian}_Cached_pagespeed.txt");
                if ($json) {
                    $optimized[1]['page_speed_data'] = LoadPageSpeedData("$testPath/{$rvMedian}_Cached_pagespeed.txt");
                    $optimized[1]['video_frames'] = array();
                    loadVideo("$testPath/video_{$rvMedian}_cached", $frames);
                    if( is_array($frames) && count($frames) ) {
                        foreach( $frames as $time => $frameFile ) {
                            $entry = array (   
                                'time' => number_format((double)$time / 1000.0, 3),
                                'image' => "$protocol://$host$path/video_{$rvMedian}_cached/$frameFile");
                            $ms = $time * 100;
                            if (array_key_exists('frames', $visual) && array_key_exists($ms, $visual['frames']))
                                $entry['progress'] = $visual['frames'][$ms]['progress'];
                            $optimized[1]['video_frames'][] = $entry;
                        }
                    }
                }
            }
            else
            {
                $original[1] = $pageData[$rvMedian][1];
                $original[1]['request_data'] = getRequests($test['id'], $testPath, $rvMedian, 1, $secure);
                $original[1]['page_speed'] = GetPageSpeedScore("$testPath/{$rvMedian}_Cached_pagespeed.txt");
                if ($json) {
                    $original[1]['page_speed_data'] = LoadPageSpeedData("$testPath/{$rvMedian}_Cached_pagespeed.txt");
                    $original[1]['video_frames'] = array();
                    loadVideo("$testPath/video_{$rvMedian}_cached", $frames);
                    if( is_array($frames) && count($frames) ) {
                        foreach( $frames as $time => $frameFile ) {
                            $entry = array (   
                                'time' => number_format((double)$time / 1000.0, 3),
                                'image' => "$protocol://$host$path/video_{$rvMedian}_cached/$frameFile");
                            $ms = $time * 100;
                            if (array_key_exists('frames', $visual) && array_key_exists($ms, $visual['frames']))
                                $entry['progress'] = $visual['frames'][$ms]['progress'];
                            $original[1]['video_frames'][] = $entry;
                        }
                    }
                }
            }
        }
        else
        {
            $test['status'] = GetTestStatusText($test['id']);
        }
        $fvLoadTimes[$count] = $fvLoadTime;
        $fvRenderTimes[$count] = $fvRenderTime;
        $fvFLI[$count] = $fvFLIvalue;
        if (isset($fvSpeedIndexDT) && isset($fvSpeedIndexDTValue))
            $fvSpeedIndexDT[$count] = $fvSpeedIndexDTValue;
        if( !$fvonly )
        {
            $rvLoadTimes[$count] = $rvLoadTime;
            $rvRenderTimes[$count] = $rvRenderTime;
            $rvFLI[$count] = $rvFLIvalue;
        }
        if ($weblite)
          $test['end'] = number_format($fvLoadTime / 1000.0, 3);

        $count++;
    }

    if( $json || $csv )
    {
        $domains = array();
        $domains['Original FV'] = array();
        $domains['Optimized FV'] = array();
        $domains['Original RV'] = array();
        $domains['Optimized RV'] = array();
        $mime_stats = array();
        $mime_stats['Original FV'] = array();
        $mime_stats['Optimized FV'] = array();
        $mime_stats['Original RV'] = array();
        $mime_stats['Optimized RV'] = array();
        GetRequestStats($original[0]['request_data'], $domains['Original FV'], $mime_stats['Original FV']);
        GetRequestStats($optimized[0]['request_data'], $domains['Optimized FV'], $mime_stats['Optimized FV']);
        GetRequestStats($original[1]['request_data'], $domains['Original RV'], $mime_stats['Original RV']);
        GetRequestStats($optimized[1]['request_data'], $domains['Optimized RV'], $mime_stats['Optimized RV']);

        $testIssues = 0;
        $json_response['data'] = array();
        $json_response['data']['Test_ID'] = $id;
        $json_response['data']['URL'] = htmlspecialchars_decode($url);
        $json_response['data']['Location'] = $testInfo['location'];
        $json_response['data']['Started'] = $started;
        $json_response['data']['Original_Test_ID'] = $tests['urls'][0]['id'];
        $json_response['data']['Optimized_Test_ID'] = $tests['urls'][1]['id'];
        $json_response['data']['Original_FV_Load_Time'] = $original[0]['loadTime'];
        $json_response['data']['Optimized_FV_Load_Time'] = $optimized[0]['loadTime'];
        $json_response['data']['Original_RV_Load_Time'] = $original[1]['loadTime'];
        $json_response['data']['Optimized_RV_Load_Time'] = $optimized[1]['loadTime'];
        $json_response['data']['Original_FV_Speed_Index'] = $original[0]['SpeedIndex'];
        $json_response['data']['Optimized_FV_Speed_Index'] = $optimized[0]['SpeedIndex'];
        $json_response['data']['Original_RV_Speed_Index'] = $original[1]['SpeedIndex'];
        $json_response['data']['Optimized_RV_Speed_Index'] = $optimized[1]['SpeedIndex'];
        $json_response['data']['Base_Domain_Test_Issues'] = $testIssues;
        $json_response['data']['Original_FV_TTFB'] = $original[0]['TTFB'];
        $json_response['data']['Optimized_FV_TTFB'] = $optimized[0]['TTFB'];
        $json_response['data']['Original_RV_TTFB'] = $original[1]['TTFB'];
        $json_response['data']['Optimized_RV_TTFB'] = $optimized[1]['TTFB'];
        $json_response['data']['Original_FV_Render'] = $original[0]['render'];
        $json_response['data']['Optimized_FV_Render'] = $optimized[0]['render'];
        $json_response['data']['Original_RV_Render'] = $original[1]['render'];
        $json_response['data']['Optimized_RV_Render'] = $optimized[1]['render'];
        $json_response['data']['Original_FV_Socket_Connect'] = $original[0]['request_data'][0]['msSocket'];
        $json_response['data']['Optimized_FV_Socket_Connect'] = $optimized[0]['request_data'][0]['msSocket'];
        $json_response['data']['Original_RV_Socket_Connect'] = $original[1]['request_data'][0]['msSocket'];
        $json_response['data']['Optimized_RV_Socket_Connect'] = $optimized[1]['request_data'][0]['msSocket'];
        $json_response['data']['Original_FV_Requests'] = $original[0]['requestsDoc'];
        $json_response['data']['Optimized_FV_Requests'] = $optimized[0]['requestsDoc'];
        $json_response['data']['Original_RV_Requests'] = $original[1]['requestsDoc'];
        $json_response['data']['Optimized_RV_Requests'] = $optimized[1]['requestsDoc'];
        $json_response['data']['Original_FV_Bytes'] = $original[0]['bytesInDoc'];
        $json_response['data']['Optimized_FV_Bytes'] = $optimized[0]['bytesInDoc'];
        $json_response['data']['Original_RV_Bytes'] = $original[1]['bytesInDoc'];
        $json_response['data']['Optimized_RV_Bytes'] = $optimized[1]['bytesInDoc'];
        $json_response['data']['Original_FV_Result'] = $original[0]['result'];
        $json_response['data']['Optimized_FV_Result'] = $optimized[0]['result'];
        $json_response['data']['Original_RV_Result'] = $original[1]['result'];
        $json_response['data']['Optimized_RV_Result'] = $optimized[1]['result'];
        foreach($domains as $config => &$domains_data)
            $json_response['data']["{$config}_Unique_Domains"] = count($domains_data);
        foreach($mime_stats as $config => &$mime_stats_data)
            foreach($mime_stats_data as $mime_type => &$mime_data) {
                $config = str_replace(' ', '_', $config);
                $mime_type = str_replace(' ', '_', $mime_type);
                $json_response['data']["{$config}_{$mime_type}_requests"] = $mime_data['count'];
                $json_response['data']["{$config}_{$mime_type}_bytes"] = $mime_data['bytes'];
            }
        $json_response['data']['Original_FV_Visually_Complete'] = $original[0]['visualComplete'];
        $json_response['data']['Optimized_FV_Visually_Complete'] = $optimized[0]['visualComplete'];
        $json_response['data']['Original_RV_Visually_Complete'] = $original[1]['visualComplete'];
        $json_response['data']['Optimized_RV_Visually_Complete'] = $optimized[1]['visualComplete'];
        $json_response['data']['Tested_From'] = $location;
        $json_response['data']['Original_FV_Page_Speed_Score'] = $original[0]['page_speed'];
        $json_response['data']['Optimized_FV_Page_Speed_Score'] = $optimized[0]['page_speed'];
        $json_response['data']['Original_RV_Page_Speed_Score'] = $original[1]['page_speed'];
        $json_response['data']['Optimized_RV_Page_Speed_Score'] = $optimized[1]['page_speed'];
        $json_response['data']['Original_FV_Feels_Like'] = $original[0]['SpeedIndex'];
        $json_response['data']['Optimized_FV_Feels_Like'] = $optimized[0]['SpeedIndex'];
        
        if ($csv) {
            foreach ($json_response['data'] as $label => $value) {
                $label = str_replace('_', ' ', $label);
                echo $label . ',';
            }
            echo "\n";
            foreach ($json_response['data'] as $label => $value) {
                if ($label == 'URL' || $label == 'Tested_From')
                    echo '"' . $value . '",';
                else
                    echo $value . ',';
            }
        }

        // responses that are only in the JSON
        if ($json) {
            $json_response['data']['Original_FV_Page_Speed_Data'] = $original[0]['page_speed_data'];
            $json_response['data']['Optimized_FV_Page_Speed_Data'] = $optimized[0]['page_speed_data'];
            $json_response['data']['Original_RV_Page_Speed_Data'] = $original[1]['page_speed_data'];
            $json_response['data']['Optimized_RV_Page_Speed_Data'] = $optimized[1]['page_speed_data'];
            $json_response['data']['Original_FV_Video_Frames'] = $original[0]['video_frames'];
            $json_response['data']['Optimized_FV_Video_Frames'] = $optimized[0]['video_frames'];
            $json_response['data']['Original_RV_Video_Frames'] = $original[1]['video_frames'];
            $json_response['data']['Optimized_RV_Video_Frames'] = $optimized[1]['video_frames'];
        }
    }
    else
    {
        if (array_key_exists('pss_advanced', $testInfo) && $testInfo['pss_advanced']) {
            echo "<h2>Side-by-side Filmstrip (<a href=\"/video/compare.php?bare=1&tests={$tests['urls'][0]['id']},{$tests['urls'][1]['id']}&end=visual\" target=\"_blank\">open in new window</a>)</h2>";
            $e1='';
            if (is_numeric($tests['urls'][0]['end']))
                $e1="-e:{$tests['urls'][0]['end']}";
            $e2='';
            if (is_numeric($tests['urls'][1]['end']))
                $e2="-e:{$tests['urls'][1]['end']}";
            echo "<iframe scrolling=\"no\" frameborder=\"0\" id=\"filmstrip\" src=\"/video/compare.php?embed=1&tests={$tests['urls'][0]['id']}$e1,{$tests['urls'][1]['id']}$e2&end=visual\"></iframe>";
        } elseif (!array_key_exists('pss_advanced', $testInfo) || !$testInfo['pss_advanced']) {
            echo '<br><table class="batchResults" border="1" cellpadding="15" cellspacing="0">
                    <tr>
                    <th class="empty"></th>';
            // second pass, generate the header
            $count = 0;
            foreach( $tests['urls'] as &$test )
            {
                $label = htmlspecialchars($test['l']);
                if( !strlen($label) )
                    $label = htmlspecialchars(ShortenUrl($test['u']));
                echo "<th>$label</th>";
                if( $count && $complete )
                    echo "<th>Difference</a></th>";
                $count++;
            }
            echo '</tr>';
            
            // FV Page load time
            if( $complete )
            {
                DisplayMetric('Page Load Time', $fvLoadTimes, $count);
                if( $includeRender )
                    DisplayMetric('Start Render Time', $fvRenderTimes, $count);
                if (!$weblite) {
                  DisplayMetric('<a href="https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index" target="_blank">Speed Index</a> (lower is better)', $fvFLI, $count, false, false);
                  if (isset($fvSpeedIndexDT) && count($fvSpeedIndexDT))
                      DisplayMetric('<a href="https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index" target="_blank">Speed Index</a> (Dev Tools)', $fvSpeedIndexDT, $count, false, false);
                }
                    
                if( !$fvonly )
                {
                    DisplayMetric('Repeat View Page Load Time', $rvLoadTimes, $count);
                    if( $includeRender )
                        DisplayMetric('Repeat View Start Render Time', $rvRenderTimes, $count);
                }

                // links to the test results
                echo '<tr><td class="right">Full Test Result</td>';
                $count = 0;
                foreach( $tests['urls'] as &$test )
                {
                    $testurl = "/results.php?test={$test['id']}";
                    if (is_numeric($test['end']))
                        $testurl .= "&end={$test['end']}";
                    elseif( FRIENDLY_URLS )
                        $testurl = "/result/{$test['id']}/";
                    $path = $test['path'];
                    $run = $test['fvMedian'];
                    $thumbnail = "{$run}_screen.jpg";
                    if (array_key_exists('thumbnail', $test)) {
                        $thumbnail = urlencode($test['thumbnail']);
                    }
                    echo "<td><a href=\"$testurl\" target=\"_blank\"><img class=\"progress pimg\" src=\"/thumbnail.php?test={$test['id']}&width=150&run=$run&file=$thumbnail\" img_src=\"/$path/$thumbnail\"><br>view test</a></td>";
                    if( $count )
                        echo "<td></td>";
                    $count++;
                }
                echo "</tr>";
            }
            else
            {
                echo "<tr><td>Test Status</td>";
                foreach( $tests['urls'] as &$test )
                {
                    echo '<td>';
                    if( $test['c'] )
                        echo 'Complete';
                    else
                        echo $test['status'];
                    echo '</td>';
                }
                echo '</tr>';
            }
            echo '</table><br>';
        }
    }

    // video
    if( $complete && $video && !$csv )
    {
        $videoComplete = true;
        // regenerate a video if it was created a while ago and still isn't available
        if( strlen($videoInfo['vID' . $videoCustom]) ) {
            if (!CheckVideo($videoInfo['vID' . $videoCustom], $regenerate_video) && $regenerate_video) {
                if (array_key_exists('regenerated' . $videoCustom, $videoInfo) && $videoInfo['regenerated'] . $videoCustom) {
                    $videoComplete = true;
                    $videoInfo['vReady' . $videoCustom] = true;
                } else {
                    $videoInfo['regenerated' . $videoCustom] = true;
                    $videoInfo['vID' . $videoCustom] = null;
                }
                $videoDirty = true;
            }
        }
        if( !strlen($videoInfo['vID' . $videoCustom]) )
        {
            $videoEnd = $weblite ? 'load' : null;
            $videoInfo['vID' . $videoCustom] = CreateVideo($tests['urls'], $videoEnd);
            $videoDirty = true;
            $videoComplete = false;
            if( !strlen($videoInfo['vID' . $videoCustom]) )
            {
                // bail on the video if it couldn't be created
                $videoComplete = true;
                $videoInfo['vReady' . $videoCustom] = true;
            }
        }
        elseif( !$videoInfo['vReady' . $videoCustom] )
        {
            $videoInfo['vReady' . $videoCustom] = CheckVideo($videoInfo['vID' . $videoCustom], $regenerate_video);
            if( $videoInfo['vReady' . $videoCustom] )
                $videoDirty = true;
            else
                $videoComplete = false;
        }
        
        if ($json) {
            $json_response['data']['VideoID'] = $videoInfo['vID' . $videoCustom];
            if ($videoComplete) {
                $json_response['statusCode'] = 200;
                $host  = $_SERVER['HTTP_HOST'];
                $uri   = rtrim(dirname($_SERVER['PHP_SELF']), '/\\');
                $json_response['data']['videoEmbed'] = "$protocol://$host$uri/video/view.php?embed=1&id=" . $videoInfo['vID' . $videoCustom];
            } else {
                $json_response['statusCode'] = 103;
                $json_response['statusText'] = 'Creating Video';
            }
        } else {
            if( $videoComplete )
            {
                if ($weblite) {
                    echo "<h2>Visual Comparison (<a href=\"/video/compare.php?bare=1&tests={$tests['urls'][0]['id']},{$tests['urls'][1]['id']}&end=load\" target=\"_blank\">view filmstrip comparison</a>)</h2>";
                } elseif (!array_key_exists('pss_advanced', $testInfo) || !$testInfo['pss_advanced']) {
                    echo "<h2>Visual Comparison* (<a href=\"/video/compare.php?bare=1&tests={$tests['urls'][0]['id']}-e:{$tests['urls'][0]['end']},{$tests['urls'][1]['id']}-e:{$tests['urls'][1]['end']}&end=visual\" target=\"_blank\">view filmstrip comparison</a>)</h2>";
                } else {
                    echo "<h2>Visual Comparison*</h2>";
                }
                VideoHtml($videoInfo['vID' . $videoCustom]);
            }
            else
            {
                $videoId = $videoInfo['vID' . $videoCustom];
                echo '<h2>Please wait while the video comparison is created<br><span class="small">(This page will automatically update when the video is ready)</span></h2>';
                echo "<script language=\"JavaScript\">\nsetInterval( \"CheckVideo('$videoId')\", 1000 );\n</script>";
            }
        }
    }
}

/**
* Display a simple comparison
* 
* @param mixed $tests
* @param mixed $complete
*/
function DisplayPSSPath(&$tests, $video, &$dirty)
{
    global $id;
    global $csv;
    global $complete;
    global $testInfo;
    global $videoInfo;
    global $videoDirty;
    global $median_metric;
    require_once('./google/google_lib.inc');
    $includeRender = false;
    if( $_REQUEST['norender'] )
        $includeRender = false;
    
    $fvLoadTime = array();
    $fvRenderTimes = array();
    $rvLoadTimes = array();
    $rvRenderTimes = array();
    $original = array();
    $optimized = array();
    $count = 0;
    global $fvonly;
    $url = '';
    $testData = array();
    $videoTests = array();
    $videoPathTests = array();
    
    // first pass, check the status of all of the tests and calculate the relevant times
    foreach($tests['urls'] as &$test) {
        if( preg_match('/(Original|Optimized)(.*)/i', trim($test['l']), $matches) ) {
            $opt_string = $matches[1];
            $variation = trim($matches[2]);
            if( !strlen($variation) ) {
                $variation = 'Page';
                $videoTests[] = $test;
            } else {
                $variation = 'Path';
                $videoPathTests[] = $test;
            }
            
            if (!array_key_exists($variation, $testData))
                $testData[$variation] = array();
            $testData[$variation][$opt_string] = array();
            
            RestoreTest($test['id']);

            $entry = &$testData[$variation][$opt_string];
            $entry['id'] = $test['id'];
            $test['path'] = GetTestPath($test['id']);
            $entry['path'] = $test['path'];
            $testPath = './' . $test['path'];
            $entry['pageData'] = loadAllPageData($testPath);
            $entry['median_run'] = GetMedianRun($entry['pageData'], 0, $median_metric);
            $entry['median'] = $entry['pageData'][$entry['median_run']][0];
            $entry['requests'] = getRequests($test['id'], $testPath, $entry['median_run'], 0, $secure);
            $entry['median']['csi'] = ParseCsiInfo($test['id'], $testPath, $entry['median_run'], 0, true);
            $entry['domains'] = array();
            $entry['mime_stats'] = array();
            GetRequestStats($entry['requests'], $entry['domains'], $entry['mime_stats']);
            if( !strlen($url) )
                $url = $entry['median']['URL'];
        }
    }

    if( $csv )
    {
        $testIssues = 0;

        echo "Test ID,URL,Location,Base Domain Test Issues,";
        foreach ($testData as $variation => &$configs) {
            foreach ($configs as $config => $data) {
                $label = "$config $variation";
                echo "$label Test ID,$label Load Time,$label TTFB,$label Render,$label Socket Connect,$label Requests,$label Bytes,$label Result,$label Unique Domains,";
                foreach($data['mime_stats'] as $mime_type => &$mime_data)
                    echo "$label $mime_type requests,$label $mime_type bytes,";
            }
        }

        echo "\n$id,\"$url\",{$testInfo['location']},$testIssues,";
        foreach ($testData as $variation => &$configs) {
            foreach ($configs as $config => $data) {
                echo "{$data['id']},{$entry['median']['loadTime']},{$entry['median']['TTFB']},{$entry['median']['render']},";
                echo "{$entry['requests'][0]['msSocket']},{$entry['median']['requestsDoc']},{$entry['median']['bytesInDoc']},{$entry['median']['result']},";
                echo count($entry['domains']) . ',';
                foreach($data['mime_stats'] as $mime_type => &$mime_data)
                    echo "{$mime_data['count']},{$mime_data['bytes']},";
            }
        }
    }
    else
    {
        global $supportsAuth;
        global $admin;
        if( !$supportsAuth || ($admin || strpos($_COOKIE['google_email'], '@google.com') !== false) ) {
            $csi = array();
            foreach ($testData as $variation => &$configs) {
                foreach($configs['Optimized']['median']['csi'] as $name => $value) {
                    if ($name == 'CRITICAL_IMAGES_LOW_RES_LOADED' ||
                        $name == 'CRITICAL_IMAGES_HI_RES_LOADED' ||
                        $name == 'NON_CRITICAL_LOADED' ||
                        $name == 'START_PARSE_TIME' ||
                        $name == 'CRITICAL_DATA_RECEIVED' ||
                        $name == 'CRITICAL_DATA_LOADED' ||
                        $name == 'CRITICAL_IMAGES_RECEIVED' ||
                        $name == 'CRITICAL_IMAGES_INLINED' ) {
                        if( !array_key_exists($name, $csi)) {
                            $csi[$name] = array();
                        }
                        $csi[$name][$variation] = $value;
                    }
                }
            }
            if (count($csi)) {
                echo '<table class="batchResults" border="1" cellpadding="15" cellspacing="0"><tr><th class="empty"></th>';
                foreach ($testData as $variation => &$configs) {
                    $label = 'Site Navigation';
                    if ($variation == 'Page')
                        $label = 'First View';
                    echo "<th>$label</th>";
                }
                echo '</tr>';
                foreach($csi as $name => &$values) {
                    if ($name == 'CRITICAL_IMAGES_INLINED' || 
                        $name == 'CRITICAL_DATA_RECEIVED' ||
                        $name == 'CRITICAL_DATA_LOADED' ||
                        $name == 'CRITICAL_IMAGES_RECEIVED' ||
                        $name == 'START_PARSE_TIME') {
                        echo '<tr class="hidden">';
                    } else {
                        echo '<tr>';
                    }
                    echo "<td>$name</td>";
                    foreach ($testData as $variation => &$configs) {
                        echo '<td>';
                        if (array_key_exists($variation, $csi[$name]))
                            echo $csi[$name][$variation];
                        echo '</td>';
                    }
                    echo '</tr>';
                }
                echo '</table><br>';
            }
        }
        
        // video
        if ($complete && $video) {
            $videoComplete = true;
            // regenerate a video if it was created a while ago and still isn't available
            if( strlen($videoInfo['vID']) ) {
                if (!CheckVideo($videoInfo['vID'], $regenerate_video) && $regenerate_video) {
                    $videoInfo['vID'] = null;
                    $videoDirty = true;
                }
            }
            if (!strlen($videoInfo['vID'])) {
                $videoInfo['vID'] = CreateVideo($videoTests);
                $videoDirty = true;
                $videoComplete = false;
                if (!strlen($videoInfo['vID'])) {
                    $videoComplete = true;
                    $videoInfo['vReady'] = true;
                }
            } elseif( !$videoInfo['vReady'] ) {
                $videoInfo['vReady'] = CheckVideo($videoInfo['vID'], $regenerate_video);
                if( $videoInfo['vReady'] )
                    $videoDirty = true;
                else
                    $videoComplete = false;
            }
            if( strlen($videoInfo['vPathID']) ) {
                if (!CheckVideo($videoInfo['vPathID'], $regenerate_video) && $regenerate_video) {
                    $videoInfo['vPathID'] = null;
                    $videoDirty = true;
                }
            }
            if (!strlen($videoInfo['vPathID'])) {
                $videoInfo['vPathID'] = CreateVideo($videoPathTests);
                $videoDirty = true;
                $videoComplete = false;
                if (!strlen($videoInfo['vPathID'])) {
                    $videoComplete = true;
                    $videoInfo['vPathReady'] = true;
                }
            } elseif( !$videoInfo['vPathReady'] ) {
                $videoInfo['vPathReady'] = CheckVideo($videoInfo['vPathID'], $regenerate_video);
                if( $videoInfo['vPathReady'] )
                    $videoDirty = true;
                else
                    $videoComplete = false;
            }
            
            if( $videoComplete ) {
                echo '<h2>First View Visual Comparison*</h2>';
                VideoHtml($videoInfo['vID']);
                echo "<br><a href=\"/video/view.php?bare=1&id={$videoInfo['vID']}\" target=\"_blank\">view stand-alone video</a>";
                echo "<br><a href=\"/video/compare.php?bare=1&tests={$testData['Page']['Original']['id']},{$testData['Page']['Optimized']['id']}\" target=\"_blank\">view filmstrip comparison</a>";
                echo '<br><br><h2>Site Navigation Visual Comparison*</h2>';
                VideoHtml($videoInfo['vPathID']);
                echo "<br><a href=\"/video/view.php?bare=1&id={$videoInfo['vPathID']}\" target=\"_blank\">view stand-alone video</a>";
                echo "<br><a href=\"/video/compare.php?bare=1&tests={$testData['Path']['Original']['id']},{$testData['Path']['Optimized']['id']}\" target=\"_blank\">view filmstrip comparison</a>";
            } else {
                $videoId = $videoInfo['vID'];
                echo '<h2>Please wait while the video comparison is created<br><span class="small">(This page will automatically update when the video is ready)</span></h2>';
                echo "<script language=\"JavaScript\">\nsetInterval( \"CheckVideo('$videoId')\", 1000 );\n</script>";
            }
        }
    }
}

/**
* Display a blink result page
*/
function DisplayBlink(&$tests, $video, &$dirty)
{
    require_once('./google/google_lib.inc');
    global $complete;
    $videoTests = array();

    // grab the tests in the order we want
    $hasCached = false;
    $cached = array('Optimized' => null, 'Original' => null);
    $hasNotCached = false;
    $notCached = array('Optimized' => null, 'Original' => null);
    foreach( $tests['urls'] as &$test )
    {
        $id = $test['id'];
        $label = $test['l'];
        if( $label == 'Optimized' )
        {
            $hasNotCached = true;
            $notCached[$label] = $test;
        }
        elseif( $label == 'Original' )
        {
            $hasNotCached = true;
            $notCached[$label] = $test;
        }
        elseif( $label == 'Optimized Cached' )
        {
            $cached['Optimized'] = $test;
            $hasCached = true;
        }
        elseif( $label == 'Original Cached' )
        {
            $cached['Original'] = $test;
            $hasCached = true;
        }
    }
    
    $videoComplete = true;
    if( $hasCached )
    {
        DisplayBlinkTable($cached, '<b>Template cached</b><br>(Navigation within site)');
        if( $video )
        {
            if( !strlen($tests['videoId']) )
            {
                $tests['videoId'] = CreateVideo($cached);
                $dirty = true;
                if( strlen($tests['videoId']) )
                    $videoComplete = false;
                else
                    $tests['videoReady'] = true;
            }
            elseif( !$tests['videoReady'] )
            {
                $tests['videoReady'] = CheckVideo($tests['videoId'], $regenerate_video);
                if( $tests['videoReady'] )
                    $dirty = true;

                else
                    $videoComplete = false;
            }
            if( $videoComplete )
            {
                echo '<h2>Template Cached - Visual Comparison</h2>';
                VideoHtml($tests['videoId']);
            }
            else {
                echo '<h2>Please wait while the video comparison is created<br><span class="small">(This page will automatically update when the video is ready)</span></h2>';
                $videoId = $tests['videoId'];
                echo "<script language=\"JavaScript\">\nsetInterval( \"CheckVideo('$videoId')\", 1000 );\n</script>";
            }
        }
    }

    if( $hasNotCached )
    {
        echo '<br>';
        DisplayBlinkTable($notCached, '<b>Template not cached</b><br>(User lands on site)');
        if( $video )
        {
            if( !strlen($tests['NCvideoId']) )
            {
                $tests['NCvideoId'] = CreateVideo($notCached);
                $dirty = true;
                if( strlen($tests['NCvideoId']) )
                    $videoComplete = false;
                else
                    $tests['NCvideoReady'] = true;
            }
            elseif( !$tests['NCvideoReady'] )
            {
                $tests['NCvideoReady'] = CheckVideo($tests['NCvideoId'], $regenerate_video);
                if( $tests['NCvideoReady'] )
                    $dirty = true;
                else
                    $videoComplete = false;
            }
            if( $videoComplete )
            {
                echo '<h2>Template Not Cached - Visual Comparison</h2>';
                VideoHtml($tests['NCvideoId']);
            } else {
                echo '<h2>Please wait while the video comparison is created<br><span class="small">(This page will automatically update when the video is ready)</span></h2>';
                $videoId = $tests['NCvideoId'];
                echo "<script language=\"JavaScript\">\nsetInterval( \"CheckVideo('$videoId')\", 1000 );\n</script>";
            }
        }
    }
}

/**
* Display one of the blink data tables
*/
function DisplayBlinkTable($tests, $tableLabel)
{
    global $complete;
    global $median_metric;

    echo '<table class="batchResults" border="1" cellpadding="15" cellspacing="0"><tr>';
    echo '<th class="empty" style="border-right: 1px solid white;"></th>';
    echo '<th class="empty"></th><th>Optimized</th><th>Original</th><th>Difference</th></tr>';
    echo "<tr><td rowspan=5>$tableLabel</td></tr>";
    
    $metrics = array( 'Critical Low Res Loaded' => array(),
                      'Critical Page Loaded' => array(),
                      'Full Page Loaded' => array()
                       );
    
    $count = 0;
    global $fvonly;
    
    // first pass, check the status of all of the tests and calculate the relevant times
    foreach( $tests as $label => &$test )
    {
        $id = $test['id'];
        RestoreTest($id);
        $test['path'] = GetTestPath($id);
        $testPath = './' . $test['path'];
        if( $test['c'] )
        {
            $pageData = loadAllPageData($testPath);
            $fvMedian = GetMedianRun($pageData, 0, $median_metric);
            $test['fvMedian'] = $fvMedian;
            $metrics['Full Page Loaded'][$count] = $pageData[$fvMedian][0]['loadTime'];
            $csi = ParseCsiInfo($id, $testPath, $fvMedian, 0, false);
            $metrics['Critical Low Res Loaded'][$count] = $csi['cprc'];
            $metrics['Critical Page Loaded'][$count] = $csi['cihl'];
        }
        else
        {
            $test['status'] = GetTestStatusText($id);
        }
        $count++;
    }
    
    // FV Page load time
    if( $complete )
    {
        foreach( $metrics as $label => &$values )
            DisplayMetric($label, $values, $count, true);

        // links to the test results
        echo '<tr><td class="right">Full Test Result</td>';
        $count = 0;
        foreach( $tests as $label => &$test )
        {
            $id = $test['id'];
            $testurl = "/results.php?test=$id";
            if( FRIENDLY_URLS )
                $testurl = "/result/$id/";
            $path = $test['path'];
            $run = $test['fvMedian'];
            echo "<td><a href=\"$testurl\" target=\"_blank\"><img class=\"progress pimg\" src=\"/thumbnail.php?test={$test['id']}&width=150&run=$run&file={$run}_screen.jpg\" img_src=\"/$path/{$run}_screen.jpg\"><br>view test</a></td>";
            if( $count )
                echo "<td></td>";
            $count++;
        }
        echo "</tr>";
    }
    else
    {
        echo "<tr><td>Test Status</td>";
        foreach( $tests as &$test )
        {
            echo '<td>';
            if( $test['c'] )
                echo 'Complete';
            else
                echo $test['status'];
            echo '</td>';
        }
        echo '<td></td></tr>';
    }

    echo '</table><br>';
}

/**
* Generate the HTML for one metric in simple view
* 
* @param mixed $metric
* @param mixed $values
* @param mixed $count
*/
function DisplayMetric($metric, &$values, $count, $reverse = false, $seconds = true)
{
    // the actual values
    echo "<tr><td class=\"right\"><b>$metric</b></td>";
    $baseline = $values[0];
    for( $i = 0; $i < $count; $i++ )
    {
        echo '<td>';
        if ($values[$i]) {
            if ($seconds) {
                echo number_format( $values[$i] / 1000.0, 3) . 's';
            } else {
                echo $values[$i];
            }
        }
        echo '</td>';
        if( $i )
        {
            if ($values[$i] && $baseline > 0 && $i)
            {
                if( $reverse )
                    $delta = $baseline - $values[$i];
                else
                    $delta = $values[$i] - $baseline;
                $pct = number_format(abs($delta / $baseline) * 100.0, 1);
                $class = '';
                $direction = '';
                if( $delta > 0 )
                {
                    $direction = '+';
                    $class = 'bad';
                }
                elseif( $delta < 0 )
                    $class = 'good';
                if ($seconds) {
                    echo "<td class=\"$class\">$direction" . number_format( $delta / 1000.0, 3) . "s ($pct%)</td>";
                } else {
                    echo "<td class=\"$class\">$direction{$delta} ($pct%)</td>";
                }
            }
            else
                echo '<td></td>';
        }
    }
    echo '</tr>';
}

/**
* Display the original and optimized values for a single metric
* 
* @param mixed $label
* @param mixed $configs
* @param mixed $metric
*/
function DisplayPathMetric($label, &$configs, $metric, $digits = 3) {
    echo "<tr><td class=\"right\"><b>$label</b></td><td>";

    $id = $configs['Original']['id'];
    $testurl = "/results.php?test=$id";
    if( FRIENDLY_URLS )
        $testurl = "/result/$id/";
    $path = $configs['Original']['path'];
    $run = $configs['Original']['median_run'];
    echo '<br><b>' . number_format( $configs['Original']['median'][$metric] / 1000.0, $digits) . '</b> seconds<br><br>';
    echo "<a href=\"$testurl\" target=\"_blank\"><img class=\"progress pimg\" src=\"/thumbnail.php?test=$id&width=150&run=$run&file={$run}_screen.jpg\" img_src=\"/$path/{$run}_screen.jpg\"><br>view test</a>";

    echo '</td><td>';
    $id = $configs['Optimized']['id'];
    $testurl = "/results.php?test=$id";
    if( FRIENDLY_URLS )
        $testurl = "/result/$id/";
    $path = $configs['Optimized']['path'];
    $run = $configs['Optimized']['median_run'];
    echo '<br><b>' . number_format( $configs['Optimized']['median'][$metric] / 1000.0, $digits) . '</b> seconds<br><br>';
    echo "<a href=\"$testurl\" target=\"_blank\"><img class=\"progress pimg\" src=\"/thumbnail.php?test=$id&width=150&run=$run&file={$run}_screen.jpg\" img_src=\"/$path/{$run}_screen.jpg\"><br>view test</a>";
    echo '</td>';
    
    $delta = $configs['Optimized']['median'][$metric] - $configs['Original']['median'][$metric];
    $class = '';
    $direction = '';
    if( $delta > 0 ) {
        $direction = '+';
        $class = 'bad';
    } elseif( $delta < 0 )
        $class = 'good';
    echo "<td class=\"$class\">$direction" . number_format( $delta / 1000.0, 3) . "s";
    if ($configs['Optimized']['median'][$metric])
        echo ' (' . number_format(abs($delta / $configs['Original']['median'][$metric]) * 100.0, 1) . '%)';
    echo "</td>";
    echo '</tr>';
}

/**
* Send a request to create a video and return the ID
* 
* @param mixed $tests
*/
function CreateVideo(&$tests, $end = null)
{
    $id = null;

    if (!strlen($end))
        $end = 'visual';
    $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
    $host  = $_SERVER['HTTP_HOST'];
    $request = "$protocol://$host/video/create.php?f=json&force=1&end=$end&tests=";

    $count = 0;
    foreach( $tests as &$test )
    {
        if( $count )
            $request .= ',';
        $request .= "{$test['id']}-l:";
        $label = $test['l'];
        if( !strlen($label) )
            $label = htmlspecialchars(ShortenUrl($test['u']));
        $request .= urlencode($label);
        if (array_key_exists('end', $test)) {
            $request .= '-e:' . $test['end'];
        }
        $count++;
    }
    
    $response = json_decode(http_fetch($request), true);
    if( $response['statusCode'] == 200 )
        $id = $response['data']['videoId'];
    
    return $id;
}

/**
* Check to see if the video is complete
* 
* @param mixed $videoID
*/
function CheckVideo($videoID, &$regenerate_video)
{
    $done = false;
    $regenerate_video = false;
    $elapsed = 0;

    $dir = GetVideoPath($videoID, true);
    if( is_dir("./$dir") )
    {
        if (is_file("./$dir/video.mp4")) {
            $done = true;
            GenerateVideoThumbnail("./$dir");
        } else {
            $created = filemtime("./$dir");
            if ($created !== false) {
                $elapsed = time() - $created;
                if ($elapsed > 600)
                    $regenerate_video = true;
            }
        }
        if ($regenerate_video) {
            delTree("./$dir");
        }
    } else
        $regenerate_video = true;
        
    return $done;
}

/**
* Generate the HTML for embedding the video
* 
* @param mixed $id
*/
function VideoHtml($id)
{
    global $videoCount;
    global $weblite;
    $videoCount++;
    $width = 816;
    $height = 384;

    $dir = GetVideoPath($id, true);
    $hasThumb = false;
    if( is_file("./$dir/video.png") )
    {
        $hasThumb = true;
        list($width, $height) = getimagesize("./$dir/video.png");
    }
    
    echo "<script>\n";
    if (array_key_exists('html', $_REQUEST) && $_REQUEST['html'])
        echo "_V_.options.techOrder = ['html5', 'flash'];\n";
    else
        echo "_V_.options.techOrder = ['flash', 'html5'];\n";
    echo "_V_.options.flash.swf = '/video/player/flowplayer-3.2.16.swf';\n";
    echo "_V_.options.flash.flashVars = {config:\"{";
    echo "'clip':{'scaling':'fit'},";
    echo "'plugins':{'controls':{'volume':false,'mute':false,'stop':true,'tooltips':{'buttons':true,'fullscreen':'Enter fullscreen mode'}}},";
    echo "'canvas':{'backgroundColor':'#000000','backgroundGradient':'none'},";
    if ($hasThumb) {
        echo "'playlist':[{'url':'/$dir/video.png'},{'url':'/$dir/video.mp4','autoPlay':false,'autoBuffering':false}]";
    } else {
        echo "'playlist':[{'url':'/$dir/video.mp4','autoPlay':false,'autoBuffering':true}]";
    }
    echo "}\"};\n";
    echo "_V_.options.flash.params = {
           allowfullscreen: 'true',
           wmode: 'transparent',
           allowscriptaccess: 'always'
       };
       _V_.options.flash.attributes={};\n";
    echo "</script>\n";
        
    echo "<video id=\"player\" class=\"player video-js vjs-default-skin\" controls
      preload=\"auto\" width=\"$width\" height=\"$height\"";
    if ($hasThumb)
        echo " poster=\"/$dir/video.png\"";
    echo "data-setup=\"{}\">
        <source src=\"/$dir/video.mp4\" type='video/mp4'>
    </video>";

    if (!$weblite)
      echo "<br>* The video for each page stops when the page is visually complete and may not match the technical load time measurement.\n";
    echo "<br><a class=\"link\" href=\"/video/download.php?id=$id\">Click here to download the video file...</a>\n";
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

/**
* Display progress information about the test
* 
* @param mixed $tests
*/
function DisplayProgress(&$tests)
{
    global $debug;
    global $json;
    global $json_response;
    $elapsed = -1;
    $position = -1;
    $seconds = -1;
    require_once('testStatus.inc');
    foreach($tests['urls'] as &$test)
    {
        $status = GetTestStatus($test['id']);
        $statusCode = $status['statusCode'];
        if( $statusCode == 100 || $statusCode == 200 )
        {
            if( $elapsed < 0 || $status['elapsed'] > $elapsed ) {
                $elapsed = $status['elapsed'];
            }
        }
        elseif( $statusCode == 101 )
        {
            if( $position < 0 || $status['behindCount'] < $position ) {
                $position = $status['behindCount'];
            }
        }
    }

    $statusText = 'Waiting to be tested';
    $img = "waiting";
    if( $elapsed >= 0 )
    {
        $seconds = $elapsed;
        $img = "testing";
        if( $elapsed == 0 )
          $statusText = "Test just started";
        elseif( $elapsed == 1 )
          $statusText = "Test Started $elapsed second ago";
        elseif( $elapsed < 60 )
          $statusText = "Test Started $elapsed seconds ago";
        else
        {
          $elapsed = floor($elapsed / 60);
          if( $elapsed == 1 )
            $statusText = "Test Started $elapsed minute ago";
          else
            $statusText = "Test Started $elapsed minutes ago";
        }
    }
    elseif( $position >= 0 )
    {
        if( $position > 1 )
            $statusText = "Waiting behind $count other tests...";
        elseif( $position == 1 )
            $statusText = "Waiting behind 1 other test...";
        else
            $statusText = "Waiting at the front of the queue...";
    }
    
    if($json) {
        if( $seconds >= 0 ) {
            $json_response['statusCode'] = 102;
            $json_response['data'] = array('elapsed' => $seconds);
        } elseif( $position >= 0 ) {
            $json_response['statusCode'] = 101;
            $json_response['data'] = array('position' => $position);
        } else {
            $json_response['statusCode'] = 100;
        }
        $json_response['statusText'] = $statusText;
    } else {
        echo '<br><div id="statusImg">';
        echo "<img id='statusImage' src=\"{$GLOBALS['cdnPath']}/images/status_$img.png\">";
        echo "<div id=\"statusText\">$statusText</div>\n";
        echo '</div><br>';
    }    
}

/**
* Calculate some aggregate stats off of the individual results
* 
* @param mixed $original
*/
function GetRequestStats(&$requests, &$domains, &$mime_stats) {
    $mime_stats['html'] = array('count' => 0, 'bytes' => 0);
    $mime_stats['css'] = array('count' => 0, 'bytes' => 0);
    $mime_stats['javascript'] = array('count' => 0, 'bytes' => 0);
    $mime_stats['jpeg'] = array('count' => 0, 'bytes' => 0);
    $mime_stats['png'] = array('count' => 0, 'bytes' => 0);
    $mime_stats['gif'] = array('count' => 0, 'bytes' => 0);
    $mime_stats['webp'] = array('count' => 0, 'bytes' => 0);
    $mime_stats['other images'] = array('count' => 0, 'bytes' => 0);
    $mime_stats['other'] = array('count' => 0, 'bytes' => 0);
        
    foreach( $requests as &$request )
    {
        if (strlen($request['host']))
            $domains[$request['host']] = 1;
        
        $mime = $request['contentType'];
        $contentType = 'other';
        if( stripos($mime, 'javascript') !== false || 
            stripos($mime, 'ecmascript') !== false || 
            !strcasecmp($mime, 'text/js') )
        {
            $contentType = 'javascript';
        }
        elseif( !strcasecmp($mime, 'text/css') )
            $contentType = 'css';
        elseif( !strcasecmp($mime, 'text/html') )
            $contentType = 'html';
        elseif( !strcasecmp($mime, 'image/jpeg') )
            $contentType = 'jpeg';
        elseif( !strcasecmp($mime, 'image/png') )
            $contentType = 'png';
        elseif( !strcasecmp($mime, 'image/gif') )
            $contentType = 'gif';
        elseif( !strcasecmp($mime, 'image/webp') )
            $contentType = 'webp';
        elseif( !strncasecmp($mime, 'image/', 6) )
            $contentType = 'other images';

        $mime_stats[$contentType]['count']++;
        $mime_stats[$contentType]['bytes'] += $request['bytesIn'];
    }
}
?>
