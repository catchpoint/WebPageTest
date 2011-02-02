<?php
include 'common.inc';
set_time_limit(1000);

var_dump($testPath);
# Mark the test as cancelled.
if( gz_is_file("$testPath/testinfo.json") )
{
    $testInfoJson = json_decode(gz_file_get_contents("$testPath/testinfo.json"), true);
    var_dump($testInfoJson);
    //$testInfoJson['cancelled'] = true;
    gz_file_put_contents("$testPath/testinfo.json", json_encode($testInfoJson));
}
?>
