<?php

declare(strict_types=1);

namespace WebPageTest;

use PHPUnit\Framework\TestCase;
use WebPageTest\Util;
use WebPageTest\Util\Cache;

final class UtilTest extends TestCase
{
    public function testConstructorThrows(): void
    {
        $this->expectException(\Exception::class);
        $util = new Util();
    }

    public function testGetSetting(): void
    {
        $override_settings_file = TESTS_PATH . '/fixtures/settings.ini';
        $value = Util::getSetting('product', false, $override_settings_file);
        $this->assertEquals('WebPagetest', $value);
    }

    public function testGetSettingWithNullDefault(): void
    {
        $override_settings_file = TESTS_PATH . '/fixtures/settings.ini';
        $value = Util::getSetting('product', null, $override_settings_file);
        $this->assertEquals('WebPagetest', $value);
    }

    public function testCacheFetch(): void
    {
        $value = 'silly-thing';
        $key = 'oh-ok';
        $cached = Cache::store($key, $value, 30);
        $this->assertTrue($cached);
        $fetched = Cache::fetch($key);
        $this->assertEquals($value, $fetched);
    }
    public function testGetRunCountFirstViewOnly(): void
    {
        $runs = 1;
        $fvonly = 1;
        $lighthouse = 0;
        $testtype = '';
        $total_runs = Util::getRunCount($runs, $fvonly, $lighthouse, $testtype);
        $this->assertEquals(1, $total_runs);
    }
    public function testGetRunCountFirstViewOnlyWithLighthouse(): void
    {
        $runs = 1;
        $fvonly = 1;
        $lighthouse = 1;
        $testtype = '';
        $total_runs = Util::getRunCount($runs, $fvonly, $lighthouse, $testtype);
        $this->assertEquals(1, $total_runs);
    }
    public function testGetRunCountRepeatView(): void
    {
        $runs = 1;
        $fvonly = 0;
        $lighthouse = 0;
        $testtype = '';
        $total_runs = Util::getRunCount($runs, $fvonly, $lighthouse, $testtype);
        $this->assertEquals(2, $total_runs);
    }
    public function testGetRunCountRepeatViewWithLighthouse(): void
    {
        $runs = 1;
        $fvonly = 0;
        $lighthouse = 1;
        $testtype = '';
        $total_runs = Util::getRunCount($runs, $fvonly, $lighthouse, $testtype);
        $this->assertEquals(2, $total_runs);
    }
    public function testGetRunCountLighthouseTest(): void
    {
        $runs = 1;
        $fvonly = 1;
        $lighthouse = 1;
        $testtype = 'lighthouse';
        $total_runs = Util::getRunCount($runs, $fvonly, $lighthouse, $testtype);
        $this->assertEquals(1, $total_runs);
    }
}
