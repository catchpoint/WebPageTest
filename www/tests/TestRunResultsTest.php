<?php

require_once __DIR__ . '/../include/TestRunResults.php';
require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/../include/TestStepResult.php';

class TestRunResultsTest extends PHPUnit_Framework_TestCase {

  public function testGetRunNumber() {
    $runResults = $this->getTestRunResults();
    $this->assertEquals(2, $runResults->getRunNumber());
  }

  public function testIsCachedRun() {
    $runResults = $this->getTestRunResults();
    $this->assertFalse($runResults->isCachedRun());
  }

  public function testCountSteps() {
    $runResults = $this->getTestRunResults();
    $this->assertEquals(3, $runResults->countSteps());
  }

  public function testGetStepResult() {
    $runResults = $this->getTestRunResults();

    $this->assertNull($runResults->getStepResult(4));

    $stepResult = $runResults->getStepResult(3);
    $this->assertInstanceOf("TestStepResult", $stepResult);
    $this->assertEquals(2, $stepResult->getRunNumber());
    $this->assertEquals(false, $stepResult->isCachedRun());
    $this->assertEquals(3, $stepResult->getStepNumber());

    $rawData = $stepResult->getRawResults();
    $this->assertEquals(99999, $rawData["result"]);
    $this->assertEquals(500, $rawData["TTFB"]);
    $this->assertEquals(1000, $rawData["loadTime"]);
  }

  public function testAggregateRawResults() {
    $runResults = $this->getTestRunResults();
    $aggregated = $runResults->aggregateRawResults();
    $this->assertEquals(9000, $aggregated["loadTime"]);
    $this->assertEquals(900, $aggregated["TTFB"]);
  }

  private function getTestRunResults() {
    $step1 = array('result' => 0, 'TTFB' => 300, 'loadTime' => 6000);
    $step2 = array('result' => 0, 'TTFB' => 100, 'loadTime' => 2000);
    $step3 = array('result' => 99999, 'TTFB' => 500, 'loadTime' => 1000);

    $rawTestInfo = array();
    $testInfo = TestInfo::fromValues("testId", "/test/path", $rawTestInfo);

    $stepResults = array(
      1 => TestStepResult::fromPageData($testInfo, $step1, 2, false, 1),
      2 => TestStepResult::fromPageData($testInfo, $step2, 2, false, 2),
      3 => TestStepResult::fromPageData($testInfo, $step3, 2, false, 3)
    );

    return TestRunResults::fromStepResults($testInfo, 2, false, $stepResults);
  }
}
