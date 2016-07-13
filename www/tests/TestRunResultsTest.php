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

  public function testIsAdultSite() {
    $stepAdult = TestStepResult::fromPageData($this->testInfo, array("title" => "myadUltPage"), 2, false, 1);
    $stepNonAdult = TestStepResult::fromPageData($this->testInfo, array("title" => "normalSite"), 2, false, 2);

    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, array($stepAdult, $stepNonAdult));
    $this->assertTrue($runResults->isAdultSite(array("adult", "foo")));
    $this->assertFalse($runResults->isAdultSite(array("bar", "foo")));

    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, array($stepNonAdult, $stepNonAdult));
    $this->assertFalse($runResults->isAdultSite(array("adult", "foo")));
    $this->assertFalse($runResults->isAdultSite(array("bar", "foo")));

    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, array($stepNonAdult, $stepNonAdult));
    $this->assertFalse($runResults->isAdultSite(array("adult", "foo")));
    $this->assertFalse($runResults->isAdultSite(array("bar", "foo")));

    $testInfo = TestInfo::fromValues("testId", "/test/path", array("testinfo" => array("url" => "adultSite")));
    $runResults = TestRunResults::fromStepResults($testInfo, 2, false, array($stepNonAdult, $stepNonAdult));
    $this->assertTrue($runResults->isAdultSite(array("adult", "foo")));
    $this->assertFalse($runResults->isAdultSite(array("bar", "foo")));
  }

  public function testAggregatePageSpeedScore() {
    $stepNoScore = $this->getMock("TestStepResult", array(), array(), "", false);
    $stepNoScore->method('getPageSpeedScore')->willReturn(null);
    $stepScore55 = $this->getMock("TestStepResult", array(), array(), "", false);
    $stepScore55->method('getPageSpeedScore')->willReturn("55");
    $stepScore40 = $this->getMock("TestStepResult", array(), array(), "", false);
    $stepScore40->method('getPageSpeedScore')->willReturn(40);

    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, array($stepNoScore, $stepScore55, $stepScore40));
    $this->assertEquals(48, $runResults->averagePageSpeedScore());

    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, array($stepNoScore, $stepNoScore, $stepNoScore));
    $this->assertEquals(null, $runResults->averagePageSpeedScore());

    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, array($stepNoScore, $stepScore55, $stepNoScore));
    $this->assertEquals(55, $runResults->averagePageSpeedScore());

    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, array($stepScore40, $stepScore40, $stepScore40));
    $this->assertEquals(40, $runResults->averagePageSpeedScore());

    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, array($stepScore40, $stepScore40, $stepScore55));
    $this->assertEquals(45, $runResults->averagePageSpeedScore());
  }

  public function testGetPageSpeedVersion() {
    $steps = array(
      TestStepResult::fromPageData($this->testInfo, array(), 2, false, 1),
      TestStepResult::fromPageData($this->testInfo, array("pageSpeedVersion" => "52.3"), 2, false, 2),
      TestStepResult::fromPageData($this->testInfo, array("pageSpeedVersion" => "2222"), 2, false, 3),
    );
    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, $steps);
    $this->assertEquals("52.3", $runResults->getPageSpeedVersion());
  }

  public function testIsOptimizationChecked() {
    $steps = array(
      TestStepResult::fromPageData($this->testInfo, array(), 2, false, 1),
      TestStepResult::fromPageData($this->testInfo, array("optimization_checked" => null), 2, false, 2),
      TestStepResult::fromPageData($this->testInfo, array("optimization_checked" => "2222"), 2, false, 3),
      TestStepResult::fromPageData($this->testInfo, array(), 2, false, 4)
    );
    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, $steps);
    $this->assertTrue($runResults->isOptimizationChecked());

    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, array_slice($steps, 0, 2));
    $this->assertFalse($runResults->isOptimizationChecked());
  }

  public function testAverageMetric() {
    $steps = array(
      TestStepResult::fromPageData($this->testInfo, array(), 2, false, 1),
      TestStepResult::fromPageData($this->testInfo, array("myMetric" => "40"), 2, false, 2),
      TestStepResult::fromPageData($this->testInfo, array("myMetric" => 53), 2, false, 3),
    );
    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, $steps);
    $this->assertEquals(46.5, $runResults->averageMetric("myMetric"));

    $runResults = TestRunResults::fromStepResults($this->testInfo, 2, false, array_slice($steps, 0, 1));
    $this->assertNull($runResults->averageMetric("myMetric"));
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
