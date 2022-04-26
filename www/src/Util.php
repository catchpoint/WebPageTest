<?php

declare(strict_types=1);

namespace WebPageTest;

use WebPageTest\Util\Cache;

class Util
{
    private static array $SETTINGS = [];
    private const SETTINGS_KEY = 'settings';
    private static string $settings_dir = __DIR__ . '/../settings';

    public function __construct()
    {
        throw new \Exception("Util should not be instantiated. It only has static methods.");
    }

    public static function getSetting(string $setting, $default = false, string $override_settings_file = "")
    {
        if (empty(self::$SETTINGS)) {
            self::$SETTINGS = Cache::fetch(self::SETTINGS_KEY) ?? [];
            if (empty(self::$SETTINGS)) {
                self::loadAndStoreSettings($override_settings_file);
            }
        }

        $ret = self::$SETTINGS[$setting] ?? $default;
        return $ret;
    }

    /**
     * Let's not make all the cookies TOO obvious. Let's sha1 hash and salt em
     *
     * Pass in a name
     */
    public static function getCookieName(string $name): string
    {
        $salt = self::getServerSecret();
        $hash = hash('sha1', $name);
        return hash('sha256', $hash . $salt);
    }


    public static function getServerSecret()
    {
      // cache the status in apc for 15 seconds so we don't hammer the scheduler
        $settings_dir = self::$settings_dir;
        $secret = Cache::fetch('server-secret');
        if (isset($secret) && !is_string($secret)) {
            $secret = null;
        }
        if (!isset($secret)) {
            $keys_file = "{$settings_dir}/keys.ini";
            if (file_exists("{$settings_dir}/common/keys.ini")) {
                $keys_file = "{$settings_dir}/common/keys.ini";
            }
            if (file_exists("{$settings_dir}/server/keys.ini")) {
                $keys_file = "{$settings_dir}/server/keys.ini";
            }
            $keys = parse_ini_file($keys_file, true);
            if (isset($keys) && isset($keys['server']['secret'])) {
                $secret = trim($keys['server']['secret']);
            }

            $ttl = 3600;
            if (!isset($secret)) {
                $secret = '';
                $ttl = 60;
            }
            Cache::store('server-secret', $secret, $ttl);
        }
        return $secret;
    }

    private static function loadAndStoreSettings(string $override_filepath = ""): void
    {
        if ($override_filepath != "") {
            if (file_exists($override_filepath)) {
                self::$SETTINGS = parse_ini_file($override_filepath);
            }
            Cache::store(self::SETTINGS_KEY, self::$SETTINGS, 60);
            return;
        }

        $global_settings_file = self::$settings_dir . "/settings.ini";
        $common_settings_file = self::$settings_dir . "/common/settings.ini";
        $server_specific_settings_file = self::$settings_dir . "/server/settings.ini";

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

        Cache::store(self::SETTINGS_KEY, self::$SETTINGS, 60);
    }
}
