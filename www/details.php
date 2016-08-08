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
        #quicklinks_table {
            margin: 0 auto;
            line-height: 1.5em;
            border-collapse: collapse;
        }
        #quicklinks_table tr.even {
            background: whitesmoke;
        }
        #quicklinks_table td, #quicklinks_table th {
            border: 1px silver solid;
            padding: 0.5em;
        }
        #quicklinks_table th {
            font-weight: bold;
            background: gainsboro;
        }

        #back_to_top {
            background:white;
            position: fixed;
            bottom:1em;
            left:50%;
            margin-left: 510px; /* 980px/2+20 */
            padding:1em;
            display: none;
        }

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
        .snippet_container_requestHeaders {
            text-align: left;
            overflow: auto;
            padding: 0 1em;
        }
        .accordion_block {
            border: 1px solid #aaa;
            border-radius: 5px;
            width:930px;
        }
        .accordion_opener {
            text-align: center;
            cursor: pointer;
            display: block;
            padding: 0.2em;
            background: no-repeat 10px 50% transparent;
        }
        .accordion_opener.jkActive {
            background-color: whitesmoke;
        }
        .accordion_closed {
            background-image: url(/images/accordion_closed.png);
        }
        .accordion_opened {
            background-image: url(/images/accordion_opened.png);
        }
        .accordion_loading {
            background-image: url(/images/activity_indicator.gif);
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

                <?php
                if ($isMultistep) {
                    echo "<a name='quicklinks'><h3>Quicklinks</h3></a>\n";
                    echo "<table id='quicklinks_table'>\n";
                    for ($i = 1; $i <= $testRunResults->countSteps(); $i++) {
                        $stepResult = $testRunResults->getStepResult($i);
                        $urlGenerator = $stepResult->createUrlGenerator("", false);
                        $stepSuffix = "step" . $i;
                        $class = $i % 2 == 0 ? " class='even'" : "";
                        echo "<tr$class>\n";
                        echo "<th>" . $stepResult->readableIdentifier() . "</th>";
                        echo "<td><a href='#waterfall_view_$stepSuffix'>Waterfall View</a></td>";
                        echo "<td><a href='#connection_view_$stepSuffix'>Connection View</a></td>";
                        echo "<td><a href='#request_details_$stepSuffix'>Request Details</a></td>";
                        echo "<td><a href='#request_headers_$stepSuffix'>Request Headers</a></td>";
                        echo "<td><a href='" . $urlGenerator->stepDetailPage("customWaterfall", "width=930") . "'>Customize Waterfall</a></td>";
                        echo "<td><a href='" . $urlGenerator->stepDetailPage("pageimages") . "'>All Images</a></td>";
                        echo "</tr>";
                    }
                    echo "</table>\n<br>\n";
                }
                ?>

                <div style="text-align:center;">
                <h3 name="waterfall_view">Waterfall View</h3>
                <?php
                    if ($isMultistep) {
                        printAccordion("waterfall_view", "waterfall", $testRunResults);
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
                    if ($isMultistep) {
                        printAccordion("connection_view", "connection", $testRunResults);
                    } else {
                        $waterfallSnippet = new ConnectionViewHtmlSnippet($testInfo, $testRunResults->getStepResult(1));
                        echo $waterfallSnippet->create();
                    }
                    ?>
                </div>
                <br><br>
                <?php include('./ads/details_middle.inc'); ?>

                <br>
                <h3 name="request_details_view">Request Details</h3>
                <?php
                    if ($isMultistep) {
                        printAccordion("request_details", "requestDetails", $testRunResults, "initDetailsTable");
                    } else {
                        $useLinks = !$settings['nolinks'];
                        $requestDetailsSnippet = new RequestDetailsHtmlSnippet($testInfo, $testRunResults->getStepResult(1), $useLinks);
                        echo $requestDetailsSnippet->create();
                    }
                ?>

                <br>
                <?php include('./ads/details_bottom.inc'); ?>
                <br>
                <?php
                    echo '';
                    if (array_key_exists('testinfo', $test) && array_key_exists('testerDNS', $test['testinfo']) && strlen($test['testinfo']['testerDNS']))
                        echo "<p>Test Machine DNS Server(s): {$test['testinfo']['testerDNS']}</p>\n";

                    if ($isMultistep) {
                        echo "<br><h3 name=\"request_headers_view\" class='center'>Request Headers</h3>\n";
                        printAccordion("request_headers", "requestHeaders", $testRunResults, "initHeaderRequestExpander");
                    } else {
                        $requestHeadersSnippet = new RequestHeadersHtmlSnippet($testRunResults->getStepResult(1), $useLinks);
                        $snippet = $requestHeadersSnippet->create();
                        if ($snippet) {
                            echo '<div id="headers">';
                            echo '<br><hr><h2>Request Headers</h2>';
                            echo $snippet;
                            echo '</div>';
                        }
                    }
                ?>
            </div>

            <?php include('footer.inc'); ?>
        </div>
        <a href="#top" id="back_to_top">Back to top</a>
        <script type="text/javascript">
<?php
include __DIR__ . '/js/jk-navigation.js';
if ($isMultistep) {
?>
        var testId = "<?php echo $testInfo->getId(); ?>";
        var testRun = <?php echo $testRunResults->getRunNumber(); ?>;
        var testIsCached = <?php echo $testRunResults->isCachedRun() ? 1 : 0; ?>;

        $(document).ready(function() {
            $(".accordion_opener").click(function(event) {
               toggleAccordion(event.target);
            });
        });

        function toggleAccordion(targetNode, forceOpen, onComplete) {
            targetNode = $(targetNode);
            $('.accordion_opener.jkActive').removeClass("jkActive");
            targetNode.addClass("jkActive");

            if ((forceOpen === true && targetNode.hasClass("accordion_opened")) ||
                (forceOpen === false && targetNode.hasClass("accordion_closed"))) {
                    if (typeof onComplete == "function") {
                        onComplete();
                    }
                    return;
            }

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
                var initFunction = targetNode.data("jsinit");
                snippetNode.load("/details_snippet.php", args, function () {
                    snippetNode.data("loaded", "true");
                    targetNode.removeClass("accordion_loading");
                    if (initFunction) {
                        window[initFunction](snippetNode);
                    }
                    // trigger animation when all images in the snippet loaded
                    var images = snippetNode.find("img");
                    var noOfImages = images.length;
                    if (noOfImages > 0) {
                        var noLoaded = 0;
                        images.on('load', function(){
                            noLoaded++;
                            if(noOfImages === noLoaded) {
                                animateAccordion(targetNode, snippetNode, onComplete);
                            }
                        });
                    } else {
                        animateAccordion(targetNode, snippetNode, onComplete);
                    }
                })
            } else {
                animateAccordion(targetNode, snippetNode, onComplete);
            }
        }

        function animateAccordion(openerNode, snippetNode, onComplete) {
            openerNode.toggleClass("accordion_opened");
            openerNode.toggleClass("accordion_closed");
            snippetNode.slideToggle(400, onComplete);
        }
<?php } ?>

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

        function initDetailsTable(targetNode) {
             $(targetNode).find(".tableDetails").tablesorter({
                headers: { 3: { sorter:'currency' } ,
                    4: { sorter:'currency' } ,
                    5: { sorter:'currency' } ,
                    6: { sorter:'currency' } ,
                    7: { sorter:'currency' } ,
                    8: { sorter:'currency' } ,
                    9: { sorter:'currency' }
                }
            });
        }

        function initHeaderRequestExpander(targetNode) {
            $(targetNode).find('.a_request').click(function () {
                expandRequest($(this));
            });
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

        function handleRequestHash() {
            var stepNum = -1;
            var doExpandAll = false;
            if (window.location.hash.startsWith("#step")) {
                var parts = window.location.hash.split("_");
                stepNum = parts[0].substring("#step".length);
                doExpandAll = parts[1] == "all";
            } else if (window.location.hash == '#all') {
                stepNum = 1;
                doExpandAll = true;
            }
            if (stepNum <= 0) {
                return;
            }
            var expand = function() {
                var scrollToNode = $(window.location.hash);
                if (doExpandAll) {
                    scrollToNode = $("#step" + stepNum + "_all");
                    expandAll(stepNum);
                } else {
                    expandRequest(scrollToNode);
                }
                scrollTo(scrollToNode);
            };
            var slide_opener = $("#request_headers_step" + stepNum);
            if (slide_opener.length) {
                toggleAccordion(slide_opener, true, expand);
            } else {
                expand();
            }
        }

        function handleHash() {
            var hash = window.location.hash;
            if (!hash) {
                var defaultAccordion = $("#waterfall_view_step1");
                if (defaultAccordion.length) {
                    toggleAccordion(defaultAccordion);
                }
                return;
            }
            if (hash.startsWith("#waterfall_view_step") ||
                hash.startsWith("#connection_view_step") ||
                hash.startsWith("#request_details_step") ||
                hash.startsWith("#request_headers_step")) {
                var targetNode = $(hash);
                if (targetNode.length) {
                    toggleAccordion(targetNode, true, function() {
                        scrollTo(targetNode);
                    });
                }
            }
            handleRequestHash();
        }

        function initBackToTop() {
            $(window).scroll(function() {
                var button = $("#back_to_top");
                if ($(this).scrollTop() > 300) {
                    button.fadeIn();
                } else {
                    button.fadeOut();
                }
            });
            $("#back_to_top").click(function() {
                $('body,html').animate({ scrollTop: 0 }, 'fast');
                return false;
            });
        }

        // init existing snippets
        $(document).ready(function() {
            initDetailsTable($(document));
            initHeaderRequestExpander($(document));
            initBackToTop();
            addJKNavigation(".accordion_opener", function(selected) {
                toggleAccordion(selected, true, function() {
                    scrollTo(selected);
                });
            });
            handleHash();
        });
        window.onhashchange = handleHash;
        $(document).keydown(function (e) {
            if (e.keyCode != 32 || e.target != document.body) {
                return;
            }
            e.preventDefault();
            var active = $(".jkActive");
            if (active.length) {
                toggleAccordion(active, undefined, function() {
                    scrollTo(active);
                });
            }
        });

        <?php
        include "waterfall.js";
        ?>
        </script>
    </body>
</html>

<?php
/**
 * Prints an accordion of a given snippetType for all steps of the run
 * @param string $namePrefix Name prefix of the anchor
 * @param string $snippetType Type of the snipper: "waterfall", "connection", "requestDetails", or "requestHeaders"
 * @param TestRunResults $testRunResults The run results
 * @param string $jsInitCall Javascript function to call after init. Optional
 */
function printAccordion($namePrefix, $snippetType, $testRunResults, $jsInitCall = "") {
    for ($i = 1; $i <= $testRunResults->countSteps(); $i++) {
        $stepResult = $testRunResults->getStepResult($i);
        echo "<div class=\"accordion_block\">\n";
        echo "<h2 id=\"". $namePrefix . "_step" . $i . "\" class=\"accordion_opener accordion_closed\" " .
             "data-snippettype='$snippetType' data-step='$i' data-jsinit='$jsInitCall'>";
        echo $stepResult->readableIdentifier();
        echo "</h2>\n";
        echo "<div id=\"snippet_" . $snippetType . "_step$i\" class='snippet_container snippet_container_$snippetType'></div>\n";
        echo "</div>\n";
    }
}
