<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';
$page_keywords = array('Custom','Waterfall','WebPageTest','Website Speed Test');
$page_description = "Website speed test custom waterfall$testLabel";
?>
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <title>WebPageTest Custom Waterfall<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Custom Waterfall'; include ('head.inc'); ?>
    </head>
    <body <?php if ($COMPACT_MODE) {echo 'class="compact"';} ?>>
            <?php
            $tab = null;
            include 'header.inc';
            ?>
            <h1>Generate a Custom Waterfall</h1>
            <div class="box">
                <form name="urlEntry" action="javascript:UpdateWaterfall();" method="GET">
                    Chart Type:
                        <label><input type="radio" name="type" value="waterfall" checked="checked">Waterfall</label>
                     &nbsp; <label><input type="radio" name="type" value="connection"> Connection View</label><br>
                    Chart Coloring:
                        <label><input type="radio" name="coloring" value="classic"> Classic</label>
                     &nbsp; <label><input type="radio" name="coloring" value="mime" checked="checked"> By MIME Type</label><br>
                     <label>Image Width: <input id="width" type="text" name="width" style="width:3em" value="930"> Pixels (300-2000)</label><br>
                     <label>Maximum Time: <input id="max" type="text" name="max" style="width:2em" value=""> Seconds (leave blank for automatic)</label><br>
                     <label>Requests (i.e. 1,2,3,4-9,8): <input id="requests" type="text" name="requests" style="width:20em" value=""></label>
                    <button id="update" onclick="javascript:UpdateWaterfall();">Update Waterfall</button><br>
                    <label><input id="showUT" type="checkbox" checked> Draw lines for User Timing Marks</label>
                    <label><input id="showCPU" type="checkbox" checked> Show CPU Utilization</label>
                    <label><input id="showBW" type="checkbox" checked> Show Bandwidth Utilization</label> <br>
                    <label><input id="showDots" type="checkbox" checked> Show Ellipsis (...) for missing items</label>
                    <label><input id="showLabels" type="checkbox" checked> Show Labels for requests (URL)</label>
                    <label><input id="showChunks" type="checkbox" checked> Show download chunks</label>
                    <label><input id="showJS" type="checkbox" checked> Show JS Execution chunks</label>
                    <label><input id="showWait" type="checkbox" checked> Show Wait Time</label>
                </form>
            </div>
            <div class="box">
            <?php
                $extension = 'php';
                if( FRIENDLY_URLS )
                    $extension = 'png';
                echo "<img id=\"waterfallImage\" style=\"display: block; margin-left: auto; margin-right: auto;\" alt=\"Waterfall\" src=\"/waterfall.$extension?test=$id&run=$run&cached=$cached&step=$step&cpu=1&bw=1&ut=1&mime=1&js=1&wait=1\">";
            ?>
            </div>
            <?php include('footer.inc'); ?>
        

        <script type="text/javascript">
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

                $("input[name=coloring]").click(function(){
                    UpdateWaterfall();
                });

                $("input[type=checkbox]").click(function(){
                    UpdateWaterfall();
                });

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
            };
        </script>
    </body>
</html>
