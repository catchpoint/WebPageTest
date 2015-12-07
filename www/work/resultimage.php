<?php

header('Content-type: text/plain');
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
set_time_limit(300);
chdir('..');
include 'common_lib.inc';
$key = '';
if (array_key_exists('key', $_REQUEST))
    $key = $_REQUEST['key'];
$id = $_REQUEST['id'];

$path = './' . GetTestPath($id);
$testPath = $path;
if (ValidateTestId($id)) {
    $testInfo = GetTestInfo($id);
    if ($testInfo && is_array($testInfo) && isset($testInfo['location'])) {
        $location = $testInfo['location'];
        $locKey = GetLocationKey($location);
        if (isset($locKey)) {
            if ((!strlen($locKey) || !strcmp($key, $locKey)) || !strcmp($_SERVER['REMOTE_ADDR'], "127.0.0.1")) {
                if (array_key_exists('file', $_FILES) && array_key_exists('name', $_FILES['file'])) {
                    $fileName = $_FILES['file']['name'];
                    if (strpos($fileName, '..') === false &&
                        strpos($fileName, '/') === false &&
                        strpos($fileName, '\\') === false) {
                        // make sure the file is an acceptable type
                        $parts = pathinfo($fileName);
                        $ext = strtolower($parts['extension']);
                        $ok = false;
                        if (strpos($ext, 'php') === false &&
                            strpos($ext, 'pl') === false &&
                            strpos($ext, 'py') === false &&
                            strpos($ext, 'cgi') === false &&
                            strpos($ext, 'asp') === false &&
                            strpos($ext, 'js') === false &&
                            strpos($ext, 'rb') === false &&
                            strpos($ext, 'htaccess') === false &&
                            strpos($ext, 'jar') === false &&
                            strpos($ext, 'hist') === false) {
                            $ok = true;
                        }

                        if ($ok) {
                            // put each run of video data in it's own directory
                            if (strpos($fileName, 'progress') !== false) {
                                if (preg_match("/(?P<runNumber>[0-9]+)_(?P<cached>Cached_)?(?P<pageNumber>[a-z]+)_progress_(?P<fileBase>[\S]+)/",$file,$matches)) {
                                    $runNum = $matches['runNumber'];
                                    $page = $matches['pageNumber'];
                                    $fileBase = $matches['fileBase'];
                                    $cached = '';
                                    if( array_key_exists('cached',$matches) && $matches['cached'] != null && $matches['cached'] != '' ) {
                                        $cached = '_cached';
                                    }
                                    $pathOld = $testPath . "/video_{$runNum}{$cached}";
                                    if (!is_dir($pathOld))
                                        mkdir($pathOld, 0777, true);
                                    $path .= "/video_{$runNum}_{$page}{$cached}";
                                    if( !is_dir($path) )
                                        mkdir($path, 0777, true);
                                    $fileName = 'frame_' . $page . '_' . $fileBase;
                                }
                                if (preg_match("/(?P<runNumber>[0-9]+)(?P<cached>Cached_)?_progress_(?P<fileBase>[\S]+)/",$file,$matches)) {
                                    $runNum = $matches['runNumber'];
                                    $fileBase = $matches['fileBase'];
                                    $cached = '';
                                    if( array_key_exists('cached',$matches) && $matches['cached'] != null && $matches['cached'] != '' ) {
                                        $cached = '_cached';
                                    }
                                    $pathOld = $testPath . "/video_{$runNum}{$cached}";
                                    if (!is_dir($pathOld))
                                        mkdir($pathOld, 0777, true);
                                    $path .= "/video_{$runNum}_1{$cached}";
                                    if( !is_dir($path) )
                                        mkdir($path, 0777, true);
                                    $fileName = 'frame_1_' . $fileBase;
                                }
                            } elseif (strpos($fileName, '_ms_') !== false) {
                                $parts = explode('_', $fileName);
                                if (count($parts)) {
                                    $runNum = $parts[0];
                                    $fileBase = $parts[count($parts) - 1];
                                    $cached = '';
                                    if( strpos($fileName, '_Cached') )
                                        $cached = '_cached';
                                    $path .= "/video_$runNum$cached";
                                    if( !is_dir($path) )
                                        mkdir($path, 0777, true);
                                    $fileName = 'ms_' . $fileBase;
                                }
                            }
                            copy($_FILES['file']['tmp_name'], "$pathOld/$fileName");
                            MoveUploadedFile($_FILES['file']['tmp_name'], "$path/$fileName");
                        }
                    }
                }
            }
        }
    }
}

/**
 * Move the file upload and set the appropriate permissions
 */
function MoveUploadedFile($src, $dest) {
    move_uploaded_file($src, $dest);
    touch($dest);
    @chmod($dest, 0666);
}
?>
