<?php

require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/TestUtil.php';

class TestInfoTest extends PHPUnit_Framework_TestCase {

  private $tempDir;

  public function tearDown() {
    if (!empty($this->tempDir) && is_dir($this->tempDir)) {
      TestUtil::removeDirRecursive($this->tempDir);
    }
  }

  public function testWithMultistepResults() {
    $this->tempDir = TestUtil::extractToTemp(__DIR__ . '/data/multistepResults.zip');
    $resultdir = $this->tempDir . '/multistepResults';
    $testInfo = TestInfo::fromFiles($resultdir);

    $this->assertTrue($testInfo->isComplete());
    $this->assertFalse($testInfo->isFirstViewOnly());

    $this->assertEquals(1, $testInfo->getRuns());
    $this->assertTrue($testInfo->isRunComplete(1));
    $this->assertFalse($testInfo->isRunComplete(2));

    $this->assertEquals(2, $testInfo->stepsInRun(1));

    $this->assertEquals($resultdir, $testInfo->getRootDirectory());

    // these values are static from a test, but the assertions make sure we don't break the methods
    $this->assertEquals("160623_K8_3", $testInfo->getId());
    $this->assertEquals("Firefox, Internet Explorer and Chrome - <b>Chrome</b> - <b>Cable</b>", $testInfo->getTestLocation());
    $this->assertEquals("ITERAHH-VBOX-01-192.168.188.112", $testInfo->getTester(1));
  }

  public function testWithSinglestepResults() {
    $this->tempDir = TestUtil::extractToTemp(__DIR__ . '/data/singlestepResults.zip');
    $resultdir = $this->tempDir . '/singlestepResults';
    $testInfo = TestInfo::fromFiles($resultdir);

    $this->assertTrue($testInfo->isComplete());
    $this->assertTrue($testInfo->isFirstViewOnly());

    $this->assertEquals(1, $testInfo->getRuns());
    $this->assertTrue($testInfo->isRunComplete(1));
    $this->assertFalse($testInfo->isRunComplete(2));

    $this->assertEquals(1, $testInfo->stepsInRun(1));

    $this->assertEquals($resultdir, $testInfo->getRootDirectory());

    // these values are static from a test, but the assertions make sure we don't break the methods
    $this->assertEquals("160620_DQ_7", $testInfo->getId());
    $this->assertEquals("Firefox, Internet Explorer and Chrome - <b>Chrome</b> - <b>Cable</b>", $testInfo->getTestLocation());
    $this->assertEquals("ITERAHH-VBOX-01-192.168.188.112", $testInfo->getTester(1));
  }
}
