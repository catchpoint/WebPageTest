<?php
ob_start();
set_time_limit(300);
include 'common.inc';
$pub = $settings['publishTo'];
if (!isset($pub) || !strlen($pub)) {
    $pub = $_SERVER['HTTP_HOST'];
}
if (strncasecmp($pub, 'http:', 5) && strncasecmp($pub, 'https:', 6))
  $pub = 'http://' . $pub;
if (!strncasecmp($pub, "http://www.webpagetest.org", 26))
  $pub = 'https://www.webpagetest.org';
$noheaders = false;
if (array_key_exists('noheaders', $_REQUEST) && $_REQUEST['noheaders'])
    $noheaders = true;
$id = null;
if (array_key_exists('test', $_REQUEST) && strlen($_REQUEST['test'])) {
    $id = $_REQUEST['test'];
    ValidateTestId($id);
}
$page_keywords = array('Publish','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Publish test results to WebPagetest.";
?>
<!DOCTYPE html>
<html>
    <head>
        <title>WebPagetest - Publish</title>
        <?php $gaTemplate = 'Publish'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            include 'header.inc';
            
            if ($id) {
                echo "<p>Please wait wile the results are uploaded to $pub (could take several minutes)...</p>";
                ob_flush();
                flush();
                echo '<p>';
                $pubUrl = PublishResult();
                if( isset($pubUrl) && strlen($pubUrl) )
                    echo "The test has been published to $pub and is available here: <a href=\"$pubUrl\">$pubUrl</a>";
                else
                    echo "There was an error publishing the results to $pub. Please try again later";
                if( FRIENDLY_URLS )
                    echo "</p><p><a href=\"/result/$id/\">Back to the test results</a></p>";
                else
                    echo "</p><p><a href=\"/results.php?test=$id\">Back to the test results</a></p>";
            } else {
                ?>
                <form id="publish" name="publish" action="publish.php" method="POST" enctype="multipart/form-data">
                Test ID to Publish: <input type="text" size="50" name="test"/>
                <ul class="input_fields">
                    <li>
                        <input type="checkbox" name="noheaders" id="noheaders" class="checkbox before_label">
                        <label for="noheaders" class="auto_width">
                        Remove HTTP Headers
                        </label>
                    </li>
                    <li>
                        <input type="checkbox" name="noscript" id="noscript" class="checkbox before_label">
                        <label for="noscript" class="auto_width">
                        Remove Script
                        </label>
                    </li>
                </ul>
                <br><button type="submit">Publish Test</button>
                </form>
                <?php
            }
            ?>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>

<?php

/**
* Publish the current result
* 
*/
function PublishResult()
{
    global $testPath;
    global $pub;
    global $noheaders;
    $result;
    
    // build the list of files to zip
    $files;
    $testPath = realpath($testPath);
    $dir = opendir($testPath);
    while($file = readdir($dir))
        if( $file != '.' && $file != '..' ) {
            if (stristr($file, 'report.txt') == false || !$noheaders) {
                $files[] = $testPath . "/$file";
            }
        }
    closedir($dir);

    if( isset($files) && count($files) )
    {    
        // zip up the results
        $zipFile = $testPath . '/publish.zip';
        $zip = new ZipArchive();
        if ($zip->open($zipFile, ZIPARCHIVE::CREATE) === true) {
            // add the files
            $files = scandir($testPath);
            foreach ($files as $file) {
              if ($file != 'publish.zip') {
                $filePath = "$testPath/$file";
                if (is_file($filePath)) {
                    $count++;
                    $zip->addFile($filePath, $file);
                } else if ($file != '.' && $file != '..' && is_dir($filePath)) {
                    $subFiles = scandir($filePath);
                    if ($subFiles) {
                        $zip->addEmptyDir($file);
                        foreach ($subFiles as $subFile) {
                            if( is_file("$filePath/$subFile") )
                                $zip->addFile("$filePath/$subFile", "$file/$subFile");
                        }
                    }
                }
              }
            }
            $zip->close();

            // upload the actual file
            $boundary = "---------------------".substr(md5(rand(0,32000)), 0, 10);
            $data = "--$boundary\r\n";

            $data .= "Content-Disposition: form-data; name=\"file\"; filename=\"publish.zip\"\r\n";
            $data .= "Content-Type: application/zip\r\n\r\n";
            $data .= file_get_contents($zipFile); 

            if (array_key_exists('noheaders', $_REQUEST)) {
                $data .= "\r\n--$boundary\r\n"; 
                $data .= "Content-Disposition: form-data; name=\"noheaders\"\r\n\r\n1";
            }

            if (array_key_exists('noscript', $_REQUEST)) {
                $data .= "\r\n--$boundary\r\n"; 
                $data .= "Content-Disposition: form-data; name=\"noscript\"\r\n\r\n1";
            }
            
            $data .= "\r\n--$boundary--\r\n";

            $params = array('http' => array(
                               'method' => 'POST',
                               'header' => "Connection: close\r\nContent-Type: multipart/form-data; boundary=$boundary",
                               'content' => $data
                            ));

            $ctx = stream_context_create($params);
            $url = "$pub/work/dopublish.php";
            $fp = fopen($url, 'rb', false, $ctx);
            if( $fp )
            {
                $response = @stream_get_contents($fp);
                if( $response && strlen($response) )
                    $result = "$pub/results.php?test=$response";
            }
            
            // delete the zip file
            unlink($zipFile);
        }
    }
    
    return $result;
}
?>
