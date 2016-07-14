<?php

require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/../include/TestResults.php';

class TestResultsTest extends PHPUnit_Framework_TestCase {

  public function testCountRuns() {
    $results = $this->getTestResultsFromPageData();
    $this->assertEquals(4, $results->countRuns());
  }

  public function testGetMedianRunNumber() {
    $results = $this->getTestResultsFromPageData();

    $this->assertEquals(3, $results->getMedianRunNumber("loadTime", false));
    $this->assertEquals(1, $results->getMedianRunNumber("TTFB", false));
    $this->assertEquals(4, $results->getMedianRunNumber("loadTime", true));
    $this->assertEquals(4, $results->getMedianRunNumber("TTFB", true));
  }

  public function testGetMedianRunNumberFastestMode() {
    $results = $this->getTestResultsFromPageData();

    $this->assertEquals(4, $results->getMedianRunNumber("loadTime", false, "fastest"));
    $this->assertEquals(3, $results->getMedianRunNumber("TTFB", false, "fastest"));

    $this->assertEquals(2, $results->getMedianRunNumber("loadTime", true, "fastest"));
    $this->assertEquals(3, $results->getMedianRunNumber("TTFB", true, "fastest"));
  }

  public function testGetFirstViewAverage() {
    $results = $this->getTestResultsFromPageData();
    $fvAverages = $results->getFirstViewAverage();
    $this->assertEquals(300, $fvAverages["TTFB"]);
    $this->assertEquals(3000, $fvAverages["loadTime"]);
    $this->assertEquals(3, $fvAverages["avgRun"]);
  }

  public function testGetRepeatViewAverage() {
    $results = $this->getTestResultsFromPageData();
    $fvAverages = $results->getRepeatViewAverage();
    $this->assertEquals(400, $fvAverages["TTFB"]);
    $this->assertEquals(4000, $fvAverages["loadTime"]);
    $this->assertEquals(4, $fvAverages["avgRun"]);
  }

  public function testGetStandardDeviation() {
    $results = $this->getTestResultsFromPageData();

    $this->assertEquals(2160, $results->getStandardDeviation("loadTime", false));
    $this->assertEquals(163, $results->getStandardDeviation("TTFB", false));
    $this->assertEquals(2160, $results->getStandardDeviation("loadTime", true));
    $this->assertEquals(81, $results->getStandardDeviation("TTFB", true));
  }

  public function testIsAdultSite() {
    $pageData = array(
      1 => array(array("title" => "normalPage")),
      2 => array(array("title" => "aduLtpage"))
    );
    $results = TestResults::fromPageData(TestInfo::fromValues("testId", "/test/path" , array()), $pageData);
    $this->assertTrue($results->isAdultSite(array("foo", "adult")));
    $this->assertFalse($results->isAdultSite(array("foo", "bar")));

    $testInfo = TestInfo::fromValues("testId", "/test/path", array("testinfo" => array("url" => "adultSite")));
    $results = TestResults::fromPageData($testInfo, array(1 => $pageData[1]));
    $this->assertTrue($results->isAdultSite(array("foo", "adult")));
    $this->assertFalse($results->isAdultSite(array("foo", "bar")));
  }

  private function getTestResultsFromPageData() {
    $run1 = array('result' => 0, 'TTFB' => 300, 'loadTime' => 6000);
    $run2 = array('result' => 404, 'TTFB' => 200, 'loadTime' => 3000);
    $run3 = array('result' => 0, 'TTFB' => 100, 'loadTime' => 2000);
    $run4 = array('result' => 99999, 'TTFB' => 500, 'loadTime' => 1000);
    $run5 = array('result' => 0, 'TTFB' => 400, 'loadTime' => 5000);

    $pageData = array(
      1 => array($run1), // missing repeat view
      2 => array($run2, $run4), // failed first view
      3 => array($run3, $run1),
      4 => array($run4, $run5)
    );
    foreach (array_keys($pageData) as $key) {
      $pageData[$key][0]["cached"] = 0;
      if (isset($pageData[$key][1])) {
        $pageData[$key][1]["cached"] = 1;
      }
    }
    $testinfo = array();
    return TestResults::fromPageData(TestInfo::fromValues("testId", "/test/path" , $testinfo), $pageData);
  }
}
