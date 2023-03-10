<?php

declare(strict_types=1);

namespace WebPageTest\Util;

class SettingsFileReader
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
     * @return array|false Parsed ini or false
     */
    public static function ini($filename, $processSections = false, $allowSample = false)
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
        return false;
    }

    /**
     * Returns an array of file lines (PHP's file()) by looking ar the default location
     * and any overwrites in /common and /server
     *
     * @param string $filename E.g. "blockdomains.txt"
     * @param int $flags Same as the second param to `file()`
     * @return array|false Parsed text file or false
     */
    public static function plain($filename, $flags = FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES)
    {
        $paths = [
            realpath(SETTINGS_PATH . '/server/' . $filename),
            realpath(SETTINGS_PATH . '/common/' . $filename),
            realpath(SETTINGS_PATH . '/' . $filename),
        ];

        foreach ($paths as $path) {
            if ($path && file_exists($path)) {
                return file($path, $flags);
            }
        }
        return false;
    }
}
