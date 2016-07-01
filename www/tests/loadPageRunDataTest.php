<?php

require_once __DIR__ . '/../common_lib.inc';
require_once __DIR__ . '/../page_data.inc';
require_once __DIR__ . '/TestUtil.php';

require __DIR__ . '/data/singlestepPageRunData.inc.php';


class LoadPageRunDataTest extends PHPUnit_Framework_TestCase {
  private $expectedData;
  private $extractPath;
  private $resultPath;

  public function setUp() {
    global $SINGLESTEP_PAGE_RUN_DATA;
    $this->expectedData = $SINGLESTEP_PAGE_RUN_DATA;
    $this->extractPath = TestUtil::extractToTemp(__DIR__ . "/data/singlestepResults.zip");
    if (!$this->extractPath) {
      $this->fail("Failed to extract results to temp dir");
    }
    $this->resultPath = $this->extractPath . "/singlestepResults";
    date_default_timezone_set("UTC"); // to make the test consistent with the result
  }

  public function tearDown() {
    if (is_dir($this->extractPath)) {
      TestUtil::removeDirRecursive($this->extractPath);
    }
  }

  public function testLoadPageRunData() {
    echo $this->resultPath . "\n";
    $pageRunData = loadPageRunData($this->resultPath, 1, 0);
    $this->assertArraySubset($this->expectedData, $pageRunData);
  }
}