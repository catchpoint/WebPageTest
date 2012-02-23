<?php
/*
    Return benchmark data formatted for dygraph in csv format
    http://dygraphs.com/
*/

chdir('..');
include './benchmarks/data.inc.php';

if (LoadData($data, $columns)) {
    echo "Date";
    foreach($columns as $column) {
        echo ",$column";
    }
    echo "\n";
    foreach ($data as $time => &$row) {
        echo date('Y-m-d H:i:s', $time);
        foreach($columns as $column) {
            echo ',';
            if (array_key_exists($column, $row))
                echo $row[$column];
        }
        echo "\n";
    }
}
?>
