<?php
header('Content-type: application/json');
$result = array('statusCode' => 200, 'statusText' => 'ok');
if( $_GET['r'] )
    $result['requestId'] = $_GET['r'];

$data = array();
$data['url'] = 'http://www.google.com/';
$result['data'] = $data;

$out = json_encode($result);

// see if we need to wrap it in a JSONP callback
if( isset($_REQUEST['callback']) && strlen($_REQUEST['callback']) )
    echo "{$_REQUEST['callback']}($out);";
else
    echo $out;
?>
