<?php

require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/../include/TestStepResult.php';
require_once __DIR__ . '/../include/TestRunResults.php';
require_once __DIR__ . '/../include/XmlResultGenerator.php';

class XmlResultGeneratorTest extends PHPUnit_Framework_TestCase {
  private $testInfo;

  public function setUp() {
    $rawTestInfo = array();
    $this->testInfo = TestInfo::fromValues("testId", "/test/path", $rawTestInfo);
    ob_start();
  }

  public function tearDown() {
    ob_end_clean();
  }

  public function testMedianSinglestep() {
    $run = $this->getTestRunResults(1);
    $xmlGenerator = new XmlResultGenerator($this->testInfo, "", new FileHandler(), array(), true);
    $xmlGenerator->printMedianRun($run);
    $xml = simplexml_load_string(ob_get_contents());
    $this->assertEquals("2", $xml->run);
    $this->assertEquals("300", $xml->TTFB);
    $this->assertEquals("6000", $xml->loadTime);
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

  private function getTestRunResults($numSteps) {
    $steps = $this->getTestStepArray();
    return TestRunResults::fromStepResults($this->testInfo, 2, false, array_slice($steps, 0, $numSteps));
  }
}
