<?php
include 'common.inc';
include 'object_detail.inc'; 
require_once('page_data.inc');
$secure = false;
$haveLocations = false;
$requests = getRequests($id, $testPath, $run, $_GET["cached"], $secure, $haveLocations, true);
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest Page Images<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Page Images'; include ('head.inc'); ?>
        <style type="text/css">
        .images td
        {
            vertical-align: top;
            padding-bottom: 1em;
        }
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = null;
            include 'header.inc';
            ?>
            <div class="translucent">
                <p>Images are what are currently being served from the given url and may not necessarily match what was loaded at the time of the test.</p>
                <table class="images">
                <?php
                foreach( $requests as &$request )
                {
                    if( strtolower(substr($request['contentType'], 0, 6)) == 'image/' )
                    {
                        $index = $request['index'] + 1;
                        echo "<tr><td><b>$index:</b></td><td>";
                        $reqUrl = "http://";
                        if( $request['secure'] )
                            $reqUrl = "https://";
                        $reqUrl .= $request['host'];
                        $reqUrl .= $request['url'];
                        echo "$reqUrl<br>";
                        $kb = number_format(((float)$request['objectSize'] / 1024.0), 1);
                        echo "$kb KB {$request['contentType']}<br>";
                        echo "<img src=\"$reqUrl\">";
                        echo "</td></tr>\n";
                    }
                }
                ?>
                </table>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
