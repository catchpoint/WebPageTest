<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
require_once('object_detail.inc');
require_once('page_data.inc');
require_once('waterfall.inc');
// ini_set('display_errors', 1);
// ini_set('display_startup_errors', 1);
// error_reporting(E_ALL);
// Prevent the details page from running out of control.
set_time_limit(30);

require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestRunResults.php';
require_once __DIR__ . '/include/RunResultHtmlTable.php';
require_once __DIR__ . '/include/UserTimingHtmlTable.php';
require_once __DIR__ . '/include/WaterfallViewHtmlSnippet.php';
require_once __DIR__ . '/include/ConnectionViewHtmlSnippet.php';
require_once __DIR__ . '/include/RequestDetailsHtmlSnippet.php';
require_once __DIR__ . '/include/RequestHeadersHtmlSnippet.php';
require_once __DIR__ . '/include/AccordionHtmlHelper.php';

$testInfo = TestInfo::fromFiles($testPath);
$testRunResults = TestRunResults::fromFiles($testInfo, $run, $cached, null);
$data = loadPageRunData($testPath, $run, $cached, $test['testinfo']);
$isMultistep = $testRunResults->countSteps() > 1;

$page_keywords = array('Performance Test','Details','WebPageTest','Website Speed Test','Page Speed');
$page_description = "Web Vitals details$testLabel";
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>Web Vitals  Details<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Vitals'; include ('head.inc'); ?>
        <style type="text/css">
        <?php
        include __DIR__ . "/css/accordion.css";
        include "waterfall.css";
        ?>
        .values {
            text-align: left;
        }
        .values li {
            padding-left: 4em;
        }
        figure {
            display: inline-block;
            margin: 5px;
        }
        .metric {
            padding-bottom: 2em;
        }
        .metric h2 + small{
            margin-top: -1.3em;
            margin-bottom: 1.5em;
            display: block;
        }
        li.even {
            background-color: #f2f2f2;
        }
        table.pretty td {
            text-align: left;
        }
        img.autohide:hover {
            opacity: 0;
        }
        .cruxbars{
            margin-bottom: 1.5em;
        }
        .left {text-align:left;}
        .center {text-align:center;}

        .indented1 {padding-left: 40pt;}
        .indented2 {padding-left: 80pt;}

        td {
            white-space:nowrap;
            text-align:left;
            vertical-align:middle;
        }

        td.center {
            text-align:center;
        }
        table.details {
          margin-left:auto; margin-right:auto;
          border-collapse: collapse;
          font-size: larger;
        }
        table.details th, table.details td {
          border: 1px silver solid;
          padding: 0.2em;
          text-align: center;
        }
        table.details th {
          background: gainsboro;
          padding-left: 2em;
          padding-right: 2em;
        }
        table.details caption {
          padding: 0.5em;
          margin-left: inherit;
          margin-right: inherit;
        }
        table.details td.domain {
          text-align: right;
          max-width: 30em;
          word-wrap: break-word;
        }
        table.details th.reqMime, table.details td.reqMime {
          max-width: 10em;
          word-wrap: break-word;
          overflow: hidden;
        }
        .a_request {
            cursor: pointer;
        }
        .lcp-image{
            overflow-x: scroll;
            max-width: 100%;
            text-align: left;
            margin-top: 1em;
        }
        .summary-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            width: 100%;
        }
        .summary-container p {
            margin-bottom: 15px;
            line-height: 1em;
        }
        .summary-metric {
            min-width: 300px;
            border: 1px solid black;
            padding: 10px;
            font-size: 1.5em;
            overflow: hidden;
        }
        .summary-container .good {
            background: #d4ffd5;
        }
        .summary-container .ok {
            background: #ffe9b0; 
        }
        .summary-container .poor {
            background: #ffbac0;
        }
        .metric-value {
            font-size: 1.8em;
            font-weight: bold;
        }
        .summary-container a:link, .summary-container a:visited {
            text-decoration: none;
            color: black;
        }
        .crux .cruxlabel {
            font-size: 0.7em;
            margin: 0;
            z-index: 99;
        }
        .cruxlabel + .cruxbars {
            margin-top: -15px !important;
        }
        .cruxbars {
            margin: 0;
            z-index: 1;
        }
        .cruxlabel .legend {
            font-size: smaller;
            font-weight: normal;
        }
        .cruxlabel .fvarrow {
            color: #1a1a1a;
        }
    </style>
    </head>
    <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
            <?php
            $tab = 'Test Result';
            $subtab = 'Web Vitals';
            include 'header.inc';
            ?>
            <div id="result" class=" vitals-diagnostics">
            <p>Google <a href="https://web.dev/vitals/">Web Vitals <img src='/images/icon-external.svg'></a> Diagnostic Information</p>
            <?php
            if (isset($testRunResults)) {
              require_once(__DIR__ . '/include/CrUX.php');
            }
            ?>
            <?php
            if ($isMultistep) {
                for ($i = 1; $i <= $testRunResults->countSteps(); $i++) {
                    $stepResult = $testRunResults->getStepResult($i);
                    echo "<h1>" . $stepResult->readableIdentifier() . "</h1>";
                    InsertWebVitalsHTML($stepResult);
                }
            } else {
                $stepResult = $testRunResults->getStepResult(1);
                InsertWebVitalsHTML($stepResult);
            }
            ?>
            </div>
            </div>
            <?php include('footer.inc'); ?>
        </div>

        <script type="text/javascript">
        function expandRequest(targetNode) {
          if (targetNode.length) {
            var div_to_expand = $('#' + targetNode.attr('data-target-id'));

            if (div_to_expand.is(":visible")) {
                div_to_expand.hide();
                targetNode.html('+' + targetNode.html().substring(1));
            } else {
                div_to_expand.show();
                targetNode.html('-' + targetNode.html().substring(1));
            }
          }
        }

        function expandAll(step) {
          var expandAllNode = $("#step" + step + "_all");
          var expandText = expandAllNode.html();
          var doShow = expandText.substring(0, 1) == "+";
          expandAllNode.html(doShow ? "- Collapse All" : "+ Expand All");
          $("#header_details_step" + step + " .header_details").each(function(index) {
            $(this).toggle(doShow);
          });
        }

        function scrollTo(node) {
            $('html, body').animate({scrollTop: node.offset().top + 'px'}, 'fast');
        }

        // init existing snippets
        $(document).ready(function() {
            <?php if ($isMultistep) { ?>
              accordionHandler.connect();
            <?php } ?>
        });

        <?php
        include "waterfall.js";
        if ($lcp_request != ''){

        ?>
        var stepLabel = "step1";
$("#request-overlay-" + stepLabel + "-" + <?php echo $lcp_request; ?>).addClass("lcp-request");

        <?php
        }
        ?>
        </script>
    </body>
</html>

<?php
$lcp_request = '';
function InsertWebVitalsHTML($stepResult) {
    InsertWebVitalsHTML_Summary($stepResult);
    InsertWebVitalsHTML_LCP($stepResult);
    InsertWebVitalsHTML_CLS($stepResult);
    InsertWebVitalsHTML_TBT($stepResult);
}

function InsertWebVitalsHTML_Summary($stepResult) {
    global $testRunResults;
    echo '<div class="summary-container">';
    // LCP
    $events = $stepResult->getMetric('largestPaints');
    $lcp = null;
    if (isset($events) && is_array($events)) {
        // Find the actual LCP event
        foreach($events as $event) {
            if(isset($event['event']) && $event['event'] == 'LargestContentfulPaint' && isset($event['time']) && isset($event['size'])) {
                if(!isset($lcp) || $event['time'] > $lcp['time'] && $event['size'] > $lcp['size']) {
                    $lcp = $event;
                }
            }
        }
        // Find the matching text or image paint event
    }
    if (isset($lcp)) {
        $scoreClass = 'good';
        if ($lcp['time'] >= 4000) {
          $scoreClass = 'poor';
        } elseif ($lcp['time'] >= 2500) {
          $scoreClass = 'ok';
        }
        echo "<a href='#lcp'><div class='summary-metric $scoreClass'>";
        echo "<p>Largest Contentful Paint</p>";
        echo "<p class='metric-value $scoreClass'>{$lcp['time']} ms</p>";
        InsertCruxHTML($testRunResults, null, 'lcp', false, false);
        echo "</div></a>";
    }
    // CLS
    $cls = null;
    $windows = array();
    if ($stepResult) {
        $cls = $stepResult->getMetric('chromeUserTiming.CumulativeLayoutShift');
        $events = $stepResult->getMetric('LayoutShifts');
        foreach ($events as $event) {
            $num = isset($event['shift_window_num']) ? strval($event['shift_window_num']) : '1';
            if (!isset($windows[$num])) {
                $windows[$num] = array('num' => $num, 'shifts' => array(), 'cls' => 0.0, 'start' => null, 'end' => null);
            }
            $windows[$num]['shifts'][] = $event;
            if (!$windows[$num]['start'] || $event['time'] < $windows[$num]['start']) {
                $windows[$num]['start'] = $event['time'];
            }
            if (!$windows[$num]['end'] || $event['time'] > $windows[$num]['end']) {
                $windows[$num]['end'] = $event['time'];
            }
            $windows[$num]['cls'] += $event['score'];
        }
    }
    if (isset($cls) && is_numeric($cls)) {
        // reverse-sort, biggest cls first
        usort($windows, function($a, $b) {
            if ($a['cls'] == $b['cls']) {
                return 0;
            }
            return ($a['cls'] > $b['cls']) ? -1 : 1;
        });
        $cls = round($cls, 3);
        $scoreClass = 'good';
        if ($cls >= 0.25) {
          $scoreClass = 'poor';
        } elseif ($cls >= 0.1) {
          $scoreClass = 'ok';
        }
        echo "<a href='#cls'><div class='summary-metric $scoreClass'>";
        echo "<p>Cumulative Layout Shift</p>";
        echo "<p class='metric-value $scoreClass'>$cls</p>";
        InsertCruxHTML($testRunResults, null, 'cls', false, false);
        echo "</div></a>";
    }
    // TBT
    $tbt = $stepResult->getMetric('TotalBlockingTime');
    if (isset($tbt)) {
        $scoreClass = 'good';
        if ($tbt >= 600) {
          $scoreClass = 'poor';
        } elseif ($tbt >= 300) {
          $scoreClass = 'ok';
        }
        echo "<a href='#tbt'><div class='summary-metric $scoreClass'>";
        echo "<p>Total Blocking Time</p>";
        echo "<p class='metric-value $scoreClass'>$tbt ms</p>";
        InsertCruxHTML($testRunResults, null, 'fid', false, true);
        echo "</div></a>";
    }

    echo '</div>'; // summary-container
}

function pretty_print($array) {
    if (is_array($array)) {
        echo '<ul>';
        foreach($array as $key => $value) {
            echo "<li><strong>" . htmlspecialchars($key) . "</strong>: ";
            if (is_array($value)) {
                pretty_print($value);
            } else {
                echo htmlspecialchars($value);
            }
            echo "</li>";
        }
        echo '</ul>';
    }
}
function prettyHTML($markup) {
    $dom = new DOMDocument();
    $dom->preserveWhiteSpace = true;
    $dom->formatOutput = true;
    $dom->loadHTML($markup,LIBXML_HTML_NOIMPLIED);


    return $dom->saveXML($dom->documentElement);
}

function InsertWebVitalsHTML_LCP($stepResult) {
    global $testInfo;
    global $lcp_request;
    global $testRunResults;
    $thumbSize = 320;
    if ($stepResult) {
        $events = $stepResult->getMetric('largestPaints');
        $lcp = null;
        if (isset($events) && is_array($events)) {
            // Find the actual LCP event
            foreach($events as $event) {
                if(isset($event['event']) && $event['event'] == 'LargestContentfulPaint' && isset($event['time']) && isset($event['size'])) {
                    if(!isset($lcp) || $event['time'] > $lcp['time'] && $event['size'] > $lcp['size']) {
                        $lcp = $event;
                    }
                }
            }
            // Find the matching text or image paint event
        }
        if (isset($lcp)) {
            echo "<div class='metric'>";
            echo "<h2 id='lcp'>Largest Contentful Paint ({$lcp['time']} ms)</h2>";
            echo "<small>";
            $urlGenerator = $stepResult->createUrlGenerator("", false);
            $filmstripUrl = $urlGenerator->filmstripView();
            echo "<a href='$filmstripUrl&highlightLCP=1'>View as Filmstrip</a>";
            $videoUrl = $urlGenerator->createVideo();
            echo " - <a href='$videoUrl'>View Video</a>";
            echo " - <a href='https://web.dev/lcp/' target='_blank' rel='noopener'>About Largest Contentful Paint (LCP) <img src='/images/icon-external.svg'></a>";
            echo "</small>";

            // 3-frame filmstrip (if video is available)
            $video_frames = $stepResult->getVisualProgress();
            if (isset($video_frames) && is_array($video_frames) && isset($video_frames['frames'])) {
                $lcp_frame = null;
                // Find the first frame after LCP
                foreach($video_frames['frames'] as $ms => $frame) {
                    $frame['time']  = $ms;
                    if ($ms >= $lcp['time']) {
                        if (!isset($lcp_frame)) {
                            $lcp_frame = $frame;
                        } elseif ($ms < $lcp_frame['time']) {
                            $lcp_frame = $frame;
                        }
                    }
                }
                // Fall back to the last frame before LCP
                if (!isset($lcp_frame)) {
                    foreach($video_frames['frames'] as $ms => $frame) {
                        $frame['time']  = $ms;
                        if (!isset($lcp_frame)) {
                            $lcp_frame = $frame;
                        } elseif ($ms > $lcp_frame['time'] && $ms <= $lcp['time']) {
                            $lcp_frame = $frame;
                        }
                    }
                }
                if (isset($lcp_frame)) {
                    $previous = $lcp_frame;
                    $next = $lcp_frame;
                    foreach($video_frames['frames'] as $ms => $frame) {
                        if ($ms < $lcp_frame['time'] && ($previous['time'] == $lcp_frame['time'] || $ms > $previous['time'])) {
                            $previous = $frame;
                            $previous['time'] = $ms;
                        }
                        if ($ms > $lcp_frame['time'] && ($next['time'] == $lcp_frame['time'] || $ms < $next['time'])) {
                            $next = $frame;
                            $next['time'] = $ms;
                        }
                    }
                    $size = getimagesize('.' . $lcp_frame['path']);
                    $frame_width = $size[0];
                    $frame_height = $size[1];
                    if ($frame_width > $frame_height) {
                        $width = min($frame_width, $thumbSize);
                        $height = intval((floatval($width) / floatval($frame_width)) * floatval($frame_height));
                    } else {
                        $height = min($frame_height, $thumbSize);
                        $width = intval((floatval($height) / floatval($frame_height)) * floatval($frame_width));
                    }
      
                    echo '<div class="frames">';
                    $urlGenerator = $stepResult->createUrlGenerator("", false);
                    $imgUrl = $urlGenerator->videoFrameThumbnail(basename($previous['path']), $thumbSize);

                    echo '<figure>';
                    echo "<img width=$width height=$height class='thumbnail' src='$imgUrl'>";
                    echo "<figcaption>{$previous['time']} ms</figcaption>";
                    echo '</figure>';

                    $imgUrl = $lcp_frame['path'];
                    $viewport = $stepResult->getMetric('viewport');
                    if (isset($lcp['element']['boundingRect']) && isset($viewport)) {
                        $lcp_x = (int)(($lcp['element']['boundingRect']['x'] * 1000) / $viewport['width']);
                        $lcp_y = (int)(($lcp['element']['boundingRect']['y'] * 1000) / $viewport['height']);
                        $lcp_width = (int)(($lcp['element']['boundingRect']['width'] * 1000) / $viewport['width']);
                        $lcp_height = (int)(($lcp['element']['boundingRect']['height'] * 1000) / $viewport['height']);
                        if ($lcp_width > 0 && $lcp_height > 0) {
                            $options = "rects=00FF00AA-$lcp_x.$lcp_y.$lcp_width.$lcp_height";
                            $imgUrl = $urlGenerator->videoFrameThumbnail(basename($lcp_frame['path']), $thumbSize, $options);
                        }
                    }
                    echo '<figure>';
                    echo "<img width=$width height=$height class='thumbnail' src='$imgUrl'>";
                    echo "<figcaption>{$lcp_frame['time']} ms</figcaption>";
                    echo '</figure>';

                    $imgUrl = $urlGenerator->videoFrameThumbnail(basename($next['path']), $thumbSize);
                    echo '<figure>';
                    echo "<img width=$width height=$height class='thumbnail' src='$imgUrl'>";
                    echo "<figcaption>{$next['time']} ms</figcaption>";
                    echo '</figure>';

                    echo '</div>';
                }
            }

            // summary table
            echo '<h3 align="left">LCP Event Summary</h3>';
            echo '<p align="left"><small><a href="#lcp-full">See full details</a></small></p>';
            echo '<table class="pretty" cellspacing="0">';
            echo "<tr><th align='left'>Time</th><td>{$lcp['time']} ms</td></tr>";
            echo "<tr><th align='left'>Size</th><td>{$lcp['size']}</td></tr>";
            echo "<tr><th align='left'>Type</th><td>{$lcp['type']}</td></tr>";
            if (isset($lcp['element']['nodeName'])) {
                echo "<tr><th align='left'>Element Type</th><td>{$lcp['element']['nodeName']}</td></tr>";
            }
            if (isset($lcp['element']['src'])) {
                $lcpSource = isset($lcp['element']['currentSrc']) ? $lcp['element']['currentSrc'] : $lcp['element']['src'];
                echo "<tr><th align='left'>Src</th><td>{$lcpSource}</td></tr>";
            }
            if (isset($lcp['element']['background-image'])) {
                echo "<tr><th align='left'>Background Image</th><td>{$lcp['element']['background-image']}</td></tr>";
                preg_match_all('/url\(([\s])?([\"|\'])?(.*?)([\"|\'])?([\s])?\)/i', $lcp['element']['background-image'], $matches, PREG_PATTERN_ORDER);
                if ($matches) {
                     $lcpSource = $matches[3][0];
                }

            }
            echo "<tr><th align='left'>Outer HTML</th><td>";
            echo "<code class='language-html'>";
            echo htmlentities($lcp['element']['outerHTML']) . '...';
            echo "</code>";
            echo "</td>";
            echo '</table>';

            // Trimmed waterfall
            $label = $stepResult->readableIdentifier($testInfo->getUrl());
            $requests = $stepResult->getRequestsWithInfo(true, true);
            $raw_requests = $requests->getRequests();
            // Find the last request that finished before LCP
            $last_request = 0;
            if (isset($raw_requests)) {
                foreach ($raw_requests as $request) {
                    if (isset($lcpSource)) {
                        if ($request['full_url'] == $lcpSource) {
                            $lcp_request = $request['number'];
                        }
                    }
                    if (isset($request['responseCode']) && $request['responseCode'] > 0 && isset($request['download_end']) && $request['download_end'] <= $lcp['time'] && isset($request['number']) && $request['number'] > $last_request) {
                        $last_request = $request['number'];
                    }
                }
            }
            $maxTime = floatval($lcp['time']) / 1000.0;
            $options = "&max=$maxTime";
            if ($last_request > 0) {
                $options .= "&requests=1-$last_request";
                $_REQUEST['requests'] = "1-$last_request";
            }
            $out = CreateWaterfallHtml(
                $label,
                $requests->getRequests(),
                $testInfo->getId(),
                $stepResult->getRunNumber(),
                $stepResult->isCachedRun(),
                $stepResult->getRawResults(),
                $options,
                $stepResult->getStepNumber());
            echo "<div class='vitals-waterfall'>";
            echo "<p class='waterfall-label waterfall-label-lcp'>LCP: {$lcp['time']} ms</p>";
            echo $out;
            echo "</div>";

                //image
                if ($lcpSource) {
                    echo "<div class='lcp-image'><h3>LCP Image</h3><img src='" . $lcpSource . "' /></div>";
                }    

            // Insert the raw debug details
            echo "<div class='values'>";
            echo "<h3 id='lcp-full'>Full LCP Event Information</h3>";
            if (isset($lcp['event'])) {
                unset($lcp['event']);
            }
            pretty_print($lcp);
            echo "</div>";
            echo "</div>"; // metric
        }
    }
}

function InsertWebVitalsHTML_CLS($stepResult) {
    global $testRunResults;
    $cls = null;
    $windows = array();
    if ($stepResult) {
        $cls = $stepResult->getMetric('chromeUserTiming.CumulativeLayoutShift');
        $events = $stepResult->getMetric('LayoutShifts');
        foreach ($events as $event) {
            $num = isset($event['shift_window_num']) ? strval($event['shift_window_num']) : '1';
            if (!isset($windows[$num])) {
                $windows[$num] = array('num' => $num, 'shifts' => array(), 'cls' => 0.0, 'start' => null, 'end' => null);
            }
            $windows[$num]['shifts'][] = $event;
            if (!$windows[$num]['start'] || $event['time'] < $windows[$num]['start']) {
                $windows[$num]['start'] = $event['time'];
            }
            if (!$windows[$num]['end'] || $event['time'] > $windows[$num]['end']) {
                $windows[$num]['end'] = $event['time'];
            }
            $windows[$num]['cls'] += $event['score'];
        }
    }
    if (isset($cls) && is_numeric($cls)) {
        $video_frames = $stepResult->getVisualProgress();
        // reverse-sort, biggest cls first
        usort($windows, function($a, $b) {
            if ($a['cls'] == $b['cls']) {
                return 0;
            }
            return ($a['cls'] > $b['cls']) ? -1 : 1;
        });
        $cls = round($cls, 3);
        echo "<div class='metric'>";
        echo "<h2 id='cls'>Cumulative Layout Shift ($cls)</h2>";
        echo "<small>";
        $urlGenerator = $stepResult->createUrlGenerator("", false);
        $filmstripUrl = $urlGenerator->filmstripView();
        echo "<a href='$filmstripUrl&highlightCLS=1'>View as Filmstrip</a>";
        $videoUrl = $urlGenerator->createVideo();
        echo " - <a href='$videoUrl'>View Video</a>";
        echo " - <a href='https://web.dev/cls/' target='_blank' rel='noopener'>About Cumulative Layout Shift (CLS) <img src='/images/icon-external.svg'></a>";
        echo "</small>";

        foreach ($windows as $window) {
            InsertWebVitalsHTML_CLSWindow($window, $stepResult, $video_frames);
        }
        echo "</div>"; // metric
    }
}

function GenerateOverlayRects($shift, $viewport, $before) {
    $rects = '';
    if (isset($shift['sources']) && isset($viewport) && is_array($shift['sources'])) {
        foreach($shift['sources'] as $source) {
            $r = null;
            if ($before && isset($source['previousRect'])) {
                $r = $source['previousRect'];
            } elseif (!$before && isset($source['currentRect'])) {
                $r = $source['currentRect'];
            }
            if (isset($r)) {
                $x = (int)(($r['x'] * 1000) / $viewport['width']);
                $y = (int)(($r['y'] * 1000) / $viewport['height']);
                $w = (int)(($r['width'] * 1000) / $viewport['width']);
                $h = (int)(($r['height'] * 1000) / $viewport['height']);
                if ($w > 0 && $h > 0) {
                    if (strlen($rects)) {
                        $rects .= ',';
                    }
                    $rects .= "$x.$y.$w.$h";
                }
            }
        }
    } elseif (!$before && isset($shift['rects']) && isset($viewport)) {
        foreach($shift['rects'] as $rect) {
            if (is_array($rect) && count($rect) == 4) {
                $x = (int)(($rect[0] * 1000) / $viewport['width']);
                $y = (int)(($rect[1] * 1000) / $viewport['height']);
                $w = (int)(($rect[2] * 1000) / $viewport['width']);
                $h = (int)(($rect[3] * 1000) / $viewport['height']);
                if ($w > 0 && $h > 0) {
                    if (strlen($rects)) {
                        $rects .= ',';
                    }
                    $rects .= "$x.$y.$w.$h";
                }
            }
        }
    }
    return $rects;
}

function InsertWebVitalsHTML_CLSWindow($window, $stepResult, $video_frames) {
    global $testInfo;
    $thumbSize = 500;

    echo "<div class='cls-window'>";
    $cls = round($window['cls'], 3);
    echo "<h3>Window {$window['num']} ($cls)</h3>";
    echo "<p>Hover over any image to see the previous frame and the effect of the layout shift.</p>";
    echo "<ul>";
    $even = true;
    $shifts = $window['shifts'];
    usort($shifts, function($a, $b) {
        if ($a['score'] == $b['score']) {
            return 0;
        }
        return ($a['score'] > $b['score']) ? -1 : 1;
    });
    foreach($shifts as $shift) {
        $even = !$even;
        if ($even) {
            echo "<li class='even'>";
        } else {
            echo "<li>";
        }
        $ls = number_format($shift['score'], 5);
        // Figure out which video frames to use
        if (isset($video_frames) && is_array($video_frames) && isset($video_frames['frames'])) {
            $cls_frame = null;
            // Find the first frame after the layout shift
            foreach($video_frames['frames'] as $ms => $frame) {
                $frame['time']  = $ms;
                if ($ms >= $shift['time']) {
                    if (!isset($cls_frame)) {
                        $cls_frame = $frame;
                    } elseif ($ms < $cls_frame['time']) {
                        $cls_frame = $frame;
                    }
                }
            }
            // Fall back to the last frame before the layout shift
            if (!isset($cls_frame)) {
                foreach($video_frames['frames'] as $ms => $frame) {
                    $frame['time']  = $ms;
                    if (!isset($cls_frame)) {
                        $cls_frame = $frame;
                    } elseif ($ms > $cls_frame['time'] && $ms <= $shift['time']) {
                        $cls_frame = $frame;
                    }
                }
            }
            if (isset($cls_frame)) {
                $previous = $cls_frame;
                $next = $cls_frame;
                foreach($video_frames['frames'] as $ms => $frame) {
                    if ($ms < $cls_frame['time'] && ($previous['time'] == $cls_frame['time'] || $ms > $previous['time'])) {
                        $previous = $frame;
                        $previous['time'] = $ms;
                    }
                    if ($ms > $cls_frame['time'] && ($next['time'] == $cls_frame['time'] || $ms < $next['time'])) {
                        $next = $frame;
                        $next['time'] = $ms;
                    }
                }
                $size = getimagesize('.' . $cls_frame['path']);
                $frame_width = $size[0];
                $frame_height = $size[1];
                $size = min($thumbSize, max($frame_width, $frame_height));
                if ($frame_width > $frame_height) {
                    $width = min($frame_width, $size);
                    $height = intval((floatval($width) / floatval($frame_width)) * floatval($frame_height));
                } else {
                    $height = min($frame_height, $size);
                    $width = intval((floatval($height) / floatval($frame_height)) * floatval($frame_width));
                }
  
                echo '<div class="frames">';
                $urlGenerator = $stepResult->createUrlGenerator("", false);
                $viewport = $stepResult->getMetric('viewport');

                // Generate the "before" image
                $before = $urlGenerator->videoFrameThumbnail(basename($previous['path']), $size);
                $rects = GenerateOverlayRects($shift, $viewport, true);
                if (strlen($rects)) {
                    $before = $urlGenerator->videoFrameThumbnail(basename($previous['path']), $size, "rects=FF0000AA-$rects");
                }

                echo '<figure>';
                echo "<div style='background-image: url(\"$before\");'>";

                // Generate the "after" image
                $after = $urlGenerator->videoFrameThumbnail(basename($cls_frame['path']), $size);
                $rects = GenerateOverlayRects($shift, $viewport, false);
                if (strlen($rects)) {
                    $after = $urlGenerator->videoFrameThumbnail(basename($cls_frame['path']), $size, "rects=FF0000AA-$rects");
                }

                echo "<img width=$width height=$height class='thumbnail autohide' src='$after'>";
                echo "</div>";
                echo "<figcaption>{$shift['time']} ms ($ls)</figcaption>";
                echo '</figure>';

                echo '</div>';
            }
        } else {
            echo "<li>Shift time : {$shift['time']} ms, Shift size: $ls</li>";
        }
        echo "</li>";
    }
    echo "</ul>";
    echo "</div>"; // cls-window
}

// Merge a start/end window into an existing array of times
function MergeBlockingTime(&$times, $start, $end) {
    $merged = false;

    // See if it overlaps with an existing window
    for($i = 0; $i < count($times) && !$merged; $i++) {
        $s = $times[0];
        $e = $times[1];
        if (($start >= $s && $start <= $e) ||
                ($end >= $s && $end <= $e) ||
                ($s >= $start && $s <= $end) ||
                ($e >= $start && $e <= $end)) {
            $times[0] = min($start, $s);
            $times[1] = max($end, $e);
            $merged = true;
        }
    }

    if (!$merged) {
        $times[] = array($start, $end);
    }
}

function InsertWebVitalsHTML_TBT($stepResult) {
    global $testRunResults;
    global $testInfo;
    if ($stepResult) {
        $tbt = $stepResult->getMetric('TotalBlockingTime');
        if (isset($tbt)) {
            echo "<div class='metric'>";
            echo "<h2 id='tbt'>Total Blocking Time ($tbt ms)</h2>";
            echo "<small><a href='https://web.dev/tbt/' target='_blank' rel='noopener'>About Total Blocking Time (TBT) <img src='/images/icon-external.svg'></a></small>";

            // Load and filter the JS executions to only the blocking time blocks
            $long_tasks = null;
            $timingsFile = $stepResult->createTestPaths()->devtoolsScriptTimingFile();
            if (isset($timingsFile) && strlen($timingsFile) && gz_is_file($timingsFile)) {
                $timings = json_decode(gz_file_get_contents($timingsFile), true);
                if (isset($timings) &&
                    is_array($timings) &&
                    isset($timings['main_thread']) &&
                    isset($timings[$timings['main_thread']]) &&
                    is_array($timings[$timings['main_thread']])) {
                  foreach($timings[$timings['main_thread']] as $url => $events) {
                      foreach($events as $timings) {
                          foreach($timings as $task) {
                              if (isset($task) && is_array($task) && count($task) >= 2) {
                                $start = $task[0];
                                $end = $task[1];
                                if ($end - $start > 50) {
                                    if (!isset($long_tasks[$url])) {
                                        $long_tasks[$url] = array();
                                    }
                                    MergeBlockingTime($long_tasks[$url], $start, $end);
                                }
                              }
                          }
                      }
                  }
                }
            }

            if (isset($long_tasks)) {
                $requests_list = null;
                $maxTime = 0;
                // Trimmed waterfall
                $label = $stepResult->readableIdentifier($testInfo->getUrl());
                $requests = $stepResult->getRequestsWithInfo(true, true);
                $raw_requests = $requests->getRequests();
                if (isset($raw_requests)) {
                    foreach ($raw_requests as $request) {
                        if (isset($request['full_url']) && isset($long_tasks[$request['full_url']])) {
                            if (isset($requests_list)) {
                                $requests_list .= ",{$request['number']}";
                            } else {
                                $requests_list = "{$request['number']}";
                            }
                            foreach($long_tasks[$request['full_url']] as $times) {
                                if ($times[1] > $maxTime) {
                                    $maxTime = $times[1];
                                }
                            }
                        }
                    }
                }

                $timeline = null;
                $localPaths = $stepResult->createTestPaths();
                if (gz_is_file($localPaths->devtoolsTraceFile()) || gz_is_file($localPaths->devtoolsTimelineFile())) {
                    $urlGenerator = $stepResult->createUrlGenerator("", FRIENDLY_URLS);
                    $timeline = $urlGenerator->stepDetailPage("chrome/timeline");
                }

                if (isset($requests_list) && $maxTime > 0) {
                    // TODO: Make the second waterfall interactive.
                    $maxTime = floatval($maxTime) / 1000.0;
                    $options = "&dots=0&bw=0&max=$maxTime";
                    $options .= "&requests=1,$requests_list";
                    $id = $testInfo->getId();
                    $run = $stepResult->getRunNumber();
                    $cached = $stepResult->isCachedRun();
                    $step = $stepResult->getStepNumber(); 
                    echo "<div class='vitals-waterfall'>";
                    echo '<div class="waterfall-container">';
                    if (isset($timeline)) {
                        echo "<a href='$timeline' target='_blank' title='View in Chrome Dev Tools Performance Panel'>";
                    }
                    echo "<img class=\"waterfall-image\" alt=\"\" src=\"/waterfall.php?test=$id&run=$run&cached=$cached&step=$step$options\">";
                    if (isset($timeline)) {
                        echo '</a>';
                    }
                    echo "</div>";
                    echo "</div>";
                }

                if (isset($timeline)) {
                    echo "<br><p><a href='$timeline' target='_blank' title='View in Chrome Dev Tools Performance Panel'>View in Chrome Dev Tools Performance Panel <img src='/images/icon-external.svg'></a></p>\n";
                }

                // Break down the long tasks by domain
                $domain_tasks = array();
                foreach($long_tasks as $url => $times) {
                    $domain = parse_url($url, PHP_URL_HOST);
                    if (!isset($domain_tasks[$domain])) {
                        $domain_tasks[$domain] = array();
                    }
                    foreach ($times as $time) {
                        MergeBlockingTime($domain_tasks[$domain], $time[0], $time[1]);
                    }
                }

                // Calculate the blocking time per domain
                $domains = array();
                foreach($domain_tasks as $domain => $times) {
                    $blocking_time = 0;
                    foreach($times as $time) {
                        $blocking_time += $time[1] - $time[0] - 50;
                    }
                    $domains[$domain] = intval(round($blocking_time));
                }
                arsort($domains);
                if (count($domains)) {
                    ?>
                    <div class="center">
                    <table class="tableDetails details center">
                        <caption>Main Thread Blocking Time by Script Origin</caption>
                        <thead>
                            <tr>
                                <th class="domain">Script Origin</th>
                                <th class="blocking">Blocking Time (ms)</th>
                            </tr>
                        </thead>
                    <?php
                    echo "<tbody>";
                    foreach($domains as $domain => $blocking) {
                        echo "<tr>";
                        echo "<td class='domain'>" . htmlspecialchars($domain) . "</td>";
                        echo "<td class='blocking'>$blocking</td>";
                        echo "</tr>";
                    }
                    echo "</tbody></table></div>\n";
                    ?>
                    <script>
                        window.addEventListener('DOMContentLoaded', (event) => {
                            $(document).find(".tableDetails").tablesorter();
                        });
                    </script>
                    <?php
                }
            }
        
            echo "</div>"; // metric
        }
    }
}
