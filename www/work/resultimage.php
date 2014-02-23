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
if (ValidateTestId($id) && gz_is_file("$path/testinfo.json")) {
  $testInfo = json_decode(gz_file_get_contents("$path/testinfo.json"), true);
  if ($testInfo && is_array($testInfo) && array_key_exists('location', $testInfo)) {
    $location = $testInfo['location'];
    $locKey = GetLocationKey($location);
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
              strpos($ext, 'jar') === false) {
              $ok = true;
          }
          
          if ($ok) {
            // put each run of video data in it's own directory
            if (strpos($fileName, 'progress')) {
              $parts = explode('_', $fileName);
              if (count($parts)) {
                $runNum = $parts[0];
                $fileBase = $parts[count($parts) - 1];
                $cached = '';
                if( strpos($fileName, '_Cached') )
                  $cached = '_cached';
                $path .= "/video_$runNum$cached";
                if( !is_dir($path) )
                  mkdir($path);
                $fileName = 'frame_' . $fileBase;
              }
            }
            MoveUploadedFile($_FILES['file']['tmp_name'], "$path/$fileName");
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
  @chmod($dest, 0666);
}
?>

