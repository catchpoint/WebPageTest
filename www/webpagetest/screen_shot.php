<?php 
include 'common.inc';
require_once('video.inc');
require_once('page_data.inc');
$pageRunData = loadPageRunData($testPath, $run, $cached);

$videoPath = "$testPath/video_{$run}";
if( $cached )
    $videoPath .= '_cached';
    
// get the status messages
$messages = LoadStatusMessages($testPath . '/' . $run . $cachedText . '_status.txt');
    
// re-build the videos
MoveVideoFiles($testPath);
BuildVideoScript($testPath, $videoPath);
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Screen Shot</title>
        <?php include ('head.inc'); ?>
        <style type="text/css">
        img.center {
            display:block; 
            margin-left: auto;
            margin-right: auto;
        }
        div.test_results-content {
            text-align: center;
        }
        table {
            text-align: left;
            width: 50em;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }
        table th {
            padding: 0.2em 1em;
            text-align: left;
        }
        table td {
            padding: 0.2em 1em;
        }
        .time {
            white-space:nowrap; 
        }
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Test Result';
            $subtab = 'Screen Shot';
            include 'header.inc';
            ?>
            <?php
                if( is_dir("./$videoPath") )
                {
                    $createPath = "/video/create.php?tests=$id-r:$run-c:$cached&id={$id}.{$run}.{$cached}";
                    echo "<a href=\"$createPath\">Create Video</a> &#8226; ";
                    echo "<a href=\"/video/downloadFrames.php?test=$id&run=$run&cached=$cached\">Download Video Frames</a>";
                }
                    
                if($cached == 1)
                    $cachedText='_Cached';
            ?>
            <h1>Fully Loaded
            <?php
            if( isset($pageRunData) && isset($pageRunData['fullyLoaded']) )
                echo ' (' . number_format($pageRunData['fullyLoaded'] / 1000.0, 3) . '  sec)';
            ?>
            </h1>
		    <a href="<?php echo substr($testPath, 1) . '/' . $run . $cachedText; ?>_screen.jpg">
            <img class="center" alt="Screen Shot" src="<?php echo "{$GLOBALS['cdnPath']}/thumbnail.php?width=930&test=$id&run=$run&file=$run{$cachedText}_screen.jpg"; ?>">
            </a>
            <?php
                // display the last status message if we have one
                if( count($messages) )
                {
                    $lastMessage = end($messages);
                    if( strlen($lastMessage['message']) )
                        echo "\n<br>Last Status Message: \"{$lastMessage['message']}\"\n";
                }
                
                if( is_file($testPath . '/' . $run . $cachedText . '_screen_render.jpg') )
                {
                    echo '<br><br><a name="start_render"><h1>Start Render';
                    if( isset($pageRunData) && isset($pageRunData['render']) )
                        echo ' (' . number_format($pageRunData['render'] / 1000.0, 3) . '  sec)';
                    echo '</h1></a>';
                    echo '<img class="center" alt="Start Render Screen Shot" src="' . substr($testPath, 1) . '/' . $run . $cachedText . '_screen_render.jpg">';
                }
                if( is_file($testPath . '/' . $run . $cachedText . '_screen_dom.jpg') )
                {
                    echo '<br><br><a name="dom_element"><h1>DOM Element';
                    if( isset($pageRunData) && isset($pageRunData['domTime']) )
                        echo ' (' . number_format($pageRunData['domTime'] / 1000.0, 3) . '  sec)';
                    echo '</h1></a>';
                    echo '<img class="center" alt="DOM Element Screen Shot" src="' . substr($testPath, 1) . '/' . $run . $cachedText . '_screen_dom.jpg">';
                }
                if( is_file($testPath . '/' . $run . $cachedText . '_screen_doc.jpg') )
                {
                    echo '<br><br><a name="doc_complete"><h1>Document Complete';
                    if( isset($pageRunData) && isset($pageRunData['docTime']) )
                        echo ' (' . number_format($pageRunData['docTime'] / 1000.0, 3) . '  sec)';
                    echo '</h1></a>';
                    echo '<img class="center" alt="Document Complete Screen Shot" src="' . substr($testPath, 1) . '/' . $run . $cachedText . '_screen_doc.jpg">';
                }
                if( is_file($testPath . '/' . $run . $cachedText . '_aft.png') )
                {
                    echo '<br><br><a name="aft"><h1>AFT Details';
                    if( isset($pageRunData) && isset($pageRunData['aft']) )
                        echo ' (' . number_format($pageRunData['aft'] / 1000.0, 3) . '  sec)';
                    echo '</h1></a>';
                    echo 'White = Stabilized Early, Blue = Dynamic, Red = Static (late - failed AFT), Greet = AFT<br>';
                    echo '<img class="center" alt="AFT Diagnostic image" src="' . substr($testPath, 1) . '/' . $run . $cachedText . '_aft.png">';
                }
                
                // display all of the status messages
                if( count($messages) )
                {
                    echo "\n<br><br><a name=\"status_messages\"><h1>Status Messages</h1></a>\n";
                    echo "<table class=\"translucent\"><tr><th>Time</th><th>Message</th></tr>\n";
                    foreach( $messages as $message )
                        echo "<tr><td class=\"time\">{$message['time']} sec.</td><td>{$message['message']}</td></tr>";
                    echo "</table>\n";
                }
            ?>
            
            <?php include('footer.inc'); ?>
        </div>
	</body>
</html>

<?php
/**
* Load the status messages into an array
* 
* @param mixed $path
*/
function LoadStatusMessages($path)
{
    $messages = array();
    $lines = gz_file($path);

    foreach( $lines as $line )
    {
        $line = trim($line);
        if( strlen($line) )
        {
            $parts = explode("\t", $line);
            $time = (float)$parts[0] / 1000.0;
            $message = trim($parts[1]);
            if( $time >= 0.0 )
            {
                $msg = array(   'time' => $time,
                                'message' => $message );
                $messages[] = $msg;
            }
        }
    }

    return $messages;
}

?>
