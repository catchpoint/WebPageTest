<?php

/**
 * Class to abstract and encapsulate file related functions
 */
class FileHandler {

  /**
   * @param string $path The path to check
   * @return bool True if the file exists, false otherwise
   */
  public function fileExists($path) {
    return is_file($path);
  }

  /**
   * @param string $path The path to check
   * @return bool True if the directory exists, false otherwise
   */
  public function dirExists($path) {
    return is_dir($path);
  }

  /**
   * @param string $path The path to check
   * @return bool True if the file exists with given path, or with additional ".gz" extension, false otherwise
   */
  public function gzFileExists($path) {
    return $this->fileExists($path . ".gz") || $this->fileExists($path);
  }

  public function gzReadFile($path) {
    if ($this->fileExists("$path.gz")) {
      return gzfile("$path.gz");
    } elseif ($this->fileExists($path)) {
      return file($path);
    }
    return null;
  }
}
