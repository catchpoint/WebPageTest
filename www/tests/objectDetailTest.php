<?php
require_once __DIR__ . '/TestUtil.php';
require_once __DIR__ . '/../common_lib.inc';
require_once __DIR__ . '/../object_detail.inc';

require __DIR__ . '/data/singlestepRequests.inc.php';
require __DIR__ . '/data/sampleDevtoolsRequests.inc.php';

class ObjectDetailTest extends PHPUnit_Framework_TestCase {
  private $tempDir;

  public function setUp() {
    $this->tempDir = null;
  }

  public function tearDown() {
    if ($this->tempDir && is_dir($this->tempDir)) {
      TestUtil::removeDirRecursive($this->tempDir);
    }
  }

  public function testGetRequestsWithDevtools() {
    global $SAMPLE_DEVTOOLS_REQUESTS;

    $this->tempDir = TestUtil::getTempPath("wptTest_");
    if (!copy(__DIR__ . "/data/sampleDevtools.json.gz", $this->tempDir . "/1_devtools.json.gz")) {
      $this->fail("Could not copy devtools file to temp dir.");
    }
    $actualRequests = getRequests("testId", $this->tempDir, 1, 0, $hasSecure, false);
    $this->assertEquals($SAMPLE_DEVTOOLS_REQUESTS, $actualRequests);
  }

  public function testGetRequests() {
    global $SINGLESTEP_REQUESTS;

    $this->tempDir = TestUtil::extractToTemp(__DIR__ . "/data/singlestepResults.zip");
    if (!$this->tempDir) {
      $this->fail("Failed to extract results to temp dir");
    }
    $testPath = $this->tempDir . "/singlestepResults";
    $actualRequests = getRequests("testId", $testPath, 1, 0, $hasSecure, false);
    $this->assertEquals($SINGLESTEP_REQUESTS, $actualRequests);
  }
}
