<?php
include('common.inc');
$file = "$testPath/{$_GET['file']}";

if( isset($_GET['file']) && 
    strlen($_GET['file']) && 
    strpos($file, '/') === false && 
    strpos($file, '\\') === false &&
    strpos($file, '..') === false &&
    gz_is_file($file) )
{
    header ("Content-type: application/octet-stream");
    gz_readfile_chunked($file);
}
else
    header("HTTP/1.0 404 Not Found");  
?>
