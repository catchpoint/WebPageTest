<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use WebPageTest\Util;
use WebPageTest\Util\Cache;

final class UtilTest extends TestCase
{
    public function testConstructorThrows(): void
    {
        $this->expectException(Exception::class);
        $util = new Util();
    }

    public function testGetSetting(): void
    {
        $override_settings_file = __DIR__ . '/fixtures/settings.ini';
        $value = Util::getSetting('product', false, $override_settings_file);
        $this->assertEquals('WebPagetest', $value);
    }

    public function testGetSettingWithNullDefault(): void
    {
        $override_settings_file = __DIR__ . '/fixtures/settings.ini';
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

}
