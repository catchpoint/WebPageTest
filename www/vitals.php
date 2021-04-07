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
        </style>
    </head>
    <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
            <?php
            include 'header.inc';
            ?>
            <div id="result">
            You want vitals?  Come get your web vitals.
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

function InsertWebVitalsHTML_LCP($stepResult) {
    echo "<h2>Largest Contentful Paint</h2>";
}

function InsertWebVitalsHTML_CLS($stepResult) {
    echo "<h2>Cumulative Layout Shift</h2>";
}

function InsertWebVitalsHTML_TBT($stepResult) {
    echo "<h2>Total Blocking Time</h2>";
}
