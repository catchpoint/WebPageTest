<?php

// To invoke this test, download PHPUnit 4.1 from phpunit.de, and from the
// directory where this file is located, run:
// php $PHPUNIT_LOCATION/phpunit.phar graphPageDataTest

include_once __DIR__ . '/../stat.inc';
include __DIR__ . '/../lib/PHPStats/PHPStats.phar';

class StatTest extends PHPUnit_Framework_TestCase
{
  public function testCi() {
    $arr1 = array(0, 1, 2, 4, 8);
    $actual = ConfData::fromArr("test", $arr1);
    $this->assertEquals("test", $actual->label);
    $this->assertEquals(5, $actual->n);
    $this->assertEquals(3, $actual->mean);
    $this->assertGreaterThan(3.926, $actual->ciHalfWidth);
    $this->assertLessThan(3.927, $actual->ciHalfWidth);
  }

}
?>
