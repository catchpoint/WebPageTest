<?php

require_once __DIR__ . '/../include/TestStepResult.php';
require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/TestUtil.php';

class TestStepResultTest extends PHPUnit_Framework_TestCase {

  private $tempDir;
  private $resultDir;

  public function setUp() {
    $this->tempDir = TestUtil::extractToTemp(__DIR__ . '/data/multistepResults.zip');
    $this->resultDir = $this->tempDir . '/multistepResults';
  }

  public function tearDown() {
    if (!empty($this->tempDir) && is_dir($this->tempDir)) {
      TestUtil::removeDirRecursive($this->tempDir);
    }
  }

  public function testFromFiles() {
    $testInfo = TestInfo::fromFiles($this->resultDir);

    $firstStep = TestStepResult::fromFiles($testInfo, 1, false, 1);
    $this->assertEquals("google", $firstStep->getEventName());
    $this->assertNotEmpty($firstStep->getRawResults());
    $this->assertEquals("http://google.com", $firstStep->getUrl());

    $secondStep = TestStepResult::fromFiles($testInfo, 1, true, 2);
    $this->assertEquals("Step 2", $secondStep->getEventName());
    $this->assertNotEmpty($secondStep->getRawResults());
    $this->assertEquals("http://duckduckgo.com", $secondStep->getUrl());
  }
}
