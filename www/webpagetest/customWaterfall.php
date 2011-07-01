<?php
include 'common.inc';
$page_keywords = array('Custom','Waterfall','Webpagetest','Website Speed Test');
$page_description = "Website speed test custom waterfall$testLabel";
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
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
                     Image Width: <input id="width" type="text" name="width" style="width:3em" value="930"> Pixels (300-2000)<br>
                     Maximum Time: <input id="max" type="text" name="max" style="width:2em" value=""> Seconds (leave blank for automatic)<br>
                     Requests (i.e. 1,2,3,4-9,8): <input id="requests" type="text" name="requests" style="width:20em" value="">
                    <button id="update" onclick="javascript:UpdateWaterfall();">Update Waterfall</button><br>
                    <input id="showCPU" type="checkbox" checked> Show CPU Utilization 
                    <input id="showBW" type="checkbox" checked> Show Bandwidth Utilization 
                    <input id="showDots" type="checkbox" checked> Show Ellipsis (...) for missing items
                </form>
            </div>
            <br>
            <?php
                $extension = 'php';
                if( FRIENDLY_URLS )
                    $extension = 'png';
                echo "<img id=\"waterfallImage\" style=\"display: block; margin-left: auto; margin-right: auto;\" alt=\"Waterfall\" src=\"/waterfall.$extension?test=$id&run=$run&cached=$cached\">";
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
                var width = $('#width').val();
                var max = $('#max').val();
                var requests = $('#requests').val();
                var showCPU = 0;
                if( $('#showCPU').attr('checked') )
                    showCPU = 1;
                var showBW = 0;
                if( $('#showBW').attr('checked') )
                    showBW = 1;
                var showDots = 0;
                if( $('#showDots').attr('checked') )
                    showDots = 1;
                <?php
                echo "var testId='$id';\n";
                echo "var testRun='$run';\n";
                echo "var cached='$cached';\n";
                echo "var extension='$extension';\n";
                ?>
                
                var src = '/waterfall.' + extension + '?test=' + testId + '&run=' + testRun + '&cached=' + cached + '&max=' + max + '&width=' + width + '&type=' + type + '&cpu=' + showCPU + '&bw=' + showBW + '&dots=' + showDots + '&requests=' + requests;
                $('#waterfallImage').attr("src", src);
            };
        </script>
    </body>
</html>
