<?php
include 'common.inc';
require_once('object_detail.inc');
require_once('page_data.inc');
require_once('waterfall.inc');

require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestRunResults.php';
require_once __DIR__ . '/include/RunResultHtmlTable.php';
require_once __DIR__ . '/include/UserTimingHtmlTable.php';
require_once __DIR__ . '/include/WaterfallViewHtmlSnippet.php';
require_once __DIR__ . '/include/ConnectionViewHtmlSnippet.php';
require_once __DIR__ . '/include/RequestDetailsHtmlSnippet.php';
require_once __DIR__ . '/include/RequestHeadersHtmlSnippet.php';

$options = null;
if (array_key_exists('end', $_REQUEST))
    $options = array('end' => $_REQUEST['end']);
$testInfo = TestInfo::fromFiles($testPath);
$testRunResults = TestRunResults::fromFiles($testInfo, $run, $cached, null, $options);
$data = loadPageRunData($testPath, $run, $cached, $options, $test['testinfo']);

$page_keywords = array('Performance Test','Details','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Website performance test details$testLabel";
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest Test Details<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Details'; include ('head.inc'); ?>
        <style type="text/css">
        div.bar {
            height:12px;
            margin-top:auto;
            margin-bottom:auto;
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
          background: whitesmoke;
          border-collapse: collapse;
        }
        table.details th, table.details td {
          border: 1px silver solid;
          padding: 0.2em;
          text-align: center;
          font-size: smaller;
        }
        table.details th {
          background: gainsboro;
        }
        table.details caption {
          margin-left: inherit;
          margin-right: inherit;
          background: whitesmoke;
        }
        table.details th.reqUrl, table.details td.reqUrl {
          text-align: left;
          width: 30em;
          word-wrap: break-word;
        }
        table.details td.even {
          background: gainsboro;
        }
        table.details td.odd {
          background: whitesmoke;
        }
        table.details td.evenRender {
          background: #dfffdf;
        }
        table.details td.oddRender {
          background: #ecffec;
        }
        table.details td.evenDoc {
          background: #dfdfff;
        }
        table.details td.oddDoc {
          background: #ececff;
        }
        table.details td.warning {
          background: #ffff88;
        }
        table.details td.error {
          background: #ff8888;
        }
        .header_details {
            display: none;
        }
        .a_request {
            cursor: pointer;
        }
        .snippet_container {
            display: none;
            margin: 1em 0;
        }
        .accordion_block {
            border: 1px solid #aaa;
            border-radius: 5px;
            width:930px;
        }
        .accordion_opener {
            cursor: pointer;
            display: block;
            padding: 0.2em;
        }
        .accordion_closed {
            background: url(/images/accordion_closed.png) no-repeat 10px 50%;
        }
        .accordion_opened {
            background: url(/images/accordion_opened.png) no-repeat 10px 50%;
            border-bottom: 1px #eee solid;
        }
        .accordion_loading {
            background: url(/images/activity_indicator.gif) no-repeat 10px 50%;
        }
        <?php
        include "waterfall.css";
        ?>
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Details';
            include 'header.inc';
            ?>

            <div id="result">
                <div id="download">
                    <div id="testinfo">
                        <?php
                        echo GetTestInfoHtml();
                        ?>
                    </div>
                    <?php
                        echo '<a href="/export.php?' . "test=$id&run=$run&cached=$cached&bodies=1&pretty=1" . '">Export HTTP Archive (.har)</a>';
                        if ( is_dir('./google') && array_key_exists('enable_google_csi', $settings) && $settings['enable_google_csi'] )
                            echo '<br><a href="/google/google_csi.php?' . "test=$id&run=$run&cached=$cached" . '">CSI (.csv) data</a>';
                        if (array_key_exists('custom', $data) && is_array($data['custom']) && count($data['custom']))
                            echo '<br><a href="/custom_metrics.php?' . "test=$id&run=$run&cached=$cached" . '">Custom Metrics</a>';
                        if( is_file("$testPath/{$run}{$cachedText}_dynaTrace.dtas") )
                        {
                            echo "<br><a href=\"/$testPath/{$run}{$cachedText}_dynaTrace.dtas\">Download dynaTrace Session</a>";
                            echo ' (<a href="http://ajax.dynatrace.com/pages/" target="_blank">get dynaTrace</a>)';
                        }
                        if( is_file("$testPath/{$run}{$cachedText}_bodies.zip") )
                            echo "<br><a href=\"/$testPath/{$run}{$cachedText}_bodies.zip\">Download Response Bodies</a>";
                        echo '<br>';
                    ?>
                </div>
                <div class="cleared"></div>
                <br>

                <?php
                  $htmlTable = new RunResultHtmlTable($testInfo, $testRunResults);
                  echo $htmlTable->create();
                ?>
                <br>
                <?php
                if( is_dir('./google') && isset($test['testinfo']['extract_csi']) )
                {
                    require_once('google/google_lib.inc');
                ?>
                    <h2>Csi Metrics</h2>
                            <table id="tableCustomMetrics" class="pretty" align="center" border="1" cellpadding="10" cellspacing="0">
                               <tr>
                            <?php
                                $isMultistep = $testRunResults->countSteps() > 1;
                                if ($isMultistep) {
                                    echo '<th align="center" class="border" valign="middle">Step</th>';
                                }
                                foreach ( $test['testinfo']['extract_csi'] as $csi_param )
                                    echo '<th align="center" class="border" valign="middle">' . $csi_param . '</th>';
                                echo "</tr>\n";
                                foreach ($testRunResults->getStepResults() as $stepResult) {
                                    echo "<tr>\n";
                                    $params = ParseCsiInfoForStep($stepResult->createTestPaths(), true);
                                    if ($isMultistep) {
                                        echo '<td class="even" valign="middle">' . $stepResult->readableIdentifier() . '</td>';
                                    }
                                    foreach ( $test['testinfo']['extract_csi'] as $csi_param )
                                    {
                                        if( array_key_exists($csi_param, $params) )
                                        {
                                            echo '<td class="even" valign="middle">' . $params[$csi_param] . '</td>';
                                        }
                                        else
                                        {
                                            echo '<td class="even" valign="middle">&nbsp;</td>';
                                        }
                                    }
                                    echo "</tr>\n";
                                }
                            ?>
                    </table><br>
                <?php
                }
                $userTimingTable = new UserTimingHtmlTable($testRunResults);
                echo $userTimingTable->create();

                ?>
                <script type="text/javascript">
                  markUserTime('aft.Detail Table');
                </script>

                <div style="text-align:center;">
                <h3 name="waterfall_view">Waterfall View</h3>
                <?php
                    if ($isMultistep) {
                        for ($i = 1; $i <= $testRunResults->countSteps(); $i++) {
                            $stepResult = $testRunResults->getStepResult($i);
                            $toggleFunction = "toggleSnippet('waterfall', $i)";
                            echo "<div class=\"accordion_block\">\n";
                            echo "<a name=\"waterfall_view_step" . $i . "\">";
                            echo "<h2 class=\"accordion_opener accordion_closed\" data-snippettype='waterfall' data-step='$i'>";
                            echo $stepResult->readableIdentifier();
                            echo "</h2></a>\n";
                            echo "<div id=\"snippet_waterfall_step$i\" class='snippet_container'></div>\n";
                            echo "</div>\n";
                        }
                    } else {
                        $enableCsi = (array_key_exists('enable_google_csi', $settings) && $settings['enable_google_csi']);
                        $waterfallSnippet = new WaterfallViewHtmlSnippet($testInfo, $testRunResults->getStepResult(1), $enableCsi);
                        echo $waterfallSnippet->create();
                    }
                ?>
                <br>
                <br>
                <h3 name="connection_view">Connection View</h3>
                    <?php
                    $waterfallSnippet = new ConnectionViewHtmlSnippet($testInfo, $testRunResults->getStepResult(1));
                    echo $waterfallSnippet->create();
                    ?>
                </div>
                <br><br>
                <?php include('./ads/details_middle.inc'); ?>

                <br>
                <?php
                    $useLinks = !$settings['nolinks'];
                    $requestDetailsSnippet = new RequestDetailsHtmlSnippet($testInfo, $testRunResults->getStepResult(1), $useLinks);
                    echo $requestDetailsSnippet->create();
                ?>

                <br>
                <?php include('./ads/details_bottom.inc'); ?>
                <br>
                <div id="headers">
                <?php
                    echo '';
                    if (array_key_exists('testinfo', $test) && array_key_exists('testerDNS', $test['testinfo']) && strlen($test['testinfo']['testerDNS']))
                        echo "<p>Test Machine DNS Server(s): {$test['testinfo']['testerDNS']}</p>\n";

                    $requestHeadersSnippet = new RequestHeadersHtmlSnippet($testRunResults->getStepResult(1), $useLinks);
                    $snippet = $requestHeadersSnippet->create();
                    if ($snippet) {
                        echo '<br><hr><h2>Request Headers</h2>';
                        echo $snippet;
                    }
                ?>
                </div>
            </div>

            <?php include('footer.inc'); ?>
        </div>

        <script type="text/javascript">
        var testId = "<?php echo $testInfo->getId(); ?>";
        var testRun = <?php echo $testRunResults->getRunNumber(); ?>;
        var testIsCached = <?php echo $testRunResults->isCachedRun() ? 1 : 0; ?>;

        $(document).ready(function() {
            $(".accordion_opener").click(function(event) {
               toggleAccordion(event.target);
            });
        });

        function toggleAccordion(targetNode) {
            targetNode = $(targetNode);
            var snippetType = targetNode.data("snippettype");
            var stepNumber = targetNode.data("step");
            var snippetNode = $("#snippet_" + snippetType + "_step" + stepNumber);
            if (snippetNode.data("loaded") !== "true") {
                var args = {
                    'snippet': snippetType,
                    'test' : testId,
                    'run' : testRun,
                    'cached' : testIsCached,
                    'step': stepNumber
                };
                targetNode.addClass("accordion_loading");
                snippetNode.load("/details_snippet.php", args, function () {
                    snippetNode.data("loaded", "true");
                    targetNode.removeClass("accordion_loading");
                    // trigger animation when all images in the snippet loaded
                    var images = snippetNode.find("img");
                    var noOfImages = images.length;
                    var noLoaded = 0;
                    images.on('load', function(){
                        noLoaded++;
                        if(noOfImages === noLoaded) {
                            animateAccordion(targetNode, snippetNode);
                        }
                    });
                })
            } else {
                animateAccordion(targetNode, snippetNode);
            }
        }

        function animateAccordion(openerNode, snippetNode) {
            openerNode.toggleClass("accordion_opened");
            openerNode.toggleClass("accordion_closed");
            snippetNode.slideToggle();
        }

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

        $(document).ready(function() { $(".tableDetails").tablesorter({
            headers: { 3: { sorter:'currency' } ,
                       4: { sorter:'currency' } ,
                       5: { sorter:'currency' } ,
                       6: { sorter:'currency' } ,
                       7: { sorter:'currency' } ,
                       8: { sorter:'currency' } ,
                       9: { sorter:'currency' }
                     }
        }); } );

        $('.a_request').click(function () {
            expandRequest($(this));
        });

        function expandAll(step) {
          $("#header_details_step" + step + " .header_details").each(function(index) {
            $(this).show();
          });
        }

        var hashLength = window.location.hash.length;
        var stepNum = -1;
        if (hashLength > 4 && window.location.hash.substring(hashLength - 4) == "_all") {
            stepNum = window.location.hash.substring("#step".length, hashLength - 4);
        } else if (window.location.hash == '#all') {
            stepNum = 1;
        }
        if (stepNum > 0) {
          expandAll(stepNum);
        } else
          expandRequest($(window.location.hash));

        <?php
        include "waterfall.js";
        ?>
        </script>
    </body>
</html>
