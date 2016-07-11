<?php 
include __DIR__ . '/common.inc';
require_once __DIR__ . '/video.inc';
require_once __DIR__ . '/page_data.inc';
require_once __DIR__ . '/devtools.inc.php';
require_once __DIR__ . '/include/FileHandler.php';
require_once __DIR__ . '/include/TestPaths.php';
require_once __DIR__ . '/include/UrlGenerator.php';
require_once __DIR__ . '/include/TestInfo.php';
require_once __DIR__ . '/include/TestRunResults.php';

$fileHandler = new FileHandler();
$testInfo = TestInfo::fromFiles($testPath);
$testRunResults = TestRunResults::fromFiles($testInfo, $run, $cached, $fileHandler);

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

            printContent($fileHandler, $testInfo, $testRunResults);
            ?>
            
            </div>

            <?php include('footer.inc'); ?>
        </div>
	</body>
</html>

<?php

/**
 * @param FileHandler $fileHandler
 * @param TestInfo $testInfo
 * @param TestRunResults $testRunResults
 */
function printContent($fileHandler, $testInfo, $testRunResults) {
    $testStepResult = $testRunResults->getStepResult(1);
    $pageRunData = $testStepResult->getRawResults();

    $localPaths = $testStepResult->createTestPaths();
    $urlPaths = $testStepResult->createTestPaths(substr($testInfo->getRootDirectory(), 1));
    $urlGenerator = $testStepResult->createUrlGenerator("", FRIENDLY_URLS);

    echo "<h1 class='stepName'>" . $testStepResult->readableIdentifier() . "</h1>";

    if ($fileHandler->dirExists($localPaths->videoDir())) {
        echo "<a href=\"" . $urlGenerator->createVideo() . "\">Create Video</a> &#8226; ";
        echo "<a href=\"" . $urlGenerator->downloadVideoFrames() . "\">Download Video Frames</a>";
    }

    $screenShotUrl = null;
    if ($fileHandler->fileExists($localPaths->screenShotPngFile())) {
        $screenShotUrl = $urlPaths->screenShotPngFile();
    } else if ($fileHandler->fileExists($localPaths->screenShotFile())) {
        $screenShotUrl = $urlPaths->screenShotFile();
    }
    if ($screenShotUrl) {
        echo '<h2>Fully Loaded</h2>';
        echo '<a href="' . $screenShotUrl . '">';
        echo '<img class="center" alt="Screen Shot" style="max-width:930px; -ms-interpolation-mode: bicubic;" src="' . $screenShotUrl .'">';
        echo '</a>';
    }

    // display the last status message if we have one
    $messages = $testStepResult->getStatusMessages();
    if (count($messages)) {
        $lastMessage = end($messages);
        if (strlen($lastMessage['message']))
            echo "\n<br>Last Status Message: \"{$lastMessage['message']}\"\n";
    }

    if ($fileHandler->fileExists($localPaths->additionalScreenShotFile("render"))) {
        echo '<br><br><a name="start_render"><h2>Start Render';
        if (isset($pageRunData) && isset($pageRunData['render']))
            echo ' (' . number_format($pageRunData['render'] / 1000.0, 3) . '  sec)';
        echo '</h2></a>';
        echo '<img class="center" alt="Start Render Screen Shot" src="' . $urlPaths->additionalScreenShotFile("render") . '">';
    }
    if ($fileHandler->fileExists($localPaths->additionalScreenShotFile("dom"))) {
        echo '<br><br><a name="dom_element"><h2>DOM Element';
        if (isset($pageRunData) && isset($pageRunData['domTime']))
            echo ' (' . number_format($pageRunData['domTime'] / 1000.0, 3) . '  sec)';
        echo '</h2></a>';
        echo '<img class="center" alt="DOM Element Screen Shot" src="' . $urlPaths->additionalScreenShotFile("dom") . '">';
    }
    if ($fileHandler->fileExists($localPaths->additionalScreenShotFile("doc"))) {
        echo '<br><br><a name="doc_complete"><h2>Document Complete';
        if (isset($pageRunData) && isset($pageRunData['docTime']))
            echo ' (' . number_format($pageRunData['docTime'] / 1000.0, 3) . '  sec)';
        echo '</h2></a>';
        echo '<img class="center" alt="Document Complete Screen Shot" src="' . $urlPaths->additionalScreenShotFile("doc") . '">';
    }
    if ($fileHandler->fileExists($localPaths->aftDiagnosticImageFile())) {
        echo '<br><br><a name="aft"><h2>AFT Details';
        if (isset($pageRunData) && isset($pageRunData['aft']))
            echo ' (' . number_format($pageRunData['aft'] / 1000.0, 3) . '  sec)';
        echo '</h2></a>';
        echo 'White = Stabilized Early, Blue = Dynamic, Red = Late Static (failed AFT), Green = AFT<br>';
        echo '<img class="center" alt="AFT Diagnostic image" src="' . $urlPaths->aftDiagnosticImageFile() . '">';
    }
    if ($fileHandler->fileExists($localPaths->additionalScreenShotFile("responsive"))) {
        echo '<br><br><h2 id="responsive">Responsive Site Check</h2>';
        echo '<img class="center" alt="Responsive Site Check image" src="' . $urlPaths->additionalScreenShotFile("responsive") . '">';
    }

    // display all of the status messages
    if (count($messages)) {
        echo "\n<br><br><a name=\"status_messages\"><h2>Status Messages</h2></a>\n";
        echo "<table id=\"messages\" class=\"translucent\"><tr><th>Time</th><th>Message</th></tr>\n";
        foreach ($messages as $message) {
            $time = $message['time'] / 1000.0;
            if ($time > 0.0) {
                echo "<tr><td class=\"time\">{$time} sec.</td><td>{$message['message']}</td></tr>";
            }
        }
        echo "</table>\n";
    }

    $row = 0;
    $console_log = $testStepResult->getConsoleLog();
    if (isset($console_log) && count($console_log)) {
        echo "\n<br><br><a name=\"console-log\"><h2>Console Log</h2></a>\n";
        echo "<table id=\"console-log\" class=\"translucent\"><tr><th>Source</th><th>Level</th><th>Message</th><th>URL</th><th>Line</th></tr>\n";
        foreach ($console_log as &$log_entry) {
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
}

?>
