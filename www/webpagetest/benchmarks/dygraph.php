<?php
/*
    Return benchmark data formatted for dygraph in csv format
    http://dygraphs.com/
*/

chdir('..');
include './benchmarks/data.inc.php';

if (array_key_exists('benchmark', $_REQUEST) && 
    array_key_exists('metric', $_REQUEST) && 
    array_key_exists('aggregate', $_REQUEST) && 
    array_key_exists('cached', $_REQUEST)) {
    $tsv = LoadDataTSV($_REQUEST['benchmark'], $_REQUEST['cached'], $_REQUEST['metric'], $_REQUEST['aggregate']);
    if (isset($tsv) && strlen($tsv)) {
        echo $tsv;
    }
}
?>
