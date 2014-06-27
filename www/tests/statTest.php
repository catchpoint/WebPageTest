<?php

// To invoke this test, download PHPUnit 4.1 from phpunit.de, and from the
// directory where this file is located, run:
// php $PHPUNIT_LOCATION/phpunit.phar graphPageDataTest

include_once '../stat.inc';
include '../../lib/PHPStats.phar';

class StatTest extends PHPUnit_Framework_TestCase
{

  public function testSampleVariance() {
    $this->assertEquals(0, sampleVariance(array(1, 1, 1)));
    $this->assertEquals(2, sampleVariance(array(-1, 1)));
    $this->assertEquals(6, sampleVariance(array(0, 1, 2, 3, 4, 5, 6, 7)));
    $this->assertEquals(10, sampleVariance(array(0, 1, 2, 4, 8)));
  }

  public function testCi() {
    $arr1 = array(0, 1, 2, 4, 8);
    $actual = ci("test", $arr1);
    $this->assertEquals("test", $actual->label);
    $this->assertEquals(5, $actual->n);
    $this->assertEquals(3, $actual->mean);
    $this->assertGreaterThan(3.926, $actual->ciHalfWidth);
    $this->assertLessThan(3.927, $actual->ciHalfWidth);
  }

}
?>
