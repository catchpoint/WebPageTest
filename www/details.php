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

                $secure = false;
                $haveLocations = false;
                $requests = getRequests($id, $testPath, $run, @$_GET['cached'], $secure, $haveLocations, true, true);
                ?>
                <script type="text/javascript">
                  markUserTime('aft.Detail Table');
                </script>

                <div style="text-align:center;">
                <h3 name="waterfall_view">Waterfall View</h3>
                <?php
                    $enableCsi = (array_key_exists('enable_google_csi', $settings) && $settings['enable_google_csi']);
                    $waterfallSnippet = new WaterfallViewHtmlSnippet($testInfo, $testRunResults->getStepResult(1), $enableCsi);
                    echo $waterfallSnippet->create();
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
                <?php include 'waterfall_detail.inc'; ?>
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

        function expandAll() {
          $(".header_details").each(function(index) {
            $(this).show();
          });
        }
        
        if (window.location.hash == '#all') {
          expandAll();
        } else
          expandRequest($(window.location.hash));

        <?php
        include "waterfall.js";
        ?>
        </script>
    </body>
</html>
