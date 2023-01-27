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
    /**
     * Return a parsed ini file by looking ar the default (even a sample) location
     * and any overwrites in /common and /server
     *
     * @param string $filename E.g. "locations.ini"
     * @param bool $processSections Same as the second param to `parse_ini_file`
     * @param bool $allowSample If true also look for e.g. "locations.ini.sample"
     * @return array|null Parsed ini or null
     */
    public static function parse($filename, $processSections = false, $allowSample = false)
    {
        $paths = [
            realpath(SETTINGS_PATH . '/server/' . $filename),
            realpath(SETTINGS_PATH . '/common/' . $filename),
            realpath(SETTINGS_PATH . '/' . $filename),
        ];
        if ($allowSample) {
            $paths[] = realpath(SETTINGS_PATH . '/' . $filename . '.sample');
        }

        foreach ($paths as $path) {
            if ($path && file_exists($path)) {
                return parse_ini_file($path, $processSections);
            }
        }
        return null;
    }
}
