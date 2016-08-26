<?php

// To invoke this test, download PHPUnit 4.1 from phpunit.de, and from the
// directory where this file is located, run:
// php $PHPUNIT_LOCATION/phpunit.phar pageDataTest

include_once __DIR__ . '/../page_data.inc';

class PageDataTest extends PHPUnit_Framework_TestCase
{
  public function setUp() {
    $run1 = array('result' => 0, 'TTFB' => 100);
    $run2 = array('result' => 404, 'TTFB' => 200);
    $run3 = array('result' => 99999, 'TTFB' => 300);
    $run4 = array('result' => 404, 'TTFB' => 400);
    $this->pageData = array(1 => array($run1, $run2), 2 => array($run2, $run3), 3 => array($run3));
    $this->pageData2 = array(1 => array($run2), 2 => array($run4));
  }

  public function testSuccessfulRun() {
    $run = array('result' => 0);
    $this->assertTrue(successfulRun($run));
    $run = array('result' => 99999);
    $this->assertTrue(successfulRun($run));
    $run = array('result' => 404);
    $this->assertFalse(successfulRun($run));
  }

  public function testValues() {
    $expectedValuesFirstViewSuccessful = array(1 => 100, 3 => 300);
    $expectedValuesFirstViewAll = array(1 => 100, 2 => 200, 3 => 300);
    $expectedValuesRepeatViewSuccessful = array(2 => 300);
    $expectedValuesRepeatViewAll = array(1 => 200, 2 => 300);
    $this->assertEquals($expectedValuesFirstViewSuccessful,
      values($this->pageData, 0, 'TTFB', true));
    $this->assertEquals($expectedValuesFirstViewAll,
      values($this->pageData, 0, 'TTFB', false));
    $this->assertEquals($expectedValuesRepeatViewSuccessful,
      values($this->pageData, 1, 'TTFB', true));
    $this->assertEquals($expectedValuesRepeatViewAll,
      values($this->pageData, 1, 'TTFB', false));
  }

  public function testGetMedianRun() {
    $this->assertEquals(1, GetMedianRun($this->pageData, 0, 'TTFB'));
    $this->assertEquals(1, GetMedianRun($this->pageData2, 0, 'TTFB'));
  }
}

?>
