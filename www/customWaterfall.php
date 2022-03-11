<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
require_once('object_detail.inc');
require_once('page_data.inc');
require_once('waterfall.inc');
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestRunResults.php';
require_once __DIR__ . '/include/RunResultHtmlTable.php';
require_once __DIR__ . '/include/UserTimingHtmlTable.php';
require_once __DIR__ . '/include/WaterfallViewHtmlSnippet.php';

$testInfo = TestInfo::fromFiles($testPath);
$testRunResults = TestRunResults::fromFiles($testInfo, $run, $cached, null);
$data = loadPageRunData($testPath, $run, $cached, $test['testinfo']);

$page_keywords = array('Custom','Waterfall','WebPageTest','Website Speed Test');
$page_description = "Website speed test custom waterfall$testLabel";
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest Custom Waterfall<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Custom Waterfall'; include ('head.inc'); ?>
    </head>
    <body id="custom-waterfall">
            <?php
            $tab = null;
            include 'header.inc';
            ?>
            <div class="customwaterfall_hed">
                <h1>Generate a Custom Waterfall</h1>
                <details open class="box details_panel">
                    <summary  class="details_panel_hed"><span><i class="icon_plus"></i> <span>Waterfall Settings</span></span></summary>
                    <form class="details_panel_content" name="urlEntry" action="javascript:UpdateWaterfall();" method="GET">
                        <fieldset>
                            <legend>Chart Type</legend>
                                <label><input type="radio" name="type" value="waterfall" checked>Waterfall</label>
                                <label><input type="radio" name="type" value="connection"> Connection View</label>
                        </fieldset>
                        <fieldset>
                            <legend>Chart Coloring</legend>
                            <label><input type="radio" name="coloring" value="classic"> Classic</label>
                            <label><input type="radio" name="coloring" value="mime" checked="checked"> By MIME Type</label>
                        </fieldset> 
                        <fieldset>
                            <label>Image Width <em>(Pixels, 300-2000)</em>: <input id="width" type="text" name="width" style="width:3em" value="930"></label>
                            <label>Maximum Time <em>(In seconds, leave blank for automatic)</em>: <input id="max" type="text" name="max" style="width:2em" value=""></label>
                            <label>Requests <em>(i.e. 1,2,3,4-9,8)</em>: <input id="requests" type="text" name="requests" value=""></label>
                        </fieldset>
                        <fieldset>
                            <legend>Show/Hide Extras</legend>
                            <label><input id="showUT" type="checkbox" checked>Lines for User Timing Marks</label>
                            <label><input id="showCPU" type="checkbox" checked>CPU Utilization</label>
                            <label><input id="showBW" type="checkbox" checked>Bandwidth Utilization</label>
                            <label><input id="showDots" type="checkbox" checked>Ellipsis (...) for missing items</label>
                            <label><input id="showLabels" type="checkbox" checked>Labels for requests (URL)</label>
                            <label><input id="showChunks" type="checkbox" checked>Download chunks</label>
                            <label><input id="showJS" type="checkbox" checked>JS Execution chunks</label>
                            <label><input id="showWait" type="checkbox" checked>Wait Time</label>
                         </fieldset>
                        <button id="update" onclick="javascript:UpdateWaterfall();">Update Waterfall</button><br>
                    </form>
                </details>
            </div>
            <div class="box">
                
            <?php

$waterfallSnippet = new WaterfallViewHtmlSnippet($testInfo, $testRunResults->getStepResult(1));
                        echo $waterfallSnippet->create(true, '&cpu=1&bw=1&ut=1&mime=1&js=1&wait=1');

                $extension = 'php';
                if( FRIENDLY_URLS )
                    $extension = 'png';
                echo "<div class=\"waterfall-container\"><img id=\"waterfallImage\" style=\"display: block; margin-left: auto; margin-right: auto;\" alt=\"Waterfall\" src=\"/waterfall.$extension?test=$id&run=$run&cached=$cached&step=$step&cpu=1&bw=1&ut=1&mime=1&js=1&wait=1\"></div>";
                echo "<p class=\"customwaterfall_download\"><a class=\"pill\" download href=\"/waterfall.$extension?test=$id&run=$run&cached=$cached&step=$step&cpu=1&bw=1&ut=1&mime=1&js=1&wait=1\">Download Waterfall Image</a></p>";

?>
            </div>
            <?php include('footer.inc'); ?>
        

        <script>
            $(document).ready(function(){

                // handle when the selection changes for the location
                $("input[name=type]").click(function(){
                    // disable the requests for connection view
                    var type = $('input[name=type]:checked').val();
                    if( type == 'connection' )
                        $('#requests').attr("disabled", "disabled");
                    else
                        $('#requests').removeAttr("disabled");

                    UpdateWaterfall();
                });

                $("input[name=coloring], input[type=checkbox]").click( UpdateWaterfall );
                $("input[type=text]:not(#requests)").on( "input", UpdateWaterfall );
                $("input#requests").on( "change", UpdateWaterfall );


                // reset the wait cursor when the image loads
                $('#waterfallImage').load(function(){
                    $('body').css('cursor', 'default');
                });
            });

            function UpdateWaterfall()
            {
                $('body').css('cursor', 'wait');
                var type = $('input[name=type]:checked').val();
                var coloring = $('input[name=coloring]:checked').val();
                var mime = 0;
                if (coloring == 'mime')
                    mime = 1;
                var width = $('#width').val();
                var max = $('#max').val();
                var requests = $('#requests').val();
                var showUT = 0;
                if( $('#showUT').attr('checked') )
                    showUT = 1;
                var showCPU = 0;
                if( $('#showCPU').attr('checked') )
                    showCPU = 1;
                var showBW = 0;
                if( $('#showBW').attr('checked') )
                    showBW = 1;
                var showDots = 0;
                if( $('#showDots').attr('checked') )
                    showDots = 1;
                var showLabels = 0;
                if( $('#showLabels').attr('checked') )
                    showLabels = 1;
                var showChunks = 0;
                if( $('#showChunks').attr('checked') )
                    showChunks = 1;
                var showJS = 0;
                if( $('#showJS').attr('checked') )
                    showJS = 1;
                var showWait = 0;
                if( $('#showWait').attr('checked') )
                    showWait = 1;
                <?php
                echo "var testId='$id';\n";
                echo "var testRun='$run';\n";
                echo "var cached='$cached';\n";
                echo "var extension='$extension';\n";
                echo "var step='$step';\n";
                ?>

                var src = '/waterfall.' + extension + '?test=' + testId +
                          '&run=' + testRun +
                          '&cached=' + cached +
                          '&step=' + step +
                          '&max=' + max +
                          '&width=' + width +
                          '&type=' + type +
                          '&mime=' + mime +
                          '&ut=' + showUT +
                          '&cpu=' + showCPU +
                          '&bw=' + showBW +
                          '&dots=' + showDots +
                          '&labels=' + showLabels +
                          '&chunks=' + showChunks +
                          '&js=' + showJS +
                          '&wait=' + showWait +
                          '&requests=' + requests;
                $('#waterfallImage').attr("src", src);
                $('.customwaterfall_download a').attr("href", src);
            };
        </script>
    </body>
</html>
