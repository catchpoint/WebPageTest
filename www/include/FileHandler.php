<?php

/**
 * Class to abstract and encapsulate file related functions
 */
class FileHandler {

  /**
   * @param string $path The path to check
   * @return bool True if the file exists, false otherwise
   */
  public function FileExists($path) {
    return is_file($path);
  }

  /**
   * @param string $path The path to check
   * @return bool True if the file exists with given path, or with additional ".gz" extension, false otherwise
   */
  public function GzFileExists($path) {
    return $this->FileExists($path . ".gz") || $this->FileExists($path);
  }

  public function gzReadFile($path) {
    if ($this->FileExists("$path.gz")) {
      return gzfile("$path.gz");
    } elseif ($this->FileExists($path)) {
      return file($path);
    }
    return null;
  }
}