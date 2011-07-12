<?php
include 'wpt_functions.inc';

$xml = file_get_contents("sample.xml");

saveWPTAssets("test",$xml);
?>
 
