<?php

require_once __DIR__ . '/../include/TestRunResults.php';
require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/../include/TestStepResult.php';

class TestRunResultsTest extends PHPUnit_Framework_TestCase {
  private $testInfo;

  public function setUp() {
    $rawTestInfo = array();
    $this->testInfo = TestInfo::fromValues("testId", "/test/path", $rawTestInfo);
  }

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

  public function testAggregateRawResultsWithInvalid() {
    // same results as invalid steps should be ignored
    $runResults = $this->getTestRunResultsWithInvalid();
    $aggregated = $runResults->aggregateRawResults();
    $this->assertEquals(9000, $aggregated["loadTime"]);
    $this->assertEquals(900, $aggregated["TTFB"]);
  }

  public function testAggregateMetric() {
    $runResults = $this->getTestRunResults();
    $this->assertEquals(9000, $runResults->aggregateMetric("loadTime"));
    $this->assertEquals(900, $runResults->aggregateMetric("TTFB"));
  }

  public function testAggregateMetricWithInvalid() {
    // same results as invalid steps should be ignored
    $runResults = $this->getTestRunResultsWithInvalid();
    $this->assertEquals(9000, $runResults->aggregateMetric("loadTime"));
    $this->assertEquals(900, $runResults->aggregateMetric("TTFB"));
    $this->assertEquals(10000, $runResults->aggregateMetric("loadTime", false));
    $this->assertEquals(1400, $runResults->aggregateMetric("TTFB", false));
  }

  public function testIsSuccessful() {
    $this->assertTrue($this->getTestRunResults()->isSuccessful());
    $this->assertFalse($this->getTestRunResultsWithInvalid()->isSuccessful());
  }

  private function getTestStepArray() {
    $step1 = array('result' => 0, 'TTFB' => 300, 'loadTime' => 6000);
    $step2 = array('result' => 0, 'TTFB' => 100, 'loadTime' => 2000);
    $step3 = array('result' => 99999, 'TTFB' => 500, 'loadTime' => 1000);

    $stepResults = array(
      1 => TestStepResult::fromPageData($this->testInfo, $step1, 2, false, 1),
      2 => TestStepResult::fromPageData($this->testInfo, $step2, 2, false, 2),
      3 => TestStepResult::fromPageData($this->testInfo, $step3, 2, false, 3)
    );
    return $stepResults;
  }

  private function getTestRunResults() {
    $steps = $this->getTestStepArray();
    return TestRunResults::fromStepResults($this->testInfo, 2, false, $steps);
  }

  private function getTestRunResultsWithInvalid() {
    $step4 = array('result' => 404, 'TTFB' => 500, 'loadTime' => 1000); // result is error
    $steps = $this->getTestStepArray();
    $steps[] = TestStepResult::fromPageData($this->testInfo, $step4, 2, false, 4);
    return TestRunResults::fromStepResults($this->testInfo, 2, false, $steps);
  }


}
