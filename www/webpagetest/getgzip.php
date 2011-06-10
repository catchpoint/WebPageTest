<?php
include('common.inc');
$file = "$testPath/{$_GET['file']}";

if( isset($_GET['file']) && strlen($_GET['file']) && gz_is_file($file) )
{
    if( strlen($_GET['mime']) )
        header ("Content-type: {$_GET['mime']}");
    else
        header ("Content-type: application/octet-stream");
    gz_readfile_chunked($file);
}
else
    header("HTTP/1.0 404 Not Found");  
?>
