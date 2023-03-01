<?php

declare(strict_types=1);

namespace WebPageTest\OE;

use WebPageTest\OE\TestResult;

interface OpportunityTest
{
  /**
   * @param array $data an array of the items needed for this test
   */
    public static function run(array $data): TestResult;
}
