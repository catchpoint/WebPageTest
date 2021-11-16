<?php declare(strict_types=1);

require_once __DIR__ . '/..' . '/www/ratelimit/check_monthly_rate_limit.php';

use PHPUnit\Framework\TestCase;

final class CheckMonthlyRateLimitTest extends TestCase {
  public function testConstructorSetsDefaultValues() : void {
    $ip = '127.0.0.1';
    $cmrl = new CheckMonthlyRateLimit($ip);
    $this->assertEquals('127.0.0.1', $cmrl->ip);
    $this->assertEquals(50, $cmrl->limit);
    $this->assertEquals(2419200, $cmrl->day_cycle_ttl);
    $this->assertEquals('rladdr_per_month_127.0.0.1', $cmrl->cache_key);
  }

  public function testConstructorSetsValues() : void {
    $ip = '127.0.0.0';
    $cmrl = new CheckMonthlyRateLimit($ip, 40, 20);
    $this->assertEquals('127.0.0.0', $cmrl->ip);
    $this->assertEquals(40, $cmrl->limit);
    $this->assertEquals(1728000, $cmrl->day_cycle_ttl);
    $this->assertEquals('rladdr_per_month_127.0.0.0', $cmrl->cache_key);
  }

  /**
   *
   * @requires extension apcu
   */
  public function testCheckFirstTime() : void {
    $ip = '127.0.0.2';
    $cmrl = new CheckMonthlyRateLimit($ip, 40, 20);
    $passes = $cmrl->check(1);
    $this->assertTrue($passes);
  }

  /**
   *
   * @requires extension apcu
   */
  public function testCheckPastLimit() : void {
    $ip = '127.0.0.3';
    $cmrl = new CheckMonthlyRateLimit($ip, 2, 20);
    $passes = $cmrl->check(1);
    $passes = $cmrl->check(1);
    $passes = $cmrl->check(1);
    $this->assertFalse($passes);
  }

  /**
   *
   * @requires extension apcu
   */
  public function testCheckLastNumberGoesPastButStillPasses() : void {
    $ip = '127.0.0.4';
    $cmrl = new CheckMonthlyRateLimit($ip, 40, 20);
    $passes = $cmrl->check(20);
    $passes = $cmrl->check(19);
    $passes = $cmrl->check(20);
    $this->assertTrue($passes);
  }

  /**
   *
   * @requires extension apcu
   */
  public function testCheckPastLimitLargeNumbers() : void {
    $ip = '127.0.0.5';
    $cmrl = new CheckMonthlyRateLimit($ip, 40, 20);
    $passes = $cmrl->check(20);
    $passes = $cmrl->check(19);
    $passes = $cmrl->check(20);
    $passes = $cmrl->check(1);
    $this->assertFalse($passes);
  }
}
