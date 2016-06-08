<?php

header('Content-type: text/plain');
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
set_time_limit(300);
chdir('..');
include 'common_lib.inc';

require_once 'TestPaths.inc';

$key = '';
if (array_key_exists('key', $_REQUEST))
  $key = $_REQUEST['key'];
$id = $_REQUEST['id'];

$testPath = './' . GetTestPath($id);
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
                strpos($ext, 'jar') === false) {
                $ok = true;
            }
            
            if ($ok) {
              if (isVideoFile($fileName)) {
                // put each run of video data in it's own directory
                $testPaths = TestPaths::fromUnderscoreFileName($testPath, $fileName);
                // make sure video dir exists
                $videoDir = $testPaths->videoDir();
                if (!is_dir($videoDir)) {
                  mkdir($videoDir, 0777, true);
                }
                MoveUploadedFile($_FILES['file']['tmp_name'], getVideoFilePath($testPaths));
              } else {
                MoveUploadedFile($_FILES['file']['tmp_name'], $testPath . "/" . $fileName);
              }
            }
          }
        }
      }
    }
  }
}

function isVideoFile($fileName) {
  return (strpos($fileName, "progress_") !== false) ||
         (strpos($fileName, "_ms_") !== false);
}

/**
 * @param $testPaths TestPaths The TestPaths object corresponding created from the uploaded file
 * @return string  The destination path for the image file of this video
 */
function getVideoFilePath($testPaths) {
  $baseName = $testPaths->getParsedBaseName();
  // parsed file names either include "progress_<frameNumber>" or "_ms_<milliSeconds>"
  $namePrefix = strpos($baseName, "progress") !== false ? "frame_" : "ms_";
  $parts = explode('_', $baseName);
  return $testPaths->videoDir() . "/" . $namePrefix . $parts[count($parts) - 1];
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

