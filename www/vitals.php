<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
require_once('object_detail.inc');
require_once('page_data.inc');
require_once('waterfall.inc');

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
        </style>
    </head>
    <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
            <?php
            include 'header.inc';
            ?>
            <div id="result">
            Google <a href="https://web.dev/vitals/">Web Vitals</a> Diagnostic Information
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
            <br><br>
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
        ?>
        </script>
    </body>
</html>

<?php
function InsertWebVitalsHTML($stepResult) {
    InsertWebVitalsHTML_LCP($stepResult);
    InsertWebVitalsHTML_CLS($stepResult);
    InsertWebVitalsHTML_TBT($stepResult);
}

function pretty_print($array) {
    if (is_array($array)) {
        echo '<ul>';
        foreach($array as $key => $value) {
            echo "<li><b>" . htmlspecialchars($key) . "</b> : ";
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

function InsertWebVitalsHTML_LCP($stepResult) {
    global $testInfo;

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
            echo "<p><a href='https://web.dev/lcp/'>About Largest Contentful Paint (LCP)</a></p>";

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

            // Trimmed waterfall
            $label = $stepResult->readableIdentifier($testInfo->getUrl());
            $requests = $stepResult->getRequestsWithInfo(true, true);
            $raw_requests = $requests->getRequests();
            // Find the last request that finished before LCP
            $last_request = 0;
            if (isset($raw_requests)) {
                foreach ($raw_requests as $request) {
                    if (isset($request['download_end']) && $request['download_end'] <= $lcp['time'] && isset($request['number']) && $request['number'] > $last_request) {
                        $last_request = $request['number'];
                    }
                }
            }
            $maxTime = floatval($lcp['time']) / 1000.0;
            $options = "&max=$maxTime";
            if ($last_request > 0) {
                $options .= "&requests=1-$last_request";
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
            echo $out;

            // Insert the raw debug details
            echo "<div class='values'>";
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
    echo "<div class='metric'>";
    echo "<h2 id='cls'>Cumulative Layout Shift</h2>";
    echo "<p><a href='https://web.dev/cls/'>About Cumulative Layout Shift (CLS)</a></p>";
    echo "Coming soon.";
    echo "</div>"; // metric
}

function InsertWebVitalsHTML_TBT($stepResult) {
    echo "<div class='metric'>";
    echo "<h2 id='tbt'>Total Blocking Time</h2>";
    echo "<p><a href='https://web.dev/tbt/'>About Total Blocking Time (TBT)</a></p>";
    echo "Coming soon.";
    echo "</div>"; // metric
}
