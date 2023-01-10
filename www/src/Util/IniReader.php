<?php

declare(strict_types=1);

namespace WebPageTest\Util;

class IniReader
{
    public static function getExtensions(): array
    {
        $file = SETTINGS_PATH . '/extensions.ini';
        if (is_file($file)) {
            return parse_ini_file($file);
        }
        return [];
    }
}
