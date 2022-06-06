<?php

// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
require_once(__DIR__ . '/../util.inc');
if( !isset($_REQUEST['tests']) && isset($_REQUEST['t']) )
{
    $tests = '';
    foreach($_REQUEST['t'] as $t)
    {
        $parts = explode(',', $t);
        if( count($parts) >= 1 )
        {
            if( strlen($tests) )
                $tests .= ',';
            $tests .= trim($parts[0]);
            if( array_key_exists(1, $parts) && strlen($parts[1]) )
                $tests .= "-r:{$parts[1]}";
        }
    }

    

    $protocol = getUrlProtocol();
    $host  = $_SERVER['HTTP_HOST'];
    $uri = $_SERVER['PHP_SELF'];
    $params = '';
    foreach( $_GET as $key => $value )
        if( $key != 't' )
            $params .= "&$key=" . urlencode($value);
    header("Location: $protocol://$host$uri?tests=$tests{$params}");
}
else
{
    require_once __DIR__ . '/../include/UrlGenerator.php';
    chdir('..');
    include 'common.inc';
    require_once('page_data.inc');
    //
    require_once('./include/TestInfo.php');
    require_once('./include/TestResults.php');
    require_once __DIR__ . '/../include/RunResultHtmlTable.php';

    include 'video/filmstrip.inc.php';  // include the common php shared across the filmstrip code
    require_once('object_detail.inc');
    require_once('waterfall.inc');
    
    //


    
    $testPath = GetTestPath($tests[0]['id']);
    $testInfo = TestInfo::fromFiles($testPath);
    $testResults = TestResults::fromFiles($testInfo);
    $page_keywords = array('Video','comparison','WebPageTest','Website Speed Test');
    $page_description = "Visual comparison of multiple websites with a side-by-side video and filmstrip view of the user experience.";

    $title = 'Webpage visual comparison';
    $labels = '';
    $location = null;
    foreach( $tests as &$test )
    {
        if (array_key_exists('location', $test)) {
            if (!isset($location)) {
                $location = $test['location'];
            } elseif ($test['location'] != $location) {
                $location = '';
            }
        } else {
            $location = '';
        }

        if( strlen($test['name']) )
        {
            if( strlen($labels) )
                $labels .= ", ";
            $labels .= htmlspecialchars($test['name']);
        }
    }


    // See if all tests are the same ID or from a compared experiment not
    $sameIDs = true;
    foreach($tests as $key=>$value) {
        if($key !== 0 && $value['id'] !== $tests[$key - 1]['id'] ){
            $sameIDs = false;
        }
    }

    $compareTestPath = GetTestPath($tests[0]['id']);
    $compareTestInfo = TestInfo::fromFiles($testPath);
    $testTest = $compareTestInfo->getRawData()['test'];
    $testTestInfo = $compareTestInfo->getRawData()['testinfo'];
    if( count($tests) === 2 && $testTestInfo['metadata'] ) {
        $metaInfo = $testTestInfo['metadata'];
        if( $metaInfo ){
            $metaInfo = json_decode($metaInfo, true);
            if( $metaInfo['experiment'] ){
                $experiment = true;
                // NOTE: this file re-does these variables due to the $tests param (not test), unique to compare page
                $experimentOriginalTestUrlGenerator = UrlGenerator::create(FRIENDLY_URLS, "", $metaInfo['experiment']['source_id'], 0, 0 );
                $experimentOriginalTestHref = $experimentOriginalTestUrlGenerator->resultSummary();
                $experimentOriginalExperimentsHref = $experimentOriginalTestUrlGenerator->resultPage("experiments");

                $controlTestUrlGenerator = UrlGenerator::create(FRIENDLY_URLS, "", $metaInfo['experiment']['control_id'], 0, 0 );
                $controlTestHref = $controlTestUrlGenerator->resultSummary();

                $experimentResultsHref = "/video/compare.php?tests=" . $tests[0]['id'] . ',' . $metaInfo['experiment']['control_id'];
                $experimentTestHref = "/result/" . $tests[0]['id'];

                $experimentOptsUrlGenerator= UrlGenerator::create(FRIENDLY_URLS, "", $tests[0]['id'], 0, 0 );
                $experimentOptsHref = $experimentOptsUrlGenerator->resultPage("experiments");
            }
        }
    }

    
    if( $sameIDs || $experiment ){
        $test['test'] = $testTest;
        $test['testinfo'] =  $testTestInfo;
    }


    
    





    $stickyFilmstrip = true; 
    if( array_key_exists('filmstripScrollWithPage', $_GET) && strlen($_GET['filmstripScrollWithPage'])) {
        $stickyFilmstrip = false; 
    }

    if( strlen($labels) )
        $title .= ' - ' . $labels;
        

    ?>

   
    <!DOCTYPE html>
    <html lang="en-us">
        <head>
            <title>WebPageTest - <?php echo ($experiment ? "Experiment Results" : "Visual Comparison"); ?></title>
            <script>document.documentElement.classList.add('has-js');</script>

            <?php
                if( !$ready )
                {
                  $autoRefresh = true;
                  $noanalytics = true;

            ?>
                <noscript>
                <meta http-equiv="refresh" content="10" />
                </noscript>
                <script language="JavaScript">
                let reloadTimeout = setTimeout( "window.location.reload(true)", 10000 );
                </script>
            <?php
                }
                $gaTemplate = 'Visual Comparison';
                $useScreenshot = true;
                $socialTitle = $experiment ? "WebPageTest Pro Experiment Results" : "WebPageTest Visual Performance Comparison";
                $socialDesc = $experiment ? "Check out this WebPageTest Pro Experiment: " : "Check out this visual page loading comparison.";

                include ('head.inc');
            ?>
            <style>
            <?php
                $bgcolor = 'ffffff';
                $color = '222222';
                if (array_key_exists('bg', $_GET)) {
                    $bgcolor = preg_replace('/[^0-9a-fA-F]/', '', $_GET['bg']);
                }
                if (array_key_exists('text', $_GET)) {
                    $color = preg_replace('/[^0-9a-fA-F]/', '', $_GET['text']);
                }
            ?>
                #video
                {
                    margin-left: auto;
                    margin-right: auto;
                    padding-right: 100%;
                }
                #video td{
                    vertical-align: top;
                }
                #videoDiv
                {
                    overflow-y: hidden;
                    position: relative;
                    overflow: auto;
                    width: 100%;
                    height: 100%;
                    padding-bottom: 1em;
                    border-left: 1px solid #f00;
                }
                #videoContainer
                {
                    <?php
                            echo "background: #$bgcolor;\n";
                            echo "color: #$color;\n"
                        ?>
                    table-layout: fixed;
                    margin-left: auto;
                    margin-right: auto;
                    width: 100%;
                }
                <?php if ( $stickyFilmstrip ) { ?>
                    body:not(.viewport-too-short-for-sticky-filmstrip) #videoContainer {
                        position: sticky;
                        top: 0;
                        z-index: 9999;
                    }
                <?php } ?>

                #videoContainer td
                {
                    margin: 2px;
                }
                #labelContainer
                {
                    width: 8em;
                    vertical-align: top;
                    text-align: right;
                    padding-right: 0.5em;
                }
                #videoLabels
                {
                    table-layout: fixed;
                    width: 100%;
                    overflow: hidden;
                }
                th{ font-weight: normal; }
                #videoLabels td
                {
                    padding: 2px;
                }
                #video td{ padding: 2px; }
                div.content
                {
                    text-align:center;
                    <?php
                        //echo "background: #$bgcolor;\n";
                        //echo "color: #$color;\n"
                    ?>
                    font-family: arial,sans-serif
                }
                .pagelink,
                .pagelinks a
                {
                    <?php
                        //echo "color: #$color;\n"
                    ?>
                    word-wrap: break-word;
                    text-decoration: none;

                }
                .thumb{ border: 3px solid #000; }
                .thumbChanged{border: 3px solid #FFC233;}
                .thumbLCP{border: 3px solid #FF0000;}
                .thumbLayoutShifted{border-style: dotted;}
                #createForm
                {
                    width:100%;
                }
                #bottom
                {
                    width:100%;
                    text-align: left;
                }
                #layout
                {
                    float: right;
                    position: relative;
                    top: -8em;
                    z-index: 4;
                    margin-bottom: -3em;
                }
                #layoutTable
                {
                    text-align: left;
                }
                #layoutTable th
                {
                    padding-left: 1em;
                    text-decoration: underline;
                }
                #layoutTable td
                {
                    padding-left: 2em;
                    vertical-align: top;
                }
                #statusTable
                {
                    table-layout: fixed;
                    margin-left: auto;
                    margin-right: auto;
                    font-size: larger;
                    text-align: left;
                }
                #statusTable th
                {
                    text-decoration: underline;
                    padding-left: 2em;
                }
                #statusTable td
                {
                    padding-top: 1em;
                    padding-left: 2em;
                }
                #statusTable a
                {
                    color: inherit;
                }
                #image
                {
                    margin-left:auto;
                    margin-right:auto;
                    clear: both;
                }
                #advanced
                {
                    <?php
                        //echo "background: #$bgcolor;\n";
                        //echo "color: #$color;\n"
                    ?>
                    /* font-family: arial,sans-serif;
                    padding: 20px; */
                }
                #advanced td
                {
                    padding: 2px 10px;
                }
                #advanced-ok
                {
                    margin-left: auto;
                    margin-right: auto;
                    margin-top: 10px;
                    display: block;
                }
                .waterfall_marker {
                    position: absolute; top: 10px; left: 250px;
                    height: 100%;
                    width: 2px;
                    background-color: #D00;
                }
                #location {
                    text-align: left;
                    padding: 5px;
                    width: 100%;
                }
                .max-shift-window b {
                    color: #FFC233;
                    font-weight: 700;
                    font-size: 1.2em;
                    font-weight: normal;
                    line-height: 1.3;
                }
                div.compare-graph {padding:20px 0; width:900px; height:600px;margin-left:auto; margin-right:auto;}
                div.compare-graph-progress {padding:20px 0; width:900px; height:400px;margin-left:auto; margin-right:auto;}
                div.compare-graph-timings {padding:20px 0; width:900px; height:900px;margin-left:auto; margin-right:auto;}
                div.compare-graph-cls {padding:20px 0; width:900px; height:200px;margin-left:auto; margin-right:auto;}
                
                .compare-all-link{
                    padding: 5px;
                    background: #1151bb;
                    color: #fff;
                    text-decoration: none;
                    margin: .5em 5px;
                    padding: 0.6875em 2.625em;
                    border-radius: 4px;
                    font-size: .9em;
                    display: inline-block;
                }
                .compare-all-link:hover {
                    background: #296ee1;
                }
                <?php
                if (defined('EMBED')) {
                ?>
                #location {display: none;}
                #bottom {display: none;}
                #layout {display: none;}
                #export {display: none;}
                div.content {padding: 0; background-color: #fff;}
                div.page {width: 100%;}
                #videoContainer {background-color: #000; border-spacing: 0; width: 100%; margin: 0;}
                #videoDiv {padding-bottom: 0;}
                body {background-color: #fff; margin: 0; padding: 0;}
                <?php
                }
                ?>
                /* div.waterfall-container {top: -2em; width:1012px; margin: 0 auto;} */
                <?php
                if ( $stickyFilmstrip ) {
                ?>
                    div.waterfall-sliders {
                        position: sticky;
                        top: 0;
                        z-index: 9999;
                    }
                <?php
                }
                ?>
            </style>


            
        </head>
        <body class="result compare <?php if($experiment){ echo ' compare-experiment'; }  if($req_screenshot){ echo ' screenshot'; } if(!$ready){ echo ' compare-loading'; }   ?>">
                <?php 
                $tab = 'Test Result';
                //$nosubheader = false;
                if( $experiment ){
                    $subtab = 'Experiment Results & Filmstrip';
                } else {
                    $subtab = 'Filmstrip';
                }

                //$headerType = 'video';
                $filmstrip = $_REQUEST['tests'];

                include __DIR__ . '/../header.inc';

                if( $error ) {
                    echo "<h1>$error</h1>";
                } elseif( $ready ) {

                    ?>
                    <div class="results_main_contain">
                    <div class="results_main">
            
                    
                    <div class="results_and_command">
            
                       <div class="results_header">
                            <?php 



                                if( !$experiment ){
                                    if (count($tests) > 1 ) {
                                        echo '<h2>Filmstrip Comparison</h2>';
                                    }
                                    else {
                                        echo '<h2>Filmstrip View</h2>';
                                    }
                                    echo '<p>Use this page to explore and compare timing and request details from one or more tests.</p>';
                                } else {
                                    echo '<h2>Experiment Results</h2>';
                                    echo '<div class="experiment_meta">';
                                    echo '<div class="experiment_meta_included">';
                                    echo '<p>Experiments Applied:</p>';
                                    echo '<ul>';
                                    include __DIR__ . '/../experiments/list_applied.inc';

                                    echo "<li><a class=\"experiment_meta-more\" href=\"". $experimentOriginalExperimentsHref ."\">Experiment More</a></li>";
                                    echo '</ul>';
                                    echo '</div>';
                                    echo '<div class="experiment_meta_urls">';

                                    echo '<p>Links:</p>';
                                    echo "<ul>
                                    <li><a href=\"". $experimentResultsHref ."\">Experiment Results</a></li>
                                    <li><a href=\"". $experimentTestHref ."\">Experiment</a></li>
                                    <li><a href=\"". $controlTestHref ."\">Control</a></li>
                                    <li><a href=\"". $experimentOriginalTestHref ."\">Original</a></li>
                                    </ul>";
                                    echo "</div>";
                                    echo "</div>"; ?>

<?php

echo '<div class="experiment_impact"><h3 class="hed_sub">Experiment Impact <em>(Notable changes between experiment and control)</em></h3>';
include __DIR__ . '/../experiments/findings.inc';
echo "</div>";

?>


                                    <div class="experiment_opportunities">
                                    <?php 
                                        include __DIR__ . '/../experiments/compare-assessments.inc'; 
                                        // if(count($assessmentChanges)){
                                        //     $numAssessmentChanged = count($assessmentChanges);
                                        //     $assessEnding = $numAssessmentChanged === 1 ? "" : "s";
                                        //     echo '<div class="experiment_opportunities-resolved">
                                        //         <h3 class="hed_sub">Resolved Opportunities</h3>
                                        //         <p>This experiment resolved '. $numAssessmentChanged .' bottleneck' . $assessEnding .':</p>
                                        //             <ol>';
                                                
                                        //     foreach($assessmentChanges as $change){
                                        //         echo '<li class="good">' . $change . '</li>';
                                        //     }
                                        // echo '</ol></div>';
                                        // }
                                    ?>

                                        
                                        <div class="experiment_opportunities-remaining">
                                            <h3 class="hed_sub">Remaining Opportunities</h3>
                                            <p>Here's how your overall opportunities look after this experiment:</p>
                                            <?php include __DIR__ . '/../experiments/summary.inc'; ?>
                                        </div>
                                    </div>

                                   

                                    


                                    <?php

                                    echo '<h3 class="hed_sub">Filmstrip Comparison <em>(Experiment vs. Control)</em></h3>';

                                   

                                }
                                
                            ?>
                            
                    <?php



   
                     ?>
                        </div>
            
                        
            
                        </div>
            
                        
                        <div id="result" class="results_body">


<?php 

                    echo '<div class=""><div class="test_results-content">';
                    echo '<div class="test_results_header">';
                    

                    echo '<div class="compare_settings">';
                    include 'video/filmstrip_settings.php';

                    
                    echo '</div>';
                        
                    echo '<div class="compare_key">
                    <h3>Filmstrip key:</h3>
                    <ul class="key">';
                    if (isset($_REQUEST['highlightCLS']) && $_REQUEST['highlightCLS']) {?>
                    <li class="max-shift-window full"><b>*</b> Shift impacts LCP Score</li>
                    <?php }
                    echo '
                        <li><b class="thumbChanged"></b>Visual change</li>
                        <li><b class="thumbChanged thumbLayoutShifted"></b>Visual change + Layout Shift</li>
                        <li><b class="thumbLCP"></b>Largest Contentful Paint</li>
                        <li><b class="thumbLCP thumbLayoutShifted"></b>Largest Contentful Paint + Layout Shift</li>
                    </ul>
                    </div><!--compare_key-->
                    </div>';
                    ?>


            <?php
                    
                    
                    ScreenShotTable();
                    echo '<div class="compare_contain_wrap">';
                    DisplayGraphs();
                    echo '</div>';
                    echo '</div>';
                } else {
                    DisplayStatus();
                }

                echo '</div>';
                ?>
                <?php include('footer.inc'); ?>
                
                </div>
                </div></div>
                </div>

            <script>
                function ShowAdvanced()
                {
                    $("#advanced").modal({opacity:80});
                }

                $("#videoDiv").scroll(function() {
                    UpdateScrollPosition();
                });

                function UpdateScrollPosition() {
                    var position = $("#videoDiv").scrollLeft();
                    var viewable = $("#videoDiv").width();
                    var width = $("#video").width();
                    if (thumbWidth && thumbWidth < width)
                      width -= thumbWidth;
                    <?php
                    $padding = 250;
                    if (array_key_exists('hideurls', $_REQUEST) && $_REQUEST['hideurls'])
                      $padding = 30;
                    echo "var padLeft = $padding;\n";
                    ?>
                    var marker = parseInt(padLeft + ((position / width) * (1012 - padLeft)));
                    $('.waterfall_marker').css('left', marker + 'px');
                    $('.waterfall_marker').parent()[0].scrollTo( {left: marker - (viewable - 50) } )
                }
                UpdateScrollPosition();

                <?php
                include "waterfall.js";
                ?>

                const VIEWPORT_TO_FILMSTRIP_THRESHOLD = 100 / 60
                function UpdateFilmstripStickyness(viewportTooShort) {
                    document.body.classList.toggle('viewport-too-short-for-sticky-filmstrip', viewportTooShort)
                }
                function WatchViewportToFilmstripThreshold(callback) {
                    const filmstrip = document.getElementById('videoContainer')
                    const viewportHeightThreshold = filmstrip.offsetHeight * VIEWPORT_TO_FILMSTRIP_THRESHOLD

                    const shortViewport = window.matchMedia(`(max-height: ${viewportHeightThreshold}px)`)
                    shortViewport.addEventListener('change', shortViewport =>
                        callback(shortViewport.matches)
                    )
                    callback(shortViewport.matches)
                }
                WatchViewportToFilmstripThreshold(UpdateFilmstripStickyness)
            </script>
        </body>
    </html>

    <?php
}

/**
* Build a side-by-side table with the captured frames from each test
*
*/
function ScreenShotTable()
{
    global $tests;
    global $thumbSize;
    global $interval;
    global $maxCompare;
    global $color;
    global $bgcolor;
    global $supports60fps;
    global $location;
    
    $has_layout_shifts = false;

    $show_shifts = false;
    if (isset($_REQUEST['highlightCLS']) && $_REQUEST['highlightCLS'])
        $show_shifts = true;

    $show_lcp = false;
    if (isset($_REQUEST['highlightLCP']) && $_REQUEST['highlightLCP'])
        $show_lcp = true;
    
    $filmstrip_end_time = 0;
    if( count($tests) )
    {
        // figure out how many columns there are and the maximum thumbnail size
        $end = 0;
        foreach( $tests as &$test ) {
            if( $test['video']['end'] > $end )
                $end = $test['video']['end'];
        }

        // if (!defined('EMBED')) {
        //     echo '<br>';
        // }

        echo '<table id="videoContainer"><tr>';



        // the actual video frames
        echo '<td><div id="videoDiv"><table id="video"><thead><tr>';
        $filmstrip_end_time = ceil($end / $interval) * $interval;
        $decimals = $interval >= 100 ? 1 : 3;
        $frameCount = 0;
        $ms = 0;
        while( $ms < $filmstrip_end_time ) {
          $ms = $frameCount * $interval;
          echo '<th>' . number_format((float)$ms / 1000.0, $decimals) . 's</th>';
          $frameCount++;
        }
        echo "</tr></thead><tbody>\n";

        $firstFrame = 0;
        $maxThumbWidth = 0;
        foreach($tests as &$test) {
            // first, let's print a run label row
            echo "<tr class=\"video_runlabel\"><th colspan=\"$frameCount\"><span class=\"video_runlabel_text\">";
            // Print the index outside of the link tag
            echo $test['index'] . ': ';
            
            if (!defined('EMBED')) {
                echo " <span id=\"label_{$test['id']}\">" . WrapableString(htmlspecialchars($test['name'])) . "</span>";
            } else {
                echo WrapableString(htmlspecialchars($test['name']));
            }

            // Print out a link to edit the test
            echo ' <a href="#" class="editLabel" data-test-guid="' . $test['id'] . '" data-current-label="' . htmlentities($test['name']) . '">';
            if (class_exists("SQLite3"))
              echo 'Edit title';
            echo '</a>';

            if (!defined('EMBED')) {
                $urlGenerator = UrlGenerator::create(FRIENDLY_URLS, "", $test['id'], $test['run'], $test['cached'], $test['step']);
                $href = $urlGenerator->resultPage("details") . "#waterfall_view_step" . $test['step'];
                echo "<a class=\"video_runlabel_backlink\" href=\"$href\">Test Run Details</a>";
            }

            echo "</span></td></tr>";


            $aft = (int)$test['aft'] / 100;
            $hasStepResult = isset($test['stepResult']) && is_a($test['stepResult'], "TestStepResult");
            $lcp = null;
            if (isset($test['stepResult']) && is_a($test['stepResult'], "TestStepResult")) {
                $lcp = $test['stepResult']->getMetric('chromeUserTiming.LargestContentfulPaint');
            }
            $cls = 0;
            $shifts = array();
            $viewport = null;
            $lcp_events = array();
            $has_lcp_rect = false;
            $shiftWindows = array();
            $maxWindow = null;

            if (isset($test['stepResult']) && is_a($test['stepResult'], "TestStepResult")) {
                $layout_shifts = $test['stepResult']->getMetric('LayoutShifts');
                $cls = $test['stepResult']->getMetric('chromeUserTiming.CumulativeLayoutShift');
                $viewport = $test['stepResult']->getMetric('viewport');
                if (isset($layout_shifts) && is_array($layout_shifts) && count($layout_shifts)) {
                    foreach($layout_shifts as $shift) {
                        if (isset($shift['time'])) {
                            $shifts[] = $shift;
                        }
                        if (isset($shift['shift_window_num'])) {
                            if (isset($shiftWindows[$shift['shift_window_num']])) {
                                $shiftWindows[$shift['shift_window_num']] = max($shiftWindows[$shift['shift_window_num']], $shift['window_score']);
                            } else {
                                $shiftWindows[$shift['shift_window_num']] = $shift['window_score'];
                            }
                        }
                    }
                    $maxWindow = array_keys($shiftWindows, max($shiftWindows))[0];
                }
                usort($shifts, function($a, $b){
                    return $a['time'] - $b['time'];
                });
                if (isset($lcp)) {
                    $lcp_time = $lcp;
                    $paint_events = $test['stepResult']->getMetric('largestPaints');
                    if (isset($paint_events) && is_array($paint_events) && count($paint_events)) {
                        foreach($paint_events as $paint) {
                            if (isset($paint['event']) &&
                                $paint['event'] == 'LargestContentfulPaint' &&
                                isset($paint['time']) &&
                                isset($paint['element']['boundingRect'])) {
                                if ($paint['time'] == $lcp) {
                                    $has_lcp_rect = true;
                                }
                                $lcp_events[] = array('time' => $paint['time'],
                                                      'top' => $paint['element']['boundingRect']['y'],
                                                      'left' => $paint['element']['boundingRect']['x'],
                                                      'width' => $paint['element']['boundingRect']['width'],
                                                      'height' => $paint['element']['boundingRect']['height']);
                            }
                        }
                        usort($lcp_events, function($a, $b){
                            return $a['time'] - $b['time'];
                        });
                    }
                }
            }

            // figure out the height of the image
            $height = 0;
            $width = $thumbSize;
            if( $test['video']['width'] && $test['video']['height'] ) {
                if ($test['video']['width'] > $test['video']['height'] ) {
                    $width = $thumbSize;
                    $height = (int)(((float)$thumbSize / (float)$test['video']['width']) * (float)$test['video']['height']);
                } else {
                    $height = $thumbSize;
                    $width = (int)(((float)$thumbSize / (float)$test['video']['height']) * (float)$test['video']['width']);
                }
            }
            $maxThumbWidth = max($maxThumbWidth, $width);
            
            echo "<tr>";

            $testEnd = ceil($test['video']['end'] / $interval) * $interval;
            $lastThumb = null;
            $frameCount = 0;
            $progress = null;
            $ms = 0;
            $localPaths = new TestPaths(GetTestPath($test['id']), $test['run'], $test['cached'], $test['step']);
            $urlGenerator = UrlGenerator::create(false, "", $test['id'], $test['run'], $test['cached'], $test['step']);
            while( $ms < $filmstrip_end_time ) {
                $ms = $frameCount * $interval;
                // find the closest video frame <= the target time
                $frame_ms = null;
                $last_frame = null;
                if (isset($test['video']['frames']) && is_array($test['video']['frames']) && count($test['video']['frames'])) {
                  foreach ($test['video']['frames'] as $frameTime => $file) {
                    if ($frameTime <= $ms && (!isset($frame_ms) || $frameTime > $frame_ms))
                      $frame_ms = $frameTime;
                  }
                  $last_frame = end($test['video']['frames']);
                  reset($test['video']['frames']);
                }
                $path = null;
                $is_last_frame = false;
                if (isset($frame_ms)) {
                  $path = $test['video']['frames'][$frame_ms];
                  if ($path == $last_frame) {
                    $is_last_frame = true;
                  }
                }
                if (array_key_exists('frame_progress', $test['video']) &&
                    array_key_exists($frame_ms, $test['video']['frame_progress']))
                  $progress = $test['video']['frame_progress'][$frame_ms];
                $label = $progress;
                if (isset($label))
                    $label = "$label%";

                if( !isset($lastThumb) )
                    $lastThumb = $path;

                echo '<td>';

                if ($ms <= $testEnd) {
                    $imgPath = $localPaths->videoDir() . "/" . $path;
                    echo "<a href=\"/$imgPath\">";
                    echo "<img title=\"" . htmlspecialchars($test['name']) . "\"";
                    $class = 'thumb';
                    $rects = null;
                    $lcp_candidate_rects = null;
                    $lcp_rects = null;
                    $shift_amount = 0.0;
                    $shift_window = 0;
                    $changed = false;
                    if ($lastThumb != $path) {
                        if( !$firstFrame || $frameCount < $firstFrame )
                            $firstFrame = $frameCount;
                        $class = 'thumbChanged';
                        $changed = true;
                        if (isset($lcp) && $ms >= $lcp) {
                            $class = 'thumbLCP';
                            $lcp = null;
                        }
                    }
                    if ($changed || $is_last_frame) {
                        if (count($shifts) && $ms > $shifts[0]['time']) {
                            $class .= ' thumbLayoutShifted';
                            while(count($shifts) && $ms > $shifts[0]['time']) {
                                $shift = array_shift($shifts);
                                if (isset($shift['score'])) {
                                    $shift_amount += $shift['score'];
                                }
                                if (isset($shift['shift_window_num'])) {
                                    $shift_window = $shift['shift_window_num'];
                                }
                                if (isset($viewport) &&
                                        isset($viewport['width']) &&
                                        $viewport['width'] > 0 &&
                                        isset($viewport['height']) &&
                                        $viewport['height'] > 0 &&
                                        isset($shift['rects']) &&
                                        is_array($shift['rects']) &&
                                        count($shift['rects']) &&
                                        isset($shift['score']) &&
                                        $shift['score'] > 0) {
                                    $has_layout_shifts = true; 
                                    
                                    // Figure out the x,y,width,height as a fraction of the viewport (3 decimal places as an integer)
                                    foreach($shift['rects'] as $rect) {
                                        if (is_array($rect) && count($rect) == 4) {
                                            $shift_x = (int)(($rect[0] * 1000) / $viewport['width']);
                                            $shift_y = (int)(($rect[1] * 1000) / $viewport['height']);
                                            $shift_width = (int)(($rect[2] * 1000) / $viewport['width']);
                                            $shift_height = (int)(($rect[3] * 1000) / $viewport['height']);
                                            if ($shift_width > 0 && $shift_height > 0) {
                                                if (isset($rects)) {
                                                    $rects .= ',';
                                                } else {
                                                    $rects = '';
                                                }
                                                $rects .= "$shift_x.$shift_y.$shift_width.$shift_height";
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (isset($viewport) &&
                                isset($viewport['width']) &&
                                $viewport['width'] > 0 &&
                                isset($viewport['height']) &&
                                $viewport['height'] > 0) {
                            while(count($lcp_events) && $ms > $lcp_events[0]['time']) {
                                $lcp_event = array_shift($lcp_events);
                                $lcp_x = (int)(($lcp_event['left'] * 1000) / $viewport['width']);
                                $lcp_y = (int)(($lcp_event['top'] * 1000) / $viewport['height']);
                                $lcp_width = (int)(($lcp_event['width'] * 1000) / $viewport['width']);
                                $lcp_height = (int)(($lcp_event['height'] * 1000) / $viewport['height']);
                                if ($lcp_width > 0 && $lcp_height > 0) {
                                    if ($lcp_event['time'] == $lcp_time) {
                                        if (isset($lcp_rects)) {
                                            $lcp_rects .= ',';
                                        } else {
                                            $lcp_rects = '';
                                        }
                                        $lcp_rects .= "$lcp_x.$lcp_y.$lcp_width.$lcp_height";
                                    } else {
                                        if (isset($lcp_candidate_rects)) {
                                            $lcp_candidate_rects .= ',';
                                        } else {
                                            $lcp_candidate_rects = '';
                                        }
                                        $lcp_candidate_rects .= "$lcp_x.$lcp_y.$lcp_width.$lcp_height";
                                    }
                                }
                            }
                        }
                    }
                    echo " class=\"$class\"";
                    echo " width=\"$width\"";
                    if( $height )
                        echo " height=\"$height\"";
                    $options = null;
                    if ($show_shifts && isset($rects)) {
                        $overlay_color = 'FF0000AA'; // Red with 50% transparency (transparency is ignored for the border)
                        $options = "rects=$overlay_color-$rects";
                    }
                    if ($show_lcp && isset($lcp_candidate_rects)) {
                        $overlay_color = '0000FFAA'; // Blue with 50% transparency (transparency is ignored for the border)
                        if (isset($options))
                            $options .= '|';
                        else
                            $options = 'rects=';
                        $options .= "$overlay_color-$lcp_candidate_rects";
                    }
                    if ($show_lcp && isset($lcp_rects)) {
                        $overlay_color = '00FF00AA'; // Green with 50% transparency (transparency is ignored for the border)
                        if (isset($options))
                            $options .= '|';
                        else
                            $options = 'rects=';
                        $options .= "$overlay_color-$lcp_rects";
                    }
                    $imgUrl = $urlGenerator->videoFrameThumbnail($path, $thumbSize, $options);
                    echo " src=\"$imgUrl\"></a>";

                    if ($show_shifts) {
                        $label = "&nbsp;";
                        if (isset($shift_amount) && number_format($shift_amount, 3, ".", "") > 0.0 && isset($shift_window) && number_format($shiftWindows[$shift_window], 3, ".", "") > 0.0) {
                            
                            $label = number_format($shift_amount, 3, ".", "") . ' / ' . number_format($shiftWindows[$shift_window], 3, ".", "");
                            $label .= '<br>Window: ' . $shift_window;
                            if ($shift_window == $maxWindow) {
                                $label = '<b class="max-shift-window">' . $label . '*</b>';
                            }
                        }
                    }
                    if (isset($label))
                        echo "<br>$label";
                    $lastThumb = $path;
                }
                $frameCount++;
                echo '</td>';
            }
            echo "</tr>\n";
        }
        echo "</tr>\n";

        // end of the table
        echo "</tbody></table></div>\n";

        // end of the container table
        echo "</td></tr></table>\n";?>

        <div class="compare_contain_wrap">

        <?php if (!defined('EMBED')) {
            // display the waterfall if there is only one test
            $end_seconds = $filmstrip_end_time / 1000;
            if( count($tests) == 1 ) {
                /* @var TestStepResult $stepResult */
                $stepResult = $tests[0]["stepResult"];
                $requests = $stepResult->getRequestsWithInfo(true, true)->getRequests();
                echo CreateWaterfallHtml('', $requests, $tests[0]['id'], $tests[0]['run'], $tests[0]['cached'], $stepResult->getRawResults(),
                                        "&max=$end_seconds&mime=1&state=1&cpu=1&bw=1", $tests[0]['step']);
                // echo '<br><br>';
            } else {
            $waterfalls = array();
            foreach ($tests as &$test) {
                $waterfalls[] = array('id' => $test['id'],
                                    'label' => htmlspecialchars($test['name']),
                                    'run' => $test['run'],
                                    'step' => $test['step'],
                                    'cached' => $test['cached']);
            }
            $labels='';
            if (array_key_exists('hideurls', $_REQUEST) && $_REQUEST['hideurls'])
                $labels = '&labels=0';
            InsertMultiWaterfall($waterfalls, "&max=$end_seconds&mime=1&state=1&cpu=1&bw=1$labels");
            }
        ?>

       
        <?php   } // EMBED?>
        </div>

        <?php
        // scroll the table to show the first thumbnail change
        $scrollPos = $firstFrame * ($maxThumbWidth + 6);
        ?>
        <script language="javascript">
            var thumbWidth = <?php echo "$maxThumbWidth + 4;"; ?>
            var scrollPos = <?php echo "$scrollPos;"; ?>
            document.getElementById("videoDiv").scrollLeft = scrollPos;
        </script>
        <?php
    }
}

/**
* Not all of the tests are done yet so display a progress update
*
*/
function DisplayStatus()
{
    global $tests;
    global $experiment;
    global $metaInfo;

    echo '<div class="results_main_contain">
    <div class="results_main">';

    if( $experiment ){
        echo '<div class="results_header"><h1>WebPageTest <span class="pro-flag">Pro</span> Experiment</h1><p>Please wait while the tests are run...</p></div>';
    } else {
        echo '<div class="results_header"><h1>Filmstrip Comparison</h1><p>Please wait while the tests are run...</p></div>';
    }

    echo '<div id="result" class="results_body">';

    if( $metaInfo && $metaInfo['experiment'] ){
    echo '<div class="experiment_meta"><div class="experiment_meta_included"><p>Experiments running:</p>';
    echo '<ul>';
    include __DIR__ . '/../experiments/list_applied.inc';
    
    echo '</ul></div></div>';
    }


    echo "<div class='scrollableTable'><table id=\"statusTable\" class=\"pretty\"><tr><th>Test</th><th>Status</th></tr><tr>";
    foreach($tests as &$test)
    {
        echo "<tr><td><a href=\"/result/{$test['id']}/\">" . htmlspecialchars($test['name']) . "</a></td><td>";
        if( $test['done'] )
            echo "Done";
        elseif( $test['started'] )
            echo "Testing...";
        else
            echo "Waiting to be tested...";

        echo "</td></tr>";
    }
    echo "</table></div>";
}

/**
* Create a wrapable string from what was passed in
*
* @param mixed $in
*/
function WrapableString($in)
{
    if( strpos(trim($in), ' '))
        $out = $in;
    else
        $out = join("&#8203;",str_split($in,1));

    return $out;
}

/**
* Display the comparison graph with the various time metrics
*
*/
function DisplayGraphs() {
    global $tests;
    global $filmstrip_end_frame;
    require_once('breakdown.inc');
    $mimeTypes = array('html', 'js', 'css', 'image', 'flash', 'font','video', 'other');
    $timeMetrics = array('visualComplete' => 'Visually Complete',
                        'lastVisualChange' => 'Last Visual Change',
                        'docTime' => 'Load Time (onload)',
                        'fullyLoaded' => 'Load Time (Fully Loaded)',
                        'domContentLoadedEventStart' => 'DOM Content Loaded',
                        'SpeedIndex' => 'Speed Index',
                        'TTFB' => 'Time to First Byte',
                        'titleTime' => 'Time to Title',
                        'render' => 'Time to Start Render',
                        'fullyLoadedCPUms' => 'CPU Busy Time');
    $progress_end = 0;
    $layout_shifts_end = 0;
    $has_cls = false;
    foreach($tests as &$test) {
        $hasStepResult = array_key_exists('stepResult', $test) && is_a($test['stepResult'], "TestStepResult");
        if ($hasStepResult &&
            !isset($timeMetrics['visualComplete85']) &&
            $test['stepResult']->getMetric('visualComplete85') > 0) {
            $timeMetrics['visualComplete85'] = "85% Visually Complete";
        }
        if ($hasStepResult &&
            !isset($timeMetrics['visualComplete90']) &&
            $test['stepResult']->getMetric('visualComplete90') > 0) {
            $timeMetrics['visualComplete90'] = "90% Visually Complete";
        }
        if ($hasStepResult &&
            !isset($timeMetrics['visualComplete95']) &&
            $test['stepResult']->getMetric('visualComplete95') > 0) {
            $timeMetrics['visualComplete95'] = "95% Visually Complete";
        }
        if ($hasStepResult &&
            !isset($timeMetrics['visualComplete99']) &&
            $test['stepResult']->getMetric('visualComplete99') > 0) {
            $timeMetrics['visualComplete99'] = "99% Visually Complete";
        }
        if ($hasStepResult &&
            !isset($timeMetrics['firstContentfulPaint']) &&
            $test['stepResult']->getMetric('firstContentfulPaint') > 0) {
            $timeMetrics['firstContentfulPaint'] = "First Contentful Paint";
        }
        if ($hasStepResult &&
            !isset($timeMetrics['chromeUserTiming.firstMeaningfulPaint']) &&
            $test['stepResult']->getMetric('chromeUserTiming.firstMeaningfulPaint') > 0) {
            $timeMetrics['chromeUserTiming.firstMeaningfulPaint'] = "First Meaningful Paint";
        }
        if ($hasStepResult &&
            !isset($timeMetrics['chromeUserTiming.LargestContentfulPaint']) &&
            $test['stepResult']->getMetric('chromeUserTiming.LargestContentfulPaint') > 0) {
            $timeMetrics['chromeUserTiming.LargestContentfulPaint'] = "Largest Contentful Paint";
        }
        if ($hasStepResult &&
            !isset($timeMetrics['TimeToInteractive']) &&
            $test['stepResult']->getMetric('TimeToInteractive') > 0) {
            $timeMetrics['TimeToInteractive'] = "Time To Interactive";
        }
        if ($hasStepResult &&
            !isset($timeMetrics['TotalBlockingTime']) &&
            $test['stepResult']->getMetric('TotalBlockingTime') !== null) {
            $timeMetrics['TotalBlockingTime'] = "Total Blocking Time";
        }
        if ($hasStepResult &&
            !$has_cls &&
            $test['stepResult']->getMetric('chromeUserTiming.CumulativeLayoutShift') !== null) {
            $has_cls = true;
        }
        
        $test['breakdown'] = $hasStepResult ? $test['stepResult']->getMimeTypeBreakdown() : array();
        if (array_key_exists('progress', $test['video'])
            && array_key_exists('frames', $test['video']['progress'])) {
            foreach ($test['video']['progress']['frames'] as $ms => &$data) {
                if ($ms > $progress_end && array_key_exists('progress', $data)) {
                    $progress_end = $ms;
                }
            }
        }

        if ($hasStepResult) {
            $shifts = $test['stepResult']->getMetric('LayoutShifts');
            if ($shifts !== null && is_array($shifts) && count($shifts)) {
                foreach($shifts as $shift) {
                    if (isset($shift['time']) && $shift['time'] > $layout_shifts_end) {
                        $layout_shifts_end = $shift['time'];
                    }
                }
            }
        }
    }
    if ($progress_end) {
        if ($layout_shifts_end && $progress_end > $layout_shifts_end) {
            $layout_shifts_end = $progress_end;
        }
        if ($progress_end % 100)
            $progress_end = intval((intval($progress_end / 100) + 1) * 100);
        echo '<div class="overflow-container"><div id="compare_visual_progress" class="compare-graph-progress"></div></div>';
    }
    if ($layout_shifts_end) {
        if ($layout_shifts_end % 100)
            $layout_shifts_end = intval((intval($layout_shifts_end / 100) + 1) * 100);
    }
    if (count($tests) <= 4) {
      echo '<div class="overflow-container"><div id="compare_times" class="compare-graph-timings"></div></div>';
      if ($has_cls) {
        echo '<div class="overflow-container"><div id="compare_cls" class="compare-graph-cls"></div></div>';
      }
      if ($layout_shifts_end) {
        echo '<div class="overflow-container"><div id="compare_layout_shifts" class="compare-graph-progress"></div></div>';
      }
      echo '<div class="overflow-container"><div id="compare_requests" class="compare-graph"></div></div>';
      echo '<div class="overflow-container"><div id="compare_bytes" class="compare-graph"></div></div>';
    } else {
      foreach($timeMetrics as $metric => $label) {
        $metricKey = str_replace('.', '', $metric);
        echo "<div class=\"overflow-container\"><div id=\"compare_times_$metricKey\" class=\"compare-graph\"></div></div>";
      }
      if ($has_cls) {
        echo '<div class="overflow-container"><div id="compare_cls" class="compare-graph-cls"></div></div>';
      }
      if ($layout_shifts_end) {
        echo '<div class="overflow-container"><div id="compare_layout_shifts" class="compare-graph-progress"></div></div>';
      }
      foreach($mimeTypes as $type) {
        echo "<div class=\"overflow-container\"><div id=\"compare_requests_$type\" class=\"compare-graph\"></div></div>";
        echo "<div class=\"overflow-container\"><div id=\"compare_bytes_$type\" class=\"compare-graph\"></div></div>";
      }
    }
    ?>
    <script src="//www.google.com/jsapi"></script>
    <script>
        google.load('visualization', '1', {'packages':['table', 'corechart']});
        google.setOnLoadCallback(drawCharts);
        function drawCharts() {
            var dataTimes = new google.visualization.DataTable();
            var dataRequests = new google.visualization.DataTable();
            var dataBytes = new google.visualization.DataTable();
            var dataCls = new google.visualization.DataTable();
            dataTimes.addColumn('string', 'Time (ms)');
            dataRequests.addColumn('string', 'MIME Type');
            dataBytes.addColumn('string', 'MIME Type');
            dataCls.addColumn('string', 'Viewports Shifted');
            <?php
            foreach($tests as &$test) {
                $name = htmlspecialchars($test['name']);
                echo "dataTimes.addColumn('number', '$name');\n";
                echo "dataRequests.addColumn('number', '$name');\n";
                echo "dataBytes.addColumn('number', '$name');\n";
                echo "dataCls.addColumn('number', '$name');\n";
            }
            echo 'dataTimes.addRows(' . count($timeMetrics) . ");\n";
            echo 'dataRequests.addRows(' . strval(count($mimeTypes) + 1) . ");\n";
            echo 'dataBytes.addRows(' . strval(count($mimeTypes) + 1) . ");\n";
            echo "dataCls.addRows(1);\n";
            if ($progress_end) {
                echo "var dataProgress = google.visualization.arrayToDataTable([\n";
                echo "  ['Time (seconds)'";
                foreach($tests as &$test)
                    echo ", '" . htmlspecialchars($test['name']) . "'";
                echo " ]";
                for ($ms = 0; $ms <= $progress_end; $ms += 10) {
                    echo ",\n  ['" . number_format($ms / 1000.0, 2) . "'";
                    foreach($tests as &$test) {
                        $progress = 0;
                        if (array_key_exists('last_progress', $test)) {
                            $progress = $test['last_progress'];
                        }
                        if (array_key_exists('progress', $test['video'])
                            && array_key_exists('frames', $test['video']['progress'])
                            && array_key_exists($ms, $test['video']['progress']['frames'])) {
                            $progress = $test['video']['progress']['frames'][$ms]['progress'];
                        }
                        $test['last_progress'] = $progress;
                        if (array_key_exists('video', $test) &&
                            array_key_exists('progress', $test['video']) &&
                            array_key_exists('frames', $test['video']['progress'])) {
                            foreach ($test['video']['progress']['frames'] as $time => $frameInfo) {
                                if ($time <= $ms)
                                    $progress = floatval($frameInfo['progress']);
                            }
                        }
                        echo ", $progress";
                    }
                    echo "]";
                }
                echo "]);\n";
            }
            if ($layout_shifts_end) {
                echo "var dataLayoutShifts = google.visualization.arrayToDataTable([\n";
                echo "  ['Time (seconds)'";
                foreach($tests as &$test) {
                    echo ", '" . htmlspecialchars($test['name']) . "'";
                    $test['layout_shifts'] = $test['stepResult']->getMetric('LayoutShifts');
                }
                echo " ]";
                for ($ms = 0; $ms <= $layout_shifts_end; $ms += 10) {
                    echo ",\n  ['" . number_format($ms / 1000.0, 2) . "'";
                    foreach($tests as &$test) {
                        $cls = 0;
                        if (isset($test['layout_shifts'])) {
                            foreach($test['layout_shifts'] as $shift) {
                                if (isset($shift['time']) && $ms >= $shift['time'] && isset($shift['cumulative_score']) && $shift['cumulative_score'] > $cls) {
                                    $cls = $shift['cumulative_score'];
                                }
                            }
                        }
                        echo ", $cls";
                    }
                    echo "]";
                }
                echo "]);\n";
            }
            $row = 0;
            foreach($timeMetrics as $metric => $label) {
                echo "dataTimes.setValue($row, 0, '$label');\n";
                $column = 1;
                foreach($tests as &$test) {
                    $hasStepResult = array_key_exists('stepResult', $test) && is_a($test['stepResult'], "TestStepResult");
                    if ($hasStepResult && $test['stepResult']->getMetric($metric) !== null)
                      echo "dataTimes.setValue($row, $column, {$test['stepResult']->getMetric($metric)});\n";
                    $column++;
                }
                $row++;
            }
            $row = 0;
            foreach($timeMetrics as $metric => $label) {
              $filterOut = array('.', '-');
              $metricKey = str_replace($filterOut, '', $metric);
              echo "var dataTimes$metricKey = new google.visualization.DataView(dataTimes);\n";
              echo "dataTimes$metricKey.setRows($row, $row);\n";
              $row++;
            }
            $row = 0;
            if ($has_cls) {
                echo "dataCls.setValue($row, 0, 'CLS');\n";
                $column = 1;
                foreach($tests as &$test) {
                    $metric = 'chromeUserTiming.CumulativeLayoutShift';
                    $hasStepResult = array_key_exists('stepResult', $test) && is_a($test['stepResult'], "TestStepResult");
                    if ($hasStepResult && $test['stepResult']->getMetric($metric) !== null)
                      echo "dataCls.setValue($row, $column, {$test['stepResult']->getMetric($metric)});\n";
                    $column++;
                }
            }
            echo "dataRequests.setValue(0, 0, 'Total');\n";
            echo "dataBytes.setValue(0, 0, 'Total');\n";
            $column = 1;
            foreach($tests as &$test) {
                if (array_key_exists('stepResult', $test) && is_a($test['stepResult'], "TestStepResult")) {
                    $requests = $test['stepResult']->getMetric('requests');
                    if ($requests !== null)
                        echo "dataRequests.setValue(0, $column, $requests);\n";
                    $bytesIn = $test['stepResult']->getMetric('bytesIn');
                    if ($bytesIn !== null)
                        echo "dataBytes.setValue(0, $column, $bytesIn);\n";
                }
                $column++;
            }
            $row = 1;
            foreach($mimeTypes as $mimeType) {
                echo "dataRequests.setValue($row, 0, '$mimeType');\n";
                echo "dataBytes.setValue($row, 0, '$mimeType');\n";
                $column = 1;
                foreach($tests as &$test) {
                    echo "dataRequests.setValue($row, $column, {$test['breakdown'][$mimeType]['requests']});\n";
                    echo "dataBytes.setValue($row, $column, {$test['breakdown'][$mimeType]['bytes']});\n";
                    $column++;
                }
                $row++;
            }
            $row = 1;
            foreach($mimeTypes as $mimeType) {
              echo "var dataRequests$mimeType = new google.visualization.DataView(dataRequests);\n";
              echo "dataRequests$mimeType.setRows($row, $row);\n";
              echo "var dataBytes$mimeType = new google.visualization.DataView(dataBytes);\n";
              echo "dataBytes$mimeType.setRows($row, $row);\n";
              $row++;
            }
            if ($progress_end) {
                echo "var progressChart = new google.visualization.LineChart(document.getElementById('compare_visual_progress'));\n";
                echo "progressChart.draw(dataProgress, {title: 'Visual Progress (%)', hAxis: {title: 'Time (seconds)'}, chartArea:{left:60, top:60, height:250, width:'75%'}});\n";
            }
            if ($layout_shifts_end) {
                echo "var layoutShiftsChart = new google.visualization.LineChart(document.getElementById('compare_layout_shifts'));\n";
                echo "layoutShiftsChart.draw(dataLayoutShifts, {title: 'Layout Shifts', hAxis: {title: 'Time (seconds)'}, chartArea:{left:60, top:60, height:250, width:'75%'}});\n";
            }
            if (count($tests) <= 4) {
              echo "var timesChart = new google.visualization.BarChart(document.getElementById('compare_times'));\n";
              echo "timesChart.draw(dataTimes, {title: 'Timings (ms)', chartArea:{left:200, top:60, height:800, width:'60%'}});\n";
              echo "var requestsChart = new google.visualization.BarChart(document.getElementById('compare_requests'));\n";
              echo "requestsChart.draw(dataRequests, {title: 'Requests', chartArea:{left:80, top:60, height:500, width:'70%'}});\n";
              echo "var bytesChart = new google.visualization.BarChart(document.getElementById('compare_bytes'));\n";
              echo "bytesChart.draw(dataBytes, {title: 'Bytes', chartArea:{left:80, top:60, height:500, width:'70%'}});\n";
              if ($has_cls) {
                echo "var clsChart = new google.visualization.BarChart(document.getElementById('compare_cls'));\n";
                echo "clsChart.draw(dataCls, {title: 'Cumulative Layout Shift', chartArea:{left:80, top:60, height:100, width:'70%'}});\n";
              }
            } else {
              foreach($timeMetrics as $metric => $label) {
                $metricKey = str_replace('.', '', $metric);
                echo "var timesChart$metricKey = new google.visualization.BarChart(document.getElementById('compare_times_$metricKey'));\n";
                echo "timesChart$metricKey.draw(dataTimes$metricKey, {title: '$label (ms)'});\n";
              }
              foreach($mimeTypes as $type) {
                echo "var requestsChart$type = new google.visualization.BarChart(document.getElementById('compare_requests_$type'));\n";
                echo "requestsChart$type.draw(dataRequests$type, {title: '$type Requests'});\n";
                echo "var bytesChart$type = new google.visualization.BarChart(document.getElementById('compare_bytes_$type'));\n";
                echo "bytesChart$type.draw(dataBytes$type, {title: '$type Bytes'});\n";
              }
              if ($has_cls) {
                echo "var clsChart = new google.visualization.BarChart(document.getElementById('compare_cls'));\n";
                echo "clsChart.draw(dataCls, {title: 'Cumulative Layout Shift', chartArea:{left:80, top:60, height:100, width:'70%'}});\n";
              }
            }
            ?>
        }
    </script>
    <?php
    if ( $stickyFilmstrip ) {
    ?>
        <script>
          var videoContainer = document.querySelector("#videoContainer");
          var waterfallSliders = document.querySelector(".waterfall-sliders").parentNode;

        //   console.log(videoContainer);
        //   console.log(waterfallSliders);
        //   console.log(videoContainer.offsetHeight);
          function setTop(){
            waterfallSliders.style.top = (videoContainer.offsetHeight ).toString() + "px";
            waterfallSliders.style.position = "sticky";
            waterfallSliders.style.zIndex = "999999";
            waterfallSliders.style.background = "rgba(255,255,255,0.9)";

            waterfallSliders.style.paddingBottom = "0";
          }
          setTop();
          window.addEventListener( "resize", setTop )
        </script>
    <?php
    }
    ?>
    <?php
}
?>
