<?php 
include 'common.inc';
require_once('video.inc');
require_once('page_data.inc');
require_once('devtools.inc.php');
$pageRunData = loadPageRunData($testPath, $run, $cached);

$videoPath = "$testPath/video_{$run}";
if( $cached )
    $videoPath .= '_cached';
    
// get the status messages
$messages = LoadStatusMessages($testPath . '/' . $run . $cachedText . '_status.txt');
$console_log = DevToolsGetConsoleLog($testPath, $run, $cached);
    
$page_keywords = array('Screen Shot','Webpagetest','Website Speed Test');
$page_description = "Website performance test screen shots$testLabel.";
$userImages = true;
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest Screen Shots<?php echo $testLabel; ?></title>
        <?php $gaTemplate = 'Screen Shot'; include ('head.inc'); ?>
        <style type="text/css">
        img.center {
            display:block; 
            margin-left: auto;
            margin-right: auto;
        }
        div.test_results-content {
            text-align: center;
        }
        #messages {
            text-align: left;
            width: 50em;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }
        #messages th {
            padding: 0.2em 1em;
            text-align: left;
        }
        #messages td {
            padding: 0.2em 1em;
        }
        #console-log {
            text-align: left;
            width: 100%;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }
        #console-log th {
            padding: 0.2em 1em;
            text-align: left;
        }
        #console-log td {
            padding: 0.2em 1em;
        }
        #console-log td.source {
            width: 50px;
        }
        #console-log td.level {
            width: 40px;
        }
        #console-log td.message div {
            width: 420px;
            overflow: auto;
        }
        #console-log td.line {
            width: 30px;
        }
        #console-log td.url div{
            width: 220px;
            overflow: hidden;
        }
        .time {
            white-space:nowrap; 
        }
        tr.even {
            background: whitesmoke;
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
                if( is_file($testPath . '/' . $run . $cachedText . '_screen.png') )
                {
                    echo '<h1>Fully Loaded</h1>';
                    echo '<a href="' . substr($testPath, 1) . '/' . $run . $cachedText . '_screen.png">';
                    echo '<img class="center" alt="Screen Shot" style="max-width:930px; -ms-interpolation-mode: bicubic;" src="' . substr($testPath, 1) . '/' . $run . $cachedText . '_screen.png">';
                    echo '</a>';
                }
                elseif( is_file($testPath . '/' . $run . $cachedText . '_screen.jpg') )
                {
                    echo '<h1>Fully Loaded</h1>';
		            echo '<a href="' . substr($testPath, 1) . '/' . $run . $cachedText . '_screen.jpg">';
                    echo '<img class="center" alt="Screen Shot" style="max-width:930px; -ms-interpolation-mode: bicubic;" src="' . substr($testPath, 1) . '/' . $run . $cachedText . '_screen.jpg">';
                    echo '</a>';
                }
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
                    echo 'White = Stabilized Early, Blue = Dynamic, Red = Late Static (failed AFT), Green = AFT<br>';
                    echo '<img class="center" alt="AFT Diagnostic image" src="' . substr($testPath, 1) . '/' . $run . $cachedText . '_aft.png">';
                }
                if( is_file($testPath . '/' . $run . $cachedText . '_screen_responsive.jpg') )
                {
                    echo '<br><br><h1 id="responsive">Responsive Site Check</h1>';
                    echo '<img class="center" alt="Responsive Site Check image" src="' . substr($testPath, 1) . '/' . $run . $cachedText . '_screen_responsive.jpg">';
                }
                
                // display all of the status messages
                if( count($messages) )
                {
                    echo "\n<br><br><a name=\"status_messages\"><h1>Status Messages</h1></a>\n";
                    echo "<table id=\"messages\" class=\"translucent\"><tr><th>Time</th><th>Message</th></tr>\n";
                    foreach( $messages as $message )
                        echo "<tr><td class=\"time\">{$message['time']} sec.</td><td>{$message['message']}</td></tr>";
                    echo "</table>\n";
                }
                
                $row = 0;
                if (isset($console_log) && count($console_log)) {
                    echo "\n<br><br><a name=\"console-log\"><h1>Console Log</h1></a>\n";
                    echo "<table id=\"console-log\" class=\"translucent\"><tr><th>Source</th><th>Level</th><th>Message</th><th>URL</th><th>Line</th></tr>\n";
                    foreach( $console_log as &$log_entry ) {
                        $row++;
                        $rowClass = '';
                        if ($row % 2 == 0)
                            $rowClass = ' class="even"';
                        echo "<tr$rowClass><td class=\"source\">" . htmlspecialchars($log_entry['source']) .
                             "</td><td class=\"level\">" . htmlspecialchars($log_entry['level']) .
                             "</td><td class=\"message\"><div>" . htmlspecialchars($log_entry['text']) . 
                             "</div></td><td class=\"url\"><div><a href=\"" . htmlspecialchars($log_entry['url']) . 
                             "\">" . htmlspecialchars($log_entry['url']) .
                             "</a></div></td><td class=\"line\">" . htmlspecialchars($log_entry['line']) . "</td></tr>\n";
                    }
                    echo "</table>\n";
                }
            ?>
            
            </div>

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
    if (is_file($path)) {
      $lines = gz_file($path);
      if (isset($lines) && is_array($lines)) {
        foreach( $lines as $line ) {
          $line = trim($line);
          if( strlen($line) ) {
            $parts = explode("\t", $line);
            $time = (float)$parts[0] / 1000.0;
            $message = trim($parts[1]);
            if( $time >= 0.0 ) {
                $msg = array(   'time' => $time,
                                'message' => $message );
                $messages[] = $msg;
            }
          }
        }
      }
    }

    return $messages;
}

?>
