<?php

declare(strict_types=1);

namespace WebPageTest;

class Util
{
    private static array $SETTINGS = [];
    private const SETTINGS_KEY = 'settings';

    public function __construct()
    {
        throw new \Exception("Util should not be instantiated. It only has static methods.");
    }

    public static function getSetting(string $setting, $default = false, string $override_settings_file = "")
    {
        if (empty(self::$SETTINGS)) {
            self::$SETTINGS = self::cacheFetch(self::SETTINGS_KEY) ?? [];
            if (empty(self::$SETTINGS)) {
                self::loadAndStoreSettings($override_settings_file);
            }
        }

        $ret = self::$SETTINGS[$setting] ?? $default;
        return $ret;
    }

    /*
     * returns string|array|null
     */
    public static function cacheFetch(string $key)
    {
        $ret = null;
        $success = false;
        // namespace the keys by installation
        $key = \sha1(__DIR__) . $key;
        if (\function_exists('apcu_fetch')) {
            $ret = \apcu_fetch($key, $success);
            if (!$success) {
                $ret = null;
            }
        } elseif (\function_exists('apc_fetch')) {
            $ret = \apc_fetch($key, $success);
            if (!$success) {
                $ret = null;
            }
        }
        return $ret;
    }

    /*
     * params
     * string $key
     * string|array $value
     * int $ttl default 0
     *
     * returns bool
     */
    public static function cacheStore(string $key, $value, int $ttl = 0): bool
    {
        $ret = false;
        // namespace the keys by installation
        $key = sha1(__DIR__) . $key;
        if (isset($value)) {
            if (function_exists('apcu_store')) {
                $ret = apcu_store($key, $value, $ttl);
            } elseif (function_exists('apc_store')) {
                $ret = apc_store($key, $value, $ttl);
            }
        }
        return $ret;
    }

    private static function loadAndStoreSettings(string $override_filepath = ""): void
    {
        if ($override_filepath != "") {
            if (file_exists($override_filepath)) {
                self::$SETTINGS = parse_ini_file($override_filepath);
            }
            self::cacheStore(self::SETTINGS_KEY, self::$SETTINGS, 60);
            return;
        }

        $global_settings_file = __DIR__ . '/../settings/settings.ini';
        $common_settings_file = __DIR__ . '/../settings/common/settings.ini';
        $server_specific_settings_file = __DIR__ . '/../settings/server/settings.ini';

        // Load the global settings
        if (file_exists($global_settings_file)) {
            self::$SETTINGS = parse_ini_file($global_settings_file);
        }
        // Load common settings as overrides
        if (file_exists($common_settings_file)) {
            $common = parse_ini_file($common_settings_file);
            self::$SETTINGS = array_merge(self::$SETTINGS, $common);
        }
        // Load server-specific settings as overrides
        if (file_exists($server_specific_settings_file)) {
            $server = parse_ini_file($server_specific_settings_file);
            self::$SETTINGS = array_merge(self::$SETTINGS, $server);
        }

        self::cacheStore(self::SETTINGS_KEY, self::$SETTINGS, 60);
    }
}
