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

  public function testMedianRunDataArraySinglestep() {
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

  public function testMedianRunDataArrayMultistep() {
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

  public function testMedianRunDataArraySinglestepForceMultistep() {
    $run = $this->getTestRunResults(1);
    $jsonGenerator = new JsonResultGenerator($this->testInfo, "", new FileHandler(), array(), true);
    $jsonGenerator->forceMultistepFormat(true);
    $result = $jsonGenerator->medianRunDataArray($run);

    $this->assertEquals("2", $result["run"]);
    $this->assertEquals("300", $result["TTFB"]);
    $this->assertEquals("6000", $result["loadTime"]);
    $this->assertFalse(array_key_exists("foo", $result));
    $this->assertFalse(array_key_exists("domains", $result));
    $this->assertFalse(array_key_exists("rawData", $result));
    $this->assertFalse(array_key_exists("pages", $result));
  }

  public function testRunDataArraySinglestep() {
    $run = $this->getTestRunResults(1);
    $jsonGenerator = new JsonResultGenerator($this->testInfo, "", new FileHandler(), array(), false);
    $result = $jsonGenerator->runDataArray($run);

    $this->assertEquals("300", $result["TTFB"]);
    $this->assertEquals("6000", $result["loadTime"]);
    $this->assertTrue(array_key_exists("foo", $result));
    $this->assertEquals("lorem", $result["foo"]);
    $this->assertTrue(array_key_exists("domains", $result));
    $this->assertTrue(array_key_exists("pages", $result));
    $this->assertTrue(array_key_exists("rawData", $result));
    $this->assertEquals("/screen_shot.php?test=160628_AB_C&run=2&cached=1", $result["pages"]["screenShot"]);
    $this->assertEquals("1", $result["numSteps"]);
  }

  public function testRunDataArrayMultistep() {
    $run = $this->getTestRunResults(2);
    $jsonGenerator = new JsonResultGenerator($this->testInfo, "", new FileHandler(), array(), false);
    $result = $jsonGenerator->runDataArray($run);

    $this->assertFalse(array_key_exists("TTFB", $result));
    $this->assertFalse(array_key_exists("loadTime", $result));
    $this->assertFalse(array_key_exists("domains", $result));
    $this->assertFalse(array_key_exists("pages", $result));
    $this->assertFalse(array_key_exists("rawData", $result));
    $this->assertEquals("2", $result["numSteps"]);

    $this->assertTrue(array_key_exists(0, $result["steps"]));
    $this->assertEquals("1", $result["steps"][0]["id"]);
    $this->assertTrue(array_key_exists("eventName", $result["steps"][0]));
    $this->assertEquals("", $result["steps"][0]["eventName"]);
    $this->assertEquals("300", $result["steps"][0]["TTFB"]);
    $this->assertEquals("6000", $result["steps"][0]["loadTime"]);
    $this->assertEquals("lorem", $result["steps"][0]["foo"]);
    $this->assertTrue(array_key_exists("domains", $result["steps"][0]));
    $this->assertEquals("/screen_shot.php?test=160628_AB_C&run=2&cached=1", $result["steps"][0]["pages"]["screenShot"]);

    $this->assertTrue(array_key_exists(1, $result["steps"]));
    $this->assertEquals("2", $result["steps"][1]["id"]);
    $this->assertEquals("MyEvent", $result["steps"][1]["eventName"]);
    $this->assertEquals("100", $result["steps"][1]["TTFB"]);
    $this->assertEquals("2000", $result["steps"][1]["loadTime"]);
    $this->assertEquals("ipsum", $result["steps"][1]["foo"]);
    $this->assertTrue(array_key_exists("domains", $result["steps"][1]));
    $this->assertEquals("/screen_shot.php?test=160628_AB_C&run=2&cached=1&step=2", $result["steps"][1]["pages"]["screenShot"]);

    $this->assertFalse(array_key_exists(2, $result["steps"]));
  }

  public function testRunDataArraySinglestepForceMultistep() {
    $run = $this->getTestRunResults(1);
    $jsonGenerator = new JsonResultGenerator($this->testInfo, "", new FileHandler(), array(), false);
    $jsonGenerator->forceMultistepFormat(true);
    $result = $jsonGenerator->runDataArray($run);

    $this->assertFalse(array_key_exists("TTFB", $result));
    $this->assertFalse(array_key_exists("loadTime", $result));
    $this->assertFalse(array_key_exists("domains", $result));
    $this->assertFalse(array_key_exists("pages", $result));
    $this->assertFalse(array_key_exists("rawData", $result));
    $this->assertEquals("1", $result["numSteps"]);

    $this->assertTrue(array_key_exists(0, $result["steps"]));
    $this->assertEquals("1", $result["steps"][0]["id"]);
    $this->assertTrue(array_key_exists("eventName", $result["steps"][0]));
    $this->assertEquals("", $result["steps"][0]["eventName"]);
    $this->assertEquals("300", $result["steps"][0]["TTFB"]);
    $this->assertEquals("6000", $result["steps"][0]["loadTime"]);
    $this->assertEquals("lorem", $result["steps"][0]["foo"]);
    $this->assertTrue(array_key_exists("domains", $result["steps"][0]));
    $this->assertEquals("/screen_shot.php?test=160628_AB_C&run=2&cached=1", $result["steps"][0]["pages"]["screenShot"]);

    $this->assertFalse(array_key_exists(1, $result["steps"]));
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
