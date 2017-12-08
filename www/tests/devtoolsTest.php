<?php

require_once __DIR__ . '/TestUtil.php';
require_once __DIR__ . '/../common_lib.inc';
require_once __DIR__ . '/../devtools.inc.php';

require __DIR__ . '/data/sampleDevtoolsRequestData.inc.php';

class DevToolsTest extends PHPUnit_Framework_TestCase {
  private $tempDir;

  public function setUp() {
    $this->tempDir = TestUtil::getTempPath("wptTest_");
  }

  public function tearDown() {
    if (is_dir($this->tempDir)) {
      TestUtil::removeDirRecursive($this->tempDir);
    }
  }

  public function testGetDevToolsRequests() {
    global $SAMPLE_DEVTOOLS_REQUEST_DATA;
    global $SAMPLE_DEVTOOLS_PAGE_DATA;

    if (!copy(__DIR__ . "/data/sampleDevtools.json.gz", $this->tempDir . "/1_devtools.json.gz")) {
      $this->fail("Could not copy devtools file to temp dir.");
    }

    $this->assertTrue(GetDevToolsRequests($this->tempDir, 1, 0, $actualRequests, $actualPageData));
    $this->assertEquals($SAMPLE_DEVTOOLS_REQUEST_DATA, $actualRequests);
    $this->assertEquals($SAMPLE_DEVTOOLS_PAGE_DATA, $actualPageData);
  }
}