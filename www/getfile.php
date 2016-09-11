<?php
if(array_key_exists("HTTP_IF_MODIFIED_SINCE",$_SERVER) && strlen(trim($_SERVER['HTTP_IF_MODIFIED_SINCE']))) {
  header("HTTP/1.0 304 Not Modified");
} else {
  include 'common.inc';
  $ok = false;
  if (isset($_REQUEST['file']) && isset($testPath) && is_dir($testPath)) {
    $file = $_REQUEST['file'];
    if (preg_match('/[a-zA-Z0-9_\-]+\.(?P<ext>png|jpg|txt|zip|csv|mp4)/i', $file, $matches)) {
      $ext = strtolower($matches['ext']);
      $dir = '';
      if (isset($_REQUEST['video']) && preg_match('/[a-zA-Z0-9_\-]+/i', $_REQUEST['video'])) {
        $dir = $_REQUEST['video'] . '/';
      }
      $filePath = "$testPath/$dir$file";
      if (is_file($filePath)) {
        $ok = true;
        header('Last-Modified: ' . gmdate('r'));
        header('Expires: '.gmdate('r', time() + 31536000));
        header('Cache-Control: public,max-age=31536000');
        if ($ext == 'jpg') {
          header ("Content-type: image/jpeg");
        } elseif ($ext == 'png') {
          header ("Content-type: image/png");
        } elseif ($ext == 'txt') {
          header ("Content-type: text/plain");
        } elseif ($ext == 'csv') {
          header ("Content-type: text/csv");
        } elseif ($ext == 'zip') {
          header ("Content-type: application/zip");
        } elseif ($ext == 'mp4') {
          header ("Content-type: video/mp4");
        }
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
      }
    }
  }
  if (!$ok) {
    header("HTTP/1.0 404 Not Found");
  }
}
?>
