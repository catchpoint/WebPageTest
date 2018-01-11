<?php
include('common.inc');
$file = "$testPath/{$_GET['file']}";

if( isset($_GET['file']) && 
    strlen($_GET['file']) && 
    strpos($_GET['file'], '/') === false && 
    strpos($_GET['file'], '\\') === false &&
    strpos($_GET['file'], '..') === false &&
    strpos($_GET['file'], 'testinfo') === false &&
    gz_is_file($file) )
{
    $file_name = $_GET['file'];
    if (substr($file_name, -10) === 'netlog.txt')
      $file_name = str_replace('netlog.txt', 'netlog.json', $file_name);
    header("Content-disposition: attachment; filename=$file_name");
    if( strpos($file_name, 'pagespeed') !== false || 
        strpos($file_name, '.json') !== false ) {
        header ("Content-type: application/json");
    } elseif (strpos($file_name, '.log') !== false) {
        header ("Content-type: text/plain");
    } else {
        header ("Content-type: application/octet-stream");
    }
    if (isset($_REQUEST['compressed'])) {
      readfile($file);
    } else {
      gz_readfile_chunked($file);
    }
}
else
    header("HTTP/1.0 404 Not Found");  
?>
