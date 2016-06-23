<?php

require_once __DIR__ . '/../include/ResultProcessing.php';
require_once __DIR__ . '/TestUtil.php';

class ResultProcessingTest extends PHPUnit_Framework_TestCase {
  
  private $tempDir;
  private $resultDir;
  private $testId;
  
  public function setUp() {
    $this->tempDir = TestUtil::extractToTemp(__DIR__ . '/data/multistepResults.zip');
    if (!$this->tempDir) {
      $this->fail("Failed to extract test data.");
    }
    $this->resultDir = $this->tempDir . '/multistepResults';
    $this->testId = "160623_K8_3";
  }
  
  public function tearDown() {
    if (is_dir($this->tempDir)) {
      TestUtil::removeDirRecursive($this->tempDir);
    }
  }

  public function testCountStepsWithData() {
    // both first and repeat view have two steps
    $resultProcessing = new ResultProcessing($this->resultDir, $this->testId, 1, false);
    $this->assertEquals(2, $resultProcessing->countSteps());
    $resultProcessing = new ResultProcessing($this->resultDir, $this->testId, 1, true);
    $this->assertEquals(2, $resultProcessing->countSteps());
  }

  public function testCountStepsRunDoesntExist() {
    // there is no second run
    $resultProcessing = new ResultProcessing($this->resultDir, $this->testId, 2, false);
    $this->assertEquals(0, $resultProcessing->countSteps());
  }

}
