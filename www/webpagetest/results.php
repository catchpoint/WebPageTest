<?php 
include 'common.inc';
require_once('page_data.inc');

if( !isset($test) && array_key_exists('f', $_REQUEST) && $_REQUEST['f'] == 'json' ) {
    $ret = array('statusCode' => 400, 'statusText' => 'Test not found');
    json_response($ret);
} else {
    $pageData = loadAllPageData($testPath);

    // if we don't have an url, try to get it from the page results
    if( !strlen($url) )
        $url = $pageData[1][0]['URL'];
    if( isset($test['test']) && ( $test['test']['batch'] || $test['test']['batch_locations'] ) )
        include 'resultBatch.inc';
    elseif( isset($test['testinfo']['cancelled']) )
        include 'testcancelled.inc';
    elseif( (isset($test['test']) && isset($test['test']['completeTime'])) || count($pageData) > 0 )
    {
        if( @$test['test']['type'] == 'traceroute' )
            include 'resultTraceroute.inc';
        else
            include 'result.inc';
    }
    else
        include 'running.inc';
}
?>
