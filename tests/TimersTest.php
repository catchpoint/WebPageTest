<?php

declare(strict_types=1);

namespace WebPageTest;

use PHPUnit\Framework\TestCase;
use WebPageTest\Util\Timers;

final class TimersTest extends TestCase
{
    public function testNoTimersReturnsNull(): void
    {
        $Timers = new Timers();
        $setTimers = $Timers->getTimers();
        $this->assertNull($setTimers);
    }
    public function testTimerNoEndReturnsNull(): void
    {
        $Timers = new Timers();
        $Timers->startTimer('db');
        $setTimers = $Timers->getTimers();
        $this->assertNull($setTimers);
    }
    public function testTimerWithStartAndEndExists(): void
    {
        $Timers = new Timers();
        $Timers->startTimer('db');
        $Timers->endTimer('db');
        $setTimers = $Timers->getTimers();
        $this->assertStringContainsString('db', $setTimers);
    }
    public function testTimerNoStartWithEndReturnsNull(): void
    {
        $Timers = new Timers();
        $Timers->endTimer('DNE');
        $setTimers = $Timers->getTimers();
        $this->assertNull($setTimers);
    }
}
