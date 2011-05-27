<?php
ob_start();
set_time_limit(300);
include 'common.inc';
require_once('./lib/pclzip.lib.php');
$pub = $settings['publishTo'];
$page_keywords = array('Publish','Webpagetest','Website Speed Test','Page Speed');
$page_description = "Publish test results to WebPagetest.";
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Publish</title>
        <?php $gaTemplate = 'Publish'; include ('head.inc'); ?>
    </head>
    <body>
        <div class="page">
            <?php
            include 'header.inc';
            ?>
            <?php
            echo "<p>Please wait wile the results are uploaded to $pub (could take several minutes)...</p>";
            ob_flush();
            flush();
            echo '<p>';
            $pubUrl = PublishResult();
            if( isset($pubUrl) && strlen($pubUrl) )
                echo "The test has been published to $pub and is available here: <a href=\"$pubUrl\">$pubUrl</a>";
            else
                echo "There was an error publishing the results to $pub. Please try again later";
                
            echo "</p><p><a href=\"/result/$id/\">Back to the test results</a></p>";
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
    $result;
    
    // build the list of files to zip
    $files;
    $dir = opendir("$testPath");
    while($file = readdir($dir))
        if( $file != '.' && $file != '..' )
            $files[] = $testPath . "/$file";
    closedir($dir);

    if( isset($files) && count($files) )
    {    
        // zip up the results
        $zipFile = $testPath . '/publish.zip';
        $zip = new PclZip($zipFile);
        if( $zip->create($files, PCLZIP_OPT_REMOVE_ALL_PATH) != 0 )
        {
            // upload the actual file
            $boundary = "---------------------".substr(md5(rand(0,32000)), 0, 10);
            $data = "--$boundary\r\n";

            $data .= "Content-Disposition: form-data; name=\"file\"; filename=\"publish.zip\"\r\n";
            $data .= "Content-Type: application/zip\r\n\r\n";
            $data .= file_get_contents($zipFile); 
            $data .= "\r\n--$boundary--\r\n";

            $params = array('http' => array(
                               'method' => 'POST',
                               'header' => 'Content-Type: multipart/form-data; boundary='.$boundary,
                               'content' => $data
                            ));

            $ctx = stream_context_create($params);
            $url = "http://$pub/work/dopublish.php";
            $fp = fopen($url, 'rb', false, $ctx);
            if( $fp )
            {
                $response = @stream_get_contents($fp);
                if( $response && strlen($response) )
                    $result = "http://$pub/result/$response/";
            }
            
            // delete the zip file
            unlink($zipFile);
        }
    }
    
    return $result;
}
?>
