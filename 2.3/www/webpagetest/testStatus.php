<?php
require_once('common.inc');
require_once('testStatus.inc');

$ret = array();
$ret['statusCode'] = 400;
$ret['statusText'] = 'Test not found';
if( isset($_REQUEST['r']) && strlen($_REQUEST['r']) )
    $ret['requestId'] = $req_r;

// see if we are dealing with multiple tests or a single test
if( isset($_REQUEST['tests']) && strlen($_REQUEST['tests']) )
{
}
else
{
    $ret['data'] = GetTestStatus($id, false);
    $ret['statusCode'] = $ret['data']['statusCode'];
    $ret['statusText'] = $ret['data']['statusText'];
}

// spit out the response in the correct format
if( $_REQUEST['f'] == 'xml' )
{
    header ('Content-type: text/xml');
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    echo "<response>\n";
    
    foreach( $ret as $key => &$val )
    {
        echo "<$key>";
        if( $key == 'data' )
        {
            echo "\n";
            foreach( $val as $k => $v )
                echo("<$k>$v</$k>\n");
        }
        else
            echo $val;
            
        echo "</$key>\n";
    }
    
    echo "</response>\n";
}
else
{
    header ("Content-type: application/json");
    echo json_encode($ret);
}
?>
