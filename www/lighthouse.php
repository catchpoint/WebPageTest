<?php
if(array_key_exists("HTTP_IF_MODIFIED_SINCE",$_SERVER) && strlen(trim($_SERVER['HTTP_IF_MODIFIED_SINCE']))) {
  header("HTTP/1.0 304 Not Modified");
} else {
  include 'common.inc';
  $ok = false;
  if (isset($testPath) && is_dir($testPath)) {
    $file = "${run}_lighthouse.html.gz";
    $filePath = "$testPath/$file";
    if (is_file($filePath)) {
      $ok = true;

      // Cache for a year
      header('Last-Modified: ' . gmdate('r'));
      header('Cache-Control: public,max-age=31536000');
      header('Content-type: text/html');
      header('Content-Length: ' . filesize($filePath));
      readfile($filePath);
    }
  }
  if (!$ok) {
    header("HTTP/1.0 404 Not Found");
  }
}
?>
