<?php

class TestUtil {

  public static function extractToTemp($zipFile) {
    $zipFile = realpath($zipFile);
    $zip = new ZipArchive();
    $destPath = self::getTempPath("wptTest_");
    if ($zip->open($zipFile) !== TRUE) {
      return null;
    }
    $zip->extractTo($destPath);
    $zip->close();
    return $destPath;
  }

  public static function getTempPath($prefix) {
    $path = tempnam(null, $prefix);
    if (is_file($path)) {
      unlink($path);
    }
    mkdir($path);
    return $path;
  }

  public static function removeDirRecursive($path) {
    $files = glob($path . '/*');
    foreach ($files as $file) {
      is_dir($file) ? self::removeDirRecursive($file) : unlink($file);
    }
    rmdir($path);
    return;
  }
}