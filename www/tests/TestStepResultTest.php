<?php

require_once __DIR__ . '/../include/TestStepResult.php';
require_once __DIR__ . '/../include/TestInfo.php';
require_once __DIR__ . '/TestUtil.php';

class TestStepResultTest extends PHPUnit_Framework_TestCase {

  private $tempDir;
  private $resultDir;

  public function setUp() {
    $this->tempDir = TestUtil::extractToTemp(__DIR__ . '/data/multistepResults.zip');
    $this->resultDir = $this->tempDir . '/multistepResults';
  }

  public function tearDown() {
    if (!empty($this->tempDir) && is_dir($this->tempDir)) {
      TestUtil::removeDirRecursive($this->tempDir);
    }
  }

  public function testFromFiles() {
    $testInfo = TestInfo::fromFiles($this->resultDir);

    $firstStep = TestStepResult::fromFiles($testInfo, 1, false, 1);
    $this->assertEquals("google", $firstStep->getEventName());
    $this->assertTrue($firstStep->hasCustomEventName());
    $this->assertNotEmpty($firstStep->getRawResults());
    $this->assertEquals("http://google.com", $firstStep->getUrl());
    $this->assertEquals("google", $firstStep->readableIdentifier());

    $secondStep = TestStepResult::fromFiles($testInfo, 1, true, 2);
    $this->assertEquals("Step 2", $secondStep->getEventName());
    $this->assertFalse($secondStep->hasCustomEventName());
    $this->assertNotEmpty($secondStep->getRawResults());
    $this->assertEquals("http://duckduckgo.com", $secondStep->getUrl());
    $this->assertEquals("http://duckduckgo.com", $secondStep->readableIdentifier());
  }

  public function testReadableIdentifier() {
    $testInfo = TestInfo::fromValues("testId", "/root/path", array());
    $step = TestStepResult::fromPageData($testInfo, array("eventName" => "testEvent", "URL" => "testUrl"), 1, 1, 1);
    $this->assertEquals("testEvent", $step->readableIdentifier("default"));

    $step = TestStepResult::fromPageData($testInfo, array("eventName" => "Step 1", "URL" => "testUrl"), 1, 1, 1);
    $this->assertEquals("testUrl", $step->readableIdentifier("default"));

    $step = TestStepResult::fromPageData($testInfo, array("eventName" => "Step 1", "URL" => ""), 1, 1, 1);
    $this->assertEquals("default", $step->readableIdentifier("default"));

    $step = TestStepResult::fromPageData($testInfo, array("eventName" => "Step 1", "URL" => ""), 1, 1, 1);
    $this->assertEquals("Step 1", $step->readableIdentifier(""));
  }

  public function testIsValid() {
    $testInfo = TestInfo::fromValues("testId", "/root/path", array());
    $step = TestStepResult::fromPageData($testInfo, array(), 1, 132, 1000);
    $this->assertFalse($step->isValid());
    $step = TestStepResult::fromPageData($testInfo, null, 1, 132, 1000);
    $this->assertFalse($step->isValid());
    $step = TestStepResult::fromPageData($testInfo, "foo", 1, 132, 1000);
    $this->assertFalse($step->isValid());

    $step = TestStepResult::fromPageData($testInfo, array("foo" => "bar"), 1, 132, 1000);
    $this->assertFalse($step->isValid());
    $step = TestStepResult::fromPageData($testInfo, array("loadTime" => 0), 1, 132, 1000);
    $this->assertFalse($step->isValid());

    $step = TestStepResult::fromPageData($testInfo, array("loadTime" => 1), 1, 132, 1000);
    $this->assertTrue($step->isValid());
    $step = TestStepResult::fromPageData($testInfo, array("fullyLoaded" => 112), 1, 132, 1000);
    $this->assertTrue($step->isValid());
  }

  public function testIsAdultSite() {
    // testInfo matches
    $testInfo = TestInfo::fromValues("testId", "/root/path", array("testinfo" => array("url" => "http://adultsite.com")));
    $step = TestStepResult::fromPageData($testInfo, array("title" => "testEvent", "URL" => "testUrl"), 1, 1, 1);
    $this->assertTrue($step->isAdultSite(array("adult", "foo")));

    // not an adult site
    $testInfo = TestInfo::fromValues("testId", "/root/path", array());
    $step = TestStepResult::fromPageData($testInfo, array("title" => "testEvent", "URL" => "testUrl"), 1, 1, 1);
    $this->assertFalse($step->isAdultSite(array("adult", "foo")));

    // title matches, adult_site = 0 is ignored
    $step = TestStepResult::fromPageData($testInfo, array("title" => "the AdulT site", "URL" => "testUrl", "adult_site" => 0), 1, 1, 1);
    $this->assertTrue($step->isAdultSite(array("adult", "foo")));
    $this->assertFalse($step->isAdultSite(array("bar", "foo")));

    // URL matches
    $step = TestStepResult::fromPageData($testInfo, array("title" => "testEvent", "URL" => "http://mysite.com/adults/"), 1, 1, 1);
    $this->assertTrue($step->isAdultSite(array("adult", "foo")));
    $this->assertFalse($step->isAdultSite(array("bar", "foo")));

    // explicitly set
    $step = TestStepResult::fromPageData($testInfo, array("adult_site" => 1), 1, 1, 1);
    $this->assertTrue($step->isAdultSite(array("adult", "foo")));
    $this->assertTrue($step->isAdultSite(array("bar", "foo")));
  }

  public function testHasBreakdownTimeline() {
    $fileHandlerExists = $this->getMock("FileHandler");
    $fileHandlerExists->method("gzFileExists")->willReturn(true);
    $fileHandlerDoesntExists = $this->getMock("FileHandler");
    $fileHandlerDoesntExists->method("gzFileExists")->willReturn(false);

    $testInfoWithTimeline = TestInfo::fromValues("testId", "/root/path", array("testinfo" => array("timeline" => "1")));
    $testInfoWithoutTimeline = TestInfo::fromValues("testId", "/root/path", array("testinfo" => array()));

    $step = TestStepResult::fromPageData($testInfoWithTimeline, array(), 1, 1, 1, $fileHandlerExists);
    $this->assertTrue($step->hasBreakdownTimeline());

    $step = TestStepResult::fromPageData($testInfoWithTimeline, array(), 1, 1, 1, $fileHandlerDoesntExists);
    $this->assertFalse($step->hasBreakdownTimeline());

    $step = TestStepResult::fromPageData($testInfoWithoutTimeline, array(), 1, 1, 1, $fileHandlerExists);
    $this->assertFalse($step->hasBreakdownTimeline());

    $step = TestStepResult::fromPageData($testInfoWithoutTimeline, array(), 1, 1, 1, $fileHandlerDoesntExists);
    $this->assertFalse($step->hasBreakdownTimeline());
  }

}
