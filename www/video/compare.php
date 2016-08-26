<?php
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

    $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == 'on') || (isset($_SERVER['HTTP_SSL']) && $_SERVER['HTTP_SSL'] == 'On')) ? 'https' : 'http';
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
    include 'video/filmstrip.inc.php';  // include the common php shared across the filmstrip code
    require_once('object_detail.inc');
    require_once('waterfall.inc');

    $page_keywords = array('Video','comparison','Webpagetest','Website Speed Test');
    $page_description = "Visual comparison of multiple websites with a side-by-side video and filmstrip view of the user experience.";

    $title = 'Web page visual comparison';
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
    if( strlen($labels) )
        $title .= ' - ' . $labels;
    ?>
    <!DOCTYPE html>
    <html>
        <head>
            <title>WebPagetest - Visual Comparison</title>
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
                setTimeout( "window.location.reload(true)", 10000 );
                </script>
            <?php
                }
                $gaTemplate = 'Visual Comparison';
                include ('head.inc');
            ?>
            <style type="text/css">
            <?php
                $bgcolor = '000000';
                $color = 'ffffff';
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
                    table-layout: fixed;
                    margin-left: auto;
                    margin-right: auto;
                    width: 99%;
                }
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
                        echo "background: #$bgcolor;\n";
                        echo "color: #$color;\n"
                    ?>
                    font-family: arial,sans-serif
                }
                .pagelink,
                .pagelinks a
                {
                    text-decoration: none;
                    <?php
                        echo "color: #$color;\n"
                    ?>
                    word-wrap: break-word;
                }
                .thumb{ border: none; }
                .thumbChanged{border: 3px solid #FEB301;}
                .thumbAFT{border: 3px solid #FF0000;}
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
                        echo "background: #$bgcolor;\n";
                        echo "color: #$color;\n"
                    ?>
                    font-family: arial,sans-serif;
                    padding: 20px;
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
                    position: absolute; top: 0; left: 250px;
                    height: 100%;
                    width: 2px;
                    background-color: #D00;
                }
                #location {
                    text-align: left;
                    padding: 5px;
                    width: 100%;
                }
                div.compare-graph {margin:20px 0; width:900px; height:600px;margin-left:auto; margin-right:auto;}
                <?php
                include "waterfall.css";
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
                div.waterfall-container {top: -8em;}
            </style>
        </head>
        <body>
            <div class="page">
                <?php
                $tab = 'Test Result';
                $nosubheader = true;
                $headerType = 'video';
                $filmstrip = $_REQUEST['tests'];
                include 'header.inc';

                if( $error ) {
                    echo "<h1>$error</h1>";
                } elseif( $ready ) {
                    if (isset($location) && strlen($location)) {
                        echo "<div id=\"location\">Tested From: $location</div>";
                    }
                    ScreenShotTable();
                    DisplayGraphs();
                } else {
                    DisplayStatus();
                }
                ?>

                <?php include('footer.inc'); ?>
            </div>

            <script type="text/javascript">
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
                    var marker = parseInt(padLeft + ((position / width) * (930 - padLeft)));
                    $('.waterfall_marker').css('left', marker + 'px');
                }
                UpdateScrollPosition();

                <?php
                include "waterfall.js";
                ?>
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
    $endTime = 'visual';
    if( array_key_exists('end', $_REQUEST) && strlen($_REQUEST['end']) )
        $endTime = htmlspecialchars(trim($_REQUEST['end']));

    $filmstrip_end_time = 0;
    if( count($tests) )
    {
        // figure out how many columns there are
        $end = 0;
        foreach( $tests as &$test )
            if( $test['video']['end'] > $end )
                $end = $test['video']['end'];

        if (!defined('EMBED')) {
            echo '<br>';
        }
        echo '<form id="createForm" name="create" method="get" action="/video/create.php">';
        echo "<input type=\"hidden\" name=\"end\" value=\"$endTime\">";
        echo '<input type="hidden" name="tests" value="' . htmlspecialchars($_REQUEST['tests']) . '">';
        echo "<input type=\"hidden\" name=\"bg\" value=\"$bgcolor\">";
        echo "<input type=\"hidden\" name=\"text\" value=\"$color\">";
        if (isset($_REQUEST['labelHeight']) && is_numeric($_REQUEST['labelHeight']))
          echo '<input type="hidden" name="labelHeight" value="' . htmlspecialchars($_REQUEST['labelHeight']) . '">"';
        if (isset($_REQUEST['timeHeight']) && is_numeric($_REQUEST['timeHeight']))
          echo '<input type="hidden" name="timeHeight" value="' . htmlspecialchars($_REQUEST['timeHeight']) . '">"';
        echo '<table id="videoContainer"><tr>';

        // build a table with the labels
        echo '<td id="labelContainer"><table id="videoLabels"><tr><th>&nbsp;</th></tr>';
        foreach( $tests as &$test ) {
            // figure out the height of this video
            $height = 100;
            if( $test['video']['width'] && $test['video']['height'] ) {
                if( $test['video']['width'] > $test['video']['height'] ) {
                    $height = 22 + (int)(((float)$thumbSize / (float)$test['video']['width']) * (float)$test['video']['height']);
                } else {
                    $height = 22 + $thumbSize;
                }
            }

            $break = '';
            if( !strpos($test['name'], ' ') )
                $break = ' style="word-break: break-all;"';
            echo "<tr width=10% height={$height}px ><td$break class=\"pagelinks\">";

            // Print the index outside of the link tag
            echo $test['index'] . ': ';

            if (!defined('EMBED')) {
                $urlGenerator = UrlGenerator::create(FRIENDLY_URLS, "", $test['id'], $test['run'], $test['cached'], $test['step']);
                $href = $urlGenerator->resultPage("details");
                echo "<a class=\"pagelink\" id=\"label_{$test['id']}\" href=\"$href\">" . WrapableString(htmlspecialchars($test['name'])) . '</a>';
            } else {
                echo WrapableString(htmlspecialchars($test['name']));
            }

            // Print out a link to edit the test
            echo '<br/>';
            echo '<a href="#" class="editLabel" data-test-guid="' . $test['id'] . '" data-current-label="' . htmlentities($test['name']) . '">';
            if (class_exists("SQLite3"))
              echo '(Edit)';
            echo '</a>';

            echo "</td></tr>\n";
        }
        echo '</table></td>';

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
            $aft = (int)$test['aft'] / 100;

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
                foreach ($test['video']['frames'] as $frameTime => $file) {
                  if ($frameTime <= $ms && (!isset($frame_ms) || $frameTime > $frame_ms))
                    $frame_ms = $frameTime;
                }
                $path = null;
                if (isset($frame_ms))
                  $path = $test['video']['frames'][$frame_ms];
                if (array_key_exists('frame_progress', $test['video']) &&
                    array_key_exists($frame_ms, $test['video']['frame_progress']))
                  $progress = $test['video']['frame_progress'][$frame_ms];

                if( !isset($lastThumb) )
                    $lastThumb = $path;

                echo '<td>';

                if ($ms <= $testEnd) {
                    $imgPath = $localPaths->videoDir() . "/" . $path;
                    echo "<a href=\"/$imgPath\">";
                    echo "<img title=\"" . htmlspecialchars($test['name']) . "\"";
                    $class = 'thumb';
                    if ($lastThumb != $path) {
                        if( !$firstFrame || $frameCount < $firstFrame )
                            $firstFrame = $frameCount;
                        $class = 'thumbChanged';
                    }
                    echo " class=\"$class\"";
                    echo " width=\"$width\"";
                    if( $height )
                        echo " height=\"$height\"";
                    $imgUrl = $urlGenerator->videoFrameThumbnail($path, $thumbSize);
                    echo " src=\"$imgUrl\"></a>";
                    if (isset($progress))
                        echo "<br>$progress%";
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
        echo "</td></tr></table>\n";
        echo "<div id=\"image\">";
        echo "<a id=\"export\" class=\"pagelink\" href=\"filmstrip.php?tests=" . htmlspecialchars($_REQUEST['tests']) . "&thumbSize=$thumbSize&ival=$interval&end=$endTime&text=$color&bg=$bgcolor\">Export filmstrip as an image...</a>";
        echo "</div>";
        echo '<div id="bottom"><input type="checkbox" name="slow" value="1"> Slow Motion<br><br>';
        echo "<input id=\"SubmitBtn\" type=\"submit\" value=\"Create Video\">";
        echo '<br><br><a class="pagelink" href="javascript:ShowAdvanced()">Advanced customization options...</a>';
        echo "</div></form>";
        if (!defined('EMBED')) {
        ?>
        <div id="layout">
            <form id="layoutForm" name="layout" method="get" action="/video/compare.php">
            <?php
                echo "<input type=\"hidden\" name=\"tests\" value=\"" . htmlspecialchars($_REQUEST['tests']) . "\">\n";
            ?>
                <table id="layoutTable">
                    <tr><th>Thumbnail Size</th><th>Thumbnail Interval</th><th>Comparison End Point</th></th></tr>
                    <?php
                        // fill in the thumbnail size selection
                        echo "<tr><td>";
                        $checked = '';
                        if( $thumbSize <= 100 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"thumbSize\" value=\"100\"$checked onclick=\"this.form.submit();\"> Small<br>";
                        $checked = '';
                        if( $thumbSize <= 150 && $thumbSize > 100 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"thumbSize\" value=\"150\"$checked onclick=\"this.form.submit();\"> Medium<br>";
                        $checked = '';
                        if( $thumbSize > 150 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"thumbSize\" value=\"200\"$checked onclick=\"this.form.submit();\"> Large";
                        echo "</td>";

                        // fill in the interval selection
                        echo "<td>";
                        if ($supports60fps) {
                          $checked = '';
                          if( $interval < 100 )
                              $checked = ' checked=checked';
                          echo "<input type=\"radio\" name=\"ival\" value=\"16.67\"$checked onclick=\"this.form.submit();\"> 60 FPS<br>";
                        }
                        $checked = '';
                        if( ($supports60fps && $interval == 100) || (!$supports60fps && $interval < 500) )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"ival\" value=\"100\"$checked onclick=\"this.form.submit();\"> 0.1 sec<br>";
                        $checked = '';
                        if( $interval == 500 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"ival\" value=\"500\"$checked onclick=\"this.form.submit();\"> 0.5 sec<br>";
                        $checked = '';
                        if( $interval == 1000 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"ival\" value=\"1000\"$checked onclick=\"this.form.submit();\"> 1 sec<br>";
                        $checked = '';
                        if( $interval > 1000 )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"ival\" value=\"5000\"$checked onclick=\"this.form.submit();\"> 5 sec<br>";
                        echo "</td>";

                        // fill in the end-point selection
                        echo "<td>";
                        if( !strcasecmp($endTime, 'aft') )
                            $endTime = 'visual';
                        $checked = '';
                        if( !strcasecmp($endTime, 'visual') )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"end\" value=\"visual\"$checked onclick=\"this.form.submit();\"> Visually Complete<br>";
                        $checked = '';
                        if( !strcasecmp($endTime, 'all') )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"end\" value=\"all\"$checked onclick=\"this.form.submit();\"> Last Change<br>";
                        $checked = '';
                        if( !strcasecmp($endTime, 'doc') )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"end\" value=\"doc\"$checked onclick=\"this.form.submit();\"> Document Complete<br>";
                        $checked = '';
                        if( !strcasecmp($endTime, 'full') )
                            $checked = ' checked=checked';
                        echo "<input type=\"radio\" name=\"end\" value=\"full\"$checked onclick=\"this.form.submit();\"> Fully Loaded<br>";
                        echo "</td></tr>";
                    ?>
                </table>
            </form>
        </div>
        <?php
        // display the waterfall if there is only one test
        $end_seconds = $filmstrip_end_time / 1000;
        if( count($tests) == 1 ) {
            /* @var TestStepResult $stepResult */
            $stepResult = $tests[0]["stepResult"];
            $requests = $stepResult->getRequestsWithInfo(true, true)->getRequests();
            echo CreateWaterfallHtml('', $requests, $tests[0]['id'], $tests[0]['run'], $tests[0]['cached'], $data,
                                     "&max=$end_seconds&mime=1&state=1&cpu=1&bw=1", $tests[0]['step']);
            echo '<br><br>';
        } else {
          $waterfalls = array();
          foreach ($tests as &$test) {
            $waterfalls[] = array('id' => $test['id'],
                                  'label' => $test['name'],
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

        <div id="advanced" style="display:none;">
            <h3>Advanced Visual Comparison Configuration</h3>
            <p>There are additional customizations that can be done by modifying the <b>tests</b> parameter in the comparison URL directly.</p>
            <p>URL structure: ...compare.php?tests=&lt;Test 1 ID&gt;,&lt;Test 2 ID&gt;...</p>
            <p>The tests are displayed in the order listed and can be customized with options:</p>
            <table>
            <tr><td>Custom label</td><td>-l:&lt;label&gt;</td><td>110606_MJ_RZEY-l:Original</td></tr>
            <tr><td>Specific run</td><td>-r:&lt;run&gt;</td><td>110606_MJ_RZEY-r:3</td></tr>
            <tr><td>Repeat view</td><td>-c:1</td><td>110606_MJ_RZEY-c:1</td></tr>
            <tr><td>Specific step</td><td>-s:3</td><td>110606_MJ_RZEY-s:3</td></tr>
            <tr><td>Specific End Time</td><td>-e:&lt;seconds&gt;</td><td>110606_MJ_RZEY-e:1.1</td></tr>
            </table>
            <br>
            <p>You can also customize the background and text color by passing HTML color values to <b>bg</b> and <b>text</b> query parameters.</p>
            <p>Examples:</p>
            <ul>
            <li><b>Customizing labels:</b>
            http://www.webpagetest.org/video/compare.php?tests=110606_MJ_RZEY-l:Original,110606_AE_RZN5-l:No+JS</li>
            <li><b>Compare First vs. Repeat view:</b>
            http://www.webpagetest.org/video/compare.php?tests=110606_MJ_RZEY, 110606_MJ_RZEY-c:1</li>
            <li><b>Second step of first run vs. Second step of second run:</b>
            http://www.webpagetest.org/video/compare.php?tests=110606_MJ_RZEY-r:1-s:2,110606_MJ_RZEY-r:2-s:2</li>
            <li><b>White background with black text:</b>
            http://www.webpagetest.org/video/compare.php?tests=110606_MJ_RZEY, 110606_MJ_RZEY-c:1&bg=ffffff&text=000000</li>
            </ul>
            <input id="advanced-ok" type=button class="simplemodal-close" value="OK">
        </div>
        <?php
        } // EMBED
        // scroll the table to show the first thumbnail change
        $scrollPos = $firstFrame * ($maxThumbWidth + 6);
        ?>
        <script language="javascript">
            var thumbWidth = <?php echo "$maxThumbWidth;"; ?>
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

    echo "<h1>Please wait while the tests are run...</h1>\n";
    echo "<table id=\"statusTable\"><tr><th>Test</th><th>Status</th></tr><tr>";
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
    echo "</table>";
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
    $mimeTypes = array('html', 'js', 'css', 'image', 'flash', 'font', 'other');
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
    foreach($tests as &$test) {
        $hasStepResult = array_key_exists('stepResult', $test) && is_a($test['stepResult'], "TestStepResult");
        $test['breakdown'] = $hasStepResult ? $test['stepResult']->getMimeTypeBreakdown() : array();
        if (array_key_exists('progress', $test['video'])
            && array_key_exists('frames', $test['video']['progress'])) {
            foreach ($test['video']['progress']['frames'] as $ms => &$data) {
                if ($ms > $progress_end && array_key_exists('progress', $data)) {
                    $progress_end = $ms;
                }
            }
        }
    }
    if ($progress_end) {
        if ($progress_end % 100)
            $progress_end = intval((intval($progress_end / 100) + 1) * 100);
        echo '<div id="compare_visual_progress" class="compare-graph"></div>';
    }
    if (count($tests) <= 4) {
      echo '<div id="compare_times" class="compare-graph"></div>';
      echo '<div id="compare_requests" class="compare-graph"></div>';
      echo '<div id="compare_bytes" class="compare-graph"></div>';
    } else {
      foreach($timeMetrics as $metric => $label)
        echo "<div id=\"compare_times_$metric\" class=\"compare-graph\"></div>";
      foreach($mimeTypes as $type) {
        echo "<div id=\"compare_requests_$type\" class=\"compare-graph\"></div>";
        echo "<div id=\"compare_bytes_$type\" class=\"compare-graph\"></div>";
      }
    }
    ?>
    <script type="text/javascript" src="<?php echo $GLOBALS['ptotocol']; ?>://www.google.com/jsapi"></script>
    <script type="text/javascript">
        google.load('visualization', '1', {'packages':['table', 'corechart']});
        google.setOnLoadCallback(drawCharts);
        function drawCharts() {
            var dataTimes = new google.visualization.DataTable();
            var dataRequests = new google.visualization.DataTable();
            var dataBytes = new google.visualization.DataTable();
            dataTimes.addColumn('string', 'Time (ms)');
            dataRequests.addColumn('string', 'MIME Type');
            dataBytes.addColumn('string', 'MIME Type');
            <?php
            foreach($tests as &$test) {
                $name = htmlspecialchars($test['name']);
                echo "dataTimes.addColumn('number', '$name');\n";
                echo "dataRequests.addColumn('number', '$name');\n";
                echo "dataBytes.addColumn('number', '$name');\n";
            }
            echo 'dataTimes.addRows(' . count($timeMetrics) . ");\n";
            echo 'dataRequests.addRows(' . strval(count($mimeTypes) + 1) . ");\n";
            echo 'dataBytes.addRows(' . strval(count($mimeTypes) + 1) . ");\n";
            if ($progress_end) {
                echo "var dataProgress = google.visualization.arrayToDataTable([\n";
                echo "  ['Time (ms)'";
                foreach($tests as &$test)
                    echo ", '" . htmlspecialchars($test['name']) . "'";
                echo " ]";
                for ($ms = 0; $ms <= $progress_end; $ms += 100) {
                    echo ",\n  ['" . number_format($ms / 1000, 1) . "'";
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
              echo "var dataTimes$metric = new google.visualization.DataView(dataTimes);\n";
              echo "dataTimes$metric.setRows($row, $row);\n";
              $row++;
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
                echo "progressChart.draw(dataProgress, {title: 'Visual Progress (%)', hAxis: {title: 'Time (seconds)'}});\n";
            }
            if (count($tests) <= 4) {
              echo "var timesChart = new google.visualization.ColumnChart(document.getElementById('compare_times'));\n";
              echo "timesChart.draw(dataTimes, {title: 'Timings (ms)'});\n";
              echo "var requestsChart = new google.visualization.ColumnChart(document.getElementById('compare_requests'));\n";
              echo "requestsChart.draw(dataRequests, {title: 'Requests'});\n";
              echo "var bytesChart = new google.visualization.ColumnChart(document.getElementById('compare_bytes'));\n";
              echo "bytesChart.draw(dataBytes, {title: 'Bytes'});\n";
            } else {
              foreach($timeMetrics as $metric => $label) {
                echo "var timesChart$metric = new google.visualization.ColumnChart(document.getElementById('compare_times_$metric'));\n";
                echo "timesChart$metric.draw(dataTimes$metric, {title: '$label (ms)'});\n";
              }
              foreach($mimeTypes as $type) {
                echo "var requestsChart$type = new google.visualization.ColumnChart(document.getElementById('compare_requests_$type'));\n";
                echo "requestsChart$type.draw(dataRequests$type, {title: '$type Requests'});\n";
                echo "var bytesChart$type = new google.visualization.ColumnChart(document.getElementById('compare_bytes_$type'));\n";
                echo "bytesChart$type.draw(dataBytes$type, {title: '$type Bytes'});\n";
              }
            }
            ?>
        }
    </script>
    <?php
}
?>
