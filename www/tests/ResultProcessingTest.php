<?php

require_once __DIR__ . '/../include/TestPaths.php';
require_once __DIR__ . '/../include/ResultProcessing.php';
require_once __DIR__ . '/../breakdown.inc';
require_once __DIR__ . '/../google/google_lib.inc';
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

  public function testPostProcessRun() {
    $firstStepPaths = new TestPaths($this->resultDir, 1, true, 1);
    $secondStepPaths = new TestPaths($this->resultDir, 1, true, 2);

    $csiCacheFile = $firstStepPaths->csiCacheFile(CSI_CACHE_VERSION) . ".gz";
    $breakdownCacheFile = $firstStepPaths->breakdownCacheFile(BREAKDOWN_CACHE_VERSION) . ".gz";
    $this->assertEquals($csiCacheFile, $secondStepPaths->csiCacheFile(CSI_CACHE_VERSION) . ".gz");
    $this->assertEquals($breakdownCacheFile, $secondStepPaths->breakdownCacheFile(BREAKDOWN_CACHE_VERSION) . ".gz");
    $this->assertNotEquals($firstStepPaths->cacheKey(), $secondStepPaths->cacheKey());

    $this->assertFileNotExists($csiCacheFile);
    $this->assertFileNotExists($breakdownCacheFile);

    $resultProcessing = new ResultProcessing($this->resultDir, $this->testId, 1, true);
    $error = $resultProcessing->postProcessRun();
    $this->assertNull($error);

    $this->assertFileExists($csiCacheFile);
    $cache = json_decode(gz_file_get_contents($csiCacheFile), true);
    $this->assertNotEmpty(@$cache[$firstStepPaths->cacheKey()], "CSI Cache for step 1 is empty");
    // actually, the second step doesn't contain CSI info. But it should be in the cache anyway
    $this->assertArrayHasKey($secondStepPaths->cacheKey(), $cache, "CSI Cache for step 2 is empty");

    $this->assertFileExists($breakdownCacheFile);
    $cache = json_decode(gz_file_get_contents($breakdownCacheFile), true);
    $this->assertNotEmpty(@$cache[$firstStepPaths->cacheKey()], "Breakdown Cache for step 1 is empty");
    $this->assertNotEmpty(@$cache[$secondStepPaths->cacheKey()], "Breakdown Cache for step 2 is empty");
  }
}
