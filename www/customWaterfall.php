<?php
include 'common.inc';
$page_keywords = array('Custom','Waterfall','Webpagetest','Website Speed Test');
$page_description = "Website speed test custom waterfall$testLabel";
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest Custom Waterfall<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Custom Waterfall'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = null;
            include 'header.inc';
            ?>

            <div style="width: 930px; margin-left: auto; margin-right: auto;">
                <br><b>Generate a custom Waterfall:</b><br>
                <form style="margin-left:2em;" name="urlEntry" action="javascript:UpdateWaterfall();" method="GET">
                    Chart Type: <input type="radio" name="type" value="waterfall" checked="checked"> Waterfall
                     &nbsp; <input type="radio" name="type" value="connection"> Connection View<br>
                    Chart Coloring: <input type="radio" name="coloring" value="classic" checked="checked"> Classic
                     &nbsp; <input type="radio" name="coloring" value="mime"> By MIME Type<br>
                     Image Width: <input id="width" type="text" name="width" style="width:3em" value="930"> Pixels (300-2000)<br>
                     Maximum Time: <input id="max" type="text" name="max" style="width:2em" value=""> Seconds (leave blank for automatic)<br>
                     Requests (i.e. 1,2,3,4-9,8): <input id="requests" type="text" name="requests" style="width:20em" value="">
                    <button id="update" onclick="javascript:UpdateWaterfall();">Update Waterfall</button><br>
                    <input id="showUT" type="checkbox" checked> Draw lines for User Timing Marks
                    <input id="showCPU" type="checkbox" checked> Show CPU Utilization 
                    <input id="showBW" type="checkbox" checked> Show Bandwidth Utilization <br>
                    <input id="showDots" type="checkbox" checked> Show Ellipsis (...) for missing items
                    <input id="showLabels" type="checkbox" checked> Show Labels for requests (URL)
                </form>
            </div>
            <br>
            <?php
                $extension = 'php';
                if( FRIENDLY_URLS )
                    $extension = 'png';
                echo "<img id=\"waterfallImage\" style=\"display: block; margin-left: auto; margin-right: auto;\" alt=\"Waterfall\" src=\"/waterfall.$extension?test=$id&run=$run&cached=$cached&step=$step&cpu=1&bw=1&ut=1\">";
            ?>
            
            <?php include('footer.inc'); ?>
        </div>

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
                          '&requests=' + requests;
                $('#waterfallImage').attr("src", src);
            };
        </script>
    </body>
</html>
