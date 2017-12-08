<?php

// To invoke this test, download PHPUnit 4.1 from phpunit.de, and from the
// directory where this file is located, run:
// php $PHPUNIT_LOCATION/phpunit.phar commonLibTest

include_once __DIR__ . '/../common_lib.inc';

class CommonLibTest extends PHPUnit_Framework_TestCase
{
  public function testMedian() {
    $values = array(1 => 0, 2 => 1, 3 => 3, 4 => 6, 5 => 10);
    $this->assertEquals(3, median($values));
  }
}

?>
