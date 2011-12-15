<?php
/*
    Template for PSS tests
    Automatically fills in the script and batch information
    and does some validation to prevent abuse
    TODO: add support for caching tests
*/  
$json = true;
$req_location = 'closest';
$test['runs'] = 8;
$test['private'] = 1;
$test['view'] = 'pss';
$test['video'] = 1;
$req_priority = 0;
$test['median_video'] = 1;
$test['web10'] = 1;
$test['discard'] = 3;
$test['script'] = "setDnsName\t%HOSTR%\tghs.google.com\noverrideHost\t%HOSTR%\tpsa.pssdemos.com\nnavigate\t%URL%";
$req_bulkurls = "Original=$req_url noscript\nOptimized=$req_url";
$test['label'] = "Page Speed Service Comparison for $req_url";
?>
