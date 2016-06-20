<?php

require_once __DIR__ . '/../common_lib.inc';
require_once __DIR__ . '/../page_data.inc';

require __DIR__ . '/data/singlestepPageRunData.inc.php';


class LoadPageRunDataTest extends PHPUnit_Framework_TestCase {
  private $expectedData;
  private $extractPath;
  private $resultPath;

  public function setUp() {
    global $SINGLESTEP_PAGE_RUN_DATA;
    $this->expectedData = $SINGLESTEP_PAGE_RUN_DATA;
    $this->extractPath = $this->extractToTemp(__DIR__ . "/data/singlestepResults.zip");
    $this->resultPath = $this->extractPath . "/singlestepResults";
    date_default_timezone_set("UTC"); // to make the test consistent with the result
  }

  public function tearDown() {
    if (is_dir($this->extractPath)) {
      //$this->removeDirRecursive($this->extractPath);
    }
  }

  /*
   * Tests
   */

  public function testLoadPageRunData() {
    echo $this->resultPath . "\n";
    $pageRunData = loadPageRunData($this->resultPath, 1, 0);
    $this->assertEquals($this->expectedData, $pageRunData);
  }


  /*
   * Helper methods
   */

  private function extractToTemp($zipFile) {
    $zipFile = realpath($zipFile);
    $zip = new ZipArchive();
    $destPath = $this->getTempPath("wptTest_");
    if ($zip->open($zipFile) !== TRUE) {
      $this->fail("Couldn't extract $zipFile to $destPath");
    }
    $zip->extractTo($destPath);
    $zip->close();
    return $destPath;
  }

  private function getTempPath($prefix) {
    $path = tempnam(null, $prefix);
    if (is_file($path)) {
      unlink($path);
    }
    mkdir($path);
    return $path;
  }

  private function removeDirRecursive($path) {
    $files = glob($path . '/*');
    foreach ($files as $file) {
      is_dir($file) ? $this->removeDirRecursive($file) : unlink($file);
    }
    rmdir($path);
    return;
  }
}