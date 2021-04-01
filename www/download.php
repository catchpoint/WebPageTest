<?php
// Copyright 2020 Catchpoint Systems Inc.
// Use of this source code is governed by the Polyform Shield 1.0.0 license that can be
// found in the LICENSE.md file.
include 'common.inc';

// only allow download of relay tests
$ok = false;
if (is_file("$testPath/test.complete") || is_file("$testPath/.archived")) {
    if( strpos($testPath, 'relay') !== false
        && strpos($testPath, 'results') !== false
        && strpos($testPath, '..') === false
        && is_dir($testPath) )
    {
        $ok = DownloadTest($testPath);
    } elseif (isset($_REQUEST['s']) && GetServerSecret() == $_REQUEST['s']) {
        $ok = DownloadTest($testPath);
    }
}

function DownloadTest($testPath) {
    $ok = false;

    // zip the test up and download it
    $zipFile = "$testPath.zip";
    $zip = new ZipArchive();
    if ($zip->open($zipFile, ZIPARCHIVE::CREATE) === true) {
        $files = scandir($testPath);
        foreach( $files as $file ) {
            $filePath = "$testPath/$file";
            if( is_file($filePath) ) {
                $zip->addFile($filePath, $file);
            } elseif( $file != '.' && $file != '..' ) {
                $videoFiles = scandir($filePath);
                if( $videoFiles ) {
                    $zip->addEmptyDir($file);
                    foreach($videoFiles as $videoFile) {
                        $videoFilePath = "$filePath/$videoFile";
                        if( is_file($videoFilePath) )
                            $zip->addFile($videoFilePath, "$file/$videoFile");
                    }
                }
            }
        }
        $ok = true;
        $zip->close();
        header('Content-type: application/zip');
        readfile_chunked($zipFile);
        unlink($zipFile);
    }

    return $ok;
}

if( !$ok )
    header("HTTP/1.0 404 Not Found");
?>
