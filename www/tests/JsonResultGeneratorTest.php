<?php

require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/../include/TestStepResult.php';
require_once __DIR__ . '/../include/TestRunResults.php';
require_once __DIR__ . '/../include/JsonResultGenerator.php';

class JsonResultGeneratorTest extends PHPUnit_Framework_TestCase {

  /* @var TestInfo */
  private $testInfo;

  public function setUp() {
    $rawTestInfo = array();
    $this->testInfo = TestInfo::fromValues("160628_AB_C", "/tmp", $rawTestInfo);
  }

  public function testMedianRunSinglestep() {
    $run = $this->getTestRunResults(1);
    $jsonGenerator = new JsonResultGenerator($this->testInfo, "", new FileHandler(), array(), true);
    $result = $jsonGenerator->medianRunDataArray($run);
    $this->assertEquals("2", $result["run"]);
    $this->assertEquals("300", $result["TTFB"]);
    $this->assertEquals("6000", $result["loadTime"]);
    $this->assertTrue(array_key_exists("foo", $result));
    $this->assertEquals("lorem", $result["foo"]);
    $this->assertTrue(array_key_exists("domains", $result));
    $this->assertTrue(array_key_exists("rawData", $result));
    $this->assertTrue(array_key_exists("pages", $result));
  }

  public function testPrintMedianRunMultistep() {
    $run = $this->getTestRunResults(3);
    $jsonGenerator = new JsonResultGenerator($this->testInfo, "", new FileHandler(), array(), true);
    $result = $jsonGenerator->medianRunDataArray($run);
    $this->assertEquals("2", $result["run"]);
    $this->assertEquals("900", $result["TTFB"]);
    $this->assertEquals("9000", $result["loadTime"]);
    $this->assertFalse(array_key_exists("foo", $result));
    $this->assertFalse(array_key_exists("domains", $result));
    $this->assertFalse(array_key_exists("rawData", $result));
    $this->assertFalse(array_key_exists("pages", $result));
  }

  public function testPrintRunSinglestep() {
    $run = $this->getTestRunResults(1);
    $jsonGenerator = new JsonResultGenerator($this->testInfo, "", new FileHandler(), array(), false);
    $result = $jsonGenerator->runDataArray($run);

    $this->assertEquals("300", $result["TTFB"]);
    $this->assertEquals("6000", $result["loadTime"]);
    $this->assertTrue(array_key_exists("foo", $result));
    $this->assertEquals("lorem", $result["foo"]);
    $this->assertTrue(array_key_exists("domains", $result));
    $this->assertEquals("/screen_shot.php?test=160628_AB_C&run=2&cached=1", $result["pages"]["screenShot"]);
    $this->assertEquals("1", $result["numSteps"]);
  }

  private function getTestStepArray() {
    $step1 = array('result' => 0, 'TTFB' => 300, 'loadTime' => 6000, 'foo' => 'lorem');
    $step2 = array('result' => 0, 'TTFB' => 100, 'loadTime' => 2000, 'foo' => 'ipsum', 'eventName' => "MyEvent");
    $step3 = array('result' => 99999, 'TTFB' => 500, 'loadTime' => 1000, 'foo' => 'dolor');

    $stepResults = array(
      1 => TestStepResult::fromPageData($this->testInfo, $step1, 2, true, 1),
      2 => TestStepResult::fromPageData($this->testInfo, $step2, 2, true, 2),
      3 => TestStepResult::fromPageData($this->testInfo, $step3, 2, true, 3)
    );
    return $stepResults;
  }

  private function getTestRunResults($numSteps) {
    $steps = $this->getTestStepArray();
    return TestRunResults::fromStepResults($this->testInfo, 2, true, array_slice($steps, 0, $numSteps));
  }
}
