<?php

header('Content-type: text/plain');
header("Cache-Control: no-cache, must-revalidate");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
set_time_limit(300);
chdir('..');
include 'common_lib.inc';

require_once 'include/TestPaths.php';

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
          if (validateUploadFileName($fileName)) {
            $fileDestination = getFileDestination($testPath, $fileName);
            MoveUploadedFile($_FILES['file']['tmp_name'], $fileDestination);
          }
        }
      }
    }
  }
}


/**
 * Checks if the fileName contains invalid characters or has an invalid extension
 * @param $fileName string The filename to check
 * @return bool true if accepted for an upload, false otherwise
 */
function validateUploadFileName($fileName) {
  if (strpos($fileName, '..') !== false ||
      strpos($fileName, '/') !== false ||
      strpos($fileName, '\\') !== false) {
    return false;
  }
  $parts = pathinfo($fileName);
  $ext = strtolower($parts['extension']);
  // TODO: shouldn't this be a whitelist?
  return !in_array($ext, array('php', 'pl', 'py', 'cgi', 'asp', 'js', 'rb', 'htaccess', 'jar'));
}

/**
 * @param $testRoot string Root directory for the test
 * @param $fileName string Name of the uploaded file
 * @return string Destination path for the uploaded file
 */
function getFileDestination($testRoot, $fileName) {
  if (!isVideoFile($fileName)) {
    // non-video files are simply copied to the test root
    return $testRoot . "/" . $fileName;
  }

  // put each run of video data in it's own directory
  $testPaths = TestPaths::fromUnderscoreFileName($testRoot, $fileName);
  // make sure video dir exists
  $videoDir = $testPaths->videoDir();
  if (!is_dir($videoDir)) {
    mkdir($videoDir, 0777, true);
  }
  return getVideoFilePath($testPaths);
}

/**
 * @param $fileName string fileName to check
 * @return bool True if the file is part of a video, false otherwise
 */
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

