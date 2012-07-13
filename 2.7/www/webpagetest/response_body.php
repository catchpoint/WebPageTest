<?php
include 'common.inc';
$body = null;
$request = (int)$_GET['request'];
if ($request) {
    $bodies_file = $testPath . '/' . $run . $cachedText . '_bodies.zip';
    if (is_file($bodies_file)) {
        $zip = new ZipArchive;
        if ($zip->open($bodies_file) === TRUE) {
            for( $i = 0; $i < $zip->numFiles; $i++ ) {
                $index = intval($zip->getNameIndex($i), 10);
                if ($index == $request) {
                    $body = $zip->getFromIndex($i);
                    break;
                }
            }
        }
    }
}

if (isset($body)) {
    header ("Content-type: text/plain");
    echo $body;
} else {
    header("HTTP/1.0 404 Not Found");
}
?>
