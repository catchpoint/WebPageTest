<?php
include('common.inc');
$file = "$testPath/{$_GET['file']}";

if( isset($_GET['file']) && strlen($_GET['file']) && gz_is_file($file) )
{
    if( strpos($_GET['file'], 'pagespeed') !== false )
        header ("Content-type: application/json");
    else
        header ("Content-type: application/octet-stream");
    gz_readfile_chunked($file);
}
else
    header("HTTP/1.0 404 Not Found");  
?>
